"use client";

import React, { useState } from "react";
import { cn } from "../../lib/cn";
import { Button } from "../ui/Button";
import { ConfirmModal } from "../ui/ConfirmModal";
import { formatUsd } from "../../lib/format";

interface WithdrawFormProps {
  onWithdraw: (amount: bigint, usdPrice: bigint) => Promise<void>;
  isBusy: boolean;
  currentRawAmount: bigint;
  currentUsdValue: bigint;
  isWithdrawalSafe: (amount: bigint, usdPrice: bigint) => boolean;
  assetLabel: string;
}

export function WithdrawForm({
  onWithdraw,
  isBusy,
  currentRawAmount,
  currentUsdValue,
  isWithdrawalSafe,
  assetLabel,
}: WithdrawFormProps) {
  const [amount, setAmount] = useState("");
  const [usdPrice, setUsdPrice] = useState("65000");
  const [error, setError] = useState("");
  const [showConfirm, setShowConfirm] = useState(false);

  const validate = (): boolean => {
    setError("");
    const amountNum = parseFloat(amount);
    const priceNum = parseFloat(usdPrice);

    if (!amount || isNaN(amountNum) || amountNum <= 0) {
      setError("Amount must be greater than 0");
      return false;
    }
    if (!usdPrice || isNaN(priceNum) || priceNum <= 0) {
      setError("USD price must be greater than 0");
      return false;
    }

    const rawAmount = BigInt(Math.floor(amountNum * 100_000_000));
    if (rawAmount > currentRawAmount) {
      setError(`Insufficient balance. Max: ${Number(currentRawAmount) / 100_000_000}`);
      return false;
    }

    const rawUsdPrice = BigInt(Math.floor(priceNum * 1_000_000));
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
    setShowConfirm(false);
    const rawAmount = BigInt(Math.floor(parseFloat(amount) * 100_000_000));
    const rawUsdPrice = BigInt(Math.floor(parseFloat(usdPrice) * 1_000_000));
    await onWithdraw(rawAmount, rawUsdPrice);
    setAmount("");
  };

  const amountNum = parseFloat(amount) || 0;
  const priceNum = parseFloat(usdPrice) || 0;
  const withdrawUsd = amountNum * priceNum;
  const remainingRaw = Math.max(0, Number(currentRawAmount) / 100_000_000 - amountNum);

  // Safety check for preview
  const rawAmountPreview = BigInt(Math.floor(amountNum * 100_000_000));
  const rawPricePreview = BigInt(Math.floor(priceNum * 1_000_000));
  const isSafe = amountNum > 0 && priceNum > 0
    ? isWithdrawalSafe(rawAmountPreview, rawPricePreview)
    : true;

  return (
    <>
      <div className="rounded-xl border border-vault-border bg-vault-surface p-5 animate-fade-in">
        <h3 className="text-heading-sm text-vault-text mb-4 flex items-center gap-2">
          <WithdrawIcon />
          Withdraw Collateral
        </h3>

        <div className="grid grid-cols-2 gap-4">
          {/* Amount Input */}
          <div>
            <label className="text-label-md uppercase tracking-widest text-vault-muted mb-1.5 block">
              Amount ({assetLabel})
            </label>
            <input
              type="number"
              step="0.00000001"
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
                Available: {(Number(currentRawAmount) / 100_000_000).toFixed(8)}
              </span>
              <button
                onClick={() => setAmount((Number(currentRawAmount) / 100_000_000).toString())}
                className="text-label-sm text-vault-accent hover:underline"
              >
                Max
              </button>
            </div>
          </div>

          {/* USD Price */}
          <div>
            <label className="text-label-md uppercase tracking-widest text-vault-muted mb-1.5 block">
              USD Price
            </label>
            <input
              type="number"
              step="0.01"
              min="0"
              value={usdPrice}
              onChange={(e) => setUsdPrice(e.target.value)}
              placeholder="65000"
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
        </div>

        {/* Preview */}
        {amountNum > 0 && (
          <div className={cn(
            "mt-3 flex items-center justify-between rounded-lg px-3 py-2 border",
            isSafe
              ? "bg-vault-elevated border-vault-border-subtle"
              : "bg-vault-danger-dim border-vault-danger/20"
          )}>
            <div>
              <span className="text-body-xs text-vault-muted">Withdraw Value: </span>
              <span className="font-mono text-body-sm font-medium text-vault-text">
                ${withdrawUsd.toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className={cn(
                "text-label-sm font-medium",
                isSafe ? "text-vault-success" : "text-vault-danger"
              )}>
                {isSafe ? "✓ Safe" : "⚠ Unsafe"}
              </span>
            </div>
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
            disabled={currentRawAmount === BigInt(0)}
            icon={<WithdrawIcon />}
          >
            Withdraw
          </Button>
        </div>
      </div>

      {/* Confirmation Modal */}
      <ConfirmModal
        isOpen={showConfirm}
        onClose={() => setShowConfirm(false)}
        onConfirm={handleConfirm}
        title="Confirm Withdrawal"
        description={`You are about to withdraw ${amount} ${assetLabel} (~$${withdrawUsd.toLocaleString()}). Remaining balance will be ${remainingRaw.toFixed(8)} ${assetLabel}.`}
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
