"use client";

import React, { useEffect, useRef } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import type { WalletName } from "@solana/wallet-adapter-base";
import { cn } from "../../lib/cn";

// Fallback accent colours per wallet (only used for the icon ring)
const WALLET_COLORS: Record<string, string> = {
  Phantom:  "#ab9ff2",
  Solflare: "#fc8800",
  Backpack: "#e33e3f",
  Coinbase: "#0052ff",
  Trust:    "#3375bb",
  Ledger:   "#ffffff",
};

// Short descriptions per wallet
const WALLET_DESCS: Record<string, string> = {
  Phantom:  "Most popular Solana wallet",
  Solflare: "Hardware wallet support",
  Backpack: "Multi-chain xNFT wallet",
  Coinbase: "Coinbase institutional wallet",
  Trust:    "Trust Wallet — mobile first",
  Ledger:   "Hardware cold wallet",
};

// Install URLs for wallets not yet installed
const INSTALL_URLS: Record<string, string> = {
  Phantom:  "https://phantom.app",
  Solflare: "https://solflare.com",
  Backpack: "https://backpack.app",
  Coinbase: "https://www.coinbase.com/wallet",
  Trust:    "https://trustwallet.com",
  Ledger:   "https://www.ledger.com",
};

// Priority order for display
const PRIORITY = ["Phantom", "Solflare", "Backpack", "Coinbase", "Trust", "Ledger"];

interface WalletModalProps {
  isOpen:  boolean;
  onClose: () => void;
}

export function WalletModal({ isOpen, onClose }: WalletModalProps) {
  const { select, wallets, wallet: connected, disconnect, disconnecting } = useWallet();
  const overlayRef = useRef<HTMLDivElement>(null);

  // Lock body scroll when open
  useEffect(() => {
    if (isOpen) document.body.style.overflow = "hidden";
    else        document.body.style.overflow = "";
    return () => { document.body.style.overflow = ""; };
  }, [isOpen]);

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  if (!isOpen) return null;

  // Build display list: registered adapters sorted by priority, then any extras
  const adapterMap = new Map(wallets.map((w) => [w.adapter.name as string, w]));

  const prioritised = PRIORITY
    .filter((name) => adapterMap.has(name))
    .map((name) => adapterMap.get(name)!);

  const extras = wallets.filter(
    (w) => !PRIORITY.includes(w.adapter.name as string)
  );

  const displayList = [...prioritised, ...extras];

  function handleSelect(name: WalletName<string>) {
    const found = wallets.find((w) => w.adapter.name === name);
    if (found) {
      select(found.adapter.name);
      onClose();
    } else {
      const url = INSTALL_URLS[name as string];
      if (url) window.open(url, "_blank");
    }
  }

  async function handleDisconnect(event: React.MouseEvent<HTMLButtonElement>) {
    event.preventDefault();
    event.stopPropagation();
    try {
      await disconnect();
    } catch (error) {
      console.error("Failed to disconnect wallet:", error);
    }
  }

  return (
    <>
      {/* Overlay */}
      <div
        ref={overlayRef}
        className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm animate-fade-in"
        onClick={(e) => { if (e.target === overlayRef.current) onClose(); }}
      />

      {/* Modal panel */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Connect wallet"
        className={cn(
          "fixed left-1/2 top-1/2 z-50 w-full max-w-sm -translate-x-1/2 -translate-y-1/2",
          "rounded-2xl border border-vault-border bg-vault-surface shadow-modal",
          "animate-fade-in"
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-vault-border px-6 py-5">
          <div>
            <h2 className="text-heading-md text-vault-text">Connect Wallet</h2>
            <p className="mt-0.5 text-body-xs text-vault-subtext">
              Choose your Solana wallet to continue
            </p>
          </div>
          <button
            onClick={onClose}
            className={cn(
              "flex h-8 w-8 items-center justify-center rounded-lg",
              "text-vault-muted transition-colors hover:bg-vault-elevated hover:text-vault-text"
            )}
          >
            <CloseIcon />
          </button>
        </div>

        {/* Wallet list */}
        <ul className="divide-y divide-vault-border-subtle px-2 py-2 max-h-72 overflow-y-auto">
          {displayList.map((w) => {
            const name    = w.adapter.name as string;
            const icon    = w.adapter.icon;          // base64 data URI — always loads
            const color   = WALLET_COLORS[name] ?? "#6b7280";
            const desc    = WALLET_DESCS[name]  ?? w.adapter.url ?? "";
            const isActive = connected?.adapter.name === w.adapter.name;
            const isReady  = w.readyState === "Installed" || w.readyState === "Loadable";

            return (
              <li key={name}>
                <button
                  onClick={() => handleSelect(w.adapter.name)}
                  className={cn(
                    "group flex w-full items-center gap-3 rounded-xl px-4 py-3",
                    "transition-all duration-150",
                    isActive ? "bg-vault-elevated" : "hover:bg-vault-elevated",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-vault-accent/40"
                  )}
                >
                  {/* Icon — uses adapter's built-in base64 icon, never broken */}
                  <div
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl overflow-hidden"
                    style={{ backgroundColor: `${color}18`, border: `1px solid ${color}30` }}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={icon}
                      alt={name}
                      width={28}
                      height={28}
                      className="h-7 w-7 object-contain"
                    />
                  </div>

                  {/* Text */}
                  <div className="flex-1 text-left">
                    <div className="text-body-sm font-medium text-vault-text">{name}</div>
                    <div className="text-body-xs text-vault-subtext">{desc}</div>
                  </div>

                  {/* Status badge */}
                  <div className="shrink-0">
                    {isActive ? (
                      <button
                        type="button"
                        onClick={handleDisconnect}
                        disabled={disconnecting}
                        className={cn(
                          "rounded-md border border-vault-danger/35 bg-vault-danger-dim px-2.5 py-1",
                          "text-label-sm text-vault-danger transition-colors",
                          "hover:bg-vault-danger hover:text-white",
                          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-vault-danger/35",
                          "disabled:cursor-not-allowed disabled:opacity-70"
                        )}
                      >
                        {disconnecting ? "Disconnecting..." : "Disconnect"}
                      </button>
                    ) : isReady ? (
                      <span className="text-label-sm text-vault-subtext">Detected</span>
                    ) : (
                      <span className="text-label-sm text-vault-muted opacity-0 group-hover:opacity-100 transition-opacity">
                        Install →
                      </span>
                    )}
                  </div>
                </button>
              </li>
            );
          })}

          {/* Empty state if no adapters loaded yet */}
          {displayList.length === 0 && (
            <li className="px-4 py-8 text-center text-body-sm text-vault-muted">
              No wallets detected. Install Phantom or Solflare to continue.
            </li>
          )}
        </ul>

        {/* Footer */}
        <div className="border-t border-vault-border px-6 py-4">
          <p className="text-center text-body-xs text-vault-muted">
            By connecting, you agree to our{" "}
            <a href="#" className="text-vault-subtext underline underline-offset-2 hover:text-vault-text">
              Terms of Service
            </a>
          </p>
        </div>
      </div>
    </>
  );
}

function CloseIcon() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M4 4L12 12M12 4L4 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
    </svg>
  );
}
