import {
  PublicKey,
  Connection,
  SystemProgram,
  Transaction,
  TransactionInstruction,
} from "@solana/web3.js";

// ── Program ID ────────────────────────────────────────────────────────────────
export const VAULT_PROGRAM_ID = new PublicKey(
  "4jJrbTHiAP5ocWhbUqJG6m1bQ6cRkNi7vJvHWpRABwBm"
);

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
  totalCollateralUsd: bigint;
  usedCreditUsd:      bigint;
  ltvBps:             number;
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

// ── Fetch vault state ─────────────────────────────────────────────────────────
export async function fetchVaultInfo(
  connection: Connection,
  owner: PublicKey
): Promise<VaultInfo | null> {
  const pda  = deriveVaultPda(owner);
  const info = await connection.getAccountInfo(pda);
  if (!info) return null;

  // Layout: [8 disc] owner(32) oracleAuthority(32) ltvBps(2) liqThreshold(2)
  //         totalCollateralUsd(8) usedCreditUsd(8) numPositions(1)
  //         dwalletIds(256) positions(464) isFrozen(1) bump(1)
  const d = info.data;
  let offset = 8;   // skip discriminator
  offset += 32;     // owner
  offset += 32;     // oracleAuthority
  const ltvBps             = d.readUInt16LE(offset); offset += 2;
  offset += 2;              // liquidationThresholdBps
  const totalCollateralUsd = d.readBigUInt64LE(offset); offset += 8;
  const usedCreditUsd      = d.readBigUInt64LE(offset); offset += 8;
  const numPositions       = d.readUInt8(offset);       offset += 1;
  offset += 256;            // dwalletIds
  offset += 464;            // positions
  const isFrozen           = d.readUInt8(offset) !== 0;

  return { totalCollateralUsd, usedCreditUsd, ltvBps, numPositions, isFrozen };
}

// ── Build instructions ────────────────────────────────────────────────────────
export function buildInitializeVaultIx(
  owner: PublicKey,
  vaultPda: PublicKey
): TransactionInstruction {
  const data = Buffer.concat([
    DISC.initializeVault,
    encodeU16LE(7500),
    encodeU16LE(8000),
  ]);
  return new TransactionInstruction({
    programId: VAULT_PROGRAM_ID,
    keys: [
      { pubkey: vaultPda,             isSigner: false, isWritable: true  },
      { pubkey: owner,                isSigner: true,  isWritable: true  },
      { pubkey: owner,                isSigner: false, isWritable: false },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    ],
    data,
  });
}

export function buildRegisterDwalletIx(
  owner: PublicKey,
  vaultPda: PublicKey,
  chain: number = 0,
  asset: number = 0
): TransactionInstruction {
  const dwalletId = Buffer.alloc(32);
  owner.toBuffer().copy(dwalletId);
  const data = Buffer.concat([
    DISC.registerDwallet,
    dwalletId,
    Buffer.from([chain]), // chain: 0=BTC, 1=ETH, 2=SOL
    Buffer.from([asset]), // asset: 0=BTC, 1=ETH, 2=SOL, ...
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
  owner: PublicKey,
  vaultPda: PublicKey
): TransactionInstruction {
  const dwalletId = Buffer.alloc(32);
  owner.toBuffer().copy(dwalletId);
  const data = Buffer.concat([
    DISC.recordDeposit,
    dwalletId,
    encodeU64LE(BigInt(150_000_000)),    // 1.5 BTC in sats
    encodeU64LE(BigInt(65_000_000_000)), // $65,000.000000
  ]);
  return new TransactionInstruction({
    programId: VAULT_PROGRAM_ID,
    keys: [
      { pubkey: vaultPda, isSigner: false, isWritable: true  },
      // oracle_authority: must match vault.oracle_authority (set to owner at init)
      { pubkey: owner,    isSigner: true,  isWritable: false },
    ],
    data,
  });
}

/**
 * Builds a record_withdrawal instruction.
 * record_withdrawal: [disc(8) + dwalletId(32) + rawAmount(8) + usdPrice6dec(8)]
 *
 * Account layout (must match RecordWithdrawal context in lib.rs):
 *   0. vault         — writable, PDA
 *   1. oracle_authority — signer (== owner, set at vault init)
 */
export function buildRecordWithdrawalIx(
  owner: PublicKey,
  vaultPda: PublicKey,
  dwalletId?: Buffer,
  rawAmount: bigint = BigInt(50_000_000),
  usdPrice6dec: bigint = BigInt(65_000_000_000)
): TransactionInstruction {
  const dwId = dwalletId ?? (() => {
    const b = Buffer.alloc(32);
    owner.toBuffer().copy(b);
    return b;
  })();
  const data = Buffer.concat([
    DISC.recordWithdrawal,
    dwId,
    encodeU64LE(rawAmount),
    encodeU64LE(usdPrice6dec),
  ]);
  return new TransactionInstruction({
    programId: VAULT_PROGRAM_ID,
    keys: [
      { pubkey: vaultPda, isSigner: false, isWritable: true },
      // oracle_authority: must match vault.oracle_authority (set to owner at vault initialization)
      { pubkey: owner,    isSigner: true,  isWritable: false },
    ],
    data,
  });
}

/**
 * Builds an update_credit instruction.
 * update_credit: [disc(8) + newUsedCreditUsd(8)]
 */
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

export async function sendAndConfirm(
  connection: Connection,
  tx: Transaction,
  sendTransaction: (tx: Transaction, connection: Connection) => Promise<string>
): Promise<string> {
  tx.recentBlockhash = (await connection.getLatestBlockhash()).blockhash;
  const sig = await sendTransaction(tx, connection);
  await connection.confirmTransaction(sig, "confirmed");
  return sig;
}
