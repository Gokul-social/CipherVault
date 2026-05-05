import React from "react";
import { cn } from "../../lib/cn";
import { Skeleton } from "./Skeleton";

type Trend = "up" | "down" | "neutral";
type AccentColor = "success" | "warning" | "danger" | "accent" | "purple";

interface StatCardProps {
  label:        string;
  value:        string;
  subValue?:    string;
  trend?:       Trend;
  accentColor?: AccentColor;
  indicator?:   React.ReactNode;
  loading?:     boolean;
  className?:   string;
  mono?:        boolean; // use mono font for value
}

const accentLeft: Record<AccentColor, string> = {
  success: "before:bg-vault-success",
  warning: "before:bg-vault-warning",
  danger:  "before:bg-vault-danger",
  accent:  "before:bg-vault-accent",
  purple:  "before:bg-vault-purple",
};

const trendIcon: Record<Trend, React.ReactNode> = {
  up:      <TrendArrow dir="up"   />,
  down:    <TrendArrow dir="down" />,
  neutral: null,
};

const trendColor: Record<Trend, string> = {
  up:      "text-vault-success",
  down:    "text-vault-danger",
  neutral: "text-vault-muted",
};

export function StatCard({
  label,
  value,
  subValue,
  trend,
  accentColor,
  indicator,
  loading = false,
  className,
  mono = false,
}: StatCardProps) {
  if (loading) {
    return (
      <div className={cn(
        "rounded-xl border border-vault-border bg-vault-surface p-5",
        className
      )}>
        <Skeleton height="h-3" width="w-28" className="mb-4" />
        <Skeleton height="h-7" width="w-36" className="mb-2" />
        <Skeleton height="h-3" width="w-20" />
      </div>
    );
  }

  return (
    <div
      className={cn(
        "group relative rounded-xl border border-vault-border bg-vault-surface p-5",
        "transition-all duration-200 ease-out",
        "hover:border-vault-muted hover:-translate-y-px hover:shadow-card-hover",
        // left accent bar
        accentColor && "before:absolute before:left-0 before:top-3 before:bottom-3 before:w-0.5 before:rounded-full",
        accentColor && accentLeft[accentColor],
        className
      )}
    >
      {/* Label */}
      <div className="mb-3 flex items-center justify-between">
        <span className="text-label-md uppercase tracking-widest text-vault-muted">
          {label}
        </span>
        {indicator && <span>{indicator}</span>}
      </div>

      {/* Value */}
      <div
        className={cn(
          "text-display-sm text-vault-text",
          mono && "font-mono"
        )}
      >
        {value}
      </div>

      {/* Sub-value / trend */}
      {(subValue || trend) && (
        <div
          className={cn(
            "mt-2 flex items-center gap-1.5 text-body-xs",
            trend ? trendColor[trend] : "text-vault-subtext"
          )}
        >
          {trend && trendIcon[trend]}
          {subValue && <span>{subValue}</span>}
        </div>
      )}
    </div>
  );
}

function TrendArrow({ dir }: { dir: "up" | "down" }) {
  return (
    <svg
      className="h-3 w-3"
      viewBox="0 0 12 12"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      {dir === "up" ? (
        <path d="M6 10V2M6 2L2 6M6 2L10 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      ) : (
        <path d="M6 2V10M6 10L2 6M6 10L10 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      )}
    </svg>
  );
}
