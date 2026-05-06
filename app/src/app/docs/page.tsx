"use client";

import React, { useState } from "react";
import { AppLayout } from "../../layouts/AppLayout";
import { cn } from "../../lib/cn";

// ── Section data ────────────────────────────────────────────────────────────

const SECTIONS = [
  "Overview",
  "Getting Started",
  "Core Concepts",
  "Smart Contracts",
  "Trade Engine",
  "FAQ",
  "Changelog",
] as const;
type Section = typeof SECTIONS[number];

export default function DocsPage() {
  const [active, setActive] = useState<Section>("Overview");

  return (
    <AppLayout pageTitle="Documentation" pageSubtitle="CipherVault Protocol Reference">
      <div className="flex gap-8 min-h-[80vh]">

        {/* Left: Sticky TOC */}
        <aside className="w-48 shrink-0">
          <div className="sticky top-[calc(var(--topbar-height)+2rem)] space-y-0.5">
            <p className="mb-3 text-label-sm uppercase tracking-widest text-vault-muted px-2">Contents</p>
            {SECTIONS.map((s) => (
              <button
                key={s}
                onClick={() => setActive(s)}
                className={cn(
                  "w-full text-left rounded-lg px-3 py-2 text-body-sm transition-all duration-150",
                  active === s
                    ? "bg-vault-elevated text-vault-text font-medium"
                    : "text-vault-subtext hover:text-vault-text hover:bg-vault-elevated"
                )}
              >
                {s}
              </button>
            ))}
          </div>
        </aside>

        {/* Right: Content */}
        <article className="flex-1 min-w-0 animate-fade-in">
          {active === "Overview"      && <OverviewSection />}
          {active === "Getting Started" && <GettingStartedSection />}
          {active === "Core Concepts" && <CoreConceptsSection />}
          {active === "Smart Contracts" && <SmartContractsSection />}
          {active === "Trade Engine"  && <TradeEngineSection />}
          {active === "FAQ"           && <FAQSection />}
          {active === "Changelog"     && <ChangelogSection />}
        </article>
      </div>
    </AppLayout>
  );
}

// ── Section components ───────────────────────────────────────────────────────

function OverviewSection() {
  return (
    <DocSection title="Protocol Overview">
      <Lead>
        CipherVault is an institutional prime brokerage protocol built on Solana. It enables
        cross-chain collateral management via Ika dWallets and encrypted order flow via Encrypt FHE,
        providing institutional-grade credit facilities entirely on-chain.
      </Lead>

      <H2>Three Technology Pillars</H2>

      <div className="grid grid-cols-3 gap-4 my-6">
        {[
          {
            name: "Ika dWallets",
            sub: "MPC Custody",
            desc: "Multi-party computation wallets that hold cross-chain collateral (BTC, ETH, SOL) without a single point of failure. Ika's threshold signature scheme ensures no single key can move funds.",
            color: "border-vault-accent/30 bg-vault-accent-glow",
          },
          {
            name: "Encrypt FHE",
            sub: "Confidential Compute",
            desc: "Fully Homomorphic Encryption applied to trade sizes and prices. Orders are encrypted client-side before submission — the matching engine never sees plaintext values.",
            color: "border-vault-purple/30 bg-vault-purple-dim",
          },
          {
            name: "Solana",
            sub: "Settlement Layer",
            desc: "All state — vaults, positions, credit lines — lives on Solana for sub-400ms finality and sub-cent fees. The collateral-vault program manages the on-chain accounting.",
            color: "border-vault-success/30 bg-vault-success-dim",
          },
        ].map((p) => (
          <div key={p.name} className={cn("rounded-xl border p-4", p.color)}>
            <div className="font-mono text-body-xs text-vault-muted mb-1">{p.sub}</div>
            <div className="text-heading-sm text-vault-text font-semibold mb-2">{p.name}</div>
            <p className="text-body-xs text-vault-subtext leading-relaxed">{p.desc}</p>
          </div>
        ))}
      </div>

      <H2>Architecture</H2>
      <div className="rounded-xl border border-vault-border bg-vault-elevated p-6 font-mono text-body-xs text-vault-subtext space-y-2">
        <div className="text-vault-muted">┌─────────────────────────────────────────────┐</div>
        <div>│  <span className="text-vault-accent">CipherVault Dashboard</span>  (Next.js + Tailwind)   │</div>
        <div className="text-vault-muted">├─────────────────────────────────────────────┤</div>
        <div>│  useVault · useCollateralStore · useOrderStore │</div>
        <div className="text-vault-muted">├──────────────────────┬──────────────────────┤</div>
        <div>│  <span className="text-vault-success">collateral-vault</span>      │  <span className="text-vault-purple">ciphervault-core</span>     │</div>
        <div>│  (Anchor / Solana)   │  (FHE order book)    │</div>
        <div className="text-vault-muted">├──────────────────────┼──────────────────────┤</div>
        <div>│  <span className="text-[#F7931A]">Ika dWallets</span>          │  <span className="text-vault-accent">Encrypt Protocol</span>     │</div>
        <div>│  BTC · ETH · SOL     │  (Mock FHE alpha)    │</div>
        <div className="text-vault-muted">└──────────────────────┴──────────────────────┘</div>
      </div>
    </DocSection>
  );
}

function GettingStartedSection() {
  const steps = [
    {
      n: "01",
      title: "Connect Wallet",
      desc: "Click 'Launch App' or 'Connect Wallet'. Use Phantom or any Solana wallet on Devnet. Make sure your wallet is set to Solana Devnet in its settings.",
    },
    {
      n: "02",
      title: "Initialize Vault",
      desc: "On the Dashboard, click 'Initialize Vault'. This creates your on-chain VaultAccount PDA with default LTV parameters (75% max LTV, 80% liquidation threshold).",
    },
    {
      n: "03",
      title: "Register a dWallet",
      desc: "Go to dWallets and select a chain (Bitcoin, Ethereum, or Solana). Click 'Register dWallet' to link an Ika MPC wallet slot to your vault. Each vault supports up to 8 dWallets.",
    },
    {
      n: "04",
      title: "Deposit Collateral",
      desc: "Go to Collateral and use the Deposit form. Enter an amount and USD price. This calls the record_deposit instruction on the collateral-vault program, updating your on-chain position.",
    },
    {
      n: "05",
      title: "Place an Order",
      desc: "Navigate to Trade. Select an asset pair (BTC/USD, ETH/USD, SOL/USD), choose Long or Short, enter size and price. The order is FHE-encrypted locally and committed to the order book.",
    },
    {
      n: "06",
      title: "View History",
      desc: "The History page shows a unified timeline of all deposits, withdrawals, orders, and settlements with their on-chain transaction signatures.",
    },
  ];

  return (
    <DocSection title="Getting Started">
      <Lead>
        Follow these steps to go from zero to your first encrypted trade on Solana Devnet.
      </Lead>
      <div className="space-y-4 mt-6">
        {steps.map((step) => (
          <div key={step.n} className="flex gap-4 rounded-xl border border-vault-border bg-vault-surface p-4">
            <span className="shrink-0 font-mono text-label-sm text-vault-accent mt-0.5">{step.n}</span>
            <div>
              <p className="text-body-sm font-semibold text-vault-text">{step.title}</p>
              <p className="mt-1 text-body-xs text-vault-subtext">{step.desc}</p>
            </div>
          </div>
        ))}
      </div>
    </DocSection>
  );
}

function CoreConceptsSection() {
  const concepts = [
    {
      term: "Loan-to-Value (LTV)",
      def: "The ratio of credit used to total collateral value. CipherVault enforces a maximum LTV of 75%. If your used credit exceeds 75% of your collateral, new orders are blocked.",
    },
    {
      term: "Health Factor",
      def: "A ratio of total collateral to used credit. A health factor of 1.0 means you are at exactly the liquidation threshold. Higher is safer. Displayed as a score from 0–100 in the UI.",
    },
    {
      term: "Liquidation Threshold",
      def: "If your LTV reaches 80%, your position becomes eligible for liquidation. The protocol can freeze your vault and allow a liquidator to repay your credit in exchange for your collateral.",
    },
    {
      term: "dWallet",
      def: "A threshold MPC wallet powered by Ika Protocol. It holds cross-chain collateral (BTC, ETH, SOL) with no single signing key. The vault program tracks each dWallet as a named slot.",
    },
    {
      term: "Collateral Position",
      def: "Each registered dWallet represents one collateral position. A position tracks: the asset, chain, raw amount (in native units), USD value (6 decimal precision), and last updated slot.",
    },
    {
      term: "FHE Encrypted Orders",
      def: "In the pre-alpha, order sizes and prices are encrypted using a mock FHE scheme before being submitted. In production, Encrypt Protocol's real FHE will be used, making trade values fully confidential even to the matching engine.",
    },
  ];

  return (
    <DocSection title="Core Concepts">
      <Lead>Key terms and concepts for understanding the CipherVault protocol.</Lead>
      <div className="mt-6 space-y-4">
        {concepts.map((c) => (
          <div key={c.term} className="rounded-xl border border-vault-border bg-vault-surface p-4">
            <p className="text-body-sm font-semibold text-vault-text mb-1">{c.term}</p>
            <p className="text-body-xs text-vault-subtext">{c.def}</p>
          </div>
        ))}
      </div>
    </DocSection>
  );
}

function SmartContractsSection() {
  return (
    <DocSection title="Smart Contracts">
      <Lead>Two on-chain programs make up the CipherVault protocol.</Lead>

      <H2>collateral-vault</H2>
      <CodeBlock>{`Program ID: 4jJrbTHiAP5ocWhbUqJG6m1bQ6cRkNi7vJvHWpRABwBm
Network:    Solana Devnet`}</CodeBlock>

      <p className="text-body-sm text-vault-subtext mt-3 mb-4">Manages vault accounts, dWallet registration, and collateral position accounting.</p>

      <table className="w-full text-body-xs border border-vault-border rounded-xl overflow-hidden">
        <thead>
          <tr className="bg-vault-elevated border-b border-vault-border">
            <th className="px-4 py-2.5 text-left text-label-md uppercase tracking-widest text-vault-muted">Instruction</th>
            <th className="px-4 py-2.5 text-left text-label-md uppercase tracking-widest text-vault-muted">Description</th>
            <th className="px-4 py-2.5 text-left text-label-md uppercase tracking-widest text-vault-muted">Accounts</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-vault-border-subtle">
          {[
            ["initialize_vault", "Create VaultAccount PDA with LTV params", "vault_pda, owner, system"],
            ["register_dwallet", "Register an Ika dWallet slot", "vault_pda, owner"],
            ["record_deposit", "Record collateral deposit with USD price", "vault_pda, oracle_authority"],
            ["record_withdrawal", "Record collateral withdrawal", "vault_pda, owner"],
            ["update_health", "Recompute LTV and health factor", "vault_pda, oracle"],
            ["update_credit", "Update used credit line", "vault_pda, owner"],
          ].map(([ix, desc, accounts]) => (
            <tr key={ix} className="hover:bg-vault-elevated/50 transition-colors">
              <td className="px-4 py-2.5 font-mono text-vault-accent">{ix}</td>
              <td className="px-4 py-2.5 text-vault-subtext">{desc}</td>
              <td className="px-4 py-2.5 font-mono text-vault-muted">{accounts}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <H2 className="mt-8">ciphervault-core</H2>
      <CodeBlock>{`Program ID: 8Voz2Petb9Q4xYMCqjNVXSyTzkmzMsK3cTrSVGGLF8Ug
Network:    Solana Devnet (pre-alpha)`}</CodeBlock>
      <p className="text-body-sm text-vault-subtext mt-3">Handles the FHE order book: place_order, settle_trade, and collateral bridging. Currently in pre-alpha — order placement is simulated locally.</p>
    </DocSection>
  );
}

function TradeEngineSection() {
  return (
    <DocSection title="Trade Engine">
      <Lead>
        CipherVault's trade engine uses Fully Homomorphic Encryption to keep order sizes and prices confidential throughout the entire lifecycle.
      </Lead>

      <H2>Order Flow</H2>
      <div className="space-y-3 mt-4">
        {[
          { step: "1. Input",      desc: "User enters size and limit price in the OrderForm." },
          { step: "2. Encrypt",    desc: "Client-side FHE encryption using Encrypt Protocol SDK. Size and price become opaque ciphertexts." },
          { step: "3. Submit",     desc: "The place_order instruction is built with the encrypted ciphertexts and submitted to the ciphervault-core program." },
          { step: "4. Match",      desc: "The FHE matching engine processes orders without decrypting them — all comparisons happen in encrypted space." },
          { step: "5. Settle",     desc: "Matched orders are settled via settle_trade, updating collateral balances and credit lines." },
        ].map(({ step, desc }) => (
          <div key={step} className="flex gap-3 rounded-lg border border-vault-border-subtle bg-vault-surface p-3">
            <span className="shrink-0 font-mono text-body-xs text-vault-accent w-16">{step}</span>
            <span className="text-body-xs text-vault-subtext">{desc}</span>
          </div>
        ))}
      </div>

      <H2 className="mt-6">Pre-Alpha Notice</H2>
      <div className="rounded-xl border border-vault-warning/30 bg-vault-warning-dim p-4">
        <p className="text-body-sm text-vault-warning font-medium mb-1">Simulation Mode Active</p>
        <p className="text-body-xs text-vault-subtext">
          In v0.1.0, the ciphervault-core program is in pre-alpha deployment. Orders are encrypted locally using a mock FHE scheme and committed to the local Zustand order store. When Encrypt Protocol Alpha 1 ships, the real FHE library will replace the mock and orders will be submitted on-chain.
        </p>
      </div>

      <H2 className="mt-6">Supported Asset Pairs</H2>
      <div className="grid grid-cols-3 gap-3 mt-3">
        {[
          { pair: "BTC/USD", min: "0.00000001 BTC", default: "$65,000" },
          { pair: "ETH/USD", min: "0.000001 ETH",   default: "$3,200" },
          { pair: "SOL/USD", min: "0.0001 SOL",      default: "$170" },
        ].map((p) => (
          <div key={p.pair} className="rounded-lg border border-vault-border bg-vault-surface p-3">
            <div className="font-mono text-body-sm font-semibold text-vault-text">{p.pair}</div>
            <div className="mt-1 text-label-sm text-vault-muted">Min size: {p.min}</div>
            <div className="text-label-sm text-vault-muted">Ref price: {p.default}</div>
          </div>
        ))}
      </div>
    </DocSection>
  );
}

function FAQSection() {
  const faqs = [
    {
      q: "Is this on mainnet?",
      a: "No. CipherVault v0.1.0 is deployed on Solana Devnet only. This is a Colosseum Frontier Hackathon submission and not a production product.",
    },
    {
      q: "Why does my dWallet registration fail sometimes?",
      a: "dWallet registration is an on-chain transaction. Make sure you have sufficient SOL for fees, your wallet is on Devnet, and you've already initialized a vault first.",
    },
    {
      q: "Why are trades simulated locally instead of on-chain?",
      a: "The ciphervault-core program is a pre-alpha deployment. The FHE order book requires the Encrypt Protocol Alpha 1 SDK which isn't publicly available yet. Orders are simulated to demonstrate the UX flow.",
    },
    {
      q: "What is the LTV and how is health factor calculated?",
      a: "LTV = used_credit_usd / total_collateral_usd. Health Factor = total_collateral_usd / used_credit_usd. A health factor below 1.25 (80% LTV) triggers liquidation eligibility.",
    },
    {
      q: "How do I get Devnet SOL?",
      a: "Use the Solana Devnet faucet at faucet.solana.com or run 'solana airdrop 2' with the Solana CLI. Each airdrop gives 2 SOL which is enough for many transactions.",
    },
    {
      q: "Can I register multiple dWallets?",
      a: "Yes, up to 8 dWallet slots per vault. Each slot can hold a different chain/asset combination (e.g. BTC on Bitcoin, ETH on Ethereum, SOL on Solana).",
    },
  ];

  return (
    <DocSection title="FAQ">
      <Lead>Frequently asked questions about the CipherVault protocol.</Lead>
      <div className="mt-6 space-y-4">
        {faqs.map((faq) => (
          <details
            key={faq.q}
            className="group rounded-xl border border-vault-border bg-vault-surface overflow-hidden"
          >
            <summary className="flex cursor-pointer items-center justify-between gap-3 px-4 py-3 text-body-sm font-medium text-vault-text list-none hover:bg-vault-elevated transition-colors">
              {faq.q}
              <svg className="h-4 w-4 shrink-0 text-vault-muted group-open:rotate-90 transition-transform duration-200" viewBox="0 0 16 16" fill="none">
                <path d="M6 4l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </summary>
            <div className="px-4 pb-4 pt-2 text-body-xs text-vault-subtext border-t border-vault-border-subtle">
              {faq.a}
            </div>
          </details>
        ))}
      </div>
    </DocSection>
  );
}

function ChangelogSection() {
  return (
    <DocSection title="Changelog">
      <Lead>Release history for the CipherVault protocol.</Lead>

      <div className="mt-6 space-y-6">
        <div className="relative pl-6 border-l-2 border-vault-accent/30">
          <div className="absolute -left-[9px] top-1 h-4 w-4 rounded-full border-2 border-vault-accent bg-vault-bg" />
          <div className="flex items-center gap-3 mb-2">
            <span className="font-mono text-body-sm font-semibold text-vault-text">v0.1.0-alpha</span>
            <span className="rounded-full border border-vault-accent/30 bg-vault-accent-glow px-2 py-0.5 font-mono text-label-sm text-vault-accent">Current</span>
            <span className="text-body-xs text-vault-muted">May 2026 · Colosseum Frontier</span>
          </div>
          <ul className="space-y-1.5 text-body-xs text-vault-subtext">
            <li className="flex gap-2"><span className="text-vault-success shrink-0">+</span> collateral-vault Anchor program deployed on Devnet</li>
            <li className="flex gap-2"><span className="text-vault-success shrink-0">+</span> 6 on-chain instructions: init, register_dwallet, record_deposit, record_withdrawal, update_health, update_credit</li>
            <li className="flex gap-2"><span className="text-vault-success shrink-0">+</span> Next.js 15 dashboard with App Router</li>
            <li className="flex gap-2"><span className="text-vault-success shrink-0">+</span> Collateral, dWallets, Trade, History pages</li>
            <li className="flex gap-2"><span className="text-vault-success shrink-0">+</span> Zustand state architecture with global transaction engine</li>
            <li className="flex gap-2"><span className="text-vault-success shrink-0">+</span> Light / dark mode theme system</li>
            <li className="flex gap-2"><span className="text-vault-success shrink-0">+</span> Multi-chain dWallet registration (BTC, ETH, SOL)</li>
            <li className="flex gap-2"><span className="text-vault-success shrink-0">+</span> BTC/ETH/SOL asset pair selector on trade page</li>
            <li className="flex gap-2"><span className="text-vault-success shrink-0">+</span> Transaction toast notifications</li>
            <li className="flex gap-2"><span className="text-vault-muted shrink-0">~</span> ciphervault-core FHE order book (simulated, pre-alpha)</li>
          </ul>
        </div>

        <div className="relative pl-6 border-l-2 border-vault-border">
          <div className="absolute -left-[9px] top-1 h-4 w-4 rounded-full border-2 border-vault-border bg-vault-bg" />
          <div className="flex items-center gap-3 mb-2">
            <span className="font-mono text-body-sm font-semibold text-vault-text">v0.2.0</span>
            <span className="text-body-xs text-vault-muted">Planned</span>
          </div>
          <ul className="space-y-1.5 text-body-xs text-vault-subtext">
            <li className="flex gap-2"><span className="text-vault-muted shrink-0">○</span> Real FHE via Encrypt Protocol Alpha 1</li>
            <li className="flex gap-2"><span className="text-vault-muted shrink-0">○</span> Live Ika dWallet SDK integration</li>
            <li className="flex gap-2"><span className="text-vault-muted shrink-0">○</span> On-chain order matching and settlement</li>
            <li className="flex gap-2"><span className="text-vault-muted shrink-0">○</span> Mainnet-beta deployment</li>
          </ul>
        </div>
      </div>
    </DocSection>
  );
}

// ── Doc primitives ────────────────────────────────────────────────────────────

function DocSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h1 className="text-display-sm text-vault-text font-semibold mb-1">{title}</h1>
      <div className="h-px bg-vault-border mb-6" />
      {children}
    </section>
  );
}

function Lead({ children }: { children: React.ReactNode }) {
  return <p className="text-body-md text-vault-subtext leading-relaxed mb-4">{children}</p>;
}

function H2({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <h2 className={cn("text-heading-md text-vault-text font-semibold mt-6 mb-3", className)}>
      {children}
    </h2>
  );
}

function CodeBlock({ children }: { children: string }) {
  return (
    <pre className="rounded-lg border border-vault-border bg-vault-elevated px-4 py-3 font-mono text-body-xs text-vault-subtext overflow-x-auto whitespace-pre-wrap">
      {children}
    </pre>
  );
}
