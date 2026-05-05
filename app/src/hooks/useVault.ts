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
  sendAndConfirm,
} from "../lib/vault";

export type VaultState = VaultInfo | null | "loading";

export interface TxMessage {
  type: "success" | "error" | "info";
  text: string;
  sig?: string;
}

export interface UseVaultReturn {
  vaultInfo:          VaultState;
  txMessage:          TxMessage | null;
  isBusy:             boolean;
  vaultPda:           string | null;
  loadVault:          () => Promise<void>;
  clearMessage:       () => void;
  handleInitVault:    () => Promise<void>;
  handleRegisterDWallet: () => Promise<void>;
  handleRecordDeposit:   () => Promise<void>;
}

export function useVault(): UseVaultReturn {
  const { publicKey, sendTransaction } = useWallet();
  const { connection } = useConnection();

  const [vaultInfo, setVaultInfo] = useState<VaultState>("loading");
  const [txMessage, setTxMessage] = useState<TxMessage | null>(null);
  const [isBusy, setIsBusy] = useState(false);

  const vaultPda = useMemo(
    () => (publicKey ? deriveVaultPda(publicKey).toBase58() : null),
    [publicKey]
  );

  const loadVault = useCallback(async () => {
    if (!publicKey) return;
    setVaultInfo("loading");
    try {
      const info = await fetchVaultInfo(connection, publicKey);
      setVaultInfo(info);
    } catch (e) {
      console.error("fetchVaultInfo:", e);
      setVaultInfo(null);
    }
  }, [publicKey, connection]);

  useEffect(() => {
    if (publicKey) loadVault();
    else setVaultInfo("loading");
  }, [publicKey, loadVault]);

  const clearMessage = () => setTxMessage(null);

  // ── Shared tx runner ─────────────────────────────────────────────────────
  async function runTx(
    label: string,
    build: () => Transaction
  ) {
    if (!publicKey) return;
    setIsBusy(true);
    setTxMessage({ type: "info", text: label });
    try {
      const tx = build();
      tx.feePayer = publicKey;
      const sig = await sendAndConfirm(connection, tx, sendTransaction);
      setTxMessage({ type: "success", text: "Transaction confirmed", sig });
      await loadVault();
    } catch (e: any) {
      console.error(e);
      setTxMessage({ type: "error", text: e?.message ?? "Transaction failed" });
    } finally {
      setIsBusy(false);
    }
  }

  // ── Actions ──────────────────────────────────────────────────────────────
  const handleInitVault = () =>
    runTx("Initializing vault…", () => {
      const pda = deriveVaultPda(publicKey!);
      return new Transaction().add(buildInitializeVaultIx(publicKey!, pda));
    });

  const handleRegisterDWallet = () =>
    runTx("Registering BTC dWallet…", () => {
      const pda = deriveVaultPda(publicKey!);
      return new Transaction().add(buildRegisterDwalletIx(publicKey!, pda));
    });

  const handleRecordDeposit = () =>
    runTx("Recording deposit…", () => {
      const pda = deriveVaultPda(publicKey!);
      return new Transaction().add(buildRecordDepositIx(publicKey!, pda));
    });

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
