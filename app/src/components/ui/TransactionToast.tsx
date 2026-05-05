"use client";

import React, { useEffect } from "react";
import { useTransactionStore, TxEntry, TxState } from "../../hooks/useTransactionStore";
import { cn } from "../../lib/cn";

export function TransactionToast() {
  const entries = useTransactionStore((s) => s.entries);
  const dismissTx = useTransactionStore((s) => s.dismissTx);

  if (entries.length === 0) return null;

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-2 max-w-sm w-full pointer-events-none">
      {entries.map((entry) => (
        <ToastItem key={entry.id} entry={entry} onDismiss={dismissTx} />
      ))}
    </div>
  );
}

function ToastItem({
  entry,
  onDismiss,
}: {
  entry: TxEntry;
  onDismiss: (id: string) => void;
}) {
  const stateConfig: Record<TxState, { icon: React.ReactNode; color: string; bgColor: string; borderColor: string }> = {
    idle: {
      icon: null,
      color: "text-vault-subtext",
      bgColor: "bg-vault-surface",
      borderColor: "border-vault-border",
    },
    signing: {
      icon: <SpinnerIcon />,
      color: "text-vault-accent",
      bgColor: "bg-vault-surface",
      borderColor: "border-vault-accent/30",
    },
    pending: {
      icon: <SpinnerIcon />,
      color: "text-vault-warning",
      bgColor: "bg-vault-surface",
      borderColor: "border-vault-warning/30",
    },
    confirmed: {
      icon: <CheckIcon />,
      color: "text-vault-success",
      bgColor: "bg-vault-surface",
      borderColor: "border-vault-success/30",
    },
    failed: {
      icon: <XIcon />,
      color: "text-vault-danger",
      bgColor: "bg-vault-surface",
      borderColor: "border-vault-danger/30",
    },
  };

  const config = stateConfig[entry.state];

  return (
    <div
      className={cn(
        "pointer-events-auto flex items-start gap-3 rounded-xl border px-4 py-3 shadow-modal",
        "animate-fade-in backdrop-blur-md",
        config.bgColor,
        config.borderColor
      )}
    >
      {/* State Icon */}
      <div className={cn("mt-0.5 shrink-0", config.color)}>
        {config.icon}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <p className={cn("text-body-sm font-medium", config.color)}>
          {entry.state === "signing" && "Signing..."}
          {entry.state === "pending" && "Confirming..."}
          {entry.state === "confirmed" && "Confirmed"}
          {entry.state === "failed" && "Failed"}
        </p>
        <p className="text-body-xs text-vault-subtext mt-0.5 truncate">
          {entry.label}
        </p>
        {entry.sig && (
          <a
            href={`https://explorer.solana.com/tx/${entry.sig}?cluster=devnet`}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-1 block font-mono text-label-sm text-vault-muted underline underline-offset-2 hover:text-vault-subtext truncate"
          >
            {entry.sig.slice(0, 20)}...
          </a>
        )}
        {entry.error && (
          <p className="mt-1 text-label-sm text-vault-danger truncate">
            {entry.error.slice(0, 80)}
          </p>
        )}
      </div>

      {/* Dismiss */}
      <button
        onClick={() => onDismiss(entry.id)}
        className="shrink-0 mt-0.5 text-vault-muted hover:text-vault-text transition-colors"
      >
        <svg className="h-3.5 w-3.5" viewBox="0 0 16 16" fill="none">
          <path d="M4 4L12 12M12 4L4 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      </button>
    </div>
  );
}

function SpinnerIcon() {
  return (
    <svg className="h-4 w-4 animate-spin" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 16 16" fill="none">
      <circle cx="8" cy="8" r="7" stroke="currentColor" strokeWidth="1.3" />
      <path d="M5 8l2 2 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function XIcon() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 16 16" fill="none">
      <circle cx="8" cy="8" r="7" stroke="currentColor" strokeWidth="1.3" />
      <path d="M5.5 5.5l5 5M10.5 5.5l-5 5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
    </svg>
  );
}
