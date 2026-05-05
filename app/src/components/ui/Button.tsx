import React from "react";
import { cn } from "../../lib/cn";

type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";
type ButtonSize    = "sm" | "md" | "lg";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?:    ButtonSize;
  loading?: boolean;
  icon?:    React.ReactNode;
  iconRight?: React.ReactNode;
}

const variantClasses: Record<ButtonVariant, string> = {
  primary:
    "bg-vault-accent text-white border-transparent " +
    "hover:bg-vault-accent-dim active:scale-[0.97] " +
    "disabled:opacity-40 disabled:cursor-not-allowed disabled:active:scale-100 " +
    "shadow-sm",
  secondary:
    "bg-transparent text-vault-text border-vault-border " +
    "hover:bg-vault-elevated hover:border-vault-muted active:scale-[0.97] " +
    "disabled:opacity-40 disabled:cursor-not-allowed",
  ghost:
    "bg-transparent text-vault-subtext border-transparent " +
    "hover:bg-vault-elevated hover:text-vault-text active:scale-[0.97] " +
    "disabled:opacity-40 disabled:cursor-not-allowed",
  danger:
    "bg-vault-danger-dim text-vault-danger border-vault-danger/30 " +
    "hover:bg-vault-danger hover:text-white active:scale-[0.97] " +
    "disabled:opacity-40 disabled:cursor-not-allowed",
};

const sizeClasses: Record<ButtonSize, string> = {
  sm: "h-7  px-3   text-body-xs  gap-1.5 rounded-md",
  md: "h-9  px-4   text-body-sm  gap-2   rounded-lg",
  lg: "h-11 px-5   text-body-md  gap-2   rounded-lg",
};

export function Button({
  variant   = "primary",
  size      = "md",
  loading   = false,
  icon,
  iconRight,
  children,
  className,
  disabled,
  ...props
}: ButtonProps) {
  return (
    <button
      disabled={disabled || loading}
      className={cn(
        "inline-flex items-center justify-center font-medium border",
        "transition-all duration-150 ease-out select-none",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-vault-accent/50",
        variantClasses[variant],
        sizeClasses[size],
        className
      )}
      {...props}
    >
      {loading ? (
        <>
          <Spinner />
          <span className="opacity-70">{children}</span>
        </>
      ) : (
        <>
          {icon && <span className="shrink-0">{icon}</span>}
          {children}
          {iconRight && <span className="shrink-0">{iconRight}</span>}
        </>
      )}
    </button>
  );
}

function Spinner() {
  return (
    <svg
      className="h-3.5 w-3.5 animate-spin"
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
    >
      <circle
        className="opacity-25"
        cx="12" cy="12" r="10"
        stroke="currentColor" strokeWidth="4"
      />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
      />
    </svg>
  );
}
