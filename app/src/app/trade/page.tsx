"use client";

import React, { useEffect, useCallback } from "react";
import { useWallet, useConnection } from "@solana/wallet-adapter-react";
import { Transaction } from "@solana/web3.js";
import { AppLayout } from "../../layouts/AppLayout";
import { SectionContainer } from "../../components/ui/SectionContainer";
import { EmptyState } from "../../components/ui/EmptyState";
import { OrderForm } from "../../components/trade/OrderForm";
import { OrderRow } from "../../components/trade/OrderRow";
import { StatCard } from "../../components/ui/StatCard";
import {
  useOrderStore,
  buildPlaceOrderIx,
  encodePlaintextOrder,
  deriveProtocolPda,
  deriveOrderPda,
} from "../../hooks/useOrderStore";
import { useCollateralStore } from "../../hooks/useCollateralStore";
import { useTransactionStore } from "../../hooks/useTransactionStore";
import { useHistoryStore } from "../../hooks/useHistoryStore";
import { ENCRYPT_ENABLED } from "../../lib/config";
import { shortenAddress, formatUsd, availableCredit } from "../../lib/format";

export default function TradePage() {
  const { publicKey, sendTransaction } = useWallet();
  const { connection } = useConnection();

  const orders             = useOrderStore((s) => s.orders);
  const addOrder           = useOrderStore((s) => s.addOrder);
  const isPlacing          = useOrderStore((s) => s.isPlacing);
  const setPlacing         = useOrderStore((s) => s.setPlacing);
  const nextOrderIndex     = useOrderStore((s) => s.nextOrderIndex);
  const incrementOrderIndex = useOrderStore((s) => s.incrementOrderIndex);
  const settlements        = useOrderStore((s) => s.settlements);

  const collateral      = useCollateralStore();
  const runTransaction  = useTransactionStore((s) => s.runTransaction);
  const addHistoryEntry = useHistoryStore((s) => s.addEntry);

  const loadData = useCallback(async () => {
    if (!publicKey) return;
    await collateral.fetchPositions(connection, publicKey);
  }, [publicKey, connection]);

  useEffect(() => { loadData(); }, [loadData]);

  /**
   * Places a real on-chain order via the ciphervault-core program.
   *
   * ENCRYPT_ENABLED=false (default):
   *   Size and price are serialised as plaintext u64 LE bytes.
   *   The order is stored on-chain as a real EncryptedOrder account,
   *   but the data is not privacy-preserving. This is the correct
   *   behaviour for the pre-Encrypt-alpha devnet demo.
   *
   * ENCRYPT_ENABLED=true (future):
   *   Size and price are encrypted via the Encrypt SDK before
   *   submission. No code changes required here — just set the flag.
   */
  const handlePlaceOrder = async (
    size: bigint,
    price: bigint,
    direction: number,
    asset: string
  ) => {
    if (!publicKey) return;
    const dir = (direction === 0 ? 0 : 1) as 0 | 1;
    setPlacing(true);

    try {
      // Build size/price payloads
      let encryptedSize: Buffer;
      let encryptedPrice: Buffer;

      if (ENCRYPT_ENABLED) {
        // Future: const { encryptedSize, encryptedPrice } = await encryptClient.createEncryptedOrder({ size, price, ... })
        throw new Error("ENCRYPT_ENABLED=true but Encrypt SDK is not yet integrated");
      } else {
        ({ encryptedSize, encryptedPrice } = encodePlaintextOrder(size, price));
      }

      // Derive on-chain accounts
      const protocolPda = deriveProtocolPda();
      const orderIndex  = BigInt(nextOrderIndex);
      const orderPda    = deriveOrderPda(publicKey, orderIndex);

      const dirLabel = dir === 0 ? "long" : "short";
      const assetDecimals = asset === "BTC" ? 100_000_000 : asset === "ETH" ? 1_000_000 : 10_000;
      const sizeDisplay  = (Number(size)  / assetDecimals).toFixed(4);
      const priceDisplay = (Number(price) / 1_000_000).toFixed(2);

      const sig = await runTransaction({
        label: `${direction === 0 ? "Long" : "Short"} ${asset} order`,
        buildTx: () => {
          const ix = buildPlaceOrderIx(
            publicKey,
            protocolPda,
            orderPda,
            encryptedSize,
            encryptedPrice,
            dir
          );
          const tx = new Transaction().add(ix);
          tx.feePayer = publicKey;
          return tx;
        },
        connection,
        sendTransaction,
        onSuccess: (txSig) => {
          // Increment order index after confirmed submission
          incrementOrderIndex();

          addOrder({
            orderId: nextOrderIndex,
            direction: dirLabel as "long" | "short",
            encryptedSize: encryptedSize.toString("hex"),
            encryptedPrice: encryptedPrice.toString("hex"),
            timestamp: Date.now(),
            isFilled: false,
            isCancelled: false,
            txSig,
          });

          addHistoryEntry({
            id: `order-${Date.now()}`,
            type: "order",
            description: `${dir === 0 ? "Long" : "Short"} ${asset} Order #${nextOrderIndex}`,
            amount: `${sizeDisplay} ${asset} @ $${priceDisplay}`,
            status: "confirmed",
            timestamp: Date.now(),
            txSig,
            asset,
          });
        },
      });

      if (!sig) {
        // runTransaction returned null → tx failed, already surfaced via toast
        setPlacing(false);
        return;
      }
    } finally {
      setPlacing(false);
    }
  };

  if (!publicKey) {
    return (
      <AppLayout pageTitle="Trade">
        <EmptyState
          icon={<TradeIcon />}
          title="Connect Your Wallet"
          description="Connect a Solana wallet to access the order book."
        />
      </AppLayout>
    );
  }

  const { totalCollateralUsd, usedCreditUsd, ltvBps, vaultExists } = collateral;
  const avail = vaultExists
    ? formatUsd(availableCredit(totalCollateralUsd, usedCreditUsd, ltvBps))
    : "$0.00";

  return (
    <AppLayout
      pageTitle="Trade"
      pageSubtitle={`${ENCRYPT_ENABLED ? "FHE-encrypted" : "On-chain"} order book · ${shortenAddress(publicKey.toBase58())}`}
      onRefresh={loadData}
    >
      <div className="grid grid-cols-3 gap-6">
        {/* Left: Order Form */}
        <div className="col-span-1">
          <OrderForm
            onSubmit={handlePlaceOrder}
            isBusy={isPlacing}
            availableCredit={avail}
          />
        </div>

        {/* Right: Orders + Settlements */}
        <div className="col-span-2 space-y-8">
          {/* Credit Metrics */}
          <div className="grid grid-cols-3 gap-4">
            <StatCard
              label="Available Credit"
              value={avail}
              subValue="For margin"
              accentColor="accent"
            />
            <StatCard
              label="Active Orders"
              value={String(orders.filter((o) => !o.isFilled && !o.isCancelled).length)}
              subValue="Open positions"
              accentColor="purple"
            />
            <StatCard
              label="Settlements"
              value={String(settlements.length)}
              subValue="Completed trades"
              accentColor="success"
            />
          </div>

          {/* Active Orders */}
          <SectionContainer
            title="Active Orders"
            subtitle={
              ENCRYPT_ENABLED
                ? "Your FHE-encrypted orders on the confidential order book"
                : "Your on-chain orders (plaintext — Encrypt FHE pending pre-alpha)"
            }
          >
            {orders.length === 0 ? (
              <EmptyState
                icon={<OrderListIcon />}
                title="No Orders"
                description="Place your first order to start trading."
              />
            ) : (
              <div className="space-y-2">
                {orders.map((order) => (
                  <OrderRow key={order.orderId} order={order} />
                ))}
              </div>
            )}
          </SectionContainer>

          {/* Settlements */}
          {settlements.length > 0 && (
            <SectionContainer
              title="Recent Settlements"
              subtitle="Completed trade settlements"
            >
              <div className="rounded-xl border border-vault-border bg-vault-surface overflow-hidden">
                <table className="w-full text-body-xs">
                  <thead>
                    <tr className="border-b border-vault-border-subtle">
                      <th className="px-4 py-2 text-left text-label-md uppercase tracking-widest text-vault-muted">ID</th>
                      <th className="px-4 py-2 text-left text-label-md uppercase tracking-widest text-vault-muted">Buyer</th>
                      <th className="px-4 py-2 text-left text-label-md uppercase tracking-widest text-vault-muted">Seller</th>
                      <th className="px-4 py-2 text-right text-label-md uppercase tracking-widest text-vault-muted">Size</th>
                      <th className="px-4 py-2 text-right text-label-md uppercase tracking-widest text-vault-muted">Price</th>
                      <th className="px-4 py-2 text-right text-label-md uppercase tracking-widest text-vault-muted">Fee</th>
                    </tr>
                  </thead>
                  <tbody>
                    {settlements.map((s) => (
                      <tr key={s.settlementId} className="border-b border-vault-border-subtle last:border-0">
                        <td className="px-4 py-2 font-mono text-vault-text">#{s.settlementId}</td>
                        <td className="px-4 py-2 font-mono text-vault-subtext">{shortenAddress(s.buyer)}</td>
                        <td className="px-4 py-2 font-mono text-vault-subtext">{shortenAddress(s.seller)}</td>
                        <td className="px-4 py-2 text-right font-mono text-vault-text">{Number(s.settledSize)}</td>
                        <td className="px-4 py-2 text-right font-mono text-vault-text">${Number(s.settledPrice)}</td>
                        <td className="px-4 py-2 text-right font-mono text-vault-muted">${Number(s.feeAmount)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </SectionContainer>
          )}
        </div>
      </div>
    </AppLayout>
  );
}

function TradeIcon() {
  return (
    <svg className="h-7 w-7 text-vault-accent" viewBox="0 0 24 24" fill="none">
      <path d="M3 3l8 18 3-9 9-3L3 3z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
    </svg>
  );
}

function OrderListIcon() {
  return (
    <svg className="h-7 w-7 text-vault-accent" viewBox="0 0 24 24" fill="none">
      <rect x="3" y="3" width="18" height="18" rx="3" stroke="currentColor" strokeWidth="1.5" />
      <path d="M7 8h10M7 12h7M7 16h4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}
