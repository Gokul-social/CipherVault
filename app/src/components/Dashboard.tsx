"use client";

import React, { useEffect, useState, useMemo } from "react";
import { useWallet, useConnection } from "@solana/wallet-adapter-react";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import { PublicKey } from "@solana/web3.js";
import { AnchorProvider, BN } from "@coral-xyz/anchor";
import {
  initializeVault,
  getVaultState,
  getHealthFactor,
  createAndRegisterDWallet,
  recordDeposit,
  VaultState,
  ChainAsset,
} from "@ciphervault/sdk";

export function Dashboard() {
  const { wallet, publicKey, signTransaction, signAllTransactions } = useWallet();
  const { connection } = useConnection();
  
  const [vaultState, setVaultState] = useState<VaultState | null>(null);
  const [healthFactor, setHealthFactor] = useState<number | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [message, setMessage] = useState<string>("");

  const provider = useMemo(() => {
    if (!wallet || !publicKey || !signTransaction || !signAllTransactions) {
      return null;
    }
    return new AnchorProvider(
      connection,
      {
        publicKey,
        signTransaction,
        signAllTransactions,
      },
      { commitment: "confirmed" }
    );
  }, [wallet, publicKey, connection, signTransaction, signAllTransactions]);

  const loadVaultData = async () => {
    if (!provider || !publicKey) return;
    try {
      const state = await getVaultState(provider, publicKey);
      setVaultState(state);
      const health = await getHealthFactor(provider, publicKey);
      setHealthFactor(health);
    } catch (e: any) {
      if (e.message && e.message.includes("Account does not exist")) {
        setVaultState(null); // Not initialized yet
      } else {
        console.error("Error loading vault state:", e);
      }
    }
  };

  useEffect(() => {
    if (provider && publicKey) {
      loadVaultData();
    }
  }, [provider, publicKey]);

  const handleInitVault = async () => {
    if (!provider || !publicKey) return;
    setLoading(true);
    setMessage("Initializing Vault...");
    try {
      // For hackathon, hardcode ltvBps=7500 (75%), liqThreshold=8000 (80%), oracle=user (for testing)
      const { txSig } = await initializeVault(provider, 7500, 8000, publicKey);
      setMessage(`Vault initialized! Tx: ${txSig}`);
      await loadVaultData();
    } catch (e: any) {
      console.error(e);
      setMessage(`Error initializing vault: ${e.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleRegisterDWallet = async () => {
    if (!provider || !publicKey) return;
    setLoading(true);
    setMessage("Registering dWallet...");
    try {
      // We pass the user's publicKey as the vault PDA just for deriving it inside the SDK.
      // Wait, SDK createAndRegisterDWallet takes vaultPda. We need to derive it.
      // Actually, the SDK derives it internally or we can just pass the derived one.
      const { deriveVaultPda } = require("@ciphervault/sdk");
      const [vaultPda] = deriveVaultPda(publicKey);
      const { txSig, dwalletId } = await createAndRegisterDWallet(provider, ChainAsset.BtcNative, vaultPda);
      setMessage(`dWallet registered! Tx: ${txSig}`);
      await loadVaultData();
    } catch (e: any) {
      console.error(e);
      setMessage(`Error registering dWallet: ${e.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleRecordDeposit = async () => {
    if (!provider || !publicKey || !vaultState || vaultState.positions.length === 0) return;
    setLoading(true);
    setMessage("Recording Deposit...");
    try {
      const { deriveVaultPda } = require("@ciphervault/sdk");
      const [vaultPda] = deriveVaultPda(publicKey);
      const dwalletId = Buffer.from(vaultState.positions[0].dwalletId, "hex");
      // Deposit 1.5 BTC (native) at $65,000
      const rawAmount = new BN("150000000"); // 1.5 BTC in sats
      const usdPrice6Dec = new BN("65000000000"); // 65,000.000000
      const txSig = await recordDeposit(provider, vaultPda, dwalletId, rawAmount, usdPrice6Dec);
      setMessage(`Deposit recorded! Tx: ${txSig}`);
      await loadVaultData();
    } catch (e: any) {
      console.error(e);
      setMessage(`Error recording deposit: ${e.message}`);
    } finally {
      setLoading(false);
    }
  };

  if (!publicKey) {
    return (
      <div style={{ textAlign: "center", padding: "2rem" }}>
        <h2 style={{ marginBottom: "1.5rem" }}>Connect your wallet to access CipherVault</h2>
        <WalletMultiButton />
      </div>
    );
  }

  return (
    <div style={{ padding: "2rem", maxWidth: "800px", margin: "0 auto" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "2rem" }}>
        <h2 style={{ margin: 0, color: "#38bdf8" }}>Dashboard</h2>
        <WalletMultiButton />
      </div>

      <div style={{ backgroundColor: "#18181b", padding: "1.5rem", borderRadius: "12px", border: "1px solid #27272a", marginBottom: "2rem" }}>
        <h3 style={{ marginTop: 0 }}>Vault Status</h3>
        {vaultState ? (
          <div>
            <p><strong>Total Collateral (USD):</strong> ${vaultState.totalCollateralUsd.toString()}</p>
            <p><strong>Available Credit:</strong> ${vaultState.availableCredit.toString()}</p>
            <p><strong>Health Factor:</strong> {healthFactor === Infinity ? "Infinity" : healthFactor?.toFixed(2)}</p>
            
            <h4 style={{ marginTop: "1.5rem" }}>Positions</h4>
            {vaultState.positions.length > 0 ? (
              <ul style={{ paddingLeft: "1.5rem" }}>
                {vaultState.positions.map((p, i) => (
                  <li key={i} style={{ marginBottom: "0.5rem" }}>
                    {p.asset} ({p.chain}): {p.amount.toString()} raw units, Value: ${p.valueUsd.toString()}
                  </li>
                ))}
              </ul>
            ) : (
              <p style={{ color: "#a1a1aa" }}>No active positions.</p>
            )}
          </div>
        ) : (
          <p style={{ color: "#a1a1aa" }}>No vault found. Initialize a vault to get started.</p>
        )}
      </div>

      <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap", marginBottom: "1rem" }}>
        {!vaultState && (
          <button 
            onClick={handleInitVault} 
            disabled={loading}
            style={btnStyle}
          >
            Initialize Vault
          </button>
        )}
        {vaultState && (
          <>
            <button 
              onClick={handleRegisterDWallet} 
              disabled={loading}
              style={btnStyle}
            >
              Register BTC dWallet
            </button>
            <button 
              onClick={handleRecordDeposit} 
              disabled={loading || vaultState.positions.length === 0}
              style={btnStyle}
            >
              Simulate Deposit (1.5 BTC)
            </button>
          </>
        )}
      </div>

      {message && (
        <div style={{ padding: "1rem", backgroundColor: "#27272a", borderRadius: "8px", fontSize: "0.875rem", fontFamily: "monospace", wordBreak: "break-all" }}>
          {message}
        </div>
      )}
    </div>
  );
}

const btnStyle = {
  padding: "0.75rem 1.5rem",
  backgroundColor: "#a78bfa",
  color: "#0a0a0f",
  border: "none",
  borderRadius: "8px",
  fontWeight: 600,
  cursor: "pointer",
  transition: "opacity 0.2s",
};
