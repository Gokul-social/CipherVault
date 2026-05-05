import React from "react";
import { cn } from "../../lib/cn";
import { Badge } from "../ui/Badge";
import { OrderEntry } from "../../hooks/useOrderStore";

interface OrderRowProps {
  order: OrderEntry;
}

export function OrderRow({ order }: OrderRowProps) {
  const isLong = order.direction === "long";

  return (
    <div
      className={cn(
        "flex items-center gap-4 rounded-xl border border-vault-border bg-vault-surface px-4 py-3",
        "transition-all duration-200 hover:border-vault-muted hover:-translate-y-px hover:shadow-card-hover"
      )}
    >
      {/* Direction Icon */}
      <div className={cn(
        "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg",
        isLong ? "bg-vault-success-dim" : "bg-vault-danger-dim"
      )}>
        {isLong ? <ArrowUpIcon /> : <ArrowDownIcon />}
      </div>

      {/* Order Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-body-sm font-medium text-vault-text">
            Order #{order.orderId}
          </span>
          <Badge variant={isLong ? "success" : "danger"}>
            {isLong ? "Long" : "Short"}
          </Badge>
        </div>
        <p className="mt-0.5 font-mono text-label-sm text-vault-muted truncate">
          Size: {order.encryptedSize.slice(0, 12)}... | Price: {order.encryptedPrice.slice(0, 12)}...
        </p>
      </div>

      {/* Timestamp */}
      <div className="text-right shrink-0">
        <div className="text-body-xs text-vault-subtext">
          {new Date(order.timestamp).toLocaleTimeString()}
        </div>
        <div className="text-label-sm text-vault-muted">
          {new Date(order.timestamp).toLocaleDateString()}
        </div>
      </div>

      {/* Status */}
      <div className="shrink-0">
        {order.isFilled ? (
          <Badge variant="success">Filled</Badge>
        ) : order.isCancelled ? (
          <Badge variant="danger">Cancelled</Badge>
        ) : (
          <Badge variant="accent" dot>Open</Badge>
        )}
      </div>
    </div>
  );
}

function ArrowUpIcon() {
  return (
    <svg className="h-3.5 w-3.5 text-vault-success" viewBox="0 0 16 16" fill="none">
      <path d="M8 12V4M5 7l3-3 3 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function ArrowDownIcon() {
  return (
    <svg className="h-3.5 w-3.5 text-vault-danger" viewBox="0 0 16 16" fill="none">
      <path d="M8 4v8M5 9l3 3 3-3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
