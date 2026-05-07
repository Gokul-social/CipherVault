"use client";

import React, { useState } from "react";
import { cn } from "../../lib/cn";
import { Button } from "../ui/Button";
import { ConfirmModal } from "../ui/ConfirmModal";
import { usePriceFeed, priceToU64, PriceFeedAsset } from "../../hooks/usePriceFeed";

interface WithdrawFormProps {
  onWithdraw: (rawAmount: bigint, usdPrice: bigint) => Promise<void>;
  isBusy: boolean;
  currentRawAmount: bigint;
  currentUsdValue: bigint;
  isWithdrawalSafe: (rawAmount: bigint, usdPrice: bigint) => boolean;
  assetLabel: string;
  asset?: PriceFeedAsset;
}

export function WithdrawForm({
  onWithdraw,
  isBusy,
  currentRawAmount,
  currentUsdValue,
  isWithdrawalSafe,
  assetLabel,
  asset = "BTC",
}: WithdrawFormProps) {
  const [amount, setAmount]         = useState("");
  const [error, setError]           = useState("");
  const [showConfirm, setShowConfirm] = useState(false);

  // Asset-specific decimal precision
  const DECIMALS: Record<PriceFeedAsset, number> = { BTC: 8, ETH: 9, SOL: 9 };
  const DECIMAL_FACTOR = Math.pow(10, DECIMALS[asset]);

  // Live oracle price — replaces hardcoded $65,000
  const { price, isLoading: priceLoading, isStale, error: priceError } = usePriceFeed(asset);

  const currentAmountDisplay = (Number(currentRawAmount) / DECIMAL_FACTOR).toFixed(DECIMALS[asset]);

  const validate = (): boolean => {
    setError("");
    const amountNum = parseFloat(amount);

    if (!amount || isNaN(amountNum) || amountNum <= 0) {
      setError("Amount must be greater than 0");
      return false;
    }
    if (!price || isStale) {
      setError("Price feed unavailable or stale — cannot record withdrawal");
      return false;
    }

    const rawAmount   = BigInt(Math.floor(amountNum * DECIMAL_FACTOR));
    const rawUsdPrice = priceToU64(price);

    if (rawAmount > currentRawAmount) {
      setError(`Insufficient balance. Max: ${currentAmountDisplay} ${assetLabel}`);
      return false;
    }
    if (!isWithdrawalSafe(rawAmount, rawUsdPrice)) {
      setError("Withdrawal would breach liquidation threshold. Reduce amount or repay credit first.");
      return false;
    }
    return true;
  };

  const handleSubmit = () => {
    if (!validate()) return;
    setShowConfirm(true);
  };

  const handleConfirm = async () => {
    if (!price) return;
    setShowConfirm(false);
    const rawAmount   = BigInt(Math.floor(parseFloat(amount) * DECIMAL_FACTOR));
    const rawUsdPrice = priceToU64(price);
    await onWithdraw(rawAmount, rawUsdPrice);
    setAmount("");
  };

  const amountNum = parseFloat(amount) || 0;
  const withdrawUsd = price ? amountNum * price : 0;
  const remainingDisplay = Math.max(0, Number(currentRawAmount) / DECIMAL_FACTOR - amountNum).toFixed(8);

  const rawAmountPreview = BigInt(Math.floor(amountNum * DECIMAL_FACTOR));
  const rawPricePreview  = price ? priceToU64(price) : BigInt(0);
  const isSafe = amountNum > 0 && price && !isStale
    ? isWithdrawalSafe(rawAmountPreview, rawPricePreview)
    : true;

  return (
    <>
      <div className="rounded-xl border border-vault-border bg-vault-surface p-5 animate-fade-in">
        <h3 className="text-heading-sm text-vault-text mb-4 flex items-center gap-2">
          <WithdrawIcon />
          Withdraw Collateral
        </h3>

        {/* Amount Input */}
        <div>
          <label className="text-label-md uppercase tracking-widest text-vault-muted mb-1.5 block">
            Amount ({assetLabel})
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
              "w-full rounded-lg border bg-vault-elevated px-3 py-2",
              "font-mono text-body-sm text-vault-text placeholder:text-vault-muted",
              "focus:outline-none focus:ring-2 focus:ring-vault-accent/40",
              "transition-all duration-150",
              "disabled:opacity-50 disabled:cursor-not-allowed",
              !isSafe && amountNum > 0
                ? "border-vault-danger/50 focus:ring-vault-danger/40"
                : "border-vault-border focus:border-vault-accent"
            )}
          />
          <div className="mt-1 flex justify-between">
            <span className="text-label-sm text-vault-muted">
              Available: {currentAmountDisplay} {assetLabel}
            </span>
            <button
              onClick={() => setAmount(currentAmountDisplay)}
              className="text-label-sm text-vault-accent hover:underline"
            >
              Max
            </button>
          </div>
        </div>

        {/* Oracle Price */}
        <div className="mt-3 flex items-center justify-between rounded-lg bg-vault-elevated px-3 py-2 border border-vault-border-subtle">
          <span className="text-body-xs text-vault-muted">Oracle Price ({asset}/USD):</span>
          {priceLoading ? (
            <span className="text-label-sm text-vault-muted animate-pulse">Fetching…</span>
          ) : priceError || !price ? (
            <span className="text-label-sm text-vault-danger">Unavailable</span>
          ) : (
            <span className={cn("font-mono text-body-sm font-medium", isStale ? "text-vault-warning" : "text-vault-text")}>
              ${price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              {isStale && <span className="ml-1 text-label-sm text-vault-warning">(stale)</span>}
            </span>
          )}
        </div>

        {/* Preview */}
        {amountNum > 0 && price && (
          <div className={cn(
            "mt-3 flex items-center justify-between rounded-lg px-3 py-2 border",
            isSafe ? "bg-vault-elevated border-vault-border-subtle" : "bg-vault-danger-dim border-vault-danger/20"
          )}>
            <div>
              <span className="text-body-xs text-vault-muted">Withdraw Value: </span>
              <span className="font-mono text-body-sm font-medium text-vault-text">
                ${withdrawUsd.toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </span>
            </div>
            <span className={cn("text-label-sm font-medium", isSafe ? "text-vault-success" : "text-vault-danger")}>
              {isSafe ? "✓ Safe" : "⚠ Unsafe"}
            </span>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="mt-3 flex items-center gap-2 rounded-lg bg-vault-danger-dim border border-vault-danger/20 px-3 py-2">
            <svg className="h-3.5 w-3.5 text-vault-danger shrink-0" viewBox="0 0 16 16" fill="none">
              <circle cx="8" cy="8" r="7" stroke="currentColor" strokeWidth="1.3" />
              <path d="M8 5v3M8 10v.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
            <p className="text-body-xs text-vault-danger">{error}</p>
          </div>
        )}

        {/* Submit */}
        <div className="mt-4">
          <Button
            variant="danger"
            onClick={handleSubmit}
            loading={isBusy}
            disabled={currentRawAmount === BigInt(0) || !price || isStale}
            icon={<WithdrawIcon />}
          >
            Withdraw
          </Button>
        </div>
      </div>

      <ConfirmModal
        isOpen={showConfirm}
        onClose={() => setShowConfirm(false)}
        onConfirm={handleConfirm}
        title="Confirm Withdrawal"
        description={`You are about to withdraw ${amount} ${assetLabel} (~$${withdrawUsd.toLocaleString()}). Remaining balance will be ${remainingDisplay} ${assetLabel}.`}
        confirmLabel="Withdraw"
        variant="warning"
        loading={isBusy}
      />
    </>
  );
}

function WithdrawIcon() {
  return (
    <svg className="h-3.5 w-3.5" viewBox="0 0 16 16" fill="none">
      <path d="M8 11V1M5 4l3-3 3 3" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M2 14h12" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
    </svg>
  );
}
