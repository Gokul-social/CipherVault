/**
 * CipherVault — Centralised environment-driven configuration.
 *
 * All program IDs, RPC endpoints, and feature flags are resolved here.
 * Never import PublicKey("hardcoded-string") directly in component files.
 */

import { clusterApiUrl, PublicKey } from "@solana/web3.js";

// ── RPC / Network ─────────────────────────────────────────────────────────────

/** Solana HTTP RPC endpoint. Override via NEXT_PUBLIC_SOLANA_RPC_URL. */
export const SOLANA_RPC_URL: string =
  process.env.NEXT_PUBLIC_SOLANA_RPC_URL ?? clusterApiUrl("devnet");

/** Solana WebSocket endpoint. Override via NEXT_PUBLIC_SOLANA_WS_URL. */
export const SOLANA_WS_URL: string =
  process.env.NEXT_PUBLIC_SOLANA_WS_URL ??
  SOLANA_RPC_URL.replace("https://", "wss://").replace("http://", "ws://");

/** Human-readable network label shown in UI. */
export const NETWORK_LABEL: string =
  process.env.NEXT_PUBLIC_NETWORK_LABEL ?? "Devnet";

// ── Program IDs ───────────────────────────────────────────────────────────────

/**
 * collateral-vault program — deployed on Solana devnet.
 * Override via NEXT_PUBLIC_VAULT_PROGRAM_ID.
 */
export const VAULT_PROGRAM_ID = new PublicKey(
  process.env.NEXT_PUBLIC_VAULT_PROGRAM_ID ??
    "4jJrbTHiAP5ocWhbUqJG6m1bQ6cRkNi7vJvHWpRABwBm"
);

/**
 * ciphervault-core program — deployed on Solana devnet.
 * Override via NEXT_PUBLIC_CORE_PROGRAM_ID.
 */
export const CORE_PROGRAM_ID = new PublicKey(
  process.env.NEXT_PUBLIC_CORE_PROGRAM_ID ??
    "8Voz2Petb9Q4xYMCqjNVXSyTzkmzMsK3cTrSVGGLF8Ug"
);

// ── Feature Flags ─────────────────────────────────────────────────────────────

/**
 * IKA_ENABLED: set NEXT_PUBLIC_IKA_ENABLED=true to attempt real Ika DKG calls.
 * When false (default), dWallet registration uses random 32-byte IDs and
 * skips Ika SDK entirely. The on-chain vault state is still real.
 */
export const IKA_ENABLED: boolean =
  process.env.NEXT_PUBLIC_IKA_ENABLED === "true";

/**
 * ENCRYPT_ENABLED: set NEXT_PUBLIC_ENCRYPT_ENABLED=true to use real FHE
 * ciphertext in orders. When false (default), orders are submitted as
 * plaintext on-chain using the ciphervault-core place_order instruction.
 */
export const ENCRYPT_ENABLED: boolean =
  process.env.NEXT_PUBLIC_ENCRYPT_ENABLED === "true";

// ── Pyth Price Feed Accounts (Devnet) ─────────────────────────────────────────
// Source: https://pyth.network/developers/price-feed-ids#solana-devnet

export const PYTH_FEEDS = {
  BTC_USD: new PublicKey("HovQMDrbAgAYPCmHVSrezcSmkMtXSSUsLDFANExrZh2J"),
  ETH_USD: new PublicKey("EdVCmQ9FSPcVe5YySXDPCRmc8aDQLKJ9xvYBMZPie1Vw"),
  SOL_USD: new PublicKey("J83w4HKfqxwcq3BEMMkPFSppX3gqekLyLJBexebFVkix"),
} as const;

// ── Protocol Constants ────────────────────────────────────────────────────────

/** Default LTV in basis points used when initializing a vault (75%). */
export const DEFAULT_LTV_BPS = 7_500;

/** Default liquidation threshold in basis points (80%). */
export const DEFAULT_LIQ_THRESHOLD_BPS = 8_000;

/** Maximum dWallets per vault (enforced on-chain). */
export const MAX_DWALLETS_PER_VAULT = 8;

/** Solana explorer base URL. */
export const EXPLORER_BASE = "https://explorer.solana.com";

/** Cluster query string for explorer links. */
export const EXPLORER_CLUSTER =
  NETWORK_LABEL.toLowerCase() === "mainnet" ? "" : "?cluster=devnet";

/** Full explorer TX URL builder. */
export function explorerTxUrl(sig: string): string {
  return `${EXPLORER_BASE}/tx/${sig}${EXPLORER_CLUSTER}`;
}

/** Full explorer address URL builder. */
export function explorerAddressUrl(address: string): string {
  return `${EXPLORER_BASE}/address/${address}${EXPLORER_CLUSTER}`;
}
