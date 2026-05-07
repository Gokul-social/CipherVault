import { PublicKey } from "@solana/web3.js";
import BN from "bn.js";

// ---------------------------------------------------------------------------
// Chain & Asset Identifiers
// ---------------------------------------------------------------------------

/**
 * Supported chain+asset pairs. Maps 1:1 to the on-chain ChainAsset enum
 * in both ciphervault-core and collateral-vault programs.
 *
 * Each variant determines which Ika cryptographic primitives to use:
 * - BTC: Curve.SECP256K1 + ECDSASecp256k1 + SHA256/DoubleSHA256
 * - ETH: Curve.SECP256K1 + ECDSASecp256k1 + KECCAK256
 * - SOL: Curve.ED25519 + EdDSA + SHA512
 * - USDC/RWAs: inherit from their settlement chain
 */
export enum ChainAsset {
  BtcNative = 0,
  EthNative = 1,
  SolNative = 2,
  Usdc = 3,
  TokenizedTBill = 4,
  TokenizedRealEstate = 5,
  TokenizedGold = 6,
}

/**
 * Human-readable labels for each ChainAsset variant.
 */
export const CHAIN_ASSET_LABELS: Record<ChainAsset, string> = {
  [ChainAsset.BtcNative]: "Bitcoin (BTC)",
  [ChainAsset.EthNative]: "Ethereum (ETH)",
  [ChainAsset.SolNative]: "Solana (SOL)",
  [ChainAsset.Usdc]: "USD Coin (USDC)",
  [ChainAsset.TokenizedTBill]: "Tokenized T-Bill",
  [ChainAsset.TokenizedRealEstate]: "Tokenized Real Estate",
  [ChainAsset.TokenizedGold]: "Tokenized Gold",
};

/**
 * Decimal precision for each asset. Used for display formatting and
 * oracle price normalization.
 */
export const CHAIN_ASSET_DECIMALS: Record<ChainAsset, number> = {
  [ChainAsset.BtcNative]: 8,
  [ChainAsset.EthNative]: 18,
  [ChainAsset.SolNative]: 9,
  [ChainAsset.Usdc]: 6,
  [ChainAsset.TokenizedTBill]: 6,
  [ChainAsset.TokenizedRealEstate]: 6,
  [ChainAsset.TokenizedGold]: 8,
};

// ---------------------------------------------------------------------------
// Order Direction
// ---------------------------------------------------------------------------

export enum OrderDirection {
  Long = 0,
  Short = 1,
}

// ---------------------------------------------------------------------------
// Core Domain Types
// ---------------------------------------------------------------------------

/**
 * Represents a single collateral position held by a trader.
 * Each position is backed by an Ika dWallet on the foreign chain.
 */
export interface CollateralPosition {
  /** Which blockchain and asset this position holds */
  chain: ChainAsset;
  /** Human-readable asset ticker (e.g., "BTC", "ETH") */
  asset: string;
  /** Amount in the asset's native denomination (use CHAIN_ASSET_DECIMALS for display) */
  amount: BN;
  /** The Ika dWallet ID custodying this collateral (32-byte hex string) */
  dwalletId: string;
  /** Current health factor in basis points (15_000 = 150%). u64.MAX if no borrows. */
  healthFactor: BN;
  /** USD value of this position (6 decimal precision) */
  valueUsd: BN;
  /** Whether this position is below liquidation threshold */
  isLiquidatable: boolean;
}

/**
 * An order on the encrypted order book. Size and price fields are FHE
 * ciphertexts — they cannot be read by anyone except the Encrypt FHE cluster.
 */
export interface EncryptedOrder {
  /** On-chain order ID (monotonically increasing) */
  orderId: BN;
  /** FHE ciphertext of the order size (encrypted to Encrypt cluster public key) */
  encryptedSize: Buffer;
  /** FHE ciphertext of the limit price */
  encryptedPrice: Buffer;
  /** Long or Short */
  direction: OrderDirection;
  /** Trader's Solana public key */
  trader: PublicKey;
  /** Unix timestamp when the order was submitted */
  timestamp: BN;
  /** Whether the order has been filled */
  isFilled: boolean;
  /** Whether the order has been cancelled */
  isCancelled: boolean;
  /** On-chain account address holding this order */
  accountAddress: PublicKey;
}

/**
 * Aggregate vault state for a trader — rolled up from all their
 * individual CollateralPositions.
 */
export interface VaultState {
  /** Total USD value of all collateral across all chains (6 decimal precision) */
  totalCollateralUsd: BN;
  /** Available credit line in USD after accounting for borrows and haircuts */
  availableCredit: BN;
  /** Portfolio-level utilization in basis points (borrowed / collateral * 10_000) */
  utilizationBps: number;
  /** Individual collateral positions across all supported chains */
  positions: CollateralPosition[];
  /** Number of active (unfilled, uncancelled) orders */
  activeOrderCount: number;
}

/**
 * Record of a completed trade settlement between two counterparties.
 * Created after the FHE matching engine confirms a valid price crossing
 * and the Encrypt threshold decryption reveals settlement parameters.
 */
export interface TradeSettlement {
  /** Settlement ID (monotonically increasing) */
  settlementId: BN;
  /** Buyer's Solana public key */
  buyer: PublicKey;
  /** Seller's Solana public key */
  seller: PublicKey;
  /** The asset that was traded */
  asset: ChainAsset;
  /** Decrypted matched size */
  settledSize: BN;
  /** Decrypted matched price */
  settledPrice: BN;
  /** Solana slot at which the settlement was recorded */
  settlementSlot: BN;
  /** Fee charged on this settlement */
  feeAmount: BN;
}

// ---------------------------------------------------------------------------
// Protocol Configuration
// ---------------------------------------------------------------------------

/**
 * Global protocol parameters read from the on-chain Protocol PDA.
 */
export interface ProtocolConfig {
  /** Protocol admin public key */
  authority: PublicKey;
  /** Maximum leverage in basis points (e.g., 50_000 = 5x) */
  maxLeverageBps: number;
  /** Settlement window duration in slots */
  settlementWindowSlots: BN;
  /** Fee rate in basis points on settled notional */
  feeRateBps: number;
  /** Whether the protocol is in emergency freeze mode */
  isFrozen: boolean;
}

// ---------------------------------------------------------------------------
// dWallet Registration
// ---------------------------------------------------------------------------

/**
 * Parameters for registering an Ika dWallet with the collateral vault.
 */
export interface DwalletRegistration {
  /** The trader registering the dWallet */
  trader: PublicKey;
  /** Which chain+asset pair this dWallet will custody */
  chainAsset: ChainAsset;
  /** 32-byte dWallet identifier from the Ika network */
  dwalletId: Uint8Array;
  /** Compressed public key of the dWallet */
  dwalletPublicKey: Uint8Array;
}

// ---------------------------------------------------------------------------
// SDK Configuration
// ---------------------------------------------------------------------------

/**
 * Configuration for initializing the CipherVault SDK.
 */
export interface CipherVaultConfig {
  /** Solana RPC endpoint (defaults to devnet) */
  rpcEndpoint: string;
  /** Solana WebSocket endpoint for subscriptions */
  wsEndpoint?: string;
  /** Program ID of the ciphervault-core program */
  coreProgramId: PublicKey;
  /** Program ID of the collateral-vault program */
  vaultProgramId: PublicKey;
  /** Ika network endpoint for dWallet operations */
  ikaEndpoint?: string;
  /** Encrypt cluster public key for FHE operations */
  encryptClusterPublicKey?: Uint8Array;
}

/**
 * Default devnet configuration. Program IDs are deployed on devnet.
 */
export const DEVNET_CONFIG: CipherVaultConfig = {
  rpcEndpoint: "https://api.devnet.solana.com",
  wsEndpoint: "wss://api.devnet.solana.com",
  coreProgramId: new PublicKey("8Voz2Petb9Q4xYMCqjNVXSyTzkmzMsK3cTrSVGGLF8Ug"),
  vaultProgramId: new PublicKey("4jJrbTHiAP5ocWhbUqJG6m1bQ6cRkNi7vJvHWpRABwBm"),
};

// ---------------------------------------------------------------------------
// PDA Helpers
// ---------------------------------------------------------------------------

/**
 * Derives the Protocol PDA address for ciphervault-core.
 */
export function deriveProtocolPda(programId: PublicKey): [PublicKey, number] {
  return PublicKey.findProgramAddressSync([Buffer.from("protocol")], programId);
}

/**
 * Derives a CollateralVault PDA for a specific trader and chain asset.
 */
export function deriveCollateralVaultPda(
  programId: PublicKey,
  trader: PublicKey,
  chainAsset: ChainAsset
): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("vault"), trader.toBuffer(), Buffer.from([chainAsset])],
    programId
  );
}

/**
 * Derives an EncryptedOrder PDA for a trader and order index.
 */
export function deriveOrderPda(
  programId: PublicKey,
  trader: PublicKey,
  orderIndex: BN
): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [
      Buffer.from("order"),
      trader.toBuffer(),
      orderIndex.toArrayLike(Buffer, "le", 8),
    ],
    programId
  );
}

/**
 * Derives a TradeSettlement PDA from buy and sell order IDs.
 */
export function deriveSettlementPda(
  programId: PublicKey,
  buyOrderId: BN,
  sellOrderId: BN
): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [
      Buffer.from("settlement"),
      buyOrderId.toArrayLike(Buffer, "le", 8),
      sellOrderId.toArrayLike(Buffer, "le", 8),
    ],
    programId
  );
}

/**
 * Derives the VaultRegistry PDA for the collateral-vault program.
 */
export function deriveVaultRegistryPda(programId: PublicKey): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("vault_registry")],
    programId
  );
}

/**
 * Derives a CollateralAccount PDA in the collateral-vault program.
 */
export function deriveCollateralAccountPda(
  programId: PublicKey,
  trader: PublicKey,
  chainAsset: ChainAsset
): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("collateral"), trader.toBuffer(), Buffer.from([chainAsset])],
    programId
  );
}
