"use client";

import React, { useState } from "react";
import { cn } from "../../lib/cn";
import { WalletBadge } from "../wallet/WalletBadge";
import { WalletModal } from "../wallet/WalletModal";
import { Button } from "../ui/Button";

interface TopBarProps {
  title:     string;
  subtitle?: string;
  onRefresh?: () => void;
  isRefreshing?: boolean;
}

export function TopBar({ title, subtitle, onRefresh, isRefreshing }: TopBarProps) {
  const [modalOpen, setModalOpen] = useState(false);

  return (
    <>
      <header
        className={cn(
          "fixed left-[var(--sidebar-width)] right-0 top-0 z-20",
          "flex h-[var(--topbar-height)] items-center justify-between",
          "border-b border-vault-border bg-vault-bg/90 px-6 backdrop-blur-md"
        )}
      >
        {/* Left: Page title */}
        <div>
          <h1 className="text-heading-md text-vault-text leading-none">{title}</h1>
          {subtitle && (
            <p className="mt-0.5 text-body-xs text-vault-subtext">{subtitle}</p>
          )}
        </div>

        {/* Right: actions + wallet */}
        <div className="flex items-center gap-3">
          {onRefresh && (
            <Button
              variant="ghost"
              size="sm"
              loading={isRefreshing}
              onClick={onRefresh}
              icon={<RefreshIcon />}
            >
              Refresh
            </Button>
          )}

          <div className="h-5 w-px bg-vault-border" />

          <WalletBadge
            onConnect={() => setModalOpen(true)}
            onDisconnect={() => setModalOpen(true)}
          />
        </div>
      </header>

      <WalletModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
      />
    </>
  );
}

function RefreshIcon() {
  return (
    <svg
      className="h-3.5 w-3.5"
      viewBox="0 0 16 16"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M2.5 8A5.5 5.5 0 0 0 8 13.5 5.5 5.5 0 0 0 13.5 8 5.5 5.5 0 0 0 8 2.5a5.5 5.5 0 0 0-3.89 1.61"
        stroke="currentColor"
        strokeWidth="1.3"
        strokeLinecap="round"
      />
      <path
        d="M4 2v3h3"
        stroke="currentColor"
        strokeWidth="1.3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
