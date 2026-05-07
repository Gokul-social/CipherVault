"use client";

import React, { useEffect } from "react";
import { AppLayout } from "../../layouts/AppLayout";
import { SectionContainer } from "../../components/ui/SectionContainer";
import { useThemeStore } from "../../hooks/useThemeStore";
import { cn } from "../../lib/cn";
import {
  SOLANA_RPC_URL,
  NETWORK_LABEL,
  VAULT_PROGRAM_ID,
  CORE_PROGRAM_ID,
  DEFAULT_LTV_BPS,
  DEFAULT_LIQ_THRESHOLD_BPS,
} from "../../lib/config";

// Full program IDs for display (resolved at import time)
const VAULT_PROGRAM_ID_STR = VAULT_PROGRAM_ID.toBase58();
const CORE_PROGRAM_ID_STR  = CORE_PROGRAM_ID.toBase58();

export default function SettingsPage() {
  const { theme, toggleTheme, initTheme } = useThemeStore();

  // Ensure theme is initialised from localStorage on first mount
  useEffect(() => {
    initTheme();
  }, []);

  return (
    <AppLayout pageTitle="Settings" pageSubtitle="Application preferences">
      <div className="max-w-2xl space-y-6">

        {/* Appearance */}
        <SectionContainer title="Appearance" subtitle="Customise how CipherVault looks">
          <div className="space-y-4">
            <div className="flex items-center justify-between rounded-xl border border-vault-border bg-vault-surface p-4">
              <div>
                <p className="text-body-sm font-medium text-vault-text">Theme</p>
                <p className="mt-0.5 text-body-xs text-vault-subtext">
                  {theme === "dark" ? "Dark mode is active" : "Light mode is active"}
                </p>
              </div>
              <button
                id="theme-toggle-btn"
                onClick={toggleTheme}
                className={cn(
                  "relative inline-flex h-7 w-14 items-center rounded-full border transition-all duration-300",
                  theme === "light"
                    ? "border-vault-accent bg-vault-accent"
                    : "border-vault-border bg-vault-elevated"
                )}
                aria-label="Toggle theme"
              >
                <span
                  className={cn(
                    "inline-block h-5 w-5 transform rounded-full bg-white shadow-sm transition-transform duration-300",
                    theme === "light" ? "translate-x-7" : "translate-x-1"
                  )}
                />
              </button>
            </div>

            {/* Theme Preview Cards */}
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => useThemeStore.getState().setTheme("dark")}
                className={cn(
                  "group relative overflow-hidden rounded-xl border p-4 text-left transition-all duration-150",
                  theme === "dark"
                    ? "border-vault-accent ring-2 ring-vault-accent/20"
                    : "border-vault-border hover:border-vault-muted"
                )}
              >
                {/* Mini dark preview */}
                <div className="mb-3 h-16 rounded-lg bg-[#0B0F14] border border-[#1E2A3A] p-2 space-y-1.5">
                  <div className="h-2 w-16 rounded bg-[#1E2A3A]" />
                  <div className="h-2 w-10 rounded bg-[#171E2B]" />
                  <div className="h-2 w-14 rounded bg-[#4F7CFF]/30" />
                </div>
                <p className="text-body-xs font-medium text-vault-text">Dark</p>
                <p className="text-label-sm text-vault-muted">Default</p>
                {theme === "dark" && (
                  <span className="absolute top-2 right-2 h-2 w-2 rounded-full bg-vault-accent" />
                )}
              </button>

              <button
                onClick={() => useThemeStore.getState().setTheme("light")}
                className={cn(
                  "group relative overflow-hidden rounded-xl border p-4 text-left transition-all duration-150",
                  theme === "light"
                    ? "border-vault-accent ring-2 ring-vault-accent/20"
                    : "border-vault-border hover:border-vault-muted"
                )}
              >
                {/* Mini light preview */}
                <div className="mb-3 h-16 rounded-lg bg-[#F0F4FA] border border-[#C8D4E8] p-2 space-y-1.5">
                  <div className="h-2 w-16 rounded bg-[#C8D4E8]" />
                  <div className="h-2 w-10 rounded bg-[#E8EDF7]" />
                  <div className="h-2 w-14 rounded bg-[#3A6BE8]/30" />
                </div>
                <p className="text-body-xs font-medium text-vault-text">Light</p>
                <p className="text-label-sm text-vault-muted">Beta</p>
                {theme === "light" && (
                  <span className="absolute top-2 right-2 h-2 w-2 rounded-full bg-vault-accent" />
                )}
              </button>
            </div>
          </div>
        </SectionContainer>

        {/* Network */}
        <SectionContainer title="Network" subtitle="Solana cluster configuration">
          <div className="rounded-xl border border-vault-border bg-vault-surface p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-body-sm text-vault-subtext">Cluster</span>
              <div className="flex items-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-vault-success" />
                <span className="font-mono text-body-sm text-vault-text">{NETWORK_LABEL}</span>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-body-sm text-vault-subtext">RPC Endpoint</span>
              <span className="font-mono text-body-xs text-vault-muted truncate max-w-[220px]" title={SOLANA_RPC_URL}>
                {new URL(SOLANA_RPC_URL).hostname}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-body-sm text-vault-subtext">Commitment</span>
              <span className="font-mono text-body-xs text-vault-text">confirmed</span>
            </div>
          </div>
          <p className="mt-2 text-body-xs text-vault-muted">
            Configure RPC via <span className="font-mono">NEXT_PUBLIC_SOLANA_RPC_URL</span> environment variable.
          </p>
        </SectionContainer>

        {/* Protocol Info */}
        <SectionContainer title="Protocol" subtitle="Deployment information">
          <div className="rounded-xl border border-vault-border bg-vault-surface p-4 space-y-3">
            {[
              { label: "Version",            value: "v0.1.0-alpha" },
              { label: "Collateral Vault",   value: VAULT_PROGRAM_ID_STR },
              { label: "CipherVault Core",   value: CORE_PROGRAM_ID_STR },
              { label: "Max LTV",            value: `${DEFAULT_LTV_BPS / 100}%` },
              { label: "Liquidation Threshold", value: `${DEFAULT_LIQ_THRESHOLD_BPS / 100}%` },
              { label: "Hackathon",          value: "Colosseum Frontier" },
            ].map(({ label, value }) => (
              <div key={label} className="flex items-center justify-between">
                <span className="text-body-sm text-vault-subtext">{label}</span>
                <span className="font-mono text-body-sm text-vault-text" title={value}>
                  {value.length > 16 ? `${value.slice(0,4)}…${value.slice(-4)}` : value}
                </span>
              </div>
            ))}
          </div>
        </SectionContainer>

      </div>
    </AppLayout>
  );
}
