# CipherVault

Confidential institutional prime brokerage on Solana powered by **Ika dWallets** and **Encrypt FHE**.

## Live Deployment

- **Application Web Interface**: https://ciphervault-ui.vercel.app
- **Source Repository**: https://github.com/Gokul-social/CipherVault

## Deployed Smart Contracts (Solana Devnet)

- **CipherVault Core**: `8Voz2Petb9Q4xYMCqjNVXSyTzkmzMsK3cTrSVGGLF8Ug`
- **Collateral Vault**: `4jJrbTHiAP5ocWhbUqJG6m1bQ6cRkNi7vJvHWpRABwBm`

## System Architecture

```mermaid
graph TD
    %% Styling Profile
    classDef default fill:#1E293B,stroke:#334155,stroke-width:1px,color:#F8FAFC,font-family:Inter
    classDef user fill:#0F172A,stroke:#38BDF8,stroke-width:2px,color:#F8FAFC,font-family:Inter
    classDef frontend fill:#1E293B,stroke:#818CF8,stroke-width:2px,color:#F8FAFC,font-family:Inter
    classDef onchain fill:#1E293B,stroke:#10B981,stroke-width:2px,color:#F8FAFC,font-family:Inter
    classDef conf fill:#1E293B,stroke:#F43F5E,stroke-width:2px,color:#F8FAFC,font-family:Inter
    classDef ext fill:#1E293B,stroke:#F59E0B,stroke-width:2px,color:#F8FAFC,font-family:Inter

    subgraph User["User Layer"]
        Trader["Institutional Trader\n(Wallet + Signed Intents)"]:::user
    end

    subgraph Frontend["Frontend Client Layer"]
        WebUI["CipherVault Dashboard\n(Next.js 15 + Tailwind + Wallet Adapter)"]:::frontend
        Store["State Management\n(Zustand + Hooks)"]:::frontend
        SDK["CipherVault SDK\n(IkaClient + EncryptClient + ProtocolClient)"]:::frontend
    end

    subgraph Solana["Solana Devnet Settlement Layer"]
        Core["CipherVault Core Program\n(Encrypted Order Flow + Trade Logic)"]:::onchain
        Vault["Collateral Vault Program\n(Vault Health + Credit + LTV Guardrails)"]:::onchain
        PDAs["Protocol PDAs\n(Vault Accounts + Positions + Orders)"]:::onchain
    end

    subgraph Confidential["Confidential Compute Layer"]
        Ika["Ika dWallet Network\n(Threshold MPC + Cross-chain Custody)"]:::conf
        Encrypt["Encrypt Protocol\n(FHE Encryption + Decryption Requests)"]:::conf
    end

    subgraph External["External Services & Assets"]
        Pyth["Pyth Price Feeds\n(BTC / ETH / SOL Oracles)"]:::ext
        CrossChain["Cross-chain Collateral Sources\n(Bitcoin + Ethereum + Solana Native)"]:::ext
    end

    %% Interactions and Data Flow
    Trader -- "Interacts" --> WebUI
    WebUI -- "Dispatches Actions" --> Store
    Store -- "Invokes Methods" --> SDK

    %% SDK Operations
    SDK -- "Registers / Controls dWallets" --> Ika
    SDK -- "Encrypts Trade Data" --> Encrypt
    SDK -- "Submits Encrypted Instructions" --> Core
    SDK -- "Manages Collateral State" --> Vault

    %% On-chain Operations
    Core -- "Updates Protocol State" --> PDAs
    Vault -- "Updates Protocol State" --> PDAs
    Core -- "Settlement & Risk Constraints" --> Vault
    Vault -- "Reads Price Oracles" --> Pyth

    %% Confidential & External Integrations
    Ika -- "Cross-chain State Sync" --> Vault
    Encrypt -- "Provides Ciphertexts" --> Core
    CrossChain -- "Custodial Deposits" --> Ika
```

## Core Project Structure

- `app/`: Next.js 15 dashboard, UI components, and trading interface.
- `sdk/`: TypeScript client libraries for integrating Ika, Encrypt, and protocol operations.
- `programs/ciphervault-core`: Anchor program for handling encrypted order flows and execution logic.
- `programs/collateral-vault`: Anchor program managing collateral deposits, vault health, and credit accounting.
- `tests/`: End-to-end integration tests validating protocol integrity.

## Local Development Setup

To run the application locally, execute the following commands in the terminal:

```bash
# Install all workspace dependencies
npm install

# Start the development server
npm run dev
```

## Available Workspace Scripts

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

# Configure and setup local Devnet environment
npm run setup:devnet
```
