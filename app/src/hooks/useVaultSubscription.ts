"use client";

import { useEffect, useRef } from "react";
import { useConnection } from "@solana/wallet-adapter-react";
import { PublicKey } from "@solana/web3.js";
import { useCollateralStore } from "./useCollateralStore";

/**
 * Subscribes to the vault PDA account via WebSocket and triggers a full
 * position re-fetch whenever the account data changes on-chain.
 *
 * This ensures the UI reflects confirmed on-chain state without requiring
 * manual refresh after every transaction.
 *
 * Cleans up the subscription automatically when the wallet disconnects
 * or the component unmounts.
 *
 * @param owner - Connected wallet public key (null = disconnected)
 */
export function useVaultSubscription(owner: PublicKey | null): void {
  const { connection } = useConnection();
  const fetchPositions = useCollateralStore((s) => s.fetchPositions);
  const subIdRef = useRef<number | null>(null);

  useEffect(() => {
    if (!owner) {
      // Wallet disconnected — clean up any existing subscription
      if (subIdRef.current !== null) {
        connection.removeAccountChangeListener(subIdRef.current);
        subIdRef.current = null;
      }
      return;
    }

    // Derive vault PDA
    const [vaultPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("vault"), owner.toBuffer()],
      new PublicKey(
        process.env.NEXT_PUBLIC_VAULT_PROGRAM_ID ??
          "4jJrbTHiAP5ocWhbUqJG6m1bQ6cRkNi7vJvHWpRABwBm"
      )
    );

    // Subscribe to on-chain account changes
    const subId = connection.onAccountChange(
      vaultPda,
      () => {
        // Re-fetch full position state on any change
        fetchPositions(connection, owner).catch((e) =>
          console.error("[useVaultSubscription] refetch error:", e)
        );
      },
      "confirmed"
    );

    subIdRef.current = subId;

    return () => {
      if (subIdRef.current !== null) {
        connection.removeAccountChangeListener(subIdRef.current);
        subIdRef.current = null;
      }
    };
  }, [owner, connection, fetchPositions]);
}
