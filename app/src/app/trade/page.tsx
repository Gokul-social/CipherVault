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
import { useOrderStore, buildPlaceOrderIx, deriveProtocolPda, deriveOrderPda, CORE_PROGRAM_ID } from "../../hooks/useOrderStore";
import { useCollateralStore } from "../../hooks/useCollateralStore";
import { useTransactionStore } from "../../hooks/useTransactionStore";
import { useHistoryStore } from "../../hooks/useHistoryStore";
import { shortenAddress, formatUsd, availableCredit } from "../../lib/format";

export default function TradePage() {
  const { publicKey, sendTransaction } = useWallet();
  const { connection } = useConnection();

  const orders = useOrderStore((s) => s.orders);
  const addOrder = useOrderStore((s) => s.addOrder);
  const isPlacing = useOrderStore((s) => s.isPlacing);
  const setPlacing = useOrderStore((s) => s.setPlacing);
  const settlements = useOrderStore((s) => s.settlements);

  const collateral = useCollateralStore();
  const runTransaction = useTransactionStore((s) => s.runTransaction);
  const addHistoryEntry = useHistoryStore((s) => s.addEntry);

  const loadData = useCallback(async () => {
    if (!publicKey) return;
    await collateral.fetchPositions(connection, publicKey);
  }, [publicKey, connection]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handlePlaceOrder = async (size: bigint, price: bigint, direction: number) => {
    if (!publicKey) return;
    setPlacing(true);

    try {
      // Step 1: Encrypt using mock FHE
      const encryptedSize = Buffer.alloc(32);
      encryptedSize.writeBigUInt64LE(size, 0);
      encryptedSize.set(Buffer.from("MOCK_FHE_"), 8);

      const encryptedPrice = Buffer.alloc(32);
      encryptedPrice.writeBigUInt64LE(price, 0);
      encryptedPrice.set(Buffer.from("MOCK_FHE_"), 8);

      // Step 2: Build and send transaction
      const protocolPda = deriveProtocolPda();
      // Use a counter based on existing orders length
      const orderIndex = BigInt(orders.length);
      const orderPda = deriveOrderPda(publicKey, orderIndex);

      const sig = await runTransaction({
        label: `Place ${direction === 0 ? "Long" : "Short"} order (FHE encrypted)`,
        buildTx: () => {
          const ix = buildPlaceOrderIx(
            publicKey,
            protocolPda,
            orderPda,
            encryptedSize,
            encryptedPrice,
            direction
          );
          const tx = new Transaction().add(ix);
          tx.feePayer = publicKey;
          return tx;
        },
        connection,
        sendTransaction,
        onSuccess: (txSig) => {
          const order = {
            orderId: orders.length,
            direction: direction === 0 ? "long" as const : "short" as const,
            encryptedSize: encryptedSize.toString("hex"),
            encryptedPrice: encryptedPrice.toString("hex"),
            timestamp: Date.now(),
            isFilled: false,
            isCancelled: false,
            txSig,
          };
          addOrder(order);

          addHistoryEntry({
            id: `order-${Date.now()}`,
            type: "order",
            description: `Placed ${direction === 0 ? "Long" : "Short"} order`,
            amount: `${Number(size) / 100_000_000} BTC @ $${Number(price) / 1_000_000}`,
            status: "confirmed",
            timestamp: Date.now(),
          });
        },
      });
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
          description="Connect a Solana wallet to access the encrypted order book."
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
      pageSubtitle={`Encrypted order book · ${shortenAddress(publicKey.toBase58())}`}
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
            subtitle="Your encrypted orders on the FHE order book"
          >
            {orders.length === 0 ? (
              <EmptyState
                icon={<OrderListIcon />}
                title="No Orders"
                description="Place your first encrypted order to start trading."
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

// ── Icons ──────────────────────────────────────────────────────────────────

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
