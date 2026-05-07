import {
  PublicKey,
  Connection,
  SystemProgram,
  Transaction,
  TransactionInstruction,
} from "@solana/web3.js";
import { VAULT_PROGRAM_ID, DEFAULT_LTV_BPS, DEFAULT_LIQ_THRESHOLD_BPS } from "./config";

// Re-export for consumers that previously imported from here
export { VAULT_PROGRAM_ID };

// ── Anchor discriminators (sha256("global:<name>")[0:8]) ──────────────────────
export const DISC = {
  initializeVault:  Buffer.from([48, 191, 163, 44, 71, 129, 63, 164]),
  registerDwallet:  Buffer.from([186, 119, 139, 52, 93, 184, 231, 1]),
  recordDeposit:    Buffer.from([98, 130, 249, 185, 16, 42, 16, 162]),
  recordWithdrawal: Buffer.from([183, 98, 220, 220, 200, 81, 42, 132]),
  updateCredit:     Buffer.from([65, 140, 57, 168, 120, 45, 193, 194]),
};

// ── Vault data shape ──────────────────────────────────────────────────────────
export interface VaultInfo {
  owner:              string;   // base58 — verified against connected wallet
  oracleAuthority:    string;   // base58 — used to gate oracle actions
  totalCollateralUsd: bigint;
  usedCreditUsd:      bigint;
  ltvBps:             number;
  liquidationThresholdBps: number;
  numPositions:       number;
  isFrozen:           boolean;
}

// ── PDA derivation ────────────────────────────────────────────────────────────
export function deriveVaultPda(owner: PublicKey): PublicKey {
  const [pda] = PublicKey.findProgramAddressSync(
    [Buffer.from("vault"), owner.toBuffer()],
    VAULT_PROGRAM_ID
  );
  return pda;
}

// ── Borsh helpers ─────────────────────────────────────────────────────────────
export function encodeU16LE(v: number): Buffer {
  const b = Buffer.alloc(2);
  b.writeUInt16LE(v, 0);
  return b;
}

export function encodeU64LE(v: bigint): Buffer {
  const b = Buffer.alloc(8);
  b.writeBigUInt64LE(v, 0);
  return b;
}

// ── Account layout offsets ────────────────────────────────────────────────────
// [8 disc][32 owner][32 oracleAuthority][2 ltvBps][2 liqThreshold]
// [8 totalCollateralUsd][8 usedCreditUsd][1 numPositions]
// [256 dwalletIds][464 positions][1 isFrozen][1 bump]
const OFFSETS = {
  owner:              8,
  oracleAuthority:    8 + 32,
  ltvBps:             8 + 32 + 32,
  liqThreshold:       8 + 32 + 32 + 2,
  totalCollateralUsd: 8 + 32 + 32 + 2 + 2,
  usedCreditUsd:      8 + 32 + 32 + 2 + 2 + 8,
  numPositions:       8 + 32 + 32 + 2 + 2 + 8 + 8,
  dwalletIds:         8 + 32 + 32 + 2 + 2 + 8 + 8 + 1,
  positions:          8 + 32 + 32 + 2 + 2 + 8 + 8 + 1 + 256,
  isFrozen:           8 + 32 + 32 + 2 + 2 + 8 + 8 + 1 + 256 + 464,
} as const;

// ── Fetch vault state ─────────────────────────────────────────────────────────
export async function fetchVaultInfo(
  connection: Connection,
  owner: PublicKey
): Promise<VaultInfo | null> {
  const pda  = deriveVaultPda(owner);
  const info = await connection.getAccountInfo(pda);
  if (!info) return null;

  const d = info.data;

  // Verify ownership — critical security check
  const onChainOwner = new PublicKey(d.subarray(OFFSETS.owner, OFFSETS.owner + 32));
  if (!onChainOwner.equals(owner)) {
    console.error("[fetchVaultInfo] PDA owner mismatch — possible spoofing attempt");
    return null;
  }

  const oracleAuthority = new PublicKey(
    d.subarray(OFFSETS.oracleAuthority, OFFSETS.oracleAuthority + 32)
  ).toBase58();

  const ltvBps             = d.readUInt16LE(OFFSETS.ltvBps);
  const liquidationThresholdBps = d.readUInt16LE(OFFSETS.liqThreshold);
  const totalCollateralUsd = d.readBigUInt64LE(OFFSETS.totalCollateralUsd);
  const usedCreditUsd      = d.readBigUInt64LE(OFFSETS.usedCreditUsd);
  const numPositions       = d.readUInt8(OFFSETS.numPositions);
  const isFrozen           = d.readUInt8(OFFSETS.isFrozen) !== 0;

  return {
    owner: onChainOwner.toBase58(),
    oracleAuthority,
    totalCollateralUsd,
    usedCreditUsd,
    ltvBps,
    liquidationThresholdBps,
    numPositions,
    isFrozen,
  };
}

// ── Build instructions ────────────────────────────────────────────────────────

export function buildInitializeVaultIx(
  owner: PublicKey,
  vaultPda: PublicKey,
  ltvBps: number = DEFAULT_LTV_BPS,
  liquidationThresholdBps: number = DEFAULT_LIQ_THRESHOLD_BPS
): TransactionInstruction {
  const data = Buffer.concat([
    DISC.initializeVault,
    encodeU16LE(ltvBps),
    encodeU16LE(liquidationThresholdBps),
  ]);
  return new TransactionInstruction({
    programId: VAULT_PROGRAM_ID,
    keys: [
      { pubkey: vaultPda,                isSigner: false, isWritable: true  },
      { pubkey: owner,                   isSigner: true,  isWritable: true  },
      { pubkey: owner,                   isSigner: false, isWritable: false }, // oracleAuthority = self
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    ],
    data,
  });
}

export function buildRegisterDwalletIx(
  owner: PublicKey,
  vaultPda: PublicKey,
  dwalletId: Uint8Array,
  chain: number,
  asset: number
): TransactionInstruction {
  if (dwalletId.length !== 32) {
    throw new Error(`dwalletId must be exactly 32 bytes, got ${dwalletId.length}`);
  }
  const data = Buffer.concat([
    DISC.registerDwallet,
    Buffer.from(dwalletId),
    Buffer.from([chain]),
    Buffer.from([asset]),
  ]);
  return new TransactionInstruction({
    programId: VAULT_PROGRAM_ID,
    keys: [
      { pubkey: vaultPda, isSigner: false, isWritable: true },
      { pubkey: owner,    isSigner: true,  isWritable: true },
    ],
    data,
  });
}

export function buildRecordDepositIx(
  oracleAuthority: PublicKey,
  vaultPda: PublicKey,
  dwalletId: Uint8Array,
  rawAmount: bigint,
  usdPrice6dec: bigint
): TransactionInstruction {
  if (dwalletId.length !== 32) {
    throw new Error(`dwalletId must be exactly 32 bytes, got ${dwalletId.length}`);
  }
  if (rawAmount <= BigInt(0)) {
    throw new Error("rawAmount must be greater than zero");
  }
  if (usdPrice6dec <= BigInt(0)) {
    throw new Error("usdPrice6dec must be greater than zero");
  }

  const data = Buffer.concat([
    DISC.recordDeposit,
    Buffer.from(dwalletId),
    encodeU64LE(rawAmount),
    encodeU64LE(usdPrice6dec),
  ]);
  return new TransactionInstruction({
    programId: VAULT_PROGRAM_ID,
    keys: [
      { pubkey: vaultPda,         isSigner: false, isWritable: true  },
      { pubkey: oracleAuthority,  isSigner: true,  isWritable: false },
    ],
    data,
  });
}

export function buildRecordWithdrawalIx(
  oracleAuthority: PublicKey,
  vaultPda: PublicKey,
  dwalletId: Uint8Array,
  rawAmount: bigint,
  usdPrice6dec: bigint
): TransactionInstruction {
  if (dwalletId.length !== 32) {
    throw new Error(`dwalletId must be exactly 32 bytes, got ${dwalletId.length}`);
  }
  if (rawAmount <= BigInt(0)) {
    throw new Error("rawAmount must be greater than zero");
  }
  if (usdPrice6dec <= BigInt(0)) {
    throw new Error("usdPrice6dec must be greater than zero");
  }

  const data = Buffer.concat([
    DISC.recordWithdrawal,
    Buffer.from(dwalletId),
    encodeU64LE(rawAmount),
    encodeU64LE(usdPrice6dec),
  ]);
  return new TransactionInstruction({
    programId: VAULT_PROGRAM_ID,
    keys: [
      { pubkey: vaultPda,        isSigner: false, isWritable: true  },
      { pubkey: oracleAuthority, isSigner: true,  isWritable: false },
    ],
    data,
  });
}

export function buildUpdateCreditIx(
  owner: PublicKey,
  vaultPda: PublicKey,
  newUsedCreditUsd: bigint
): TransactionInstruction {
  const data = Buffer.concat([
    DISC.updateCredit,
    encodeU64LE(newUsedCreditUsd),
  ]);
  return new TransactionInstruction({
    programId: VAULT_PROGRAM_ID,
    keys: [
      { pubkey: vaultPda, isSigner: false, isWritable: true },
      { pubkey: owner,    isSigner: true,  isWritable: true },
    ],
    data,
  });
}
