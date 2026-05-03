/**
 * CipherVault Mock Oracle + Ika Deposit Relayer
 *
 * Simulates an off-chain oracle that monitors Ika dWallet deposits and
 * relays price + amount data to the collateral-vault program on devnet.
 *
 * Usage:
 *   DEMO_KEYPAIR=<base58_secret_key> npx ts-node scripts/mock-oracle.ts --vault <pubkey>
 *
 * Polls every 15 seconds, simulating a 1 BTC deposit at $65,000.
 * Press Ctrl+C to stop.
 */

import {
  Connection,
  Keypair,
  PublicKey,
  clusterApiUrl,
} from "@solana/web3.js";
import { AnchorProvider, Program, BN, Wallet, Idl } from "@coral-xyz/anchor";
import * as bs58 from "bs58";

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

const COLLATERAL_VAULT_PROGRAM_ID = new PublicKey(
  "4jJrbTHiAP5ocWhbUqJG6m1bQ6cRkNi7vJvHWpRABwBm"
);

// Simulated BTC deposit parameters
const BTC_RAW_AMOUNT = new BN(100_000_000); // 1 BTC = 100,000,000 satoshis
const BTC_USD_PRICE_6DEC = new BN(65_000_000_000); // $65,000.000000
const POLL_INTERVAL_MS = 15_000; // 15 seconds

// ANSI color codes (chalk-like, zero-dependency)
const RESET = "\x1b[0m";
const GREEN = "\x1b[32m";
const YELLOW = "\x1b[33m";
const CYAN = "\x1b[36m";
const RED = "\x1b[31m";
const DIM = "\x1b[2m";
const BOLD = "\x1b[1m";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function timestamp(): string {
  return `${DIM}[${new Date().toISOString()}]${RESET}`;
}

function formatBtc(satoshis: BN): string {
  const btc = satoshis.toNumber() / 100_000_000;
  return btc.toFixed(1);
}

function formatUsd(price6dec: BN): string {
  const usd = price6dec.toNumber() / 1_000_000;
  return usd.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
  });
}

function loadKeypair(): Keypair {
  const envKey = process.env.DEMO_KEYPAIR;
  if (!envKey) {
    console.error(
      `${RED}Error: DEMO_KEYPAIR environment variable not set.${RESET}`
    );
    console.error(
      `Set it to a base58-encoded secret key of the oracle authority.`
    );
    console.error(
      `Example: DEMO_KEYPAIR=$(solana-keygen new --no-bip39-passphrase --outfile /dev/stdout 2>/dev/null | head -1) npx ts-node scripts/mock-oracle.ts --vault <pubkey>`
    );
    process.exit(1);
  }

  try {
    const secretKey = bs58.default.decode(envKey);
    return Keypair.fromSecretKey(secretKey);
  } catch {
    console.error(`${RED}Error: Invalid base58 in DEMO_KEYPAIR.${RESET}`);
    process.exit(1);
  }
}

function parseVaultArg(): PublicKey {
  const args = process.argv.slice(2);
  const vaultIdx = args.indexOf("--vault");
  if (vaultIdx === -1 || vaultIdx + 1 >= args.length) {
    console.error(
      `${RED}Error: --vault <pubkey> argument required.${RESET}`
    );
    console.error(`Usage: npx ts-node scripts/mock-oracle.ts --vault <pubkey>`);
    process.exit(1);
  }

  try {
    return new PublicKey(args[vaultIdx + 1]);
  } catch {
    console.error(
      `${RED}Error: Invalid public key for --vault argument.${RESET}`
    );
    process.exit(1);
  }
}

// ---------------------------------------------------------------------------
// Oracle Loop
// ---------------------------------------------------------------------------

async function runOracle(): Promise<void> {
  console.log(`\n${BOLD}${CYAN}╔══════════════════════════════════════════╗${RESET}`);
  console.log(`${BOLD}${CYAN}║   CipherVault Mock Oracle + Relayer      ║${RESET}`);
  console.log(`${BOLD}${CYAN}╚══════════════════════════════════════════╝${RESET}\n`);

  const keypair = loadKeypair();
  const vaultPda = parseVaultArg();

  const connection = new Connection(clusterApiUrl("devnet"), "confirmed");
  const wallet = new Wallet(keypair);
  const provider = new AnchorProvider(connection, wallet, {
    commitment: "confirmed",
    preflightCommitment: "confirmed",
  });

  // Load the IDL
  let idl: Idl;
  try {
    idl = require("../target/idl/collateral_vault.json");
  } catch {
    console.error(
      `${RED}Error: IDL not found. Run 'anchor build' first.${RESET}`
    );
    process.exit(1);
  }

  const program = new Program(idl, COLLATERAL_VAULT_PROGRAM_ID, provider);

  console.log(`${timestamp()} ${GREEN}Oracle authority:${RESET} ${keypair.publicKey.toBase58()}`);
  console.log(`${timestamp()} ${GREEN}Target vault:${RESET}    ${vaultPda.toBase58()}`);
  console.log(`${timestamp()} ${GREEN}Cluster:${RESET}         devnet`);
  console.log(`${timestamp()} ${GREEN}Poll interval:${RESET}   ${POLL_INTERVAL_MS / 1000}s`);
  console.log();

  // Verify the vault exists and we're the oracle
  try {
    const vault = await program.account.vaultAccount.fetch(vaultPda);
    const oracleAuth = (vault.oracleAuthority as PublicKey).toBase58();
    if (oracleAuth !== keypair.publicKey.toBase58()) {
      console.error(
        `${RED}Error: This keypair is not the vault's oracle authority.${RESET}`
      );
      console.error(`  Expected: ${oracleAuth}`);
      console.error(`  Got:      ${keypair.publicKey.toBase58()}`);
      process.exit(1);
    }
    console.log(`${timestamp()} ${GREEN}✓ Vault verified — oracle authority matches${RESET}`);
  } catch (e: any) {
    console.error(
      `${RED}Error: Could not fetch vault account. Is the vault initialized?${RESET}`
    );
    console.error(`  ${e.message}`);
    process.exit(1);
  }

  // Find the first dWallet ID registered in the vault
  let dwalletId: number[];
  try {
    const vault = await program.account.vaultAccount.fetch(vaultPda);
    const ids = vault.dwalletIds as number[][];
    if (!ids || ids.length === 0) {
      console.error(
        `${RED}Error: No dWallets registered in this vault. Register one first.${RESET}`
      );
      process.exit(1);
    }
    dwalletId = ids[0];
    console.log(
      `${timestamp()} ${GREEN}✓ Using dWallet:${RESET} ${Buffer.from(dwalletId).toString("hex").slice(0, 16)}...`
    );
  } catch (e: any) {
    console.error(`${RED}Error reading vault dWallet IDs: ${e.message}${RESET}`);
    process.exit(1);
  }

  console.log(`\n${timestamp()} ${YELLOW}Starting oracle loop — press Ctrl+C to stop${RESET}\n`);

  let depositCount = 0;

  const loop = async () => {
    depositCount++;

    console.log(
      `${timestamp()} ${CYAN}Oracle:${RESET} Recording BTC deposit — ${formatBtc(BTC_RAW_AMOUNT)} BTC @ ${formatUsd(BTC_USD_PRICE_6DEC)}`
    );

    try {
      const txSig = await program.methods
        .recordDeposit(dwalletId, BTC_RAW_AMOUNT, BTC_USD_PRICE_6DEC)
        .accounts({
          vault: vaultPda,
          oracleAuthority: keypair.publicKey,
        })
        .rpc();

      console.log(
        `${timestamp()} ${GREEN}Oracle:${RESET} tx confirmed — ${txSig}`
      );

      // Fetch updated state
      const vault = await program.account.vaultAccount.fetch(vaultPda);
      const totalUsd = (vault.totalCollateralUsd as BN).toNumber() / 1_000_000;
      console.log(
        `${timestamp()} ${DIM}  └─ Total collateral: ${totalUsd.toLocaleString("en-US", { style: "currency", currency: "USD" })} (${depositCount} deposits)${RESET}`
      );
    } catch (e: any) {
      console.error(
        `${timestamp()} ${RED}Oracle error:${RESET} ${e.message}`
      );
      // Don't exit — continue polling
    }

    console.log();
  };

  // Run first iteration immediately
  await loop();

  // Then poll every POLL_INTERVAL_MS
  const intervalId = setInterval(loop, POLL_INTERVAL_MS);

  // Graceful shutdown
  process.on("SIGINT", () => {
    console.log(
      `\n${timestamp()} ${YELLOW}Oracle shutting down — ${depositCount} deposits recorded${RESET}`
    );
    clearInterval(intervalId);
    process.exit(0);
  });
}

// ---------------------------------------------------------------------------
// Entry
// ---------------------------------------------------------------------------

runOracle().catch((e) => {
  console.error(`${RED}Fatal error: ${e.message}${RESET}`);
  process.exit(1);
});
