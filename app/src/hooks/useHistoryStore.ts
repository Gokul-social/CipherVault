"use client";

import { create } from "zustand";
import { Connection, PublicKey } from "@solana/web3.js";
import { DISC, deriveVaultPda } from "../lib/vault";
import { CORE_PROGRAM_ID } from "../lib/config";

// ── Types ──────────────────────────────────────────────────────────────────

export type HistoryEntryType = "deposit" | "withdrawal" | "order" | "settlement" | "vault_init" | "register_dwallet";

export interface HistoryEntry {
  id: string;
  type: HistoryEntryType;
  description: string;
  amount: string;
  status: "confirmed" | "pending" | "failed";
  timestamp: number;
  txSig?: string;
  chain?: string;
  asset?: string;
}

export type HistoryFilter = "all" | HistoryEntryType;

// ── Discriminator → instruction type map ─────────────────────────────────

// First 8 bytes of each instruction data identify the instruction type.
const DISC_HEX_TO_TYPE: Record<string, HistoryEntryType> = {
  [Buffer.from(DISC.initializeVault).toString("hex")]:  "vault_init",
  [Buffer.from(DISC.registerDwallet).toString("hex")]:  "register_dwallet",
  [Buffer.from(DISC.recordDeposit).toString("hex")]:    "deposit",
  [Buffer.from(DISC.recordWithdrawal).toString("hex")]: "withdrawal",
};

function discHex(data: Buffer): string {
  return data.subarray(0, 8).toString("hex");
}

function entryDescription(type: HistoryEntryType, txSig: string): string {
  switch (type) {
    case "vault_init":       return "Vault Initialized";
    case "register_dwallet": return "dWallet Registered";
    case "deposit":          return "Collateral Deposit";
    case "withdrawal":       return "Collateral Withdrawal";
    case "order":            return "Encrypted Order";
    case "settlement":       return "Trade Settlement";
    default:                 return "Protocol Transaction";
  }
}

interface HistoryStore {
  entries: HistoryEntry[];
  localEntries: HistoryEntry[];
  filter: HistoryFilter;
  isLoading: boolean;

  // Actions
  fetchHistory: (connection: Connection, owner: PublicKey) => Promise<void>;
  addEntry: (entry: HistoryEntry) => void;
  setFilter: (filter: HistoryFilter) => void;
  clearHistory: () => void;

  // Derived
  filteredEntries: () => HistoryEntry[];
}

// ── Store ──────────────────────────────────────────────────────────────────

export const useHistoryStore = create<HistoryStore>((set, get) => ({
  entries: [],
  localEntries: [],
  filter: "all",
  isLoading: false,

  /**
   * Fetches real transaction history from the Solana RPC.
   *
   * Strategy:
   * 1. Fetch the last 50 signatures for the vault PDA
   * 2. Fetch each transaction's parsed instruction data
   * 3. Identify instruction type via discriminator prefix
   * 4. Build HistoryEntry for each known instruction
   */
  fetchHistory: async (connection, owner) => {
    set({ isLoading: true });
    try {
      const vaultPda = deriveVaultPda(owner);

      // Fetch up to 50 confirmed signatures for the vault PDA
      const sigs = await connection.getSignaturesForAddress(vaultPda, {
        limit: 50,
      }, "confirmed");

      if (sigs.length === 0) {
        set({ entries: [], isLoading: false });
        return;
      }

      // Fetch parsed transactions in batches of 10
      const txSigStrings = sigs.map((s) => s.signature);
      const BATCH_SIZE = 10;
      const parsedTxs: (Awaited<ReturnType<typeof connection.getParsedTransactions>>[number])[] = [];

      for (let i = 0; i < txSigStrings.length; i += BATCH_SIZE) {
        const batch = txSigStrings.slice(i, i + BATCH_SIZE);
        const results = await connection.getParsedTransactions(batch, {
          commitment: "confirmed",
          maxSupportedTransactionVersion: 0,
        });
        parsedTxs.push(...results);
      }

      const onChainEntries: HistoryEntry[] = [];

      for (let idx = 0; idx < parsedTxs.length; idx++) {
        const tx = parsedTxs[idx];
        const sig = txSigStrings[idx];
        const sigInfo = sigs[idx];

        if (!tx) continue;

        const blockTime = tx.blockTime;
        const failed = tx.meta?.err !== null;

        // Scan each instruction for a known vault discriminator
        const instructions = tx.transaction.message.instructions;
        for (const ix of instructions) {
          // Skip parsed system/spl instructions
          if (!("data" in ix)) continue;

          let rawData: Buffer;
          try {
            rawData = Buffer.from(ix.data, "base64");
          } catch {
            continue;
          }

          if (rawData.length < 8) continue;

          const disc = discHex(rawData);
          const type = DISC_HEX_TO_TYPE[disc];
          if (!type) continue;

          onChainEntries.push({
            id: `${sig}-${idx}`,
            type,
            description: entryDescription(type, sig),
            amount: "—",          // Amount parsing requires additional context (oracle price)
            status: failed ? "failed" : "confirmed",
            timestamp: blockTime ? blockTime * 1000 : sigInfo.blockTime ? sigInfo.blockTime * 1000 : Date.now(),
            txSig: sig,
          });
          break; // One entry per transaction
        }
      }

      set({ entries: onChainEntries, isLoading: false });
    } catch (e) {
      console.error("[fetchHistory] error:", e);
      set({ isLoading: false });
    }
  },

  // Optimistic local entries (added immediately on tx submission)
  addEntry: (entry) => {
    set((s) => ({
      localEntries: [entry, ...s.localEntries].slice(0, 20),
    }));
  },

  setFilter: (filter) => set({ filter }),

  clearHistory: () => set({ entries: [], localEntries: [] }),

  filteredEntries: () => {
    const { entries, localEntries, filter } = get();

    // Merge: local optimistic entries at top, deduped by txSig
    const onChainSigs = new Set(entries.map((e) => e.txSig).filter(Boolean));
    const dedupedLocal = localEntries.filter(
      (e) => !e.txSig || !onChainSigs.has(e.txSig)
    );

    const all = [...dedupedLocal, ...entries].sort(
      (a, b) => b.timestamp - a.timestamp
    );

    if (filter === "all") return all;
    return all.filter((e) => e.type === filter);
  },
}));
