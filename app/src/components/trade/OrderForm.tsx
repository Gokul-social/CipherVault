"use client";

import React, { useState } from "react";
import { cn } from "../../lib/cn";
import { Button } from "../ui/Button";
import { ConfirmModal } from "../ui/ConfirmModal";

const ASSET_PAIRS = [
  { id: "BTC", label: "BTC/USD", decimals: 8,  multiplier: 100_000_000, defaultPrice: "65000" },
  { id: "ETH", label: "ETH/USD", decimals: 6,  multiplier: 1_000_000,   defaultPrice: "3200"  },
  { id: "SOL", label: "SOL/USD", decimals: 4,  multiplier: 10_000,      defaultPrice: "170"   },
];

interface OrderFormProps {
  onSubmit: (size: bigint, price: bigint, direction: number, asset: string) => Promise<void>;
  isBusy: boolean;
  availableCredit: string;
}

export function OrderForm({ onSubmit, isBusy, availableCredit }: OrderFormProps) {
  const [assetIndex, setAssetIndex] = useState(0);
  const [size, setSize]             = useState("");
  const [price, setPrice]           = useState(ASSET_PAIRS[0].defaultPrice);
  const [direction, setDirection]   = useState<0 | 1>(0); // 0=Long, 1=Short
  const [error, setError]           = useState("");
  const [showConfirm, setShowConfirm] = useState(false);

  const pair = ASSET_PAIRS[assetIndex];

  const handleAssetChange = (idx: number) => {
    setAssetIndex(idx);
    setSize("");
    setPrice(ASSET_PAIRS[idx].defaultPrice);
    setError("");
  };

  const validate = (): boolean => {
    setError("");
    const sizeNum  = parseFloat(size);
    const priceNum = parseFloat(price);
    if (!size || isNaN(sizeNum) || sizeNum <= 0) {
      setError("Order size must be greater than 0");
      return false;
    }
    if (!price || isNaN(priceNum) || priceNum <= 0) {
      setError("Limit price must be greater than 0");
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
    const rawSize  = BigInt(Math.floor(parseFloat(size) * pair.multiplier));
    const rawPrice = BigInt(Math.floor(parseFloat(price) * 1_000_000));
    await onSubmit(rawSize, rawPrice, direction, pair.id);
    setSize("");
  };

  const notional = (parseFloat(size) || 0) * (parseFloat(price) || 0);

  return (
    <>
      <div className="rounded-xl border border-vault-border bg-vault-surface p-5 animate-fade-in">
        <h3 className="text-heading-sm text-vault-text mb-4 flex items-center gap-2">
          <OrderIcon />
          Place Encrypted Order
        </h3>

        {/* Asset Pair Selector */}
        <div className="mb-4">
          <label className="text-label-md uppercase tracking-widest text-vault-muted mb-1.5 block">
            Asset Pair
          </label>
          <div className="flex gap-1 rounded-lg bg-vault-elevated p-1">
            {ASSET_PAIRS.map((p, idx) => (
              <button
                key={p.id}
                onClick={() => handleAssetChange(idx)}
                className={cn(
                  "flex-1 rounded-md py-1.5 text-body-xs font-medium transition-all duration-150",
                  assetIndex === idx
                    ? "bg-vault-surface text-vault-text shadow-sm"
                    : "text-vault-subtext hover:text-vault-text"
                )}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        {/* Direction Toggle */}
        <div className="flex gap-1 rounded-lg bg-vault-elevated p-1 mb-4">
          <button
            onClick={() => setDirection(0)}
            className={cn(
              "flex-1 rounded-md py-2 text-body-sm font-medium transition-all duration-150",
              direction === 0
                ? "bg-vault-success text-white shadow-sm"
                : "text-vault-subtext hover:text-vault-text"
            )}
          >
            Long
          </button>
          <button
            onClick={() => setDirection(1)}
            className={cn(
              "flex-1 rounded-md py-2 text-body-sm font-medium transition-all duration-150",
              direction === 1
                ? "bg-vault-danger text-white shadow-sm"
                : "text-vault-subtext hover:text-vault-text"
            )}
          >
            Short
          </button>
        </div>

        {/* Size Input */}
        <div className="mb-3">
          <label className="text-label-md uppercase tracking-widest text-vault-muted mb-1.5 block">
            Size ({pair.id})
          </label>
          <input
            type="number"
            step={1 / pair.multiplier}
            min="0"
            value={size}
            onChange={(e) => setSize(e.target.value)}
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

        {/* Price Input */}
        <div className="mb-3">
          <label className="text-label-md uppercase tracking-widest text-vault-muted mb-1.5 block">
            Limit Price (USD)
          </label>
          <input
            type="number"
            step="0.01"
            min="0"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            placeholder={pair.defaultPrice}
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

        {/* Order Summary */}
        {notional > 0 && (
          <div className="mb-4 rounded-lg bg-vault-elevated border border-vault-border-subtle p-3 space-y-1.5">
            <div className="flex justify-between text-body-xs">
              <span className="text-vault-muted">Notional</span>
              <span className="font-mono text-vault-text">
                ${notional.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>
            <div className="flex justify-between text-body-xs">
              <span className="text-vault-muted">Direction</span>
              <span className={cn("font-medium", direction === 0 ? "text-vault-success" : "text-vault-danger")}>
                {direction === 0 ? "Long" : "Short"} {pair.id}
              </span>
            </div>
            <div className="flex justify-between text-body-xs">
              <span className="text-vault-muted">Encryption</span>
              <span className="text-vault-accent font-mono">FHE (Mock)</span>
            </div>
            <div className="flex justify-between text-body-xs">
              <span className="text-vault-muted">Available Credit</span>
              <span className="font-mono text-vault-text">{availableCredit}</span>
            </div>
          </div>
        )}

        {/* FHE Notice */}
        <div className="mb-4 flex items-center gap-2 rounded-lg border border-vault-accent/20 bg-vault-accent-glow px-3 py-2">
          <LockIcon />
          <span className="text-body-xs text-vault-accent">
            Size and price will be encrypted using Encrypt FHE before submission
          </span>
        </div>

        {/* Error */}
        {error && (
          <p className="mb-4 text-body-xs text-vault-danger">{error}</p>
        )}

        {/* Submit */}
        <Button
          variant="primary"
          size="lg"
          className="w-full"
          onClick={handleSubmit}
          loading={isBusy}
          icon={<OrderIcon />}
        >
          {direction === 0 ? `Place Long ${pair.id}` : `Place Short ${pair.id}`}
        </Button>
      </div>

      <ConfirmModal
        isOpen={showConfirm}
        onClose={() => setShowConfirm(false)}
        onConfirm={handleConfirm}
        title="Confirm Order"
        description={`Place a ${direction === 0 ? "Long" : "Short"} order for ${size} ${pair.id} at $${price}. Notional: $${notional.toLocaleString(undefined, { maximumFractionDigits: 2 })}.`}
        confirmLabel="Encrypt & Submit"
        variant="accent"
        loading={isBusy}
      />
    </>
  );
}

function OrderIcon() {
  return (
    <svg className="h-3.5 w-3.5" viewBox="0 0 16 16" fill="none">
      <path d="M3 3l5 10 2-5 5-2L3 3z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" />
    </svg>
  );
}

function LockIcon() {
  return (
    <svg className="h-3.5 w-3.5 text-vault-accent" viewBox="0 0 16 16" fill="none">
      <rect x="3" y="7" width="10" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.2" />
      <path d="M5 7V5a3 3 0 016 0v2" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
    </svg>
  );
}

