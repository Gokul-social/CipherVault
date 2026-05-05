"use client";

import React from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { cn } from "../../lib/cn";
import { shortenAddress } from "../../lib/format";
import { Badge } from "../ui/Badge";

interface WalletBadgeProps {
  onConnect:    () => void;
  onDisconnect: () => void;
  className?:   string;
}

export function WalletBadge({ onConnect, onDisconnect, className }: WalletBadgeProps) {
  const { publicKey, wallet, disconnect } = useWallet();

  if (!publicKey) {
    return (
      <button
        id="wallet-connect-btn"
        onClick={onConnect}
        className={cn(
          "inline-flex items-center gap-2 rounded-lg border border-vault-accent/40",
          "bg-vault-accent-glow px-3 py-1.5 text-body-sm font-medium text-vault-accent",
          "transition-all duration-150 hover:border-vault-accent hover:bg-vault-accent/10",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-vault-accent/50",
          className
        )}
      >
        <WalletIcon />
        Connect Wallet
      </button>
    );
  }

  const address = publicKey.toBase58();

  return (
    <div className={cn("flex items-center gap-2", className)}>
      {/* Network badge */}
      <Badge variant="accent" dot>Devnet</Badge>

      {/* Address pill */}
      <button
        onClick={onDisconnect}
        title="Disconnect wallet"
        className={cn(
          "group flex items-center gap-2 rounded-lg border border-vault-border",
          "bg-vault-elevated px-3 py-1.5",
          "transition-all duration-150 hover:border-vault-muted hover:bg-vault-surface",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-vault-accent/40"
        )}
      >
        {/* Wallet avatar (deterministic from address) */}
        <WalletAvatar address={address} walletName={wallet?.adapter.name} />
        <span className="font-mono text-body-xs text-vault-text">
          {shortenAddress(address)}
        </span>
        {/* Disconnect on hover */}
        <span className="text-label-sm text-vault-muted opacity-0 transition-opacity group-hover:opacity-100">
          ✕
        </span>
      </button>
    </div>
  );
}

function WalletIcon() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="2" y="5" width="16" height="12" rx="2" stroke="currentColor" strokeWidth="1.5"/>
      <path d="M2 8h16" stroke="currentColor" strokeWidth="1.5"/>
      <circle cx="14.5" cy="12" r="1.5" fill="currentColor"/>
    </svg>
  );
}

function WalletAvatar({
  address,
  walletName,
}: {
  address: string;
  walletName?: string;
}) {
  // Deterministic color from address
  const hue = parseInt(address.slice(0, 6), 16) % 360;

  return (
    <span
      className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[9px] font-bold uppercase"
      style={{
        background: `hsl(${hue}, 55%, 35%)`,
        color:      `hsl(${hue}, 80%, 85%)`,
      }}
      title={walletName}
    >
      {address.slice(0, 2)}
    </span>
  );
}
