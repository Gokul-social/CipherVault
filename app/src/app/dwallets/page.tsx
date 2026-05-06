"use client";

import React, { useEffect, useState, useCallback } from "react";
import { useWallet, useConnection } from "@solana/wallet-adapter-react";
import { Transaction } from "@solana/web3.js";
import { AppLayout } from "../../layouts/AppLayout";
import { SectionContainer } from "../../components/ui/SectionContainer";
import { EmptyState } from "../../components/ui/EmptyState";
import { Button } from "../../components/ui/Button";
import { DWalletCard } from "../../components/dwallets/DWalletCard";
import { StatCardSkeleton } from "../../components/ui/Skeleton";
import { useCollateralStore } from "../../hooks/useCollateralStore";
import { useTransactionStore } from "../../hooks/useTransactionStore";
import { useHistoryStore } from "../../hooks/useHistoryStore";
import { deriveVaultPda, buildRegisterDwalletIx } from "../../lib/vault";
import { shortenAddress } from "../../lib/format";
import { cn } from "../../lib/cn";

// Chain → on-chain chain/asset enum mapping
const CHAIN_ASSET_MAP: Record<number, { chain: number; asset: number }> = {
  0: { chain: 0, asset: 0 }, // Bitcoin → BTC
  1: { chain: 1, asset: 1 }, // Ethereum → ETH
  2: { chain: 2, asset: 2 }, // Solana → SOL
};

export default function DWalletsPage() {
  const { publicKey, sendTransaction } = useWallet();
  const { connection } = useConnection();
  const store = useCollateralStore();
  const runTransaction = useTransactionStore((s) => s.runTransaction);
  const addHistoryEntry = useHistoryStore((s) => s.addEntry);

  const [selectedChain, setSelectedChain] = useState(0); // 0=BTC, 1=ETH, 2=SOL

  const loadData = useCallback(async () => {
    if (!publicKey) return;
    await store.fetchPositions(connection, publicKey);
  }, [publicKey, connection]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleRegister = async () => {
    if (!publicKey) return;
    const vaultPda = deriveVaultPda(publicKey);
    const { chain, asset } = CHAIN_ASSET_MAP[selectedChain] ?? { chain: 0, asset: 0 };

    await runTransaction({
      label: `Register ${CHAINS[selectedChain].label} dWallet`,
      buildTx: () => {
        const ix = buildRegisterDwalletIx(publicKey, vaultPda, chain, asset);
        const tx = new Transaction().add(ix);
        tx.feePayer = publicKey;
        return tx;
      },
      connection,
      sendTransaction,
      onSuccess: () => {
        addHistoryEntry({
          id: `register-${Date.now()}`,
          type: "deposit",
          description: `Registered ${CHAINS[selectedChain].label} dWallet`,
          amount: "—",
          status: "confirmed",
          timestamp: Date.now(),
          chain: CHAINS[selectedChain].label,
        });
        loadData();
      },
    });
  };

  if (!publicKey) {
    return (
      <AppLayout pageTitle="dWallets">
        <EmptyState
          icon={<WalletIcon />}
          title="Connect Your Wallet"
          description="Connect a Solana wallet to manage your dWallets."
        />
      </AppLayout>
    );
  }

  const { positions, isLoading, vaultExists, numPositions } = store;

  return (
    <AppLayout
      pageTitle="dWallets"
      pageSubtitle={`Cross-chain custody · ${shortenAddress(publicKey.toBase58())}`}
      onRefresh={loadData}
      isRefreshing={isLoading}
    >
      {!vaultExists && !isLoading ? (
        <EmptyState
          icon={<VaultIcon />}
          title="No Vault Found"
          description="Initialize a vault from the Dashboard before registering dWallets."
          action={{ label: "Go to Dashboard", onClick: () => window.location.href = "/" }}
        />
      ) : (
        <div className="space-y-8">
          {/* Register New dWallet */}
          <SectionContainer title="Register dWallet" subtitle="Create an Ika MPC wallet for cross-chain custody">
            <div className="rounded-xl border border-vault-border bg-vault-surface p-5">
              <div className="flex items-end gap-4">
                {/* Chain Selector */}
                <div className="flex-1">
                  <label className="text-label-md uppercase tracking-widest text-vault-muted mb-2 block">
                    Select Chain
                  </label>
                  <div className="flex gap-2">
                    {CHAINS.map((chain) => (
                      <button
                        key={chain.id}
                        onClick={() => setSelectedChain(chain.id)}
                        className={cn(
                          "flex items-center gap-2 rounded-lg border px-4 py-2.5 text-body-sm font-medium",
                          "transition-all duration-150",
                          selectedChain === chain.id
                            ? "border-vault-accent bg-vault-accent-glow text-vault-accent"
                            : "border-vault-border bg-vault-elevated text-vault-subtext hover:border-vault-muted hover:text-vault-text"
                        )}
                      >
                        <span className={cn("h-2 w-2 rounded-full", chain.dotColor)} />
                        {chain.label}
                      </button>
                    ))}
                  </div>
                </div>

                <Button
                  variant="primary"
                  onClick={handleRegister}
                  disabled={numPositions >= 8}
                  icon={<PlusIcon />}
                >
                  Register dWallet
                </Button>
              </div>

              {numPositions >= 8 && (
                <p className="mt-3 text-body-xs text-vault-danger">
                  Maximum of 8 dWallets per vault reached.
                </p>
              )}
            </div>
          </SectionContainer>

          {/* Registered Wallets */}
          <SectionContainer
            title="Registered Wallets"
            subtitle={`${numPositions} of 8 slots used`}
          >
            {isLoading ? (
              <div className="grid grid-cols-3 gap-4">
                <StatCardSkeleton />
                <StatCardSkeleton />
                <StatCardSkeleton />
              </div>
            ) : positions.length === 0 ? (
              <EmptyState
                icon={<WalletIcon />}
                title="No dWallets Registered"
                description="Register your first dWallet to start depositing cross-chain collateral."
              />
            ) : (
              <div className="grid grid-cols-3 gap-4">
                {positions.map((pos) => (
                  <DWalletCard
                    key={pos.index}
                    dwalletId={pos.dwalletId}
                    chainLabel={pos.chainLabel}
                    assetLabel={pos.assetLabel}
                    rawAmount={pos.rawAmount}
                    usdValue={pos.usdValue}
                    status={pos.rawAmount > BigInt(0) ? "active" : "empty"}
                  />
                ))}
              </div>
            )}
          </SectionContainer>
        </div>
      )}
    </AppLayout>
  );
}

// ── Constants ─────────────────────────────────────────────────────────────

const CHAINS = [
  { id: 0, label: "Bitcoin", dotColor: "bg-[#F7931A]" },
  { id: 1, label: "Ethereum", dotColor: "bg-[#627EEA]" },
  { id: 2, label: "Solana", dotColor: "bg-[#9945FF]" },
];

// ── Icons ──────────────────────────────────────────────────────────────────

function WalletIcon() {
  return (
    <svg className="h-7 w-7 text-vault-accent" viewBox="0 0 24 24" fill="none">
      <rect x="2" y="6" width="20" height="14" rx="3" stroke="currentColor" strokeWidth="1.5" />
      <circle cx="17" cy="13" r="2" fill="currentColor" />
      <path d="M2 10h20" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
}

function VaultIcon() {
  return (
    <svg className="h-7 w-7 text-vault-accent" viewBox="0 0 24 24" fill="none">
      <rect x="2" y="3" width="20" height="18" rx="3" stroke="currentColor" strokeWidth="1.5" />
      <circle cx="12" cy="12" r="4" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
}

function PlusIcon() {
  return (
    <svg className="h-3.5 w-3.5" viewBox="0 0 16 16" fill="none">
      <path d="M8 3v10M3 8h10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}
