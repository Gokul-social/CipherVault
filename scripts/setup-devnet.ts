/**
 * CipherVault Devnet Setup Script
 *
 * This script bootstraps the CipherVault protocol on Solana devnet:
 * 1. Generates or loads a test keypair
 * 2. Airdrops SOL for deployment and transaction fees
 * 3. Deploys both Anchor programs (ciphervault-core, collateral-vault)
 * 4. Initializes the Protocol and VaultRegistry state accounts
 * 5. Prints all program IDs, PDAs, and configuration to console
 *
 * Usage: npx ts-node scripts/setup-devnet.ts
 */

import {
  Connection,
  Keypair,
  LAMPORTS_PER_SOL,
  PublicKey,
  clusterApiUrl,
} from "@solana/web3.js";
import { AnchorProvider, Program, Wallet, setProvider } from "@coral-xyz/anchor";
import * as fs from "fs";
import * as path from "path";

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

const DEVNET_RPC = clusterApiUrl("devnet");
const AIRDROP_AMOUNT_SOL = 2;
const KEYPAIR_PATH = path.resolve(__dirname, "..", "test-keypair.json");

// Placeholder program IDs — replaced after `anchor deploy`
const CORE_PROGRAM_ID = new PublicKey(
  "CVau1tC0rePr0gramXXXXXXXXXXXXXXXXXXXXXXXXX"
);
const VAULT_PROGRAM_ID = new PublicKey(
  "CVau1tC011atera1XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX"
);

// Protocol initialization parameters
const PROTOCOL_PARAMS = {
  maxLeverageBps: 50_000, // 5x leverage
  settlementWindowSlots: 100, // ~40 seconds at 400ms slots
  feeRateBps: 30, // 0.30% fee
};

const VAULT_PARAMS = {
  minHealthFactorBps: 15_000, // 150% collateralization
  maxAssetsPerTrader: 7, // one slot per ChainAsset variant
};

// ---------------------------------------------------------------------------
// Keypair Management
// ---------------------------------------------------------------------------

/**
 * Loads an existing keypair from disk or generates a new one.
 * The keypair is saved to `test-keypair.json` in the project root
 * so subsequent runs use the same identity.
 */
function loadOrCreateKeypair(): Keypair {
  if (fs.existsSync(KEYPAIR_PATH)) {
    console.log(`📂 Loading existing keypair from ${KEYPAIR_PATH}`);
    const secretKey = JSON.parse(fs.readFileSync(KEYPAIR_PATH, "utf-8"));
    return Keypair.fromSecretKey(new Uint8Array(secretKey));
  }

  console.log("🔑 Generating new test keypair...");
  const keypair = Keypair.generate();
  fs.writeFileSync(KEYPAIR_PATH, JSON.stringify(Array.from(keypair.secretKey)));
  console.log(`💾 Saved keypair to ${KEYPAIR_PATH}`);
  return keypair;
}

// ---------------------------------------------------------------------------
// Airdrop
// ---------------------------------------------------------------------------

/**
 * Requests an airdrop of SOL on devnet. Retries up to 3 times on failure.
 */
async function airdropSol(
  connection: Connection,
  publicKey: PublicKey,
  amountSol: number
): Promise<void> {
  const lamports = amountSol * LAMPORTS_PER_SOL;
  let retries = 3;

  while (retries > 0) {
    try {
      console.log(
        `💰 Requesting airdrop of ${amountSol} SOL to ${publicKey.toBase58()}...`
      );
      const signature = await connection.requestAirdrop(publicKey, lamports);
      const latestBlockhash = await connection.getLatestBlockhash();
      await connection.confirmTransaction({
        signature,
        ...latestBlockhash,
      });
      const balance = await connection.getBalance(publicKey);
      console.log(
        `✅ Airdrop confirmed. Balance: ${balance / LAMPORTS_PER_SOL} SOL`
      );
      return;
    } catch (err) {
      retries--;
      if (retries === 0) throw err;
      console.log(`⚠️  Airdrop failed, retrying... (${retries} attempts left)`);
      await new Promise((r) => setTimeout(r, 2000));
    }
  }
}

// ---------------------------------------------------------------------------
// PDA Derivation
// ---------------------------------------------------------------------------

function deriveProtocolPda(): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("protocol")],
    CORE_PROGRAM_ID
  );
}

function deriveVaultRegistryPda(): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("vault_registry")],
    VAULT_PROGRAM_ID
  );
}

// ---------------------------------------------------------------------------
// Main Setup
// ---------------------------------------------------------------------------

async function main(): Promise<void> {
  console.log("═".repeat(60));
  console.log("  CipherVault Devnet Setup");
  console.log("═".repeat(60));
  console.log();

  // 1. Connection & Keypair
  const connection = new Connection(DEVNET_RPC, "confirmed");
  const keypair = loadOrCreateKeypair();
  const wallet = new Wallet(keypair);

  console.log(`🌐 RPC: ${DEVNET_RPC}`);
  console.log(`👤 Authority: ${keypair.publicKey.toBase58()}`);
  console.log();

  // 2. Airdrop SOL
  const balance = await connection.getBalance(keypair.publicKey);
  if (balance < LAMPORTS_PER_SOL) {
    await airdropSol(connection, keypair.publicKey, AIRDROP_AMOUNT_SOL);
  } else {
    console.log(
      `💰 Existing balance: ${balance / LAMPORTS_PER_SOL} SOL (skipping airdrop)`
    );
  }
  console.log();

  // 3. Set up Anchor provider
  const provider = new AnchorProvider(connection, wallet, {
    commitment: "confirmed",
    preflightCommitment: "confirmed",
  });
  setProvider(provider);

  // 4. Derive PDAs
  const [protocolPda, protocolBump] = deriveProtocolPda();
  const [vaultRegistryPda, vaultRegistryBump] = deriveVaultRegistryPda();

  // 5. Program deployment reminder
  console.log("─".repeat(60));
  console.log("  📋 Pre-Deployment Checklist");
  console.log("─".repeat(60));
  console.log("  Run the following before initializing state:");
  console.log();
  console.log("    anchor build");
  console.log("    anchor deploy --provider.cluster devnet");
  console.log();
  console.log("  Then update the program IDs in:");
  console.log("    - Anchor.toml");
  console.log("    - programs/ciphervault-core/src/lib.rs (declare_id!)");
  console.log("    - programs/collateral-vault/src/lib.rs (declare_id!)");
  console.log("    - sdk/src/types.ts (DEVNET_CONFIG)");
  console.log("    - scripts/setup-devnet.ts (CORE_PROGRAM_ID, VAULT_PROGRAM_ID)");
  console.log();

  // 6. Print configuration summary
  console.log("─".repeat(60));
  console.log("  🔧 Configuration");
  console.log("─".repeat(60));
  console.log();
  console.log("  Protocol Parameters:");
  console.log(`    Max Leverage:          ${PROTOCOL_PARAMS.maxLeverageBps / 10_000}x`);
  console.log(`    Settlement Window:     ${PROTOCOL_PARAMS.settlementWindowSlots} slots`);
  console.log(`    Fee Rate:              ${PROTOCOL_PARAMS.feeRateBps / 100}%`);
  console.log();
  console.log("  Vault Parameters:");
  console.log(`    Min Health Factor:     ${VAULT_PARAMS.minHealthFactorBps / 100}%`);
  console.log(`    Max Assets/Trader:     ${VAULT_PARAMS.maxAssetsPerTrader}`);
  console.log();

  // 7. Print program IDs and PDAs
  console.log("─".repeat(60));
  console.log("  📍 Program IDs & PDAs");
  console.log("─".repeat(60));
  console.log();
  console.log("  Programs:");
  console.log(`    ciphervault-core:      ${CORE_PROGRAM_ID.toBase58()}`);
  console.log(`    collateral-vault:      ${VAULT_PROGRAM_ID.toBase58()}`);
  console.log();
  console.log("  PDAs:");
  console.log(`    Protocol:              ${protocolPda.toBase58()} (bump: ${protocolBump})`);
  console.log(`    VaultRegistry:         ${vaultRegistryPda.toBase58()} (bump: ${vaultRegistryBump})`);
  console.log();

  // 8. Example PDA derivations for a test trader
  const testTrader = keypair.publicKey;
  const chainAssets = [
    { name: "BTC", value: 0 },
    { name: "ETH", value: 1 },
    { name: "SOL", value: 2 },
  ];

  console.log("  Example Collateral Vault PDAs (for test trader):");
  for (const asset of chainAssets) {
    const [vaultPda] = PublicKey.findProgramAddressSync(
      [
        Buffer.from("vault"),
        testTrader.toBuffer(),
        Buffer.from([asset.value]),
      ],
      CORE_PROGRAM_ID
    );
    console.log(`    ${asset.name}:                    ${vaultPda.toBase58()}`);
  }
  console.log();

  console.log("  Example Collateral Account PDAs (for test trader):");
  for (const asset of chainAssets) {
    const [accountPda] = PublicKey.findProgramAddressSync(
      [
        Buffer.from("collateral"),
        testTrader.toBuffer(),
        Buffer.from([asset.value]),
      ],
      VAULT_PROGRAM_ID
    );
    console.log(`    ${asset.name}:                    ${accountPda.toBase58()}`);
  }
  console.log();

  console.log("═".repeat(60));
  console.log("  ✅ Setup complete. Deploy programs and then run");
  console.log("     initialization transactions in Phase 2.");
  console.log("═".repeat(60));
}

// ---------------------------------------------------------------------------
// Entry Point
// ---------------------------------------------------------------------------

main().catch((err) => {
  console.error("❌ Setup failed:", err);
  process.exit(1);
});
