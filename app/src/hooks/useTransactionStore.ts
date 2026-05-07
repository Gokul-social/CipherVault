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

// ── Anchor error code decoder ──────────────────────────────────────────────

// Anchor custom errors start at 0x1770 (6000). Offsets map to CollateralVaultError enum.
const ANCHOR_ERROR_MESSAGES: Record<string, string> = {
  "0x1770": "Unauthorized: caller is not the vault owner",
  "0x1771": "Insufficient collateral: withdrawal would breach liquidation threshold",
  "0x1772": "Vault frozen: operations are temporarily halted",
  "0x1773": "dWallet already registered in this vault",
  "0x1774": "dWallet not found in this vault",
  "0x1775": "Exceeds maximum wallet limit of 8 per vault",
  "0x1776": "Invalid chain or asset identifier",
  "0x1777": "Invalid health factor after operation",
  "0x1778": "Unauthorized oracle: signer is not the registered oracle authority",
  "0x1779": "LTV basis points exceeds maximum of 8000 (80%)",
  "0x177a": "Liquidation threshold exceeds maximum of 9000 (90%)",
  "0x177b": "LTV must be strictly less than liquidation threshold",
  "0x177c": "Arithmetic overflow",
  "0x177d": "Insufficient balance for withdrawal",
  "0x177e": "Invalid oracle price",
  "0x177f": "Invalid amount: must be greater than zero",
};

function decodeAnchorErrorCode(hex: string): string | undefined {
  return ANCHOR_ERROR_MESSAGES[hex.toLowerCase()];
}

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

      const sig = await sendTransaction(tx, connection, { skipPreflight: true, preflightCommitment: "confirmed" });
      pendingTx(id, sig);

      await connection.confirmTransaction(
        { signature: sig, blockhash, lastValidBlockHeight },
        "confirmed"
      );
      confirmTx(id);

      onSuccess?.(sig);
      return sig;
    } catch (e: any) {
      // ── Error extraction strategy ───────────────────────────────────────
      // 1. Phantom's SendTransactionError exposes getLogs() with raw program logs
      // 2. Anchor errors appear in logs as "Program log: AnchorError ... Error Message: ..."
      // 3. Custom program errors appear as "custom program error: 0x..."
      // 4. Fall back to e.message or a generic message

      let msg = "Transaction failed";

      // Try to get simulation logs from Phantom's SendTransactionError
      const logs: string[] | undefined =
        typeof e?.getLogs === "function"
          ? (await e.getLogs().catch(() => undefined))
          : (e?.logs as string[] | undefined);

      if (logs && logs.length > 0) {
        const logsText = logs.join("\n");

        // Anchor error message format: "Error Message: <message>"
        const anchorMsgMatch = logsText.match(/Error Message: (.+)/);
        // Custom program error code
        const customErrMatch = logsText.match(/custom program error: (0x[0-9a-fA-F]+)/);
        // Fallback: last "Program log:" line
        const programLogMatches = logsText.match(/Program log: (.+)/g);
        const lastLog = programLogMatches?.[programLogMatches.length - 1]?.replace("Program log: ", "");

        if (anchorMsgMatch?.[1]) {
          msg = anchorMsgMatch[1].trim();
        } else if (customErrMatch?.[1]) {
          msg = decodeAnchorErrorCode(customErrMatch[1]) ?? customErrMatch[0];
        } else if (lastLog) {
          msg = lastLog;
        }
      } else {
        // No logs — parse e.message directly
        const raw: string = e?.message ?? "";
        const anchorMsgMatch = raw.match(/Error Message: (.+?)(?:\.|$)/);
        const customErrMatch = raw.match(/custom program error: (0x[0-9a-fA-F]+)/);
        if (anchorMsgMatch?.[1]) {
          msg = anchorMsgMatch[1].trim();
        } else if (customErrMatch?.[1]) {
          msg = decodeAnchorErrorCode(customErrMatch[1]) ?? customErrMatch[0];
        } else if (raw && raw !== "Unexpected error") {
          msg = raw;
        }
      }

      console.error("[runTransaction] failed:", e, "logs:", logs);
      failTx(id, msg);
      return null;
    }
  },
}));
