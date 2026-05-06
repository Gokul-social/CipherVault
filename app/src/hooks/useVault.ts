"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { useWallet, useConnection } from "@solana/wallet-adapter-react";
import { Transaction } from "@solana/web3.js";
import {
  VaultInfo,
  fetchVaultInfo,
  deriveVaultPda,
  buildInitializeVaultIx,
  buildRegisterDwalletIx,
  buildRecordDepositIx,
} from "../lib/vault";
import { useTransactionStore } from "./useTransactionStore";
import { useCollateralStore } from "./useCollateralStore";

export type VaultState = VaultInfo | null | "loading";

// Legacy message type — kept for Dashboard backward-compatibility
export interface TxMessage {
  type: "success" | "error" | "info";
  text: string;
  sig?: string;
}

export interface UseVaultReturn {
  vaultInfo:             VaultState;
  txMessage:             TxMessage | null;
  isBusy:                boolean;
  vaultPda:              string | null;
  loadVault:             () => Promise<void>;
  clearMessage:          () => void;
  handleInitVault:       () => Promise<void>;
  handleRegisterDWallet: () => Promise<void>;
  handleRecordDeposit:   () => Promise<void>;
}

export function useVault(): UseVaultReturn {
  const { publicKey, sendTransaction } = useWallet();
  const { connection } = useConnection();

  // ── Zustand stores ───────────────────────────────────────────────────────
  const runTransaction = useTransactionStore((s) => s.runTransaction);
  const txEntries      = useTransactionStore((s) => s.entries);
  const fetchPositions = useCollateralStore((s) => s.fetchPositions);

  // ── Local legacy state (keeps Dashboard API stable) ──────────────────────
  const [vaultInfo, setVaultInfo] = useState<VaultState>("loading");
  const [txMessage, setTxMessage] = useState<TxMessage | null>(null);
  const [isBusy, setIsBusy]       = useState(false);

  // Mirror latest Zustand tx entry → legacy txMessage banner
  useEffect(() => {
    const latest = txEntries[0];
    if (!latest) return;
    if (latest.state === "confirmed") {
      setTxMessage({ type: "success", text: "Transaction confirmed", sig: latest.sig });
      setIsBusy(false);
    } else if (latest.state === "failed") {
      setTxMessage({ type: "error", text: latest.error ?? "Transaction failed" });
      setIsBusy(false);
    } else if (latest.state === "signing" || latest.state === "pending") {
      setTxMessage({ type: "info", text: latest.label });
      setIsBusy(true);
    }
  }, [txEntries]);

  const vaultPda = useMemo(
    () => (publicKey ? deriveVaultPda(publicKey).toBase58() : null),
    [publicKey]
  );

  // ── loadVault — refreshes raw vault + collateral store ───────────────────
  const loadVault = useCallback(async () => {
    if (!publicKey) return;
    setVaultInfo("loading");
    try {
      const [info] = await Promise.all([
        fetchVaultInfo(connection, publicKey),
        fetchPositions(connection, publicKey),
      ]);
      setVaultInfo(info);
    } catch (e) {
      console.error("loadVault:", e);
      setVaultInfo(null);
    }
  }, [publicKey, connection, fetchPositions]);

  useEffect(() => {
    if (publicKey) loadVault();
    else setVaultInfo("loading");
  }, [publicKey, loadVault]);

  const clearMessage = () => setTxMessage(null);

  // ── Actions — delegate to global transaction engine ──────────────────────
  const handleInitVault = async () => {
    if (!publicKey) return;
    const pda = deriveVaultPda(publicKey);
    await runTransaction({
      label: "Initializing vault…",
      buildTx: () => {
        const tx = new Transaction();
        tx.feePayer = publicKey;
        tx.add(buildInitializeVaultIx(publicKey, pda));
        return tx;
      },
      connection,
      sendTransaction,
      onSuccess: () => loadVault(),
    });
  };

  const handleRegisterDWallet = async () => {
    if (!publicKey) return;
    const pda = deriveVaultPda(publicKey);
    await runTransaction({
      label: "Registering BTC dWallet…",
      buildTx: () => {
        const tx = new Transaction();
        tx.feePayer = publicKey;
        tx.add(buildRegisterDwalletIx(publicKey, pda, 0, 0));
        return tx;
      },
      connection,
      sendTransaction,
      onSuccess: () => loadVault(),
    });
  };

  const handleRecordDeposit = async () => {
    if (!publicKey) return;
    const pda = deriveVaultPda(publicKey);
    await runTransaction({
      label: "Recording deposit…",
      buildTx: () => {
        const tx = new Transaction();
        tx.feePayer = publicKey;
        tx.add(buildRecordDepositIx(publicKey, pda));
        return tx;
      },
      connection,
      sendTransaction,
      onSuccess: () => loadVault(),
    });
  };

  return {
    vaultInfo,
    txMessage,
    isBusy,
    vaultPda,
    loadVault,
    clearMessage,
    handleInitVault,
    handleRegisterDWallet,
    handleRecordDeposit,
  };
}
