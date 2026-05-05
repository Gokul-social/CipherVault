"use client";

import React from "react";
import { cn } from "../../lib/cn";
import { Badge } from "../ui/Badge";
import { shortenAddress } from "../../lib/format";

interface DWalletCardProps {
  dwalletId: string;
  chainLabel: string;
  assetLabel: string;
  rawAmount: bigint;
  usdValue: bigint;
  status: "active" | "empty" | "frozen";
}

const STATUS_BADGE: Record<string, { variant: "success" | "neutral" | "danger"; label: string }> = {
  active: { variant: "success", label: "Active" },
  empty: { variant: "neutral", label: "Empty" },
  frozen: { variant: "danger", label: "Frozen" },
};

export function DWalletCard({
  dwalletId,
  chainLabel,
  assetLabel,
  rawAmount,
  usdValue,
  status,
}: DWalletCardProps) {
  const badge = STATUS_BADGE[status] ?? STATUS_BADGE.empty;

  return (
    <div
      className={cn(
        "rounded-xl border border-vault-border bg-vault-surface p-5",
        "transition-all duration-200 hover:border-vault-muted hover:-translate-y-px hover:shadow-card-hover"
      )}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-vault-elevated border border-vault-border">
            <WalletCardIcon chain={chainLabel} />
          </div>
          <div>
            <h3 className="text-body-sm font-medium text-vault-text">{assetLabel} dWallet</h3>
            <p className="text-label-sm text-vault-muted">{chainLabel} Network</p>
          </div>
        </div>
        <Badge variant={badge.variant} dot>{badge.label}</Badge>
      </div>

      {/* Details */}
      <div className="space-y-3">
        <DetailRow label="dWallet ID" value={shortenAddress(dwalletId, 8)} mono />
        <DetailRow label="Chain" value={chainLabel} />
        <DetailRow label="Asset" value={assetLabel} />
        <DetailRow
          label="Deposited"
          value={rawAmount > BigInt(0)
            ? `${(Number(rawAmount) / 100_000_000).toFixed(8)}`
            : "—"
          }
          mono
        />
        <DetailRow
          label="USD Value"
          value={usdValue > BigInt(0)
            ? `$${Number(usdValue).toLocaleString()}`
            : "—"
          }
          mono
        />
      </div>
    </div>
  );
}

function DetailRow({
  label,
  value,
  mono,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-label-md uppercase tracking-widest text-vault-muted">{label}</span>
      <span className={cn("text-body-xs text-vault-text", mono && "font-mono")}>{value}</span>
    </div>
  );
}

function WalletCardIcon({ chain }: { chain: string }) {
  const color = {
    Bitcoin: "text-[#F7931A]",
    Ethereum: "text-[#627EEA]",
    Solana: "text-[#9945FF]",
  }[chain] ?? "text-vault-accent";

  return (
    <svg className={cn("h-5 w-5", color)} viewBox="0 0 16 16" fill="none">
      <rect x="1" y="4" width="14" height="9" rx="1.5" stroke="currentColor" strokeWidth="1.3" />
      <circle cx="11.5" cy="8.5" r="1.5" fill="currentColor" />
      <path d="M1 7h14" stroke="currentColor" strokeWidth="1.3" />
    </svg>
  );
}
