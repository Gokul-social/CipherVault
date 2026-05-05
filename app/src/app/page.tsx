"use client";

import React, { useState } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { Dashboard } from "../components/dashboard/Dashboard";
import { WalletModal } from "../components/wallet/WalletModal";
import { cn } from "../lib/cn";

export default function Home() {
  const { publicKey } = useWallet();
  const [modalOpen, setModalOpen] = useState(false);

  // Authenticated → full dashboard
  if (publicKey) {
    return <Dashboard />;
  }

  // Unauthenticated → institutional landing / auth gate
  return (
    <>
      <div className="flex min-h-screen flex-col bg-vault-bg">
        {/* Nav strip */}
        <header className="flex h-14 items-center justify-between border-b border-vault-border px-8">
          <div className="flex items-center gap-2.5">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-vault-accent/10 ring-1 ring-vault-accent/30">
              <CipherVaultLogo />
            </div>
            <span className="text-heading-sm text-vault-text tracking-tight">CipherVault</span>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-body-xs text-vault-muted font-mono">Devnet</span>
            <button
              id="landing-connect-btn"
              onClick={() => setModalOpen(true)}
              className={cn(
                "rounded-lg bg-vault-accent px-4 py-1.5 text-body-sm font-medium text-white",
                "transition-all duration-150 hover:bg-vault-accent-dim active:scale-[0.97]",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-vault-accent/50"
              )}
            >
              Connect Wallet
            </button>
          </div>
        </header>

        {/* Hero */}
        <main className="flex flex-1 flex-col items-center justify-center px-6 text-center">
          <div className="animate-fade-in max-w-3xl">
            {/* Eyebrow */}
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-vault-border bg-vault-surface px-3 py-1">
              <span className="h-1.5 w-1.5 rounded-full bg-vault-success animate-pulse" />
              <span className="font-mono text-label-md uppercase tracking-widest text-vault-muted">
                Colosseum Frontier Hackathon
              </span>
            </div>

            {/* Heading */}
            <h1 className="text-display-2xl text-vault-text">
              Institutional{" "}
              <span className="text-vault-accent">Prime Brokerage</span>
              <br />on Solana
            </h1>

            {/* Tagline */}
            <p className="mx-auto mt-6 max-w-xl text-body-lg text-vault-subtext">
              Cross-chain collateral via Ika dWallets.
              Encrypted order flow via Encrypt FHE.
              Institutional-grade credit facilities on-chain.
            </p>

            {/* 3 key metrics */}
            <div className="mt-12 grid grid-cols-3 gap-4 max-w-2xl mx-auto">
              {[
                { label: "Max LTV",       value: "75%",    desc: "Loan-to-value ratio" },
                { label: "Settlement",    value: "<400ms", desc: "Solana finality" },
                { label: "Custody Model", value: "MPC",    desc: "Ika dWallet secured" },
              ].map((metric) => (
                <div
                  key={metric.label}
                  className="rounded-xl border border-vault-border bg-vault-surface p-5 text-left"
                >
                  <div className="text-label-md uppercase tracking-widest text-vault-muted">
                    {metric.label}
                  </div>
                  <div className="mt-2 font-mono text-display-sm text-vault-text">
                    {metric.value}
                  </div>
                  <div className="mt-1 text-body-xs text-vault-subtext">{metric.desc}</div>
                </div>
              ))}
            </div>

            {/* Tech stack pills */}
            <div className="mt-10 flex flex-wrap justify-center gap-2">
              {[
                { label: "Ika dWallets",  sub: "MPC Custody" },
                { label: "Encrypt FHE",   sub: "Confidential Compute" },
                { label: "Solana",         sub: "Settlement Layer" },
              ].map((tech) => (
                <div
                  key={tech.label}
                  className="flex items-center gap-2 rounded-lg border border-vault-border bg-vault-surface px-4 py-2"
                >
                  <span className="text-body-sm font-medium text-vault-text">{tech.label}</span>
                  <span className="h-3 w-px bg-vault-border" />
                  <span className="font-mono text-body-xs text-vault-muted">{tech.sub}</span>
                </div>
              ))}
            </div>

            {/* CTA */}
            <div className="mt-12">
              <button
                id="hero-connect-btn"
                onClick={() => setModalOpen(true)}
                className={cn(
                  "rounded-xl bg-vault-accent px-8 py-3.5 text-body-md font-semibold text-white",
                  "transition-all duration-200 hover:bg-vault-accent-dim hover:-translate-y-0.5 hover:shadow-glow-accent",
                  "active:scale-[0.98] active:translate-y-0",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-vault-accent/50"
                )}
              >
                Launch App
              </button>
              <p className="mt-3 text-body-xs text-vault-muted">
                Connect a Solana wallet to access your vault
              </p>
            </div>
          </div>
        </main>

        {/* Footer */}
        <footer className="border-t border-vault-border py-4 text-center">
          <p className="text-body-xs text-vault-muted">
            CipherVault · Powered by{" "}
            <span className="text-vault-subtext">Solana</span>,{" "}
            <span className="text-vault-subtext">Ika</span>, and{" "}
            <span className="text-vault-subtext">Encrypt Protocol</span>
          </p>
        </footer>
      </div>

      <WalletModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
      />
    </>
  );
}

function CipherVaultLogo() {
  return (
    <svg className="h-4 w-4 text-vault-accent" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M8 1L14 4.5V11.5L8 15L2 11.5V4.5L8 1Z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round"/>
      <path d="M8 5V11M5 7l3-2 3 2" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}
