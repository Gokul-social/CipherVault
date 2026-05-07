"use client";

import { create } from "zustand";
import {
  PublicKey,
  Connection,
  Transaction,
  TransactionInstruction,
  SystemProgram,
} from "@solana/web3.js";
import { CORE_PROGRAM_ID, ENCRYPT_ENABLED } from "../lib/config";

export { CORE_PROGRAM_ID };

// ── Types ──────────────────────────────────────────────────────────────────

export type OrderDirection = "long" | "short";

export interface OrderEntry {
  orderId: number;
  direction: OrderDirection;
  /**
   * When ENCRYPT_ENABLED=true: FHE ciphertext hex from Encrypt SDK.
   * When ENCRYPT_ENABLED=false: hex of plaintext u64 (plaintext on-chain order).
   */
  encryptedSize: string;
  encryptedPrice: string;
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
  nextOrderIndex: number;

  // Actions
  addOrder: (order: OrderEntry) => void;
  addSettlement: (settlement: SettlementEntry) => void;
  setPlacing: (v: boolean) => void;
  incrementOrderIndex: () => void;
  reset: () => void;
}

// ── Anchor discriminators for ciphervault-core ─────────────────────────────
// Verified: sha256("global:<name>")[0:8]
export const CORE_DISC = {
  placeOrder:          Buffer.from([51, 194, 155, 175, 124, 234, 252, 175]),
  settleTrade:         Buffer.from([174, 80, 13, 113, 231, 97, 11, 173]),
  depositCollateral:   Buffer.from([131, 178, 143, 117, 64, 235, 115, 213]),
  withdrawCollateral:  Buffer.from([115, 135, 168, 106, 235, 245, 157, 39]),
} as const;

// ── Store ──────────────────────────────────────────────────────────────────

export const useOrderStore = create<OrderStore>((set) => ({
  orders: [],
  settlements: [],
  isPlacing: false,
  nextOrderIndex: 0,

  addOrder: (order) =>
    set((s) => ({ orders: [order, ...s.orders] })),

  addSettlement: (settlement) =>
    set((s) => ({ settlements: [settlement, ...s.settlements] })),

  setPlacing: (v) => set({ isPlacing: v }),

  incrementOrderIndex: () =>
    set((s) => ({ nextOrderIndex: s.nextOrderIndex + 1 })),

  reset: () =>
    set({ orders: [], settlements: [], isPlacing: false, nextOrderIndex: 0 }),
}));

// ── PDA Derivation ────────────────────────────────────────────────────────

export function deriveProtocolPda(): PublicKey {
  const [pda] = PublicKey.findProgramAddressSync(
    [Buffer.from("protocol")],
    CORE_PROGRAM_ID
  );
  return pda;
}

export function deriveOrderPda(trader: PublicKey, orderIndex: bigint): PublicKey {
  const buf = Buffer.alloc(8);
  buf.writeBigUInt64LE(orderIndex, 0);
  const [pda] = PublicKey.findProgramAddressSync(
    [Buffer.from("order"), trader.toBuffer(), buf],
    CORE_PROGRAM_ID
  );
  return pda;
}

// ── Instruction Builders ──────────────────────────────────────────────────

/**
 * Builds a place_order instruction for the ciphervault-core program.
 *
 * When ENCRYPT_ENABLED=false: encryptedSize/encryptedPrice contain plaintext
 * u64 values serialised as little-endian 8-byte buffers. This is still a real
 * on-chain transaction — orders are stored on-chain, just not privacy-preserving.
 *
 * When ENCRYPT_ENABLED=true: encryptedSize/encryptedPrice are real FHE
 * ciphertexts from the Encrypt SDK.
 */
export function buildPlaceOrderIx(
  trader: PublicKey,
  protocolPda: PublicKey,
  orderPda: PublicKey,
  encryptedSize: Buffer,
  encryptedPrice: Buffer,
  direction: 0 | 1   // 0 = Long, 1 = Short
): TransactionInstruction {
  // Borsh Vec<u8>: [u32 length LE | bytes]
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
      { pubkey: orderPda,    isSigner: false, isWritable: true },
      { pubkey: trader,      isSigner: true,  isWritable: true },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    ],
    data,
  });
}

/**
 * Encodes plaintext size and price as 8-byte LE buffers.
 * Used when ENCRYPT_ENABLED=false. These are the real values stored on-chain.
 */
export function encodePlaintextOrder(
  size: bigint,
  price: bigint
): { encryptedSize: Buffer; encryptedPrice: Buffer } {
  const encryptedSize = Buffer.alloc(8);
  encryptedSize.writeBigUInt64LE(size, 0);

  const encryptedPrice = Buffer.alloc(8);
  encryptedPrice.writeBigUInt64LE(price, 0);

  return { encryptedSize, encryptedPrice };
}
