"use client";

import React, { useEffect, useRef } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import type { WalletName } from "@solana/wallet-adapter-base";
import { cn } from "../../lib/cn";

interface WalletModalProps {
  isOpen:   boolean;
  onClose:  () => void;
}

const KNOWN_WALLETS = [
  {
    name:  "Phantom",
    icon:  "https://phantom.app/img/phantom-logo.svg",
    color: "#ab9ff2",
    desc:  "Most popular Solana wallet",
  },
  {
    name:  "Solflare",
    icon:  "https://solflare.com/assets/logo.svg",
    color: "#fc8800",
    desc:  "Hardware wallet support",
  },
  {
    name:  "Backpack",
    icon:  "https://backpack.app/images/icon.png",
    color: "#e33e3f",
    desc:  "Multi-chain xNFT wallet",
  },
];

export function WalletModal({ isOpen, onClose }: WalletModalProps) {
  const { select, wallets, wallet: connected } = useWallet();
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

  // Merge adapter wallets with our known list for display
  const adapterWalletNames = wallets.map((w) => w.adapter.name);

  function handleSelect(name: string) {
    const found = wallets.find((w) => w.adapter.name === name);
    if (found) {
      select(found.adapter.name);
      onClose();
    } else {
      // Wallet not installed — open install page
      const urls: Record<string, string> = {
        Phantom:  "https://phantom.app",
        Solflare: "https://solflare.com",
        Backpack: "https://backpack.app",
      };
      if (urls[name]) window.open(urls[name], "_blank");
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
        <ul className="divide-y divide-vault-border-subtle px-2 py-2">
          {KNOWN_WALLETS.map((w) => {
            const isInstalled = adapterWalletNames.includes(w.name as WalletName<string>);
            const isActive    = connected?.adapter.name === (w.name as WalletName<string>);

            return (
              <li key={w.name}>
                <button
                  onClick={() => handleSelect(w.name)}
                  className={cn(
                    "group flex w-full items-center gap-3 rounded-xl px-4 py-3",
                    "transition-all duration-150",
                    isActive
                      ? "bg-vault-elevated"
                      : "hover:bg-vault-elevated",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-vault-accent/40"
                  )}
                >
                  {/* Icon */}
                  <div
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"
                    style={{ backgroundColor: `${w.color}18`, border: `1px solid ${w.color}30` }}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={w.icon}
                      alt={w.name}
                      className="h-6 w-6 object-contain"
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = "none";
                      }}
                    />
                  </div>

                  {/* Text */}
                  <div className="flex-1 text-left">
                    <div className="text-body-sm font-medium text-vault-text">
                      {w.name}
                    </div>
                    <div className="text-body-xs text-vault-subtext">{w.desc}</div>
                  </div>

                  {/* Status */}
                  <div className="shrink-0">
                    {isActive ? (
                      <span className="text-label-sm text-vault-success">Connected</span>
                    ) : isInstalled ? (
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
