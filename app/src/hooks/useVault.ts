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
} from "../lib/vault";
import { useTransactionStore } from "./useTransactionStore";
import { useCollateralStore } from "./useCollateralStore";
import { useHistoryStore } from "./useHistoryStore";
import { useVaultSubscription } from "./useVaultSubscription";

export type VaultState = VaultInfo | null | "loading";

export interface UseVaultReturn {
  vaultInfo:       VaultState;
  isBusy:          boolean;
  vaultPda:        string | null;
  loadVault:       () => Promise<void>;
  handleInitVault: () => Promise<void>;
  /**
   * Registers a new dWallet with the vault.
   * @param dwalletId - 32-byte Uint8Array. Use crypto.getRandomValues for devnet.
   * @param chain     - Chain index: 0=BTC, 1=ETH, 2=SOL
   * @param asset     - Asset index: 0=BTC, 1=ETH, 2=SOL
   */
  handleRegisterDWallet: (dwalletId: Uint8Array, chain: number, asset: number) => Promise<void>;
}

export function useVault(): UseVaultReturn {
  const { publicKey, sendTransaction } = useWallet();
  const { connection } = useConnection();

  const runTransaction  = useTransactionStore((s) => s.runTransaction);
  const txEntries       = useTransactionStore((s) => s.entries);
  const fetchPositions  = useCollateralStore((s) => s.fetchPositions);
  const fetchHistory    = useHistoryStore((s) => s.fetchHistory);

  const [vaultInfo, setVaultInfo] = useState<VaultState>("loading");
  const [isBusy, setIsBusy]       = useState(false);

  // Mirror transaction state → isBusy
  useEffect(() => {
    const latest = txEntries[0];
    if (!latest) return;
    if (latest.state === "confirmed" || latest.state === "failed") {
      setIsBusy(false);
    } else if (latest.state === "signing" || latest.state === "pending") {
      setIsBusy(true);
    }
  }, [txEntries]);

  const vaultPda = useMemo(
    () => (publicKey ? deriveVaultPda(publicKey).toBase58() : null),
    [publicKey]
  );

  const loadVault = useCallback(async () => {
    if (!publicKey) return;
    setVaultInfo("loading");
    try {
      const [info] = await Promise.all([
        fetchVaultInfo(connection, publicKey),
        fetchPositions(connection, publicKey),
        fetchHistory(connection, publicKey),
      ]);
      setVaultInfo(info);
    } catch (e) {
      console.error("[useVault] loadVault error:", e);
      setVaultInfo(null);
    }
  }, [publicKey, connection, fetchPositions, fetchHistory]);

  // Initial load on wallet connect
  useEffect(() => {
    if (publicKey) {
      loadVault();
    } else {
      setVaultInfo("loading");
      useCollateralStore.getState().reset();
    }
  }, [publicKey, loadVault]);

  // Real-time WebSocket subscription — auto-updates on-chain changes
  useVaultSubscription(publicKey);

  // ── Actions ───────────────────────────────────────────────────────────────

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

  const handleRegisterDWallet = async (
    dwalletId: Uint8Array,
    chain: number,
    asset: number
  ) => {
    if (!publicKey) return;
    const pda = deriveVaultPda(publicKey);
    const chainLabel = ["Bitcoin", "Ethereum", "Solana"][chain] ?? `Chain(${chain})`;

    await runTransaction({
      label: `Registering ${chainLabel} dWallet…`,
      buildTx: () => {
        const tx = new Transaction();
        tx.feePayer = publicKey;
        tx.add(buildRegisterDwalletIx(publicKey, pda, dwalletId, chain, asset));
        return tx;
      },
      connection,
      sendTransaction,
      onSuccess: () => loadVault(),
    });
  };

  return {
    vaultInfo,
    isBusy,
    vaultPda,
    loadVault,
    handleInitVault,
    handleRegisterDWallet,
  };
}
