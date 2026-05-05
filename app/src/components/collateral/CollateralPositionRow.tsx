"use client";

import React from "react";
import { cn } from "../../lib/cn";
import { formatUsd, shortenAddress } from "../../lib/format";
import { Badge } from "../ui/Badge";

interface CollateralPositionRowProps {
  index: number;
  dwalletId: string;
  chainLabel: string;
  assetLabel: string;
  rawAmount: bigint;
  usdValue: bigint;
  ltvContribution: number;
  onDeposit?: () => void;
  onWithdraw?: () => void;
}

const CHAIN_ICONS: Record<string, React.ReactNode> = {
  Bitcoin: <BtcIcon />,
  Ethereum: <EthIcon />,
  Solana: <SolIcon />,
  RWA: <RwaIcon />,
};

export function CollateralPositionRow({
  index,
  dwalletId,
  chainLabel,
  assetLabel,
  rawAmount,
  usdValue,
  ltvContribution,
  onDeposit,
  onWithdraw,
}: CollateralPositionRowProps) {
  return (
    <div
      className={cn(
        "group flex items-center gap-4 rounded-xl border border-vault-border bg-vault-surface p-4",
        "transition-all duration-200 hover:border-vault-muted hover:-translate-y-px hover:shadow-card-hover"
      )}
    >
      {/* Asset Icon */}
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-vault-elevated border border-vault-border">
        {CHAIN_ICONS[chainLabel] ?? <DefaultIcon />}
      </div>

      {/* Asset Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-body-sm font-medium text-vault-text">{assetLabel}</span>
          <Badge variant="neutral">{chainLabel}</Badge>
        </div>
        <div className="mt-0.5 flex items-center gap-2">
          <span className="font-mono text-label-sm text-vault-muted" title={dwalletId}>
            dWallet: {shortenAddress(dwalletId, 6)}
          </span>
        </div>
      </div>

      {/* Amount */}
      <div className="text-right shrink-0">
        <div className="font-mono text-body-sm font-medium text-vault-text">
          {Number(rawAmount).toLocaleString()}
        </div>
        <div className="text-body-xs text-vault-subtext">
          {formatUsd(usdValue * BigInt(1_000_000))}
        </div>
      </div>

      {/* LTV Contribution */}
      <div className="shrink-0 w-20 text-right">
        <div className="text-body-xs text-vault-muted mb-1">LTV Share</div>
        <div className="h-1.5 w-full rounded-full bg-vault-elevated overflow-hidden">
          <div
            className="h-full rounded-full bg-vault-accent transition-all duration-500"
            style={{ width: `${Math.min(ltvContribution, 100)}%` }}
          />
        </div>
        <div className="mt-0.5 text-label-sm font-mono text-vault-accent">
          {ltvContribution}%
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-1.5 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
        {onDeposit && (
          <button
            onClick={onDeposit}
            className="rounded-md bg-vault-success-dim px-2.5 py-1 text-label-sm font-medium text-vault-success hover:bg-vault-success/20 transition-colors"
          >
            Deposit
          </button>
        )}
        {onWithdraw && (
          <button
            onClick={onWithdraw}
            className="rounded-md bg-vault-danger-dim px-2.5 py-1 text-label-sm font-medium text-vault-danger hover:bg-vault-danger/20 transition-colors"
          >
            Withdraw
          </button>
        )}
      </div>
    </div>
  );
}

function BtcIcon() {
  return (
    <svg className="h-5 w-5 text-[#F7931A]" viewBox="0 0 16 16" fill="none">
      <circle cx="8" cy="8" r="7" stroke="currentColor" strokeWidth="1.2" />
      <path d="M6 4.5v7M10 4.5v7M5 6.5h5.5c.83 0 1.5.67 1.5 1.5s-.67 1.5-1.5 1.5H5" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round" />
    </svg>
  );
}

function EthIcon() {
  return (
    <svg className="h-5 w-5 text-[#627EEA]" viewBox="0 0 16 16" fill="none">
      <path d="M8 1l5 7-5 3-5-3 5-7z" stroke="currentColor" strokeWidth="1.1" strokeLinejoin="round" />
      <path d="M3 8l5 3 5-3-5 4-5-4z" stroke="currentColor" strokeWidth="1.1" strokeLinejoin="round" />
    </svg>
  );
}

function SolIcon() {
  return (
    <svg className="h-5 w-5 text-[#9945FF]" viewBox="0 0 16 16" fill="none">
      <path d="M2 11.5h10l2-2H4l-2 2zM2 4.5h10l2 2H4l-2-2zM4 8h10l2-2H6L4 8z" stroke="currentColor" strokeWidth="0.9" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function RwaIcon() {
  return (
    <svg className="h-5 w-5 text-vault-warning" viewBox="0 0 16 16" fill="none">
      <rect x="2" y="3" width="12" height="10" rx="1.5" stroke="currentColor" strokeWidth="1.1" />
      <path d="M2 6h12" stroke="currentColor" strokeWidth="1.1" />
      <path d="M5 9h3" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round" />
    </svg>
  );
}

function DefaultIcon() {
  return (
    <svg className="h-5 w-5 text-vault-muted" viewBox="0 0 16 16" fill="none">
      <circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="1.2" />
      <path d="M8 5v3l2 2" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round" />
    </svg>
  );
}
