"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "../../lib/cn";
import { useThemeStore } from "../../hooks/useThemeStore";

interface NavItem {
  id:    string;
  label: string;
  icon:  React.ReactNode;
  href:  string;
  badge?: string;
}

const NAV_ITEMS: NavItem[] = [
  {
    id:    "dashboard",
    label: "Dashboard",
    icon:  <DashboardIcon />,
    href:  "/",
  },
  {
    id:    "collateral",
    label: "Collateral",
    icon:  <CollateralIcon />,
    href:  "/collateral",
  },
  {
    id:    "dwallets",
    label: "dWallets",
    icon:  <DWalletIcon />,
    href:  "/dwallets",
  },
  {
    id:    "trade",
    label: "Trade",
    icon:  <TradeIcon />,
    href:  "/trade",
  },
  {
    id:    "history",
    label: "History",
    icon:  <HistoryIcon />,
    href:  "/history",
  },
];

const BOTTOM_ITEMS: NavItem[] = [
  {
    id:    "settings",
    label: "Settings",
    icon:  <SettingsIcon />,
    href:  "/settings",
  },
  {
    id:    "docs",
    label: "Documentation",
    icon:  <DocsIcon />,
    href:  "/docs",
  },
];

export function Sidebar() {
  const pathname = usePathname();
  const { theme, toggleTheme, initTheme } = useThemeStore();

  React.useEffect(() => {
    initTheme();
  }, []);

  return (
    <aside
      id="sidebar"
      className={cn(
        "fixed left-0 top-0 z-30 flex h-screen w-[var(--sidebar-width)] flex-col",
        "border-r border-vault-border bg-vault-surface",
        "animate-slide-in-left"
      )}
    >
      {/* Logo */}
      <div className="flex h-[var(--topbar-height)] shrink-0 items-center gap-3 border-b border-vault-border px-5">
        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-vault-accent/10 ring-1 ring-vault-accent/30">
          <CipherVaultLogo />
        </div>
        <div>
          <span className="text-heading-sm text-vault-text tracking-tight">
            CipherVault
          </span>
        </div>
      </div>

      {/* Primary nav */}
      <nav className="flex-1 overflow-y-auto py-4 no-scrollbar">
        <div className="px-3">
          <p className="mb-1 px-2 text-label-sm uppercase tracking-widest text-vault-muted">
            Protocol
          </p>
          <ul className="space-y-0.5">
            {NAV_ITEMS.map((item) => (
              <NavLink key={item.id} item={item} currentPath={pathname} />
            ))}
          </ul>
        </div>
      </nav>

      {/* Network status */}
      <div className="border-t border-vault-border p-3">
        <div className="flex items-center gap-2.5 rounded-lg px-2 py-2">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-vault-success opacity-60" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-vault-success" />
          </span>
          <div className="flex-1 min-w-0">
            <p className="text-body-xs font-medium text-vault-text truncate">Solana Devnet</p>
            <p className="text-label-sm text-vault-muted">Connected</p>
          </div>
          {/* Theme toggle button */}
          <button
            onClick={toggleTheme}
            title={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
            className="shrink-0 flex h-7 w-7 items-center justify-center rounded-lg border border-vault-border text-vault-muted hover:text-vault-text hover:border-vault-muted transition-all duration-150"
          >
            {theme === "dark" ? <SunIcon /> : <MoonIcon />}
          </button>
        </div>

        {/* Bottom items */}
        <ul className="mt-1 space-y-0.5">
          {BOTTOM_ITEMS.map((item) => (
            <NavLink key={item.id} item={item} currentPath={pathname} />
          ))}
        </ul>
      </div>
    </aside>
  );
}

function NavLink({ item, currentPath }: { item: NavItem; currentPath: string }) {
  const isStub = item.href === "#";
  const isExternal = item.href.startsWith("http");
  const isActive = !isStub && !isExternal && (
    item.href === "/" ? currentPath === "/" : currentPath.startsWith(item.href)
  );

  const cls = cn(
    "group flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-body-sm",
    "transition-all duration-150",
    isActive
      ? "bg-vault-elevated text-vault-text font-medium"
      : isStub
        ? "text-vault-muted cursor-default"
        : "text-vault-subtext hover:bg-vault-elevated hover:text-vault-text",
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-vault-accent/40"
  );

  const inner = (
    <>
      <span
        className={cn(
          "shrink-0 transition-colors duration-150",
          isActive
            ? "text-vault-accent"
            : isStub
              ? "text-vault-muted"
              : "text-vault-muted group-hover:text-vault-subtext"
        )}
      >
        {item.icon}
      </span>
      <span className="flex-1">{item.label}</span>
      {isActive && (
        <span className="h-1.5 w-1.5 rounded-full bg-vault-accent" />
      )}
      {isStub && !isActive && (
        <span className="text-label-sm text-vault-muted opacity-0 group-hover:opacity-100 transition-opacity">
          Soon
        </span>
      )}
    </>
  );

  if (isStub) return <li><button className={cls}>{inner}</button></li>;
  if (isExternal) {
    return (
      <li>
        <a href={item.href} target="_blank" rel="noopener noreferrer" className={cls}>
          {inner}
        </a>
      </li>
    );
  }

  return (
    <li>
      <Link href={item.href} className={cls}>
        {inner}
      </Link>
    </li>
  );
}

// ── Icons ──────────────────────────────────────────────────────────────────

function CipherVaultLogo() {
  return (
    <svg className="h-4 w-4 text-vault-accent" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M8 1L14 4.5V11.5L8 15L2 11.5V4.5L8 1Z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round"/>
      <path d="M8 5V11M5 7l3-2 3 2" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

function DashboardIcon() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="1" y="1" width="6" height="6" rx="1.5" stroke="currentColor" strokeWidth="1.3"/>
      <rect x="9" y="1" width="6" height="6" rx="1.5" stroke="currentColor" strokeWidth="1.3"/>
      <rect x="1" y="9" width="6" height="6" rx="1.5" stroke="currentColor" strokeWidth="1.3"/>
      <rect x="9" y="9" width="6" height="6" rx="1.5" stroke="currentColor" strokeWidth="1.3"/>
    </svg>
  );
}

function CollateralIcon() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="8" cy="8" r="6.5" stroke="currentColor" strokeWidth="1.3"/>
      <path d="M8 4.5V8l2.5 2.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
    </svg>
  );
}

function DWalletIcon() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="1" y="4" width="14" height="9" rx="1.5" stroke="currentColor" strokeWidth="1.3"/>
      <circle cx="11.5" cy="8.5" r="1.5" fill="currentColor"/>
      <path d="M1 7h14" stroke="currentColor" strokeWidth="1.3"/>
    </svg>
  );
}

function TradeIcon() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M3 3l5 10 2-5 5-2L3 3z" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round"/>
    </svg>
  );
}

function HistoryIcon() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M2 8a6 6 0 1 0 1.8-4.3" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
      <path d="M2 4v4h4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M8 5.5V8l1.5 1.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
    </svg>
  );
}

function SettingsIcon() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="8" cy="8" r="2" stroke="currentColor" strokeWidth="1.3"/>
      <path d="M8 1v2M8 13v2M1 8h2M13 8h2M3.05 3.05l1.41 1.41M11.54 11.54l1.41 1.41M3.05 12.95l1.41-1.41M11.54 4.46l1.41-1.41" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
    </svg>
  );
}

function DocsIcon() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="2" y="1" width="12" height="14" rx="2" stroke="currentColor" strokeWidth="1.3"/>
      <path d="M5 5h6M5 8h6M5 11h4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
    </svg>
  );
}

function SunIcon() {
  return (
    <svg className="h-3.5 w-3.5" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="8" cy="8" r="3" stroke="currentColor" strokeWidth="1.3"/>
      <path d="M8 1v2M8 13v2M1 8h2M13 8h2M3.05 3.05l1.41 1.41M11.54 11.54l1.41 1.41M3.05 12.95l1.41-1.41M11.54 4.46l1.41-1.41" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
    </svg>
  );
}

function MoonIcon() {
  return (
    <svg className="h-3.5 w-3.5" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M13.5 10A6 6 0 0 1 6 2.5a6 6 0 1 0 7.5 7.5z" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}
