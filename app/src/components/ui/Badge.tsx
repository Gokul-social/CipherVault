import React from "react";
import { cn } from "../../lib/cn";

type BadgeVariant = "success" | "warning" | "danger" | "accent" | "neutral" | "purple";

interface BadgeProps {
  variant?: BadgeVariant;
  children: React.ReactNode;
  dot?: boolean;
  className?: string;
}

const variantClasses: Record<BadgeVariant, string> = {
  success: "bg-vault-success-dim text-vault-success border-vault-success/20",
  warning: "bg-vault-warning-dim text-vault-warning border-vault-warning/20",
  danger:  "bg-vault-danger-dim  text-vault-danger  border-vault-danger/20",
  accent:  "bg-vault-accent-glow text-vault-accent  border-vault-accent/20",
  neutral: "bg-vault-elevated    text-vault-subtext  border-vault-border",
  purple:  "bg-vault-purple-dim  text-vault-purple   border-vault-purple/20",
};

const dotClasses: Record<BadgeVariant, string> = {
  success: "bg-vault-success",
  warning: "bg-vault-warning",
  danger:  "bg-vault-danger",
  accent:  "bg-vault-accent",
  neutral: "bg-vault-muted",
  purple:  "bg-vault-purple",
};

export function Badge({
  variant = "neutral",
  children,
  dot = false,
  className,
}: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5",
        "text-label-sm font-medium tracking-wide uppercase",
        variantClasses[variant],
        className
      )}
    >
      {dot && (
        <span
          className={cn(
            "h-1.5 w-1.5 rounded-full animate-pulse-ring",
            dotClasses[variant]
          )}
        />
      )}
      {children}
    </span>
  );
}
