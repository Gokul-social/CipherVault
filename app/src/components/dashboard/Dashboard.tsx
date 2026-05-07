"use client";

import React from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { useVault } from "../../hooks/useVault";
import { AppLayout } from "../../layouts/AppLayout";
import { StatCard } from "../ui/StatCard";
import { StatCardSkeleton } from "../ui/Skeleton";
import { VaultHealthIndicator } from "./VaultHealthIndicator";
import { SectionContainer } from "../ui/SectionContainer";
import { Button } from "../ui/Button";
import { Badge } from "../ui/Badge";
import { cn } from "../../lib/cn";
import {
  formatUsd,
  formatLtv,
  formatHealthFactor,
  healthScore,
  availableCredit,
  shortenAddress,
} from "../../lib/format";

export function Dashboard() {
  const { publicKey } = useWallet();
  const {
    vaultInfo,
    isBusy,
    vaultPda,
    loadVault,
    handleInitVault,
    handleRegisterDWallet,
  } = useVault();

  const isLoading = vaultInfo === "loading";
  const hasVault  = vaultInfo !== null && vaultInfo !== "loading";

  // Computed metrics
  const score = hasVault
    ? healthScore(vaultInfo!.totalCollateralUsd, vaultInfo!.usedCreditUsd, vaultInfo!.ltvBps)
    : 100;

  const healthFactor = hasVault
    ? formatHealthFactor(vaultInfo!.totalCollateralUsd, vaultInfo!.usedCreditUsd)
    : "—";

  const ltv = hasVault ? formatLtv(vaultInfo!.ltvBps) : "—";

  const availCredit = hasVault
    ? formatUsd(availableCredit(
        vaultInfo!.totalCollateralUsd,
        vaultInfo!.usedCreditUsd,
        vaultInfo!.ltvBps
      ))
    : "—";

  return (
    <AppLayout
      pageTitle="Vault Overview"
      pageSubtitle={publicKey ? `Owner · ${shortenAddress(publicKey.toBase58())}` : undefined}
      onRefresh={loadVault}
      isRefreshing={isBusy && isLoading}
    >
      {/* ── No Vault: Onboarding ─────────────────────────────────────────── */}
      {!isLoading && !hasVault && (
        <OnboardingCta onInit={handleInitVault} loading={isBusy} />
      )}

      {/* ── Vault Exists: Full Dashboard ────────────────────────────────── */}
      {(isLoading || hasVault) && (
        <div className="space-y-8">

          {/* Financial Metrics */}
          <SectionContainer
            title="Financial Metrics"
            subtitle="Live on-chain data from your vault PDA"
          >
            <div className="grid grid-cols-3 gap-4">
              {isLoading ? (
                <>
                  <StatCardSkeleton />
                  <StatCardSkeleton />
                  <StatCardSkeleton />
                </>
              ) : (
                <>
                  <StatCard
                    label="Total Collateral"
                    value={formatUsd(vaultInfo!.totalCollateralUsd)}
                    subValue="USD equivalent"
                    accentColor="success"
                    trend={vaultInfo!.totalCollateralUsd > BigInt(0) ? "up" : "neutral"}
                  />
                  <StatCard
                    label="Credit Used"
                    value={formatUsd(vaultInfo!.usedCreditUsd)}
                    subValue="Outstanding exposure"
                    accentColor={vaultInfo!.usedCreditUsd > BigInt(0) ? "warning" : "success"}
                  />
                  <StatCard
                    label="Available Credit"
                    value={availCredit}
                    subValue={`Max ${ltv} LTV`}
                    accentColor="accent"
                  />
                </>
              )}
            </div>
          </SectionContainer>

          {/* Risk Metrics + Health */}
          <SectionContainer
            title="Risk Metrics"
            subtitle="Collateralization and liquidation parameters"
          >
            <div className="grid grid-cols-3 gap-4">
              {isLoading ? (
                <>
                  <div className="col-span-1"><StatCardSkeleton /></div>
                  <div className="col-span-1"><StatCardSkeleton /></div>
                  <div className="col-span-1 row-span-2 h-full">
                    <div className="h-56 rounded-xl border border-vault-border bg-vault-surface skeleton" />
                  </div>
                </>
              ) : (
                <>
                  <StatCard
                    label="Active Positions"
                    value={String(vaultInfo!.numPositions)}
                    subValue="Registered dWallets"
                    accentColor="purple"
                    indicator={
                      vaultInfo!.numPositions > 0
                        ? <Badge variant="purple">Active</Badge>
                        : <Badge variant="neutral">Empty</Badge>
                    }
                  />
                  <StatCard
                    label="Vault Status"
                    value={vaultInfo!.isFrozen ? "Frozen" : "Active"}
                    subValue={vaultInfo!.isFrozen ? "Contact support" : "All systems operational"}
                    accentColor={vaultInfo!.isFrozen ? "danger" : "success"}
                    indicator={
                      vaultInfo!.isFrozen
                        ? <Badge variant="danger" dot>Frozen</Badge>
                        : <Badge variant="success" dot>Live</Badge>
                    }
                  />
                  {/* Health arc — spans 2 rows of the 3-col grid */}
                  <VaultHealthIndicator
                    score={score}
                    healthFactor={healthFactor}
                    ltv={ltv}
                    isFrozen={vaultInfo!.isFrozen}
                    className="row-span-2"
                  />
                  {/* PDA address */}
                  <div className="col-span-2">
                    <StatCard
                      label="Vault PDA"
                      value={vaultPda ? shortenAddress(vaultPda, 8) : "—"}
                      subValue={vaultPda ?? ""}
                      mono
                      accentColor="accent"
                    />
                  </div>
                </>
              )}
            </div>
          </SectionContainer>

          {/* Actions */}
          {hasVault && (
            <SectionContainer
              title="Protocol Actions"
              subtitle="Interact with your vault on-chain"
            >
              <div className="flex flex-wrap items-center gap-3">
                <Button
                  variant="secondary"
                  onClick={() => {
                    // Generate a fresh random dWallet ID (BTC, chain=0, asset=0)
                    const id = new Uint8Array(32);
                    crypto.getRandomValues(id);
                    handleRegisterDWallet(id, 0, 0);
                  }}
                  loading={isBusy}
                  icon={<DWalletIcon />}
                >
                  Register BTC dWallet
                </Button>
                <Button
                  variant="secondary"
                  onClick={() => (window.location.href = "/collateral")}
                  disabled={vaultInfo!.numPositions === 0}
                  icon={<DepositIcon />}
                  title={
                    vaultInfo!.numPositions === 0
                      ? "Register a dWallet first"
                      : undefined
                  }
                >
                  Manage Collateral
                </Button>

                {/* Hint for step flow */}
                {vaultInfo!.numPositions === 0 && (
                  <div className="flex items-center gap-2 rounded-lg border border-vault-accent/20 bg-vault-accent-glow px-3 py-1.5">
                    <InfoIcon />
                    <span className="text-body-xs text-vault-accent">
                      Step 1: Register a dWallet → Step 2: Manage Collateral
                    </span>
                  </div>
                )}
              </div>
            </SectionContainer>
          )}
        </div>
      )}
    </AppLayout>
  );
}

// ── Onboarding CTA ─────────────────────────────────────────────────────────────

function OnboardingCta({
  onInit,
  loading,
}: {
  onInit: () => Promise<void>;
  loading: boolean;
}) {
  const steps = [
    { n: "01", title: "Initialize Vault",    desc: "Create your on-chain vault PDA with LTV parameters." },
    { n: "02", title: "Register dWallet",    desc: "Link a Bitcoin dWallet via Ika MPC custody." },
    { n: "03", title: "Deposit Collateral",  desc: "Record collateral value. Credit line becomes available." },
  ];

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center text-center animate-fade-in">
      {/* Icon */}
      <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-2xl border border-vault-border bg-vault-surface ring-1 ring-inset ring-vault-border">
        <svg className="h-8 w-8 text-vault-accent" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M16 3L28 9.5V22.5L16 29L4 22.5V9.5L16 3Z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round"/>
          <path d="M16 12V20M12 15l4-3 4 3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </div>

      <h2 className="text-display-md text-vault-text">No Vault Found</h2>
      <p className="mt-3 max-w-md text-body-md text-vault-subtext">
        Initialize your institutional vault to unlock cross-chain collateral management
        and encrypted credit facilities.
      </p>

      {/* Steps */}
      <div className="mt-10 flex gap-6">
        {steps.map((step) => (
          <div
            key={step.n}
            className="w-52 rounded-xl border border-vault-border bg-vault-surface p-5 text-left"
          >
            <span className="font-mono text-label-sm text-vault-accent">{step.n}</span>
            <h3 className="mt-2 text-heading-sm text-vault-text">{step.title}</h3>
            <p className="mt-1 text-body-xs text-vault-subtext">{step.desc}</p>
          </div>
        ))}
      </div>

      <div className="mt-8">
        <Button
          size="lg"
          variant="primary"
          onClick={onInit}
          loading={loading}
          icon={<VaultIcon />}
        >
          Initialize Vault
        </Button>
      </div>
    </div>
  );
}

// ── Mini icons ─────────────────────────────────────────────────────────────────

function DWalletIcon() {
  return (
    <svg className="h-3.5 w-3.5" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="1" y="4" width="14" height="9" rx="1.5" stroke="currentColor" strokeWidth="1.3"/>
      <circle cx="11.5" cy="8.5" r="1.5" fill="currentColor"/>
      <path d="M1 7h14" stroke="currentColor" strokeWidth="1.3"/>
    </svg>
  );
}

function DepositIcon() {
  return (
    <svg className="h-3.5 w-3.5" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M8 1v10M5 8l3 3 3-3" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M2 14h12" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
    </svg>
  );
}

function VaultIcon() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="1.5" y="2" width="13" height="12" rx="2" stroke="currentColor" strokeWidth="1.3"/>
      <circle cx="8" cy="8" r="2.5" stroke="currentColor" strokeWidth="1.3"/>
      <path d="M8 5.5V6M8 10v.5M5.5 8H6M10 8h.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
    </svg>
  );
}

function InfoIcon() {
  return (
    <svg className="h-3.5 w-3.5 text-vault-accent" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="8" cy="8" r="6.5" stroke="currentColor" strokeWidth="1.3"/>
      <path d="M8 7v4M8 5.5v.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
    </svg>
  );
}
