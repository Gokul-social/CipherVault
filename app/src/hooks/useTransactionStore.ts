"use client";

import { create } from "zustand";
import { Connection, Transaction } from "@solana/web3.js";

// ── Types ──────────────────────────────────────────────────────────────────

export type TxState = "idle" | "signing" | "pending" | "confirmed" | "failed";

export interface TxEntry {
  id: string;
  label: string;
  state: TxState;
  sig?: string;
  error?: string;
  timestamp: number;
}

interface TransactionStore {
  entries: TxEntry[];

  // Actions
  startTx: (id: string, label: string) => void;
  pendingTx: (id: string, sig: string) => void;
  confirmTx: (id: string) => void;
  failTx: (id: string, error: string) => void;
  dismissTx: (id: string) => void;
  clearAll: () => void;

  // High-level runner that manages the full lifecycle
  runTransaction: (opts: {
    label: string;
    buildTx: () => Transaction | Promise<Transaction>;
    connection: Connection;
    sendTransaction: (tx: Transaction, connection: Connection, options?: Record<string, unknown>) => Promise<string>;
    onSuccess?: (sig: string) => void;
  }) => Promise<string | null>;
}

// ── Helpers ────────────────────────────────────────────────────────────────

let idCounter = 0;
function nextId(): string {
  return `tx-${Date.now()}-${++idCounter}`;
}

const MAX_ENTRIES = 5;
const AUTO_DISMISS_MS = 8_000;

// ── Store ──────────────────────────────────────────────────────────────────

export const useTransactionStore = create<TransactionStore>((set, get) => ({
  entries: [],

  startTx: (id, label) => {
    set((s) => ({
      entries: [
        { id, label, state: "signing" as TxState, timestamp: Date.now() },
        ...s.entries,
      ].slice(0, MAX_ENTRIES),
    }));
  },

  pendingTx: (id, sig) => {
    set((s) => ({
      entries: s.entries.map((e) =>
        e.id === id ? { ...e, state: "pending" as TxState, sig } : e
      ),
    }));
  },

  confirmTx: (id) => {
    set((s) => ({
      entries: s.entries.map((e) =>
        e.id === id ? { ...e, state: "confirmed" as TxState } : e
      ),
    }));
    // Auto-dismiss after delay
    setTimeout(() => get().dismissTx(id), AUTO_DISMISS_MS);
  },

  failTx: (id, error) => {
    set((s) => ({
      entries: s.entries.map((e) =>
        e.id === id ? { ...e, state: "failed" as TxState, error } : e
      ),
    }));
    // Auto-dismiss after delay
    setTimeout(() => get().dismissTx(id), AUTO_DISMISS_MS);
  },

  dismissTx: (id) => {
    set((s) => ({
      entries: s.entries.filter((e) => e.id !== id),
    }));
  },

  clearAll: () => set({ entries: [] }),

  runTransaction: async ({ label, buildTx, connection, sendTransaction, onSuccess }) => {
    const id = nextId();
    const { startTx, pendingTx, confirmTx, failTx } = get();

    startTx(id, label);

    try {
      const tx = await buildTx();
      const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash("confirmed");
      tx.recentBlockhash = blockhash;

      const sig = await sendTransaction(tx, connection, { skipPreflight: false, preflightCommitment: "confirmed" });
      pendingTx(id, sig);

      await connection.confirmTransaction(
        { signature: sig, blockhash, lastValidBlockHeight },
        "confirmed"
      );
      confirmTx(id);

      onSuccess?.(sig);
      return sig;
    } catch (e: any) {
      // Extract meaningful error: Anchor errors nest inside logs
      const raw: string = e?.message ?? "";
      const anchorMatch = raw.match(/custom program error: (0x[0-9a-fA-F]+)/);
      const logMatch = raw.match(/Error Message: (.+?)(?:\.|$)/);
      const msg = logMatch?.[1] ?? anchorMatch?.[0] ?? raw ?? "Transaction failed";
      failTx(id, msg);
      return null;
    }
  },
}));
