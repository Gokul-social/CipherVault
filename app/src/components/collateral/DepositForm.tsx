"use client";

import React, { useState } from "react";
import { cn } from "../../lib/cn";
import { Button } from "../ui/Button";
import { usePriceFeed, priceToU64, PriceFeedAsset } from "../../hooks/usePriceFeed";

interface DepositFormProps {
  onDeposit: (rawAmount: bigint, usdPrice: bigint) => Promise<void>;
  isBusy: boolean;
  hasPositions: boolean;
  asset?: PriceFeedAsset;
}

export function DepositForm({
  onDeposit,
  isBusy,
  hasPositions,
  asset = "BTC",
}: DepositFormProps) {
  const [amount, setAmount] = useState("");
  const [error, setError]   = useState("");

  // Live oracle price — replaces hardcoded $65,000
  const { price, isLoading: priceLoading, isStale, error: priceError } = usePriceFeed(asset);

  // Asset-specific decimal precision
  const DECIMALS: Record<PriceFeedAsset, number> = { BTC: 8, ETH: 9, SOL: 9 };
  const DECIMAL_FACTOR = Math.pow(10, DECIMALS[asset]);

  const validate = (): boolean => {
    setError("");
    const amountNum = parseFloat(amount);

    if (!amount || isNaN(amountNum) || amountNum <= 0) {
      setError("Amount must be greater than 0");
      return false;
    }
    if (!hasPositions) {
      setError("Register a dWallet first before depositing");
      return false;
    }
    if (!price || isStale) {
      setError("Price feed unavailable or stale — cannot record deposit");
      return false;
    }
    return true;
  };

  const handleSubmit = async () => {
    if (!validate() || !price) return;

    // Convert to on-chain format using live oracle price
    const rawAmount  = BigInt(Math.floor(parseFloat(amount) * DECIMAL_FACTOR));
    const usdPrice6  = priceToU64(price); // price * 1_000_000

    await onDeposit(rawAmount, usdPrice6);
    setAmount("");
  };

  const amountNum   = parseFloat(amount) || 0;
  const previewUsd  = price && amountNum > 0 ? amountNum * price : null;

  return (
    <div className="rounded-xl border border-vault-border bg-vault-surface p-5 animate-fade-in">
      <h3 className="text-heading-sm text-vault-text mb-4 flex items-center gap-2">
        <DepositIcon />
        Deposit Collateral
      </h3>

      {/* Amount Input */}
      <div>
        <label className="text-label-md uppercase tracking-widest text-vault-muted mb-1.5 block">
          Amount ({asset})
        </label>
        <input
          type="number"
          step={asset === "BTC" ? "0.00000001" : "0.000000001"}
          min="0"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder="0.00"
          disabled={isBusy}
          className={cn(
            "w-full rounded-lg border border-vault-border bg-vault-elevated px-3 py-2",
            "font-mono text-body-sm text-vault-text placeholder:text-vault-muted",
            "focus:outline-none focus:ring-2 focus:ring-vault-accent/40 focus:border-vault-accent",
            "transition-all duration-150",
            "disabled:opacity-50 disabled:cursor-not-allowed"
          )}
        />
      </div>

      {/* Oracle Price Display */}
      <div className="mt-3 flex items-center justify-between rounded-lg bg-vault-elevated px-3 py-2 border border-vault-border-subtle">
        <span className="text-body-xs text-vault-muted">Oracle Price ({asset}/USD):</span>
        {priceLoading ? (
          <span className="text-label-sm text-vault-muted animate-pulse">Fetching…</span>
        ) : priceError || !price ? (
          <span className="text-label-sm text-vault-danger">Unavailable</span>
        ) : (
          <span className={cn(
            "font-mono text-body-sm font-medium",
            isStale ? "text-vault-warning" : "text-vault-text"
          )}>
            ${price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            {isStale && <span className="ml-1 text-label-sm text-vault-warning">(stale)</span>}
          </span>
        )}
      </div>

      {/* USD Value Preview */}
      {previewUsd !== null && (
        <div className="mt-2 flex items-center gap-2 rounded-lg bg-vault-elevated px-3 py-2 border border-vault-border-subtle">
          <span className="text-body-xs text-vault-muted">Estimated Value:</span>
          <span className="font-mono text-body-sm font-medium text-vault-success">
            ${previewUsd.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </span>
        </div>
      )}

      {/* Error */}
      {error && <p className="mt-3 text-body-xs text-vault-danger">{error}</p>}

      {/* Submit */}
      <div className="mt-4">
        <Button
          variant="primary"
          onClick={handleSubmit}
          loading={isBusy}
          disabled={!hasPositions || !price || isStale}
          icon={<DepositIcon />}
          title={!hasPositions ? "Register a dWallet first" : !price ? "Awaiting price feed" : undefined}
        >
          Record Deposit
        </Button>
      </div>
    </div>
  );
}

function DepositIcon() {
  return (
    <svg className="h-3.5 w-3.5" viewBox="0 0 16 16" fill="none">
      <path d="M8 1v10M5 8l3 3 3-3" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M2 14h12" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
    </svg>
  );
}
