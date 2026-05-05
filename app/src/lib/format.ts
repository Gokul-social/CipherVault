// ── Currency formatting ───────────────────────────────────────────────────────

/** Format a raw USD value (6 decimal places in u64) to a human-readable string */
export function formatUsd(raw: bigint): string {
  const usd = Number(raw) / 1_000_000;
  if (usd === 0) return "$0.00";
  if (usd >= 1_000_000) {
    return `$${(usd / 1_000_000).toFixed(2)}M`;
  }
  if (usd >= 1_000) {
    return `$${(usd / 1_000).toFixed(1)}K`;
  }
  return `$${usd.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

/** Format LTV basis points to a percentage string */
export function formatLtv(bps: number): string {
  return `${(bps / 100).toFixed(0)}%`;
}

/** Format health factor ratio */
export function formatHealthFactor(
  collateral: bigint,
  credit: bigint
): string {
  if (credit === BigInt(0)) return "∞";
  const ratio = Number(collateral) / Number(credit);
  return ratio.toFixed(2);
}

/** Shorten a Solana public key for display */
export function shortenAddress(address: string, chars = 4): string {
  return `${address.slice(0, chars)}...${address.slice(-chars)}`;
}

/** Compute health score 0–100 for UI indicators */
export function healthScore(collateral: bigint, credit: bigint, ltvBps: number): number {
  if (credit === BigInt(0)) return 100;
  const currentLtv = (Number(credit) / Number(collateral)) * 100;
  const maxLtv     = ltvBps / 100;
  const score      = Math.max(0, Math.min(100, 100 - (currentLtv / maxLtv) * 100));
  return Math.round(score);
}

/** Map a health score to a semantic color token */
export function healthColor(score: number): "success" | "warning" | "danger" {
  if (score >= 60) return "success";
  if (score >= 30) return "warning";
  return "danger";
}

/** Compute available credit */
export function availableCredit(collateral: bigint, credit: bigint, ltvBps: number): bigint {
  const maxCredit = BigInt(Math.floor((Number(collateral) * ltvBps) / 10_000));
  const avail = maxCredit - credit;
  return avail > BigInt(0) ? avail : BigInt(0);
}
