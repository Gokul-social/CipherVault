// CipherVault SDK — Barrel Export
// Re-exports all types, clients, and utilities for consumers.

// --- Shared Types & Enums ---
export {
  ChainAsset,
  CHAIN_ASSET_LABELS,
  CHAIN_ASSET_DECIMALS,
  OrderDirection,
  DEVNET_CONFIG,
  deriveProtocolPda,
  deriveCollateralVaultPda,
  deriveOrderPda,
  deriveSettlementPda,
  deriveVaultRegistryPda,
  deriveCollateralAccountPda,
} from "./types";

export type {
  CollateralPosition,
  EncryptedOrder,
  VaultState,
  TradeSettlement,
  ProtocolConfig,
  DwalletRegistration,
  CipherVaultConfig,
} from "./types";

// --- Ika dWallet Client ---
export {
  IkaClient,
  createDevnetIkaClient,
  getChainCryptoConfig,
} from "./ika-client";

export type {
  IkaClientConfig,
  CreateDwalletResult,
  SignatureResult,
} from "./ika-client";

// --- Encrypt FHE Client ---
export {
  EncryptClient,
  createDevnetEncryptClient,
} from "./encrypt-client";

export type {
  EncryptClientConfig,
  EncryptedUint64,
  GraphExecutionResult,
  DecryptionResult,
  EncryptedOrderParams,
} from "./encrypt-client";

// --- Collateral Vault Client ---
export {
  initializeVault,
  createAndRegisterDWallet,
  recordDeposit,
  getVaultState,
  getHealthFactor,
  watchForDeposit,
  deriveVaultPda,
  COLLATERAL_VAULT_PROGRAM_ID,
} from "./collateral";
