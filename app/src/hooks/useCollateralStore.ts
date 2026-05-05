"use client";

import { create } from "zustand";
import { PublicKey, Connection, Transaction } from "@solana/web3.js";
import {
  VaultInfo,
  fetchVaultInfo,
  deriveVaultPda,
  buildRecordDepositIx,
  buildRecordWithdrawalIx,
  DISC,
  encodeU64LE,
  VAULT_PROGRAM_ID,
} from "../lib/vault";
import { useTransactionStore } from "./useTransactionStore";

// ── Types ──────────────────────────────────────────────────────────────────

export interface CollateralPosition {
  index: number;
  dwalletId: string;  // hex
  chain: number;
  asset: number;
  rawAmount: bigint;
  usdValue: bigint;
  lastUpdatedSlot: bigint;
  chainLabel: string;
  assetLabel: string;
  ltvContribution: number; // percentage 0-100
}

interface CollateralStore {
  // State
  positions: CollateralPosition[];
  totalCollateralUsd: bigint;
  usedCreditUsd: bigint;
  ltvBps: number;
  liquidationThresholdBps: number;
  numPositions: number;
  isFrozen: boolean;
  isLoading: boolean;
  vaultExists: boolean;

  // Actions
  fetchPositions: (connection: Connection, owner: PublicKey) => Promise<void>;
  reset: () => void;

  // Derived
  healthScore: () => number;
  availableCredit: () => bigint;
  isWithdrawalSafe: (positionIndex: number, withdrawAmount: bigint, usdPrice: bigint) => boolean;
}

// ── Chain/Asset Labels ────────────────────────────────────────────────────

const CHAIN_LABELS: Record<number, string> = {
  0: "Bitcoin",
  1: "Ethereum",
  2: "Solana",
  3: "RWA",
};

const ASSET_LABELS: Record<number, string> = {
  0: "BTC",
  1: "ETH",
  2: "SOL",
  3: "USDC",
  4: "T-Bill",
  5: "Real Estate",
  6: "Gold",
};

// ── Store ──────────────────────────────────────────────────────────────────

export const useCollateralStore = create<CollateralStore>((set, get) => ({
  positions: [],
  totalCollateralUsd: BigInt(0),
  usedCreditUsd: BigInt(0),
  ltvBps: 0,
  liquidationThresholdBps: 0,
  numPositions: 0,
  isFrozen: false,
  isLoading: true,
  vaultExists: false,

  fetchPositions: async (connection, owner) => {
    set({ isLoading: true });
    try {
      const pda = deriveVaultPda(owner);
      const info = await connection.getAccountInfo(pda);

      if (!info) {
        set({ isLoading: false, vaultExists: false, positions: [] });
        return;
      }

      // Parse full vault account data including positions
      const d = info.data;
      let offset = 8; // discriminator
      offset += 32;   // owner
      offset += 32;   // oracleAuthority
      const ltvBps = d.readUInt16LE(offset); offset += 2;
      const liquidationThresholdBps = d.readUInt16LE(offset); offset += 2;
      const totalCollateralUsd = d.readBigUInt64LE(offset); offset += 8;
      const usedCreditUsd = d.readBigUInt64LE(offset); offset += 8;
      const numPositions = d.readUInt8(offset); offset += 1;

      // Parse dwalletIds (8 * 32 = 256 bytes)
      const dwalletIds: string[] = [];
      for (let i = 0; i < 8; i++) {
        const id = d.subarray(offset, offset + 32);
        dwalletIds.push(Buffer.from(id).toString("hex"));
        offset += 32;
      }

      // Parse positions (8 * 58 = 464 bytes)
      // CollateralPosition: dwalletId(32) + chain(1) + asset(1) + rawAmount(8) + usdValue(8) + lastUpdatedSlot(8) = 58
      const positions: CollateralPosition[] = [];
      for (let i = 0; i < numPositions; i++) {
        const posOffset = offset + i * 58;
        const dwalletId = Buffer.from(d.subarray(posOffset, posOffset + 32)).toString("hex");
        const chain = d.readUInt8(posOffset + 32);
        const asset = d.readUInt8(posOffset + 33);
        const rawAmount = d.readBigUInt64LE(posOffset + 34);
        const usdValue = d.readBigUInt64LE(posOffset + 42);
        const lastUpdatedSlot = d.readBigUInt64LE(posOffset + 50);

        const ltvContribution = totalCollateralUsd > BigInt(0)
          ? Number((usdValue * BigInt(100)) / totalCollateralUsd)
          : 0;

        positions.push({
          index: i,
          dwalletId,
          chain,
          asset,
          rawAmount,
          usdValue,
          lastUpdatedSlot,
          chainLabel: CHAIN_LABELS[chain] ?? `Chain(${chain})`,
          assetLabel: ASSET_LABELS[asset] ?? `Asset(${asset})`,
          ltvContribution,
        });
      }

      set({
        positions,
        totalCollateralUsd,
        usedCreditUsd,
        ltvBps,
        liquidationThresholdBps,
        numPositions,
        isFrozen: false, // parsed separately
        isLoading: false,
        vaultExists: true,
      });
    } catch (e) {
      console.error("fetchPositions error:", e);
      set({ isLoading: false });
    }
  },

  reset: () => set({
    positions: [],
    totalCollateralUsd: BigInt(0),
    usedCreditUsd: BigInt(0),
    ltvBps: 0,
    numPositions: 0,
    isLoading: true,
    vaultExists: false,
  }),

  healthScore: () => {
    const { totalCollateralUsd, usedCreditUsd, ltvBps } = get();
    if (usedCreditUsd === BigInt(0)) return 100;
    const currentLtv = (Number(usedCreditUsd) / Number(totalCollateralUsd)) * 100;
    const maxLtv = ltvBps / 100;
    const score = Math.max(0, Math.min(100, 100 - (currentLtv / maxLtv) * 100));
    return Math.round(score);
  },

  availableCredit: () => {
    const { totalCollateralUsd, usedCreditUsd, ltvBps } = get();
    const maxCredit = BigInt(Math.floor((Number(totalCollateralUsd) * ltvBps) / 10_000));
    const avail = maxCredit - usedCreditUsd;
    return avail > BigInt(0) ? avail : BigInt(0);
  },

  isWithdrawalSafe: (positionIndex, withdrawAmount, usdPrice) => {
    const { positions, totalCollateralUsd, usedCreditUsd, liquidationThresholdBps } = get();
    const pos = positions[positionIndex];
    if (!pos) return false;

    if (withdrawAmount > pos.rawAmount) return false;

    // Project USD removal
    const usdRemoved = (withdrawAmount * usdPrice) / BigInt(1_000_000);
    const projectedTotal = totalCollateralUsd - usdRemoved;

    if (usedCreditUsd === BigInt(0)) return true;

    // Check health: projected_total * 10000 / used_credit >= liquidation_threshold
    const projectedHealth = (projectedTotal * BigInt(10_000)) / usedCreditUsd;
    return projectedHealth >= BigInt(liquidationThresholdBps);
  },
}));
