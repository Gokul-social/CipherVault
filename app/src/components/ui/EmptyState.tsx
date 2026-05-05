import React from "react";
import { cn } from "../../lib/cn";
import { Button } from "./Button";

interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description: string;
  action?: {
    label: string;
    onClick: () => void;
    loading?: boolean;
  };
  className?: string;
}

export function EmptyState({ icon, title, description, action, className }: EmptyStateProps) {
  return (
    <div className={cn("flex flex-col items-center justify-center py-16 text-center animate-fade-in", className)}>
      {icon && (
        <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-2xl border border-vault-border bg-vault-surface">
          {icon}
        </div>
      )}
      <h3 className="text-heading-md text-vault-text">{title}</h3>
      <p className="mt-2 max-w-sm text-body-sm text-vault-subtext">{description}</p>
      {action && (
        <div className="mt-6">
          <Button
            variant="primary"
            onClick={action.onClick}
            loading={action.loading}
          >
            {action.label}
          </Button>
        </div>
      )}
    </div>
  );
}
