"use client";

import React, { useEffect, useState, useMemo } from "react";
import { useWallet, useConnection } from "@solana/wallet-adapter-react";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import {
  PublicKey,
  SystemProgram,
  Transaction,
  TransactionInstruction,
} from "@solana/web3.js";

// ── Constants ────────────────────────────────────────────────────────────────

const VAULT_PROGRAM_ID = new PublicKey(
  "4jJrbTHiAP5ocWhbUqJG6m1bQ6cRkNi7vJvHWpRABwBm"
);

// Anchor instruction discriminators (sha256("global:<name>")[0:8])
const DISC = {
  initializeVault: Buffer.from([48, 191, 163, 44, 71, 129, 63, 164]),
  registerDwallet:  Buffer.from([186, 119, 139, 52, 93, 184, 231, 1]),
  recordDeposit:    Buffer.from([98, 130, 249, 185, 16, 42, 16, 162]),
};

// ── PDA Derivation ───────────────────────────────────────────────────────────

function deriveVaultPda(owner: PublicKey): PublicKey {
  const [pda] = PublicKey.findProgramAddressSync(
    [Buffer.from("vault"), owner.toBuffer()],
    VAULT_PROGRAM_ID
  );
  return pda;
}

// ── Borsh helpers ────────────────────────────────────────────────────────────

function encodeU16LE(v: number): Buffer {
  const b = Buffer.alloc(2);
  b.writeUInt16LE(v, 0);
  return b;
}

function encodeU64LE(v: bigint): Buffer {
  const b = Buffer.alloc(8);
  b.writeBigUInt64LE(v, 0);
  return b;
}

// ── Vault state from RPC ─────────────────────────────────────────────────────

interface VaultInfo {
  totalCollateralUsd: bigint;
  usedCreditUsd: bigint;
  ltvBps: number;
  numPositions: number;
  isFrozen: boolean;
}

async function fetchVaultInfo(
  connection: ReturnType<typeof useConnection>["connection"],
  owner: PublicKey
): Promise<VaultInfo | null> {
  const pda = deriveVaultPda(owner);
  const info = await connection.getAccountInfo(pda);
  if (!info) return null;

  // Skip 8-byte Anchor discriminator, then parse fields
  // Layout: owner(32) oracleAuthority(32) ltvBps(2) liqThreshold(2)
  //         totalCollateralUsd(8) usedCreditUsd(8) numPositions(1)
  //         dwalletIds(32*8=256) positions(struct*8) isFrozen(1) bump(1)
  const d = info.data;
  let offset = 8; // skip discriminator
  offset += 32;   // owner
  offset += 32;   // oracleAuthority
  const ltvBps = d.readUInt16LE(offset); offset += 2;
  offset += 2;    // liquidationThresholdBps
  const totalCollateralUsd = d.readBigUInt64LE(offset); offset += 8;
  const usedCreditUsd = d.readBigUInt64LE(offset); offset += 8;
  const numPositions = d.readUInt8(offset); offset += 1;
  offset += 256;  // dwalletIds (8 * 32)
  // positions: 8 * (32 + 1 + 1 + 8 + 8 + 8) = 8 * 58 = 464 bytes
  offset += 464;
  const isFrozen = d.readUInt8(offset) !== 0;

  return { totalCollateralUsd, usedCreditUsd, ltvBps, numPositions, isFrozen };
}

// ── Component ────────────────────────────────────────────────────────────────

export function Dashboard() {
  const { publicKey, sendTransaction } = useWallet();
  const { connection } = useConnection();

  const [vaultInfo, setVaultInfo] = useState<VaultInfo | null | "loading">("loading");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const vaultPda = useMemo(
    () => (publicKey ? deriveVaultPda(publicKey) : null),
    [publicKey]
  );

  const loadVault = async () => {
    if (!publicKey) return;
    setVaultInfo("loading");
    try {
      const info = await fetchVaultInfo(connection, publicKey);
      setVaultInfo(info);
    } catch (e: any) {
      console.error("fetchVaultInfo error:", e);
      setVaultInfo(null);
    }
  };

  useEffect(() => {
    if (publicKey) loadVault();
  }, [publicKey]);

  // ── Initialize Vault ────────────────────────────────────────────────────
  const handleInitVault = async () => {
    if (!publicKey || !vaultPda) return;
    setLoading(true);
    setMessage("Building transaction…");
    try {
      // Args: ltvBps (u16) = 7500, liquidationThresholdBps (u16) = 8000
      const data = Buffer.concat([
        DISC.initializeVault,
        encodeU16LE(7500),
        encodeU16LE(8000),
      ]);

      const ix = new TransactionInstruction({
        programId: VAULT_PROGRAM_ID,
        keys: [
          { pubkey: vaultPda,                   isSigner: false, isWritable: true  },
          { pubkey: publicKey,                   isSigner: true,  isWritable: true  },
          { pubkey: publicKey,                   isSigner: false, isWritable: false }, // oracleAuthority = self
          { pubkey: SystemProgram.programId,     isSigner: false, isWritable: false },
        ],
        data,
      });

      const tx = new Transaction().add(ix);
      tx.feePayer = publicKey;
      tx.recentBlockhash = (await connection.getLatestBlockhash()).blockhash;

      const sig = await sendTransaction(tx, connection);
      await connection.confirmTransaction(sig, "confirmed");

      setMessage(`✅ Vault initialized! Tx: ${sig}`);
      await loadVault();
    } catch (e: any) {
      console.error(e);
      setMessage(`❌ ${e.message}`);
    } finally {
      setLoading(false);
    }
  };

  // ── Register dWallet (BTC) ──────────────────────────────────────────────
  const handleRegisterDWallet = async () => {
    if (!publicKey || !vaultPda) return;
    setLoading(true);
    setMessage("Registering dWallet…");
    try {
      // Generate a deterministic 32-byte dWallet ID from the owner pubkey
      const dwalletId = Buffer.alloc(32);
      publicKey.toBuffer().copy(dwalletId);

      const data = Buffer.concat([
        DISC.registerDwallet,
        dwalletId,         // [u8; 32]
        Buffer.from([0]),  // chain = 0 (BTC)
        Buffer.from([0]),  // asset = 0
      ]);

      const ix = new TransactionInstruction({
        programId: VAULT_PROGRAM_ID,
        keys: [
          { pubkey: vaultPda,  isSigner: false, isWritable: true },
          { pubkey: publicKey, isSigner: true,  isWritable: true },
        ],
        data,
      });

      const tx = new Transaction().add(ix);
      tx.feePayer = publicKey;
      tx.recentBlockhash = (await connection.getLatestBlockhash()).blockhash;

      const sig = await sendTransaction(tx, connection);
      await connection.confirmTransaction(sig, "confirmed");

      setMessage(`✅ dWallet registered! Tx: ${sig}`);
      await loadVault();
    } catch (e: any) {
      console.error(e);
      setMessage(`❌ ${e.message}`);
    } finally {
      setLoading(false);
    }
  };

  // ── Record Deposit ──────────────────────────────────────────────────────
  const handleRecordDeposit = async () => {
    if (!publicKey || !vaultPda) return;
    setLoading(true);
    setMessage("Recording deposit…");
    try {
      const dwalletId = Buffer.alloc(32);
      publicKey.toBuffer().copy(dwalletId);

      const data = Buffer.concat([
        DISC.recordDeposit,
        dwalletId,
        encodeU64LE(BigInt(150_000_000)),    // 1.5 BTC in sats
        encodeU64LE(BigInt(65_000_000_000)), // $65,000.000000
      ]);

      const ix = new TransactionInstruction({
        programId: VAULT_PROGRAM_ID,
        keys: [
          { pubkey: vaultPda,  isSigner: false, isWritable: true  },
          { pubkey: publicKey, isSigner: true,  isWritable: false }, // oracleAuthority
        ],
        data,
      });

      const tx = new Transaction().add(ix);
      tx.feePayer = publicKey;
      tx.recentBlockhash = (await connection.getLatestBlockhash()).blockhash;

      const sig = await sendTransaction(tx, connection);
      await connection.confirmTransaction(sig, "confirmed");

      setMessage(`✅ Deposit recorded! Tx: ${sig}`);
      await loadVault();
    } catch (e: any) {
      console.error(e);
      setMessage(`❌ ${e.message}`);
    } finally {
      setLoading(false);
    }
  };

  // ── Render ──────────────────────────────────────────────────────────────

  if (!publicKey) {
    return (
      <div style={{ textAlign: "center", padding: "2rem" }}>
        <p style={{ color: "#a1a1aa", marginBottom: "1.5rem" }}>
          Connect your wallet to access CipherVault
        </p>
        <WalletMultiButton />
      </div>
    );
  }

  const isLoading = vaultInfo === "loading";

  return (
    <div style={{ padding: "2rem", maxWidth: "820px", margin: "0 auto" }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "2rem" }}>
        <h2 style={{ margin: 0, fontSize: "1.5rem", color: "#38bdf8" }}>Dashboard</h2>
        <WalletMultiButton />
      </div>

      {/* Vault Status */}
      <div style={{ backgroundColor: "#18181b", padding: "1.5rem", borderRadius: "12px", border: "1px solid #27272a", marginBottom: "2rem" }}>
        <h3 style={{ marginTop: 0, color: "#e4e4e7" }}>Vault Status</h3>
        {isLoading ? (
          <p style={{ color: "#71717a" }}>Loading…</p>
        ) : !vaultInfo ? (
          <p style={{ color: "#a1a1aa" }}>No vault found. Initialize a vault to get started.</p>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
            {[
              { label: "Total Collateral (USD)", value: `$${(Number(vaultInfo.totalCollateralUsd) / 1_000_000).toFixed(2)}` },
              { label: "Used Credit (USD)",      value: `$${(Number(vaultInfo.usedCreditUsd) / 1_000_000).toFixed(2)}` },
              { label: "LTV",                    value: `${(vaultInfo.ltvBps / 100).toFixed(0)}%` },
              { label: "Active Positions",        value: `${vaultInfo.numPositions}` },
              { label: "Health Factor",           value: vaultInfo.usedCreditUsd === BigInt(0) ? "∞" : (Number(vaultInfo.totalCollateralUsd) / Number(vaultInfo.usedCreditUsd)).toFixed(2) },
              { label: "Status",                  value: vaultInfo.isFrozen ? "🔴 Frozen" : "🟢 Active" },
            ].map(({ label, value }) => (
              <div key={label} style={{ backgroundColor: "#27272a", padding: "1rem", borderRadius: "8px" }}>
                <div style={{ fontSize: "0.75rem", color: "#71717a", marginBottom: "0.25rem", fontFamily: "monospace" }}>{label}</div>
                <div style={{ fontSize: "1.25rem", fontWeight: 700, color: "#e4e4e7" }}>{value}</div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Action Buttons */}
      <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap", marginBottom: "1.5rem" }}>
        {!isLoading && !vaultInfo && (
          <button onClick={handleInitVault} disabled={loading} style={btnStyle("#a78bfa")}>
            {loading ? "Processing…" : "Initialize Vault"}
          </button>
        )}
        {!isLoading && vaultInfo && (
          <>
            <button onClick={handleRegisterDWallet} disabled={loading} style={btnStyle("#38bdf8")}>
              {loading ? "Processing…" : "Register BTC dWallet"}
            </button>
            <button
              onClick={handleRecordDeposit}
              disabled={loading || vaultInfo.numPositions === 0}
              title={vaultInfo.numPositions === 0 ? "Register a dWallet first" : ""}
              style={{
                ...btnStyle("#34d399"),
                opacity: vaultInfo.numPositions === 0 ? 0.4 : 1,
                cursor: vaultInfo.numPositions === 0 ? "not-allowed" : "pointer",
              }}
            >
              {loading ? "Processing…" : "Simulate Deposit (1.5 BTC)"}
            </button>
            <button onClick={loadVault} disabled={loading} style={btnStyle("#71717a")}>
              Refresh
            </button>
          </>
        )}
      </div>

      {/* Step hint */}
      {!isLoading && vaultInfo && vaultInfo.numPositions === 0 && (
        <div style={{ padding: "0.75rem 1rem", backgroundColor: "#1c1c22", border: "1px solid #a78bfa44", borderRadius: "8px", marginBottom: "1rem", fontSize: "0.8rem", color: "#a78bfa" }}>
          ℹ️ Step 1: Register a BTC dWallet → Step 2: Simulate a Deposit
        </div>
      )}

      {/* Message */}
      {message && (
        <div style={{ padding: "1rem", backgroundColor: "#1c1c22", border: "1px solid #27272a", borderRadius: "8px", fontFamily: "monospace", fontSize: "0.8rem", color: "#a1a1aa", wordBreak: "break-all" }}>
          {message}
        </div>
      )}
    </div>
  );
}

function btnStyle(color: string) {
  return {
    padding: "0.75rem 1.5rem",
    backgroundColor: color,
    color: "#0a0a0f",
    border: "none",
    borderRadius: "8px",
    fontWeight: 700 as const,
    cursor: "pointer",
    fontSize: "0.875rem",
    transition: "opacity 0.2s",
  };
}
