"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useConnection } from "@solana/wallet-adapter-react";
import { PublicKey, AccountInfo } from "@solana/web3.js";
import { PYTH_FEEDS } from "../lib/config";

// ── Pyth Price Account Layout ─────────────────────────────────────────────
// Pyth V2 price accounts on devnet.
// Layout reference: https://docs.pyth.network/documentation/pythnet-price-feeds/account-structure
//
// Relevant fields:
//   offset 0   : magic (u32)
//   offset 4   : version (u32)
//   offset 8   : type (u32)  — 3 = price account
//   offset 12  : size (u32)
//   offset 16  : price_type (u32)
//   offset 20  : exponent (i32)  — price * 10^exponent = USD
//   offset 24  : num_component_prices (u32)
//   offset 28  : num_quoters (u32)
//   ...
//   offset 208 : agg.price (i64)   ← current aggregate price
//   offset 216 : agg.conf (u64)    ← confidence interval
//   offset 224 : agg.status (u32)  — 1 = Trading
//   offset 228 : agg.corp_act (u32)
//   offset 232 : agg.pub_slot (u64)

const PYTH_MAGIC = 0xa1b2c3d4;
const PRICE_STATUS_TRADING = 1;

function parsePythPrice(data: Buffer): { price: number; confidence: number; exponent: number; status: number } | null {
  if (data.length < 240) return null;

  const magic = data.readUInt32LE(0);
  if (magic !== PYTH_MAGIC) return null;

  const exponent = data.readInt32LE(20);
  const rawPrice = data.readBigInt64LE(208);
  const rawConf  = data.readBigUInt64LE(216);
  const status   = data.readUInt32LE(224);

  if (rawPrice <= BigInt(0)) return null;

  const multiplier = Math.pow(10, exponent);
  const price      = Number(rawPrice) * multiplier;
  const confidence = Number(rawConf)  * Math.abs(multiplier);

  return { price, confidence, exponent, status };
}

// ── Types ─────────────────────────────────────────────────────────────────

export type PriceFeedAsset = "BTC" | "ETH" | "SOL";

export interface PriceFeedState {
  price: number | null;          // USD price
  confidence: number | null;     // ± confidence interval
  isLoading: boolean;
  isStale: boolean;              // true if status !== Trading
  error: string | null;
  lastUpdatedMs: number | null;
}

const FEED_ACCOUNTS: Record<PriceFeedAsset, PublicKey> = {
  BTC: PYTH_FEEDS.BTC_USD,
  ETH: PYTH_FEEDS.ETH_USD,
  SOL: PYTH_FEEDS.SOL_USD,
};

const POLL_INTERVAL_MS = 10_000; // 10s fallback polling

// ── Hook ──────────────────────────────────────────────────────────────────

/**
 * Subscribes to a Pyth devnet price feed account and returns the current
 * USD price with confidence interval.
 *
 * Uses `connection.onAccountChange` (websocket) as the primary update
 * mechanism, with a 10s polling fallback.
 *
 * @param asset - "BTC" | "ETH" | "SOL"
 */
export function usePriceFeed(asset: PriceFeedAsset): PriceFeedState {
  const { connection } = useConnection();
  const [state, setState] = useState<PriceFeedState>({
    price: null,
    confidence: null,
    isLoading: true,
    isStale: false,
    error: null,
    lastUpdatedMs: null,
  });

  const feedAccount = FEED_ACCOUNTS[asset];
  const subIdRef = useRef<number | null>(null);
  const pollRef  = useRef<ReturnType<typeof setInterval> | null>(null);

  const processAccount = useCallback((info: AccountInfo<Buffer> | null) => {
    if (!info?.data) {
      setState((s) => ({ ...s, isLoading: false, error: "Feed account not found" }));
      return;
    }

    const parsed = parsePythPrice(info.data);
    if (!parsed) {
      setState((s) => ({ ...s, isLoading: false, error: "Failed to parse price account" }));
      return;
    }

    setState({
      price: parsed.status === PRICE_STATUS_TRADING ? parsed.price : null,
      confidence: parsed.confidence,
      isLoading: false,
      isStale: parsed.status !== PRICE_STATUS_TRADING,
      error: null,
      lastUpdatedMs: Date.now(),
    });
  }, []);

  const fetchOnce = useCallback(async () => {
    try {
      const info = await connection.getAccountInfo(feedAccount, "confirmed");
      processAccount(info as AccountInfo<Buffer> | null);
    } catch (e) {
      setState((s) => ({
        ...s,
        isLoading: false,
        error: e instanceof Error ? e.message : "Price feed fetch failed",
      }));
    }
  }, [connection, feedAccount, processAccount]);

  useEffect(() => {
    let active = true;
    setState((s) => ({ ...s, isLoading: true, error: null }));

    // Initial fetch
    fetchOnce();

    // WebSocket subscription
    const subId = connection.onAccountChange(
      feedAccount,
      (info) => {
        if (active) processAccount(info as AccountInfo<Buffer>);
      },
      "confirmed"
    );
    subIdRef.current = subId;

    // Polling fallback in case WS misses updates
    const intervalId = setInterval(() => {
      if (active) fetchOnce();
    }, POLL_INTERVAL_MS);
    pollRef.current = intervalId;

    return () => {
      active = false;
      if (subIdRef.current !== null) {
        connection.removeAccountChangeListener(subIdRef.current);
        subIdRef.current = null;
      }
      if (pollRef.current !== null) {
        clearInterval(pollRef.current);
        pollRef.current = null;
      }
    };
  }, [connection, feedAccount, fetchOnce, processAccount]);

  return state;
}

/**
 * Converts a USD price from usePriceFeed into the 6-decimal integer
 * format expected by the on-chain program (e.g. $65000.00 → 65_000_000_000).
 */
export function priceToU64(usdPrice: number): bigint {
  return BigInt(Math.round(usdPrice * 1_000_000));
}
