"use client";

import React, { useEffect, useCallback } from "react";
import { useWallet, useConnection } from "@solana/wallet-adapter-react";
import { Transaction } from "@solana/web3.js";
import { AppLayout } from "../../layouts/AppLayout";
import { SectionContainer } from "../../components/ui/SectionContainer";
import { StatCard } from "../../components/ui/StatCard";
import { StatCardSkeleton } from "../../components/ui/Skeleton";
import { EmptyState } from "../../components/ui/EmptyState";
import { CollateralPositionRow } from "../../components/collateral/CollateralPositionRow";
import { DepositForm } from "../../components/collateral/DepositForm";
import { WithdrawForm } from "../../components/collateral/WithdrawForm";
import { useCollateralStore } from "../../hooks/useCollateralStore";
import { useTransactionStore } from "../../hooks/useTransactionStore";
import { useHistoryStore } from "../../hooks/useHistoryStore";
import {
  deriveVaultPda,
  buildRecordDepositIx,
  buildRecordWithdrawalIx,
  encodeU64LE,
  DISC,
  VAULT_PROGRAM_ID,
} from "../../lib/vault";
import {
  formatUsd,
  formatLtv,
  formatHealthFactor,
  healthScore,
  availableCredit,
  shortenAddress,
} from "../../lib/format";

export default function CollateralPage() {
  const { publicKey, sendTransaction } = useWallet();
  const { connection } = useConnection();

  const store = useCollateralStore();
  const runTransaction = useTransactionStore((s) => s.runTransaction);
  const addHistoryEntry = useHistoryStore((s) => s.addEntry);

  const loadData = useCallback(async () => {
    if (!publicKey) return;
    await store.fetchPositions(connection, publicKey);
  }, [publicKey, connection]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  if (!publicKey) {
    return (
      <AppLayout pageTitle="Collateral">
        <EmptyState
          icon={<LockIcon />}
          title="Connect Your Wallet"
          description="Connect a Solana wallet to manage your collateral positions."
        />
      </AppLayout>
    );
  }

  const { positions, totalCollateralUsd, usedCreditUsd, ltvBps, isLoading, vaultExists, numPositions } = store;

  const score = vaultExists ? healthScore(totalCollateralUsd, usedCreditUsd, ltvBps) : 100;
  const hf = vaultExists ? formatHealthFactor(totalCollateralUsd, usedCreditUsd) : "—";
  const avail = vaultExists ? formatUsd(availableCredit(totalCollateralUsd, usedCreditUsd, ltvBps)) : "—";

  const handleDeposit = async (rawAmount: bigint, usdPrice: bigint) => {
    if (!publicKey) return;
    const vaultPda = deriveVaultPda(publicKey);
    const dwalletId = Buffer.alloc(32);
    publicKey.toBuffer().copy(dwalletId);

    const sig = await runTransaction({
      label: `Deposit ${Number(rawAmount) / 100_000_000} BTC collateral`,
      buildTx: () => {
        const ix = buildRecordDepositIx(publicKey, vaultPda);
        // Override with custom amounts
        const data = Buffer.concat([
          DISC.recordDeposit,
          dwalletId,
          encodeU64LE(rawAmount),
          encodeU64LE(usdPrice),
        ]);
        ix.data = data;
        const tx = new Transaction().add(ix);
        tx.feePayer = publicKey;
        return tx;
      },
      connection,
      sendTransaction,
      onSuccess: () => {
        addHistoryEntry({
          id: `deposit-${Date.now()}`,
          type: "deposit",
          description: `Deposited ${Number(rawAmount) / 100_000_000} BTC`,
          amount: `$${(Number(rawAmount) * Number(usdPrice) / (100_000_000 * 1_000_000)).toFixed(2)}`,
          status: "confirmed",
          timestamp: Date.now(),
          asset: "BTC",
        });
        loadData();
      },
    });
  };

  const handleWithdraw = async (rawAmount: bigint, usdPrice: bigint) => {
    if (!publicKey) return;
    const vaultPda = deriveVaultPda(publicKey);

    const sig = await runTransaction({
      label: `Withdraw ${Number(rawAmount) / 100_000_000} BTC collateral`,
      buildTx: () => {
        const ix = buildRecordWithdrawalIx(publicKey, vaultPda, undefined, rawAmount, usdPrice);
        const tx = new Transaction().add(ix);
        tx.feePayer = publicKey;
        return tx;
      },
      connection,
      sendTransaction,
      onSuccess: () => {
        addHistoryEntry({
          id: `withdrawal-${Date.now()}`,
          type: "withdrawal",
          description: `Withdrew ${Number(rawAmount) / 100_000_000} BTC`,
          amount: `$${(Number(rawAmount) * Number(usdPrice) / (100_000_000 * 1_000_000)).toFixed(2)}`,
          status: "confirmed",
          timestamp: Date.now(),
          asset: "BTC",
        });
        loadData();
      },
    });
  };

  return (
    <AppLayout
      pageTitle="Collateral"
      pageSubtitle={publicKey ? `Manage positions · ${shortenAddress(publicKey.toBase58())}` : undefined}
      onRefresh={loadData}
      isRefreshing={isLoading}
    >
      {!vaultExists && !isLoading ? (
        <EmptyState
          icon={<VaultIcon />}
          title="No Vault Found"
          description="Initialize a vault from the Dashboard before managing collateral."
          action={{ label: "Go to Dashboard", onClick: () => window.location.href = "/" }}
        />
      ) : (
        <div className="space-y-8">
          {/* Overview Metrics */}
          <SectionContainer title="Collateral Overview" subtitle="Aggregate position metrics">
            <div className="grid grid-cols-4 gap-4">
              {isLoading ? (
                <>
                  <StatCardSkeleton />
                  <StatCardSkeleton />
                  <StatCardSkeleton />
                  <StatCardSkeleton />
                </>
              ) : (
                <>
                  <StatCard
                    label="Total Collateral"
                    value={formatUsd(totalCollateralUsd)}
                    subValue="Across all positions"
                    accentColor="success"
                    trend={totalCollateralUsd > BigInt(0) ? "up" : "neutral"}
                  />
                  <StatCard
                    label="Available Credit"
                    value={avail}
                    subValue={`Max ${formatLtv(ltvBps)} LTV`}
                    accentColor="accent"
                  />
                  <StatCard
                    label="Health Factor"
                    value={hf}
                    subValue={`Score: ${score}/100`}
                    accentColor={score >= 60 ? "success" : score >= 30 ? "warning" : "danger"}
                  />
                  <StatCard
                    label="Active Positions"
                    value={String(numPositions)}
                    subValue="dWallet-backed"
                    accentColor="purple"
                  />
                </>
              )}
            </div>
          </SectionContainer>

          {/* Positions List */}
          <SectionContainer
            title="Positions"
            subtitle={`${positions.length} active position${positions.length !== 1 ? "s" : ""}`}
          >
            {positions.length === 0 && !isLoading ? (
              <EmptyState
                icon={<StackIcon />}
                title="No Collateral Deposited"
                description="Register a dWallet and deposit collateral to unlock your credit line."
              />
            ) : (
              <div className="space-y-2">
                {positions.map((pos) => (
                  <CollateralPositionRow
                    key={pos.index}
                    index={pos.index}
                    dwalletId={pos.dwalletId}
                    chainLabel={pos.chainLabel}
                    assetLabel={pos.assetLabel}
                    rawAmount={pos.rawAmount}
                    usdValue={pos.usdValue}
                    ltvContribution={pos.ltvContribution}
                  />
                ))}
              </div>
            )}
          </SectionContainer>

          {/* Deposit & Withdraw */}
          <div className="grid grid-cols-2 gap-6">
            <DepositForm
              onDeposit={handleDeposit}
              isBusy={false}
              hasPositions={numPositions > 0}
            />
            <WithdrawForm
              onWithdraw={handleWithdraw}
              isBusy={false}
              currentRawAmount={positions[0]?.rawAmount ?? BigInt(0)}
              currentUsdValue={positions[0]?.usdValue ?? BigInt(0)}
              isWithdrawalSafe={(amount, price) => store.isWithdrawalSafe(0, amount, price)}
              assetLabel={positions[0]?.assetLabel ?? "BTC"}
            />
          </div>
        </div>
      )}
    </AppLayout>
  );
}

// ── Icons ──────────────────────────────────────────────────────────────────

function LockIcon() {
  return (
    <svg className="h-7 w-7 text-vault-accent" viewBox="0 0 24 24" fill="none">
      <rect x="3" y="11" width="18" height="11" rx="2" stroke="currentColor" strokeWidth="1.5" />
      <path d="M7 11V7a5 5 0 0110 0v4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

function VaultIcon() {
  return (
    <svg className="h-7 w-7 text-vault-accent" viewBox="0 0 24 24" fill="none">
      <rect x="2" y="3" width="20" height="18" rx="3" stroke="currentColor" strokeWidth="1.5" />
      <circle cx="12" cy="12" r="4" stroke="currentColor" strokeWidth="1.5" />
      <path d="M12 8v1M12 15v1M8 12h1M15 12h1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

function StackIcon() {
  return (
    <svg className="h-7 w-7 text-vault-accent" viewBox="0 0 24 24" fill="none">
      <path d="M12 2L2 7l10 5 10-5-10-5z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
      <path d="M2 17l10 5 10-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M2 12l10 5 10-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
