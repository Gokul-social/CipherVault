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
  const runTransaction  = useTransactionStore((s) => s.runTransaction);
  const addHistoryEntry = useHistoryStore((s) => s.addEntry);

  const loadData = useCallback(async () => {
    if (!publicKey) return;
    await store.fetchPositions(connection, publicKey);
  }, [publicKey, connection]);

  useEffect(() => { loadData(); }, [loadData]);

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

  const {
    positions,
    totalCollateralUsd,
    usedCreditUsd,
    ltvBps,
    isLoading,
    vaultExists,
    numPositions,
    oracleAuthority,
  } = store;

  const score = vaultExists ? healthScore(totalCollateralUsd, usedCreditUsd, ltvBps) : 100;
  const hf    = vaultExists ? formatHealthFactor(totalCollateralUsd, usedCreditUsd) : "—";
  const avail = vaultExists ? formatUsd(availableCredit(totalCollateralUsd, usedCreditUsd, ltvBps)) : "—";

  // Gate oracle actions: deposit/withdraw require oracle = connected wallet
  const isOracle = store.isUserOracle(publicKey.toBase58());

  // Use first active position for deposit/withdraw targets
  const primaryPosition = positions[0] ?? null;

  const handleDeposit = async (rawAmount: bigint, usdPrice6dec: bigint) => {
    if (!publicKey || !primaryPosition) return;

    // dwalletId from on-chain position data (32-byte hex → Uint8Array)
    const dwalletId = Uint8Array.from(Buffer.from(primaryPosition.dwalletId, "hex"));
    const vaultPda  = deriveVaultPda(publicKey);

    const sig = await runTransaction({
      label: `Deposit ${(Number(rawAmount) / 1e8).toFixed(4)} ${primaryPosition.assetLabel}`,
      buildTx: () => {
        const ix = buildRecordDepositIx(publicKey, vaultPda, dwalletId, rawAmount, usdPrice6dec);
        const tx = new Transaction().add(ix);
        tx.feePayer = publicKey;
        return tx;
      },
      connection,
      sendTransaction,
      onSuccess: (txSig) => {
        addHistoryEntry({
          id: `deposit-${Date.now()}`,
          type: "deposit",
          description: `Deposited ${(Number(rawAmount) / 1e8).toFixed(4)} ${primaryPosition.assetLabel}`,
          amount: formatUsd((rawAmount * usdPrice6dec) / BigInt(1_000_000)),
          status: "confirmed",
          timestamp: Date.now(),
          txSig,
          asset: primaryPosition.assetLabel,
          chain: primaryPosition.chainLabel,
        });
        loadData();
      },
    });
  };

  const handleWithdraw = async (rawAmount: bigint, usdPrice6dec: bigint) => {
    if (!publicKey || !primaryPosition) return;

    const dwalletId = Uint8Array.from(Buffer.from(primaryPosition.dwalletId, "hex"));
    const vaultPda  = deriveVaultPda(publicKey);

    const sig = await runTransaction({
      label: `Withdraw ${(Number(rawAmount) / 1e8).toFixed(4)} ${primaryPosition.assetLabel}`,
      buildTx: () => {
        const ix = buildRecordWithdrawalIx(publicKey, vaultPda, dwalletId, rawAmount, usdPrice6dec);
        const tx = new Transaction().add(ix);
        tx.feePayer = publicKey;
        return tx;
      },
      connection,
      sendTransaction,
      onSuccess: (txSig) => {
        addHistoryEntry({
          id: `withdrawal-${Date.now()}`,
          type: "withdrawal",
          description: `Withdrew ${(Number(rawAmount) / 1e8).toFixed(4)} ${primaryPosition.assetLabel}`,
          amount: formatUsd((rawAmount * usdPrice6dec) / BigInt(1_000_000)),
          status: "confirmed",
          timestamp: Date.now(),
          txSig,
          asset: primaryPosition.assetLabel,
          chain: primaryPosition.chainLabel,
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
          action={{ label: "Go to Dashboard", onClick: () => (window.location.href = "/") }}
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

          {/* Oracle Authority Notice */}
          {vaultExists && !isLoading && !isOracle && (
            <div className="rounded-xl border border-vault-accent/20 bg-vault-accent-glow px-4 py-3">
              <p className="text-body-xs text-vault-accent">
                ℹ️ Deposits and withdrawals require the oracle authority to sign.
                Connected wallet is not the oracle for this vault.
                Oracle: <span className="font-mono">{oracleAuthority ? shortenAddress(oracleAuthority) : "unknown"}</span>
              </p>
            </div>
          )}

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

          {/* Deposit & Withdraw — only shown if oracle matches */}
          {vaultExists && isOracle && (
            <div className="grid grid-cols-2 gap-6">
              <DepositForm
                onDeposit={handleDeposit}
                isBusy={false}
                hasPositions={numPositions > 0}
                asset={primaryPosition?.assetLabel === "BTC" ? "BTC" : primaryPosition?.assetLabel === "ETH" ? "ETH" : "SOL"}
              />
              <WithdrawForm
                onWithdraw={handleWithdraw}
                isBusy={false}
                currentRawAmount={primaryPosition?.rawAmount ?? BigInt(0)}
                currentUsdValue={primaryPosition?.usdValue ?? BigInt(0)}
                isWithdrawalSafe={(amount, price) => store.isWithdrawalSafe(0, amount, price)}
                assetLabel={primaryPosition?.assetLabel ?? "BTC"}
                asset={primaryPosition?.assetLabel === "BTC" ? "BTC" : primaryPosition?.assetLabel === "ETH" ? "ETH" : "SOL"}
              />
            </div>
          )}
        </div>
      )}
    </AppLayout>
  );
}

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
