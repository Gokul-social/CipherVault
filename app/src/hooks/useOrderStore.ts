"use client";

import { create } from "zustand";
import { PublicKey, Connection, Transaction, TransactionInstruction, SystemProgram } from "@solana/web3.js";
import { useTransactionStore } from "./useTransactionStore";

// ── Types ──────────────────────────────────────────────────────────────────

export type OrderDirection = "long" | "short";

export interface OrderEntry {
  orderId: number;
  direction: OrderDirection;
  encryptedSize: string; // hex preview
  encryptedPrice: string; // hex preview
  timestamp: number;
  isFilled: boolean;
  isCancelled: boolean;
  txSig?: string;
}

export interface SettlementEntry {
  settlementId: number;
  buyer: string;
  seller: string;
  settledSize: bigint;
  settledPrice: bigint;
  feeAmount: bigint;
  slot: number;
}

interface OrderStore {
  orders: OrderEntry[];
  settlements: SettlementEntry[];
  isPlacing: boolean;
  isLoading: boolean;

  // Actions
  addOrder: (order: OrderEntry) => void;
  addSettlement: (settlement: SettlementEntry) => void;
  setPlacing: (v: boolean) => void;
  reset: () => void;
}

// ── Core Program Constants ────────────────────────────────────────────────

export const CORE_PROGRAM_ID = new PublicKey(
  "8Voz2Petb9Q4xYMCqjNVXSyTzkmzMsK3cTrSVGGLF8Ug"
);

// Anchor discriminators for ciphervault-core
export const CORE_DISC = {
  // sha256("global:place_order")[0:8]
  placeOrder: Buffer.from([51, 194, 155, 175, 124, 234, 252, 175]),
  // sha256("global:settle_trade")[0:8]
  settleTrade: Buffer.from([174, 80, 13, 113, 231, 97, 11, 173]),
  // sha256("global:deposit_collateral")[0:8]
  depositCollateral: Buffer.from([131, 178, 143, 117, 64, 235, 115, 213]),
  // sha256("global:withdraw_collateral")[0:8]
  withdrawCollateral: Buffer.from([115, 135, 168, 106, 235, 245, 157, 39]),
};

// ── Store ──────────────────────────────────────────────────────────────────

export const useOrderStore = create<OrderStore>((set, get) => ({
  orders: [],
  settlements: [],
  isPlacing: false,
  isLoading: false,

  addOrder: (order) => {
    set((s) => ({ orders: [order, ...s.orders] }));
  },

  addSettlement: (settlement) => {
    set((s) => ({ settlements: [settlement, ...s.settlements] }));
  },

  setPlacing: (v) => set({ isPlacing: v }),

  reset: () => set({ orders: [], settlements: [], isPlacing: false }),
}));

// ── Instruction Builders ──────────────────────────────────────────────────

function deriveProtocolPda(): PublicKey {
  const [pda] = PublicKey.findProgramAddressSync(
    [Buffer.from("protocol")],
    CORE_PROGRAM_ID
  );
  return pda;
}

function deriveOrderPda(trader: PublicKey, orderIndex: bigint): PublicKey {
  const buf = Buffer.alloc(8);
  buf.writeBigUInt64LE(orderIndex, 0);
  const [pda] = PublicKey.findProgramAddressSync(
    [Buffer.from("order"), trader.toBuffer(), buf],
    CORE_PROGRAM_ID
  );
  return pda;
}

/**
 * Builds a place_order instruction for the ciphervault-core program.
 * Encodes: [disc(8) | size_len(4) | size_data(N) | price_len(4) | price_data(M) | direction(1)]
 */
export function buildPlaceOrderIx(
  trader: PublicKey,
  protocolPda: PublicKey,
  orderPda: PublicKey,
  encryptedSize: Buffer,
  encryptedPrice: Buffer,
  direction: number // 0 = Long, 1 = Short
): TransactionInstruction {
  // Borsh encoding: Vec<u8> is encoded as [u32 length | bytes], then direction as u8
  const sizeLen = Buffer.alloc(4);
  sizeLen.writeUInt32LE(encryptedSize.length, 0);
  const priceLen = Buffer.alloc(4);
  priceLen.writeUInt32LE(encryptedPrice.length, 0);

  const data = Buffer.concat([
    CORE_DISC.placeOrder,
    sizeLen,
    encryptedSize,
    priceLen,
    encryptedPrice,
    Buffer.from([direction]),
  ]);

  return new TransactionInstruction({
    programId: CORE_PROGRAM_ID,
    keys: [
      { pubkey: protocolPda, isSigner: false, isWritable: true },
      { pubkey: orderPda, isSigner: false, isWritable: true },
      { pubkey: trader, isSigner: true, isWritable: true },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    ],
    data,
  });
}

/**
 * Builds a deposit_collateral instruction for the ciphervault-core program.
 */
export function buildCoreDepositCollateralIx(
  trader: PublicKey,
  protocolPda: PublicKey,
  collateralVaultPda: PublicKey,
  chainAsset: number,
  amount: bigint,
  dwalletId: Buffer
): TransactionInstruction {
  const amountBuf = Buffer.alloc(8);
  amountBuf.writeBigUInt64LE(amount, 0);

  const data = Buffer.concat([
    CORE_DISC.depositCollateral,
    Buffer.from([chainAsset]),
    amountBuf,
    dwalletId,
  ]);

  return new TransactionInstruction({
    programId: CORE_PROGRAM_ID,
    keys: [
      { pubkey: protocolPda, isSigner: false, isWritable: true },
      { pubkey: collateralVaultPda, isSigner: false, isWritable: true },
      { pubkey: trader, isSigner: true, isWritable: true },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    ],
    data,
  });
}

/**
 * Builds a withdraw_collateral instruction for the ciphervault-core program.
 */
export function buildCoreWithdrawCollateralIx(
  trader: PublicKey,
  protocolPda: PublicKey,
  collateralVaultPda: PublicKey,
  amount: bigint
): TransactionInstruction {
  const amountBuf = Buffer.alloc(8);
  amountBuf.writeBigUInt64LE(amount, 0);

  const data = Buffer.concat([
    CORE_DISC.withdrawCollateral,
    amountBuf,
  ]);

  return new TransactionInstruction({
    programId: CORE_PROGRAM_ID,
    keys: [
      { pubkey: protocolPda, isSigner: false, isWritable: true },
      { pubkey: collateralVaultPda, isSigner: false, isWritable: true },
      { pubkey: trader, isSigner: true, isWritable: true },
    ],
    data,
  });
}

// Export PDA derivers for consumers
export { deriveProtocolPda, deriveOrderPda };
