import { Connection, PublicKey } from "@solana/web3.js";
import BN from "bn.js";
import { ChainAsset, OrderDirection } from "./types";

// ---------------------------------------------------------------------------
// Encrypt FHE Types
// ---------------------------------------------------------------------------

/**
 * Configuration for the Encrypt FHE client.
 * Encrypt enables Solana programs to compute on encrypted data using
 * Fully Homomorphic Encryption (FHE).
 * See: https://docs.encrypt.xyz
 */
export interface EncryptClientConfig {
  /** Solana RPC connection */
  solanaConnection: Connection;
  /** The Encrypt program ID on Solana devnet */
  encryptProgramId: PublicKey;
  /** The FHE cluster's public key used to encrypt data */
  clusterPublicKey: Uint8Array;
}

/** An FHE-encrypted unsigned 64-bit integer (ciphertext). */
export interface EncryptedUint64 {
  /** Raw ciphertext bytes */
  ciphertext: Uint8Array;
  /** Solana account address where this ciphertext is stored on-chain */
  accountAddress?: PublicKey;
}

/** Result from submitting an FHE computation graph for execution. */
export interface GraphExecutionResult {
  /** Transaction signature of the execute_graph instruction */
  txSignature: string;
  /** Output ciphertext account addresses created by the computation */
  outputAccounts: PublicKey[];
  /** Slot at which the graph was submitted */
  submissionSlot: number;
}

/** Result from a threshold decryption request. */
export interface DecryptionResult {
  /** The decrypted plaintext value */
  plaintext: BN;
  /** Transaction signature of the decryption response */
  txSignature: string;
  /** Whether decryption is complete (false if still pending) */
  isComplete: boolean;
}

/** Parameters for constructing an encrypted order. */
export interface EncryptedOrderParams {
  /** Plaintext order size (will be encrypted) */
  size: BN;
  /** Plaintext limit price (will be encrypted) */
  price: BN;
  /** Order direction */
  direction: OrderDirection;
  /** Asset being traded */
  asset: ChainAsset;
}

// ---------------------------------------------------------------------------
// Encrypt Client
// ---------------------------------------------------------------------------

/**
 * CipherVault's wrapper around the Encrypt protocol for FHE operations.
 *
 * The Encrypt flow on Solana:
 * 1. Write FHE logic using #[encrypt_fn] DSL (compiled to computation graph)
 * 2. Encrypt plaintext values to the cluster's public key → ciphertext accounts
 * 3. Call execute_graph on-chain → emits events for off-chain executor
 * 4. Executor evaluates graph homomorphically → commits results on-chain
 * 5. Request threshold decryption when application needs plaintext
 *
 * Pre-Alpha: Currently all data is plaintext on-chain. Real encryption
 * will be enabled in Alpha 1. See docs.encrypt.xyz disclaimer.
 */
export class EncryptClient {
  private connection: Connection;
  private encryptProgramId: PublicKey;
  private clusterPublicKey: Uint8Array;

  constructor(config: EncryptClientConfig) {
    this.connection = config.solanaConnection;
    this.encryptProgramId = config.encryptProgramId;
    this.clusterPublicKey = config.clusterPublicKey;
  }

  /**
   * Encrypts a numeric value using the FHE cluster's public key.
   * The result is an EUint64 ciphertext that can be stored on-chain
   * and operated on homomorphically.
   *
   * [ENCRYPT-VERIFY] The exact encryption API is not yet documented.
   * In the pre-alpha, data is stored as plaintext. When real FHE is
   * enabled, this will use the REFHE scheme from the Encrypt research.
   *
   * @param plaintext - The value to encrypt (u64 range)
   * @param publicKey - FHE cluster public key (defaults to configured key)
   * @returns The encrypted ciphertext bytes
   */
  async encryptValue(
    plaintext: BN,
    publicKey?: Uint8Array
  ): Promise<EncryptedUint64> {
    const key = publicKey ?? this.clusterPublicKey;

    // [ENCRYPT-VERIFY] Pre-alpha implementation — no real encryption.
    // When the SDK is released, this will call the FHE encryption primitive.
    // For now, we serialize the plaintext as a mock ciphertext for testing.
    const mockCiphertext = Buffer.alloc(32);
    mockCiphertext.set(plaintext.toArrayLike(Buffer, "le", 8), 0);
    // Append a tag indicating this is a mock (will be stripped in production)
    mockCiphertext.set(Buffer.from("MOCK_FHE_"), 8);

    return {
      ciphertext: mockCiphertext,
    };
  }

  /**
   * Submits an FHE computation graph for execution by the Encrypt network.
   * The graph is a DAG of homomorphic operations compiled from #[encrypt_fn]
   * annotated Rust functions.
   *
   * [ENCRYPT-VERIFY] The graph submission is done via the execute_graph
   * Solana instruction on the Encrypt program. The exact instruction format
   * and account layout need verification from docs.encrypt.xyz.
   *
   * @param graphData - Serialized computation graph (compiled from #[encrypt_fn])
   * @param inputAccounts - Ciphertext accounts used as graph inputs
   * @returns Execution result with output account addresses
   */
  async submitComputationGraph(
    graphData: Uint8Array,
    inputAccounts: PublicKey[]
  ): Promise<GraphExecutionResult> {
    // [ENCRYPT-VERIFY] The execute_graph instruction:
    // 1. Creates output ciphertext accounts (one per graph output)
    // 2. Emits an event that the off-chain executor listens for
    // 3. The executor evaluates the FHE graph and commits results
    //
    // Account structure (tentative):
    //   - encrypt_program (the Encrypt on-chain program)
    //   - payer (funds new ciphertext accounts)
    //   - system_program
    //   - graph_data (serialized computation DAG)
    //   - input_ciphertext_accounts[] (remaining accounts)

    throw new Error(
      "submitComputationGraph: Implementation pending — requires " +
      "Encrypt execute_graph instruction format verification"
    );
  }

  /**
   * Requests threshold decryption of a ciphertext account.
   * The Encrypt decryptor network (2/3 majority required) collaborates
   * to decrypt the value and post the plaintext on-chain.
   *
   * [ENCRYPT-VERIFY] Decryption is an asynchronous process:
   * 1. Submit decryption request instruction
   * 2. Decryptor nodes process the request
   * 3. Result is posted to a designated account
   * Polling or WebSocket subscription needed to detect completion.
   *
   * @param ciphertextAccount - The on-chain account holding the ciphertext
   * @returns Decryption result (may be incomplete if still processing)
   */
  async requestDecryption(
    ciphertextAccount: PublicKey
  ): Promise<DecryptionResult> {
    // [ENCRYPT-VERIFY] The decryption instruction structure is TBD.
    // It likely involves:
    //   - The ciphertext account to decrypt
    //   - A destination account for the plaintext
    //   - Authorization (who is allowed to request decryption)

    throw new Error(
      "requestDecryption: Implementation pending — requires " +
      "Encrypt threshold decryption instruction verification"
    );
  }

  /**
   * Composes and encrypts an order for the CipherVault encrypted order book.
   * Encrypts both size and price, returning ciphertext buffers ready for
   * the place_order instruction.
   *
   * @param params - Order parameters (size, price, direction, asset)
   * @returns Encrypted size and price as byte buffers
   */
  async createEncryptedOrder(
    params: EncryptedOrderParams
  ): Promise<{ encryptedSize: Buffer; encryptedPrice: Buffer }> {
    const [sizeResult, priceResult] = await Promise.all([
      this.encryptValue(params.size),
      this.encryptValue(params.price),
    ]);

    return {
      encryptedSize: Buffer.from(sizeResult.ciphertext),
      encryptedPrice: Buffer.from(priceResult.ciphertext),
    };
  }

  /**
   * Polls a decryption request until completion or timeout.
   *
   * @param ciphertextAccount - Account being decrypted
   * @param timeoutMs - Maximum wait time in milliseconds
   * @param pollIntervalMs - Polling interval in milliseconds
   * @returns The completed decryption result
   */
  async awaitDecryption(
    ciphertextAccount: PublicKey,
    timeoutMs: number = 30_000,
    pollIntervalMs: number = 2_000
  ): Promise<DecryptionResult> {
    const startTime = Date.now();

    while (Date.now() - startTime < timeoutMs) {
      const result = await this.requestDecryption(ciphertextAccount);
      if (result.isComplete) {
        return result;
      }
      await new Promise((resolve) => setTimeout(resolve, pollIntervalMs));
    }

    throw new Error(
      `Decryption timeout: ciphertext account ${ciphertextAccount.toBase58()} ` +
      `did not decrypt within ${timeoutMs}ms`
    );
  }
}

// ---------------------------------------------------------------------------
// Factory
// ---------------------------------------------------------------------------

/**
 * Creates an EncryptClient configured for Solana devnet.
 */
export function createDevnetEncryptClient(
  connection: Connection
): EncryptClient {
  return new EncryptClient({
    solanaConnection: connection,
    // [ENCRYPT-VERIFY] The Encrypt program ID on Solana devnet needs to be
    // obtained from the Encrypt team or their deployment docs.
    encryptProgramId: new PublicKey(
      "Encr1ptXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX"
    ),
    // [ENCRYPT-VERIFY] The FHE cluster public key is generated during
    // cluster setup. For devnet, use the key published by the Encrypt team.
    clusterPublicKey: new Uint8Array(32),
  });
}
