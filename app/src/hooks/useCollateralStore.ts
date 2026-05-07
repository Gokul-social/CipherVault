"use client";

import { create } from "zustand";
import { PublicKey, Connection } from "@solana/web3.js";
import {
  VaultInfo,
  fetchVaultInfo,
  deriveVaultPda,
} from "../lib/vault";

// ── Types ──────────────────────────────────────────────────────────────────

export interface CollateralPosition {
  index: number;
  dwalletId: string;  // 32-byte hex
  chain: number;
  asset: number;
  rawAmount: bigint;
  usdValue: bigint;
  lastUpdatedSlot: bigint;
  chainLabel: string;
  assetLabel: string;
  ltvContribution: number; // 0–100
}

interface CollateralStore {
  // On-chain state
  positions: CollateralPosition[];
  totalCollateralUsd: bigint;
  usedCreditUsd: bigint;
  ltvBps: number;
  liquidationThresholdBps: number;
  numPositions: number;
  isFrozen: boolean;
  oracleAuthority: string | null; // base58 — gating oracle actions

  // Status
  isLoading: boolean;
  vaultExists: boolean;
  lastFetchedSlot: number | null;

  // Actions
  fetchPositions: (connection: Connection, owner: PublicKey) => Promise<void>;
  reset: () => void;

  // Derived
  healthScore: () => number;
  availableCredit: () => bigint;
  isWithdrawalSafe: (positionIndex: number, withdrawAmount: bigint, usdPrice: bigint) => boolean;
  isUserOracle: (walletAddress: string) => boolean;
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

// ── Binary layout offsets (mirrors lib/vault.ts OFFSETS) ──────────────────
// [8 disc][32 owner][32 oracleAuthority][2 ltvBps][2 liqThreshold]
// [8 totalCollateralUsd][8 usedCreditUsd][1 numPositions]
// [256 dwalletIds 8×32][464 positions 8×58][1 isFrozen][1 bump]
const POS_START = 8 + 32 + 32 + 2 + 2 + 8 + 8 + 1 + 256;
const POS_SIZE  = 58; // dwalletId(32) + chain(1) + asset(1) + rawAmount(8) + usdValue(8) + lastUpdatedSlot(8)
const FROZEN_OFFSET = POS_START + 464;

// ── Store ──────────────────────────────────────────────────────────────────

export const useCollateralStore = create<CollateralStore>((set, get) => ({
  positions: [],
  totalCollateralUsd: BigInt(0),
  usedCreditUsd: BigInt(0),
  ltvBps: 0,
  liquidationThresholdBps: 0,
  numPositions: 0,
  isFrozen: false,
  oracleAuthority: null,
  isLoading: true,
  vaultExists: false,
  lastFetchedSlot: null,

  fetchPositions: async (connection, owner) => {
    set({ isLoading: true });
    try {
      const pda = deriveVaultPda(owner);
      const result = await connection.getAccountInfoAndContext(pda, "confirmed");

      if (!result.value) {
        set({ isLoading: false, vaultExists: false, positions: [], oracleAuthority: null });
        return;
      }

      const d = result.value.data;
      const slot = result.context.slot;

      // Verify on-chain owner matches the requesting wallet
      const onChainOwner = new PublicKey(d.subarray(8, 40));
      if (!onChainOwner.equals(owner)) {
        console.error("[fetchPositions] Owner mismatch — aborting");
        set({ isLoading: false, vaultExists: false });
        return;
      }

      const oracleAuthority = new PublicKey(d.subarray(40, 72)).toBase58();
      const ltvBps = d.readUInt16LE(72);
      const liquidationThresholdBps = d.readUInt16LE(74);
      const totalCollateralUsd = d.readBigUInt64LE(76);
      const usedCreditUsd = d.readBigUInt64LE(84);
      const numPositions = d.readUInt8(92);

      // ── Parse active positions ───────────────────────────────────────────
      const positions: CollateralPosition[] = [];
      for (let i = 0; i < numPositions; i++) {
        const base = POS_START + i * POS_SIZE;
        const dwalletId = Buffer.from(d.subarray(base, base + 32)).toString("hex");
        const chain     = d.readUInt8(base + 32);
        const asset     = d.readUInt8(base + 33);
        const rawAmount = d.readBigUInt64LE(base + 34);
        const usdValue  = d.readBigUInt64LE(base + 42);
        const lastUpdatedSlot = d.readBigUInt64LE(base + 50);

        const ltvContribution =
          totalCollateralUsd > BigInt(0)
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

      // ── FIX: Read isFrozen from correct offset ───────────────────────────
      const isFrozen = d.length > FROZEN_OFFSET ? d.readUInt8(FROZEN_OFFSET) !== 0 : false;

      set({
        positions,
        totalCollateralUsd,
        usedCreditUsd,
        ltvBps,
        liquidationThresholdBps,
        numPositions,
        isFrozen,
        oracleAuthority,
        isLoading: false,
        vaultExists: true,
        lastFetchedSlot: slot,
      });
    } catch (e) {
      console.error("[fetchPositions] error:", e);
      set({ isLoading: false });
    }
  },

  reset: () =>
    set({
      positions: [],
      totalCollateralUsd: BigInt(0),
      usedCreditUsd: BigInt(0),
      ltvBps: 0,
      liquidationThresholdBps: 0,
      numPositions: 0,
      isFrozen: false,
      oracleAuthority: null,
      isLoading: false,
      vaultExists: false,
      lastFetchedSlot: null,
    }),

  healthScore: () => {
    const { totalCollateralUsd, usedCreditUsd, ltvBps } = get();
    if (usedCreditUsd === BigInt(0)) return 100;
    const currentLtv = (Number(usedCreditUsd) / Number(totalCollateralUsd)) * 100;
    const maxLtv = ltvBps / 100;
    return Math.round(Math.max(0, Math.min(100, 100 - (currentLtv / maxLtv) * 100)));
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

    const usdRemoved = (withdrawAmount * usdPrice) / BigInt(1_000_000);
    const projectedTotal = totalCollateralUsd - usdRemoved;

    if (usedCreditUsd === BigInt(0)) return true;

    // Health: projected_total * 10000 / used_credit >= liquidation_threshold_bps
    const projectedHealth = (projectedTotal * BigInt(10_000)) / usedCreditUsd;
    return projectedHealth >= BigInt(liquidationThresholdBps);
  },

  isUserOracle: (walletAddress) => {
    const { oracleAuthority } = get();
    return oracleAuthority !== null && oracleAuthority === walletAddress;
  },
}));
