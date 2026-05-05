"use client";

import React, { useState } from "react";
import { cn } from "../../lib/cn";
import { Button } from "../ui/Button";

interface DepositFormProps {
  onDeposit: (amount: bigint, usdPrice: bigint) => Promise<void>;
  isBusy: boolean;
  hasPositions: boolean;
}

export function DepositForm({ onDeposit, isBusy, hasPositions }: DepositFormProps) {
  const [amount, setAmount] = useState("");
  const [usdPrice, setUsdPrice] = useState("65000");
  const [error, setError] = useState("");

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
    if (!hasPositions) {
      setError("Register a dWallet first before depositing");
      return false;
    }
    return true;
  };

  const handleSubmit = async () => {
    if (!validate()) return;

    // Convert to on-chain format: amount in sats (8 decimals), price in 6 decimal USD
    const rawAmount = BigInt(Math.floor(parseFloat(amount) * 100_000_000)); // sats
    const rawUsdPrice = BigInt(Math.floor(parseFloat(usdPrice) * 1_000_000)); // 6 dec USD

    await onDeposit(rawAmount, rawUsdPrice);
    setAmount("");
  };

  const previewUsd = amount && usdPrice
    ? (parseFloat(amount) * parseFloat(usdPrice)).toFixed(2)
    : null;

  return (
    <div className="rounded-xl border border-vault-border bg-vault-surface p-5 animate-fade-in">
      <h3 className="text-heading-sm text-vault-text mb-4 flex items-center gap-2">
        <DepositIcon />
        Deposit Collateral
      </h3>

      <div className="grid grid-cols-2 gap-4">
        {/* Amount Input */}
        <div>
          <label className="text-label-md uppercase tracking-widest text-vault-muted mb-1.5 block">
            Amount (BTC)
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
              "w-full rounded-lg border border-vault-border bg-vault-elevated px-3 py-2",
              "font-mono text-body-sm text-vault-text placeholder:text-vault-muted",
              "focus:outline-none focus:ring-2 focus:ring-vault-accent/40 focus:border-vault-accent",
              "transition-all duration-150",
              "disabled:opacity-50 disabled:cursor-not-allowed"
            )}
          />
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

      {/* USD Preview */}
      {previewUsd && (
        <div className="mt-3 flex items-center gap-2 rounded-lg bg-vault-elevated px-3 py-2 border border-vault-border-subtle">
          <span className="text-body-xs text-vault-muted">Estimated Value:</span>
          <span className="font-mono text-body-sm font-medium text-vault-success">
            ${parseFloat(previewUsd).toLocaleString()}
          </span>
        </div>
      )}

      {/* Error */}
      {error && (
        <p className="mt-3 text-body-xs text-vault-danger">{error}</p>
      )}

      {/* Submit */}
      <div className="mt-4">
        <Button
          variant="primary"
          onClick={handleSubmit}
          loading={isBusy}
          disabled={!hasPositions}
          icon={<DepositIcon />}
          title={!hasPositions ? "Register a dWallet first" : undefined}
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
