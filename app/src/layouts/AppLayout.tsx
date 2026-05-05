import React from "react";
import { Sidebar } from "../components/layout/Sidebar";
import { TopBar } from "../components/layout/TopBar";
import { TransactionToast } from "../components/ui/TransactionToast";
import { cn } from "../lib/cn";

interface AppLayoutProps {
  children:      React.ReactNode;
  pageTitle:     string;
  pageSubtitle?: string;
  onRefresh?:    () => void;
  isRefreshing?: boolean;
}

export function AppLayout({
  children,
  pageTitle,
  pageSubtitle,
  onRefresh,
  isRefreshing,
}: AppLayoutProps) {
  return (
    <div className="min-h-screen bg-vault-bg">
      <Sidebar />
      <TopBar
        title={pageTitle}
        subtitle={pageSubtitle}
        onRefresh={onRefresh}
        isRefreshing={isRefreshing}
      />

      {/* Main content — offset for sidebar + topbar */}
      <main
        className={cn(
          "ml-[var(--sidebar-width)] pt-[var(--topbar-height)]",
          "min-h-screen"
        )}
      >
        <div className="mx-auto max-w-6xl px-6 py-8">
          {children}
        </div>
      </main>

      {/* Global transaction toasts */}
      <TransactionToast />
    </div>
  );
}
