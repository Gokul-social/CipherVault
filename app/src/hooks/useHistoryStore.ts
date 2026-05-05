"use client";

import { create } from "zustand";
import { useCollateralStore, CollateralPosition } from "./useCollateralStore";
import { useOrderStore, OrderEntry, SettlementEntry } from "./useOrderStore";

// ── Types ──────────────────────────────────────────────────────────────────

export type HistoryEntryType = "deposit" | "withdrawal" | "order" | "settlement";

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

interface HistoryStore {
  localEntries: HistoryEntry[];
  filter: HistoryFilter;

  // Actions
  addEntry: (entry: HistoryEntry) => void;
  setFilter: (filter: HistoryFilter) => void;
  clearHistory: () => void;

  // Derived
  filteredEntries: () => HistoryEntry[];
}

// ── Store ──────────────────────────────────────────────────────────────────

export const useHistoryStore = create<HistoryStore>((set, get) => ({
  localEntries: [],
  filter: "all",

  addEntry: (entry) => {
    set((s) => ({
      localEntries: [entry, ...s.localEntries].slice(0, 100),
    }));
  },

  setFilter: (filter) => set({ filter }),

  clearHistory: () => set({ localEntries: [] }),

  filteredEntries: () => {
    const { localEntries, filter } = get();

    // Merge with order store entries
    const orders = useOrderStore.getState().orders;
    const settlements = useOrderStore.getState().settlements;

    const orderEntries: HistoryEntry[] = orders.map((o) => ({
      id: `order-${o.orderId}`,
      type: "order" as const,
      description: `${o.direction === "long" ? "Long" : "Short"} Order #${o.orderId}`,
      amount: "Encrypted",
      status: o.isFilled ? "confirmed" as const : o.isCancelled ? "failed" as const : "pending" as const,
      timestamp: o.timestamp,
      txSig: o.txSig,
    }));

    const settlementEntries: HistoryEntry[] = settlements.map((s) => ({
      id: `settlement-${s.settlementId}`,
      type: "settlement" as const,
      description: `Settlement #${s.settlementId}`,
      amount: `${Number(s.settledSize)} @ ${Number(s.settledPrice)}`,
      status: "confirmed" as const,
      timestamp: Date.now(),
    }));

    const all = [...localEntries, ...orderEntries, ...settlementEntries]
      .sort((a, b) => b.timestamp - a.timestamp);

    if (filter === "all") return all;
    return all.filter((e) => e.type === filter);
  },
}));
