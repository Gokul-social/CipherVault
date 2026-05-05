"use client";

import React from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { AppLayout } from "../../layouts/AppLayout";
import { SectionContainer } from "../../components/ui/SectionContainer";
import { EmptyState } from "../../components/ui/EmptyState";
import { Badge } from "../../components/ui/Badge";
import { useHistoryStore, HistoryFilter, HistoryEntry } from "../../hooks/useHistoryStore";
import { shortenAddress } from "../../lib/format";
import { cn } from "../../lib/cn";

const FILTERS: { key: HistoryFilter; label: string }[] = [
  { key: "all", label: "All" },
  { key: "deposit", label: "Deposits" },
  { key: "withdrawal", label: "Withdrawals" },
  { key: "order", label: "Orders" },
  { key: "settlement", label: "Settlements" },
];

const TYPE_ICONS: Record<string, React.ReactNode> = {
  deposit: <DepositIcon />,
  withdrawal: <WithdrawIcon />,
  order: <OrderIcon />,
  settlement: <SettlementIcon />,
};

const TYPE_COLORS: Record<string, string> = {
  deposit: "bg-vault-success-dim",
  withdrawal: "bg-vault-danger-dim",
  order: "bg-vault-accent-glow",
  settlement: "bg-vault-purple-dim",
};

const STATUS_BADGE: Record<string, { variant: "success" | "accent" | "danger"; label: string }> = {
  confirmed: { variant: "success", label: "Confirmed" },
  pending: { variant: "accent", label: "Pending" },
  failed: { variant: "danger", label: "Failed" },
};

export default function HistoryPage() {
  const { publicKey } = useWallet();
  const filter = useHistoryStore((s) => s.filter);
  const setFilter = useHistoryStore((s) => s.setFilter);
  const filteredEntries = useHistoryStore((s) => s.filteredEntries);

  const entries = filteredEntries();

  if (!publicKey) {
    return (
      <AppLayout pageTitle="History">
        <EmptyState
          icon={<ClockIcon />}
          title="Connect Your Wallet"
          description="Connect a Solana wallet to view your transaction history."
        />
      </AppLayout>
    );
  }

  return (
    <AppLayout
      pageTitle="History"
      pageSubtitle={`Transaction log · ${shortenAddress(publicKey.toBase58())}`}
    >
      <SectionContainer>
        {/* Filter Tabs */}
        <div className="flex gap-1 rounded-lg bg-vault-elevated p-1 mb-6">
          {FILTERS.map((f) => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={cn(
                "flex-1 rounded-md py-2 text-body-sm font-medium transition-all duration-150",
                filter === f.key
                  ? "bg-vault-surface text-vault-text shadow-sm"
                  : "text-vault-subtext hover:text-vault-text"
              )}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* Entries */}
        {entries.length === 0 ? (
          <EmptyState
            icon={<ClockIcon />}
            title="No Transaction History"
            description="Your deposits, withdrawals, orders, and settlements will appear here."
          />
        ) : (
          <div className="space-y-2">
            {entries.map((entry) => (
              <HistoryRow key={entry.id} entry={entry} />
            ))}
          </div>
        )}
      </SectionContainer>
    </AppLayout>
  );
}

function HistoryRow({ entry }: { entry: HistoryEntry }) {
  const badge = STATUS_BADGE[entry.status] ?? STATUS_BADGE.pending;

  return (
    <div
      className={cn(
        "flex items-center gap-4 rounded-xl border border-vault-border bg-vault-surface px-4 py-3",
        "transition-all duration-200 hover:border-vault-muted hover:-translate-y-px hover:shadow-card-hover"
      )}
    >
      {/* Type Icon */}
      <div className={cn(
        "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg",
        TYPE_COLORS[entry.type] ?? "bg-vault-elevated"
      )}>
        {TYPE_ICONS[entry.type] ?? <DefaultIcon />}
      </div>

      {/* Description */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-body-sm font-medium text-vault-text truncate">
            {entry.description}
          </span>
        </div>
        {entry.txSig && (
          <a
            href={`https://explorer.solana.com/tx/${entry.txSig}?cluster=devnet`}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-0.5 block font-mono text-label-sm text-vault-muted underline underline-offset-2 hover:text-vault-subtext truncate"
          >
            {entry.txSig.slice(0, 20)}...
          </a>
        )}
      </div>

      {/* Amount */}
      <div className="text-right shrink-0">
        <div className="font-mono text-body-sm text-vault-text">{entry.amount}</div>
        {entry.chain && (
          <div className="text-label-sm text-vault-muted">{entry.chain}</div>
        )}
      </div>

      {/* Timestamp */}
      <div className="text-right shrink-0 w-20">
        <div className="text-body-xs text-vault-subtext">
          {new Date(entry.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
        </div>
        <div className="text-label-sm text-vault-muted">
          {new Date(entry.timestamp).toLocaleDateString([], { month: "short", day: "numeric" })}
        </div>
      </div>

      {/* Status */}
      <div className="shrink-0">
        <Badge variant={badge.variant} dot>{badge.label}</Badge>
      </div>
    </div>
  );
}

// ── Icons ──────────────────────────────────────────────────────────────────

function ClockIcon() {
  return (
    <svg className="h-7 w-7 text-vault-accent" viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.5" />
      <path d="M12 7v5l3 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

function DepositIcon() {
  return (
    <svg className="h-4 w-4 text-vault-success" viewBox="0 0 16 16" fill="none">
      <path d="M8 2v9M5 8l3 3 3-3" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M3 14h10" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
    </svg>
  );
}

function WithdrawIcon() {
  return (
    <svg className="h-4 w-4 text-vault-danger" viewBox="0 0 16 16" fill="none">
      <path d="M8 11V2M5 5l3-3 3 3" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M3 14h10" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
    </svg>
  );
}

function OrderIcon() {
  return (
    <svg className="h-4 w-4 text-vault-accent" viewBox="0 0 16 16" fill="none">
      <path d="M3 3l5 10 2-5 5-2L3 3z" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round" />
    </svg>
  );
}

function SettlementIcon() {
  return (
    <svg className="h-4 w-4 text-vault-purple" viewBox="0 0 16 16" fill="none">
      <path d="M5 8l2 2 4-4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="8" cy="8" r="6.5" stroke="currentColor" strokeWidth="1.2" />
    </svg>
  );
}

function DefaultIcon() {
  return (
    <svg className="h-4 w-4 text-vault-muted" viewBox="0 0 16 16" fill="none">
      <circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="1.2" />
    </svg>
  );
}
