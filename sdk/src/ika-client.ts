import { Connection, PublicKey } from "@solana/web3.js";
// [IKA-VERIFY] Package name confirmed as @ika.xyz/sdk per npm and docs.ika.xyz
// @ts-ignore - Temporary until official types are correctly exported
import { Curve, Hash, SignatureAlgorithm } from "@ika.xyz/sdk";
import { ChainAsset } from "./types";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface IkaClientConfig {
  solanaConnection: Connection;
  ikaRpcUrl: string;
  dwalletProgramId: PublicKey;
}

export interface CreateDwalletResult {
  dwalletId: Uint8Array;
  publicKey: Uint8Array;
  encryptedUserShare: Uint8Array;
}

export interface SignatureResult {
  signature: Uint8Array;
  messageHash: Uint8Array;
  messageApprovalAccount: PublicKey;
}

interface ChainCryptoConfig {
  curve: typeof Curve[keyof typeof Curve];
  signatureAlgorithm: typeof SignatureAlgorithm[keyof typeof SignatureAlgorithm];
  hash: typeof Hash[keyof typeof Hash];
}

// ---------------------------------------------------------------------------
// Chain → Crypto Mapping
// ---------------------------------------------------------------------------

/**
 * Maps ChainAsset to Ika cryptographic primitives.
 * Source: https://docs.ika.xyz/docs/sdk/cryptographic-primitives
 *
 * - BTC: SECP256K1 + ECDSASecp256k1 + DoubleSHA256
 * - ETH: SECP256K1 + ECDSASecp256k1 + KECCAK256
 * - SOL/USDC/RWAs: ED25519 + EdDSA + SHA512
 */
export function getChainCryptoConfig(chain: ChainAsset): ChainCryptoConfig {
  switch (chain) {
    case ChainAsset.BtcNative:
      return {
        curve: Curve.SECP256K1,
        signatureAlgorithm: SignatureAlgorithm.ECDSASecp256k1,
        hash: Hash.DoubleSHA256,
      };
    case ChainAsset.EthNative:
      return {
        curve: Curve.SECP256K1,
        signatureAlgorithm: SignatureAlgorithm.ECDSASecp256k1,
        hash: Hash.KECCAK256,
      };
    case ChainAsset.SolNative:
    case ChainAsset.Usdc:
    case ChainAsset.TokenizedTBill:
    case ChainAsset.TokenizedRealEstate:
    case ChainAsset.TokenizedGold:
      return {
        curve: Curve.ED25519,
        signatureAlgorithm: SignatureAlgorithm.EdDSA,
        hash: Hash.SHA512,
      };
    default:
      throw new Error(`Unsupported chain asset: ${chain}`);
  }
}

// ---------------------------------------------------------------------------
// Client
// ---------------------------------------------------------------------------

/**
 * CipherVault wrapper for Ika dWallet operations.
 *
 * dWallet lifecycle on Solana (from solana-pre-alpha.ika.xyz):
 * 1. DKG → creates dWallet with split key (user share + network share)
 * 2. Transfer authority → program PDA controls the dWallet
 * 3. approve_message CPI → program authorizes signing when conditions met
 * 4. Ika network signs → 2PC-MPC produces signature
 * 5. Signature stored on-chain → MessageApproval account readable by anyone
 */
export class IkaClient {
  private connection: Connection;
  private ikaRpcUrl: string;
  private dwalletProgramId: PublicKey;

  constructor(config: IkaClientConfig) {
    this.connection = config.solanaConnection;
    this.ikaRpcUrl = config.ikaRpcUrl;
    this.dwalletProgramId = config.dwalletProgramId;
  }

  /**
   * Creates a new dWallet via Ika's DKG protocol for a target chain.
   *
   * [IKA-VERIFY] The SDK likely exposes DKG as a multi-step flow:
   * 1. Create UserShareEncryptionKey
   * 2. Call createZeroTrustDwallet() or equivalent
   * 3. Result includes dWallet object ID and encrypted user share
   */
  async createDwallet(
    chain: ChainAsset,
    userPubkey: PublicKey
  ): Promise<CreateDwalletResult> {
    const config = getChainCryptoConfig(chain);

    // [IKA-VERIFY] Replace with actual SDK DKG call:
    // const ikaClient = new IkaSDK({ rpcUrl: this.ikaRpcUrl });
    // const encKey = await ikaClient.createUserShareEncryptionKey(userPubkey);
    // const dwallet = await ikaClient.createZeroTrustDwallet({
    //   curve: config.curve,
    //   encryptionKey: encKey,
    // });
    // return {
    //   dwalletId: dwallet.id,
    //   publicKey: dwallet.publicKey,
    //   encryptedUserShare: dwallet.encryptedShare,
    // };

    throw new Error(
      `createDwallet: pending @ika.xyz/sdk DKG API verification. ` +
      `Curve: ${JSON.stringify(config)}`
    );
  }

  /**
   * Approves a message for signing via CPI to the dWallet program.
   *
   * [IKA-VERIFY] On-chain CPI flow from the Solana pre-alpha docs:
   *   ctx.approve_message(message_approval, dwallet, payer,
   *     system_program, message_hash, user_pubkey, signature_scheme, bump)
   */
  async approveAndSign(
    dwalletId: Uint8Array,
    messageHash: Uint8Array,
    chain: ChainAsset
  ): Promise<SignatureResult> {
    const _config = getChainCryptoConfig(chain);

    // [IKA-VERIFY] Build and send the approve_message transaction
    throw new Error(
      "approveAndSign: pending dWallet approve_message CPI verification"
    );
  }

  /**
   * Reads a completed signature from a MessageApproval account.
   */
  async getSignature(
    messageApprovalAccount: PublicKey
  ): Promise<Uint8Array | null> {
    // [IKA-VERIFY] Deserialize MessageApproval account to extract signature
    const info = await this.connection.getAccountInfo(messageApprovalAccount);
    if (!info?.data) return null;
    return info.data;
  }

  /**
   * Transfers dWallet authority to a Solana program PDA so the program
   * can CPI-authorize signing without the user present.
   */
  async transferAuthorityToPda(
    dwalletId: Uint8Array,
    authorityPda: PublicKey
  ): Promise<string> {
    // [IKA-VERIFY] May be a Sui transaction or Solana instruction
    throw new Error(
      "transferAuthorityToPda: pending authority transfer mechanism verification"
    );
  }

  /**
   * Creates a Taproot-specific dWallet for Bitcoin.
   * Uses SECP256K1 + Taproot + SHA256 per BIP-340/341/342.
   */
  async createBtcTaprootDwallet(
    userPubkey: PublicKey
  ): Promise<CreateDwalletResult> {
    const _config: ChainCryptoConfig = {
      curve: Curve.SECP256K1,
      signatureAlgorithm: SignatureAlgorithm.Taproot,
      hash: Hash.SHA256,
    };

    throw new Error(
      "createBtcTaprootDwallet: pending @ika.xyz/sdk Taproot DKG verification"
    );
  }
}

// ---------------------------------------------------------------------------
// Factory
// ---------------------------------------------------------------------------

export function createDevnetIkaClient(connection: Connection): IkaClient {
  return new IkaClient({
    solanaConnection: connection,
    // [IKA-VERIFY] Ika devnet RPC URL (runs on Sui infrastructure)
    ikaRpcUrl: "https://rpc.ika.xyz/devnet",
    // [IKA-VERIFY] dWallet program ID on Solana devnet
    dwalletProgramId: new PublicKey(
      "dWa11etXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX"
    ),
  });
}
