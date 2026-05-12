<div align="center">
  <br />
  <h1>CIPHERVAULT</h1>
  <p>
    <strong>A secure trading platform that lets institutions manage and trade cross-chain assets in complete privacy.</strong>
  </p>
  
  <p>
    <a href="https://ciphervault-ui.vercel.app"><img src="https://img.shields.io/badge/LIVE_APP-ciphervault--ui.vercel.app-14F195?style=for-the-badge" alt="Live App" /></a>
    <a href="https://explorer.solana.com/address/8Voz2Petb9Q4xYMCqjNVXSyTzkmzMsK3cTrSVGGLF8Ug?cluster=devnet"><img src="https://img.shields.io/badge/CORE_PROGRAM-Solana_Explorer-9945FF?style=for-the-badge" alt="Core Contract" /></a>
    <a href="https://explorer.solana.com/address/4jJrbTHiAP5ocWhbUqJG6m1bQ6cRkNi7vJvHWpRABwBm?cluster=devnet"><img src="https://img.shields.io/badge/VAULT_PROGRAM-Solana_Explorer-14F195?style=for-the-badge" alt="Vault Contract" /></a>
  </p>

  <p>
    <img src="https://img.shields.io/badge/Next.js-000000.svg?style=for-the-badge&logo=next.js&logoColor=white" alt="Next.js" />
    <img src="https://img.shields.io/badge/tailwindcss-%2338B2AC.svg?style=for-the-badge&logo=tailwind-css&logoColor=white" alt="Tailwind CSS" />
    <img src="https://img.shields.io/badge/Solana-000000.svg?style=for-the-badge&logo=solana&logoColor=white" alt="Solana" />
    <img src="https://img.shields.io/badge/Rust-000000.svg?style=for-the-badge&logo=rust&logoColor=white" alt="Rust" />
    <img src="https://img.shields.io/badge/Anchor-9945FF.svg?style=for-the-badge&logo=anchor&logoColor=white" alt="Anchor" />
    <img src="https://img.shields.io/badge/Vercel-000000.svg?style=for-the-badge&logo=vercel&logoColor=white" alt="Vercel" />
  </p>
  <br />
</div>

> **CIPHERVAULT** bridges the gap between different blockchains to give institutions a secure, unified trading platform. Built on Solana, it uses advanced encryption to keep sensitive trade details completely hidden while still ensuring fast, reliable, and transparent execution.

---

## Table of Contents

- [Live Deployment](#live-deployment)
- [System Architecture](#system-architecture)
- [Protocol Features](#protocol-features)
- [Technology Stack](#technology-stack)
- [Quick Start](#quick-start)
- [Workspace Scripts](#workspace-scripts)
- [Project Structure](#project-structure)

---

## Live Deployment

| Component | URL / ID | Status |
|:---|:---|:---:|
| **Frontend Dashboard** | [ciphervault-ui.vercel.app](https://ciphervault-ui.vercel.app) | Live |
| **CipherVault Core** | [`8Voz...F8Ug`](https://explorer.solana.com/address/8Voz2Petb9Q4xYMCqjNVXSyTzkmzMsK3cTrSVGGLF8Ug?cluster=devnet) | Deployed |
| **Collateral Vault** | [`4jJr...wBm`](https://explorer.solana.com/address/4jJrbTHiAP5ocWhbUqJG6m1bQ6cRkNi7vJvHWpRABwBm?cluster=devnet) | Deployed |
| **Network** | Solana Devnet | Active |

### Contract Details

```
Core Program ID   : 8Voz2Petb9Q4xYMCqjNVXSyTzkmzMsK3cTrSVGGLF8Ug
Vault Program ID  : 4jJrbTHiAP5ocWhbUqJG6m1bQ6cRkNi7vJvHWpRABwBm
Network           : Solana Devnet
Framework         : Anchor
```

---

## System Architecture

> **[CipherVault Deep Dive]**
> An institutional-grade architecture ensuring secure on-chain trade execution, encrypted order books via FHE, and secure, cross-chain multi-asset management powered by dWallets.

<div align="center">
  <img src="assets/architecture.png" alt="CipherVault Platform Architecture" style="width:100%; border-radius: 12px; box-shadow: 0 4px 12px rgba(0,0,0,0.5); margin: 20px 0;" />
</div>

<br/>

### Data Flow & Component Interaction

```mermaid
graph TD
    classDef frontend fill:#1E293B,stroke:#818CF8,stroke-width:2px,color:#F8FAFC,font-family:Inter
    classDef onchain fill:#1E293B,stroke:#14F195,stroke-width:2px,color:#F8FAFC,font-family:Inter
    classDef conf fill:#1E293B,stroke:#9945FF,stroke-width:2px,color:#F8FAFC,font-family:Inter
    classDef ext fill:#1E293B,stroke:#F59E0B,stroke-width:2px,color:#F8FAFC,font-family:Inter

    subgraph BROWSER ["🌐 Browser Environment & Dashboard"]
        direction TB
        UI["Next.js 15 + Tailwind UI"]:::frontend
        STORE["Zustand Global State"]:::frontend
        SDK["@ciphervault/sdk (Web3 RPC)"]:::frontend
    end

    subgraph SOLANA ["⚡ Solana Settlement Layer (Devnet)"]
        direction TB
        CORE["CipherVault Core Program\n(Order matching & Settlement)"]:::onchain
        VAULT["Collateral Vault Program\n(Risk Engine & Position Tracking)"]:::onchain
        PDAS["Protocol PDAs & State"]:::onchain
    end

    subgraph CONFIDENTIAL ["🔒 Confidential Compute Layer"]
        direction TB
        IKA["Ika dWallet Network\n(MPC Custody)"]:::conf
        ENC["Encrypt FHE Protocol\n(Order Encryption)"]:::conf
    end

    subgraph EXTERNAL ["🌍 External Data & Chains"]
        direction LR
        PYTH["Pyth Oracle Feeds\n(Real-time Pricing)"]:::ext
        XC["Foreign Chains\n(Bitcoin, Ethereum, RWAs)"]:::ext
    end

    UI <--> |"User Actions & Updates"| STORE
    STORE <--> |"Invoke Transactions"| SDK
    SDK --> |"Setup MPC Keys"| IKA
    SDK --> |"FHE Ciphertexts"| ENC
    SDK --> |"Build Instructions"| CORE
    SDK --> |"Register Assets"| VAULT
    
    CORE --> |"Mutate State"| PDAS
    VAULT --> |"Track Margins"| PDAS
    CORE --> |"Verify Collateralization"| VAULT
    VAULT --> |"Fetch USD Price"| PYTH
    IKA --> |"Verify Foreign TXs"| VAULT
    ENC --> |"Encrypted Match"| CORE
    XC --> |"Native Custody"| IKA
```

---

## Smart Contract Details

CipherVault operates on Solana via highly optimized Anchor programs utilizing fixed-size state accounts and PDA-based authority structures to ensure maximum security.

### 1. CipherVault Core (`8Voz2Petb9Q4xYMCqjNVXSyTzkmzMsK3cTrSVGGLF8Ug`)
The Core Protocol acts as the matching engine and central settlement hub, operating exclusively on FHE ciphertexts to preserve trade secrecy.

*   **`EncryptedOrder`**: Represents a user's limit/market order. Order size and price are obfuscated via Encrypt's FHE cluster public key.
*   **`place_order`**: Deposits an encrypted payload to the order book. Only the decentralized matching nodes can compute homomorphic equality and price overlap.
*   **`settle_trade`**: Called by crankers post-threshold-decryption. Instantiates a `TradeSettlement` entry containing the actual matched sizes and executed prices.

### 2. Collateral Vault Program (`4jJrbTHiAP5ocWhbUqJG6m1bQ6cRkNi7vJvHWpRABwBm`)
This program enforces LTV constraints and tracks up to 8 distinct dWallet-backed cross-chain positions per user within a single PDA.

*   **`VaultAccount`**: Manages the user's aggregate health factor (`total_collateral_usd` vs `used_credit_usd`). Adheres to a `liquidation_threshold_bps` (max 90%).
*   **`register_dwallet`**: Seamlessly pairs an off-chain Ika MPC address with an on-chain tracker for assets spanning Bitcoin native, Ethereum, Solana, and tokenized real-world assets (RWAs).
*   **`record_deposit` / `record_withdrawal`**: Strict oracle-gated instructions that intake deposit assertions from the relayer network and re-evaluate total collateral power using Pyth Network feeds.

---

## Protocol Features

| Feature | Description |
|:---|:---|
| **Confidential Trading** | Encrypts order sizes and pricing data using Fully Homomorphic Encryption (FHE) |
| **Cross-chain Custody** | Decentralized, non-custodial asset management via Ika dWallet MPC networks |
| **On-chain Settlement** | Deterministic trade execution and collateral accounting on Solana |
| **Dynamic LTV Engine** | Real-time vault health tracking powered by Pyth Network oracle price feeds |
| **Zustand Architecture** | Robust frontend state management coupled with a unified transaction engine |
| **Institutional UX** | Premium, responsive dashboard built with Next.js 15 and modern TailwindCSS |

---

## Technology Stack

| Layer | Technology | Function |
|:---|:---|:---|
| **Frontend** | Next.js 15 | React framework for dashboard UI and routing |
| **Styling** | Tailwind CSS | Utility-first CSS for institutional-grade design |
| **State** | Zustand | Global state management and transaction tracking |
| **Solana SDK** | `@solana/web3.js` | RPC interactions, Tx building, wallet adapter |
| **Confidential** | Ika & Encrypt SDKs | Threshold MPC custody and FHE payload generation |
| **Smart Contracts** | Anchor (Rust) | Solana program logic (`ciphervault-core`, `collateral-vault`) |
| **Oracles** | Pyth Network | Real-time cryptocurrency price data feeds |
| **Hosting** | Vercel | Edge-optimized deployment for the web interface |

---

## Quick Start

### Prerequisites
- [Node.js](https://nodejs.org/) v18+
- [Solana CLI](https://docs.solana.com/cli/install-solana-cli-tools) & [Anchor](https://www.anchor-lang.com/docs/installation)
- Phantom Wallet (browser extension)

### 1. Clone & Install
```bash
git clone https://github.com/Gokul-social/CipherVault.git
cd CipherVault
npm install
```

### 2. Configure Environment
```bash
# Set up Devnet configuration
solana config set --url devnet
npm run setup:devnet
```

### 3. Start Development Server
```bash
npm run dev
```

### 4. Connect & Test
1. Open `http://localhost:3000`
2. Connect your Phantom wallet (ensure it is set to **Devnet**)
3. Initialize your collateral vault and start managing cross-chain positions!

---

## Workspace Scripts

The workspace provides several utility scripts for streamlined development:

```bash
# Build the TypeScript SDK package
npm run build:sdk

# Build the Next.js application for production
npm run build:app

# Execute Anchor smart contract test suite
npm run test:anchor

# Execute SDK integration tests
npm run test:sdk
```

---

## Project Structure

```
CipherVault/
├── app/                          # Next.js Frontend Dashboard
│   ├── src/
│   │   ├── app/                  # Application routes (Pages)
│   │   ├── components/           # UI Components (Modals, Toasts)
│   │   └── store/                # Zustand global state
├── programs/
│   ├── ciphervault-core/         # Order flow & trade execution contract
│   └── collateral-vault/         # Vault health & credit accounting contract
├── sdk/                          # Unified TypeScript Client Libraries
├── scripts/                      # Deployment & setup utilities
├── tests/                        # End-to-end integration tests
├── Anchor.toml                   # Anchor workspace configuration
└── package.json                  # Workspace dependencies
```

---

<div align="center">
  <br />
  <p>Built on <strong>Solana</strong> · Secured by <strong>Ika</strong> & <strong>Encrypt</strong></p>
  <p>
    <a href="https://ciphervault-ui.vercel.app">Live App</a> · 
    <a href="https://explorer.solana.com/address/8Voz2Petb9Q4xYMCqjNVXSyTzkmzMsK3cTrSVGGLF8Ug?cluster=devnet">Core Program</a> · 
    <a href="https://explorer.solana.com/address/4jJrbTHiAP5ocWhbUqJG6m1bQ6cRkNi7vJvHWpRABwBm?cluster=devnet">Vault Program</a>
  </p>
</div>
