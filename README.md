# CipherVault

Confidential institutional prime brokerage on Solana powered by **Ika dWallets** and **Encrypt FHE**.

## Live Links

- App: https://ciphervault-ui.vercel.app
- Repository: https://github.com/Gokul-social/CipherVault

## Architecture Flow

```mermaid
flowchart TB
    %% =========================
    %% User / Entry Layer
    %% =========================
    U[Institutional Trader\nWallet + Signed Intents]

    subgraph FE[Frontend Experience]
      WEB[CipherVault Dashboard\nNext.js 15 + Tailwind + Wallet Adapter]
      STATE[State + Hooks\nZustand Stores + Typed Actions]
      SDK[@ciphervault/sdk\nIkaClient + EncryptClient + CollateralClient]
    end

    %% =========================
    %% Solana Settlement Layer
    %% =========================
    subgraph SOL[Solana Devnet Settlement Layer]
      CORE[ciphervault-core\nEncrypted Order Flow + Trade Logic]
      VAULT[collateral-vault\nVault Health + Credit + LTV Guardrails]
      PDA[Protocol PDAs\nVault Accounts + Positions + Orders]
      PYTH[Pyth Price Feeds\nBTC / ETH / SOL USD]
    end

    %% =========================
    %% Confidential Compute Layer
    %% =========================
    subgraph CONF[Confidential Infrastructure]
      IKA[Ika dWallet Network\nThreshold MPC / Cross-chain Custody]
      ENC[Encrypt Protocol\nFHE Encryption + Decryption Requests]
    end

    %% =========================
    %% Cross-chain Collateral Layer
    %% =========================
    subgraph XC[Cross-chain Collateral Sources]
      BTC[Bitcoin]
      ETH[Ethereum]
      SOLA[Solana Native Assets]
    end

    %% User -> App
    U --> WEB
    WEB --> STATE
    STATE --> SDK

    %% SDK -> Confidential + Solana
    SDK -->|Register / control dWallets| IKA
    SDK -->|Encrypt size + price| ENC
    SDK -->|Submit instructions| CORE
    SDK -->|Update collateral & credit| VAULT

    %% Solana internal coupling
    CORE --> PDA
    VAULT --> PDA
    VAULT --> PYTH

    %% Cross-chain collateral routing
    BTC --> IKA
    ETH --> IKA
    SOLA --> IKA
    IKA -->|Collateral state updates| VAULT

    %% Confidential trade loop
    ENC -->|Ciphertext payloads| CORE
    CORE -->|Settlement + risk checks| VAULT

    %% Visual styling
    classDef user fill:#f9f3d6,stroke:#c99700,stroke-width:1.5px,color:#3f2f00;
    classDef front fill:#dff6ff,stroke:#0b84a5,stroke-width:1.5px,color:#0a2d36;
    classDef chain fill:#e8f5e9,stroke:#2e7d32,stroke-width:1.5px,color:#173d1a;
    classDef conf fill:#ffe7ef,stroke:#c2185b,stroke-width:1.5px,color:#4a1028;
    classDef assets fill:#efe9ff,stroke:#5e35b1,stroke-width:1.5px,color:#2d1761;

    class U user;
    class WEB,STATE,SDK front;
    class CORE,VAULT,PDA,PYTH chain;
    class IKA,ENC conf;
    class BTC,ETH,SOLA assets;
```

## Core Components

- `app/`: Next.js dashboard and trading UX.
- `sdk/`: TypeScript clients for Ika, Encrypt, and protocol interactions.
- `programs/ciphervault-core`: Order flow and encrypted trading logic.
- `programs/collateral-vault`: Collateral, vault health, and credit accounting.
- `tests/`: Anchor and integration-level protocol tests.

## Local Development

```bash
npm install
npm run dev
```

## Workspace Scripts

```bash
npm run build:sdk
npm run build:app
npm run test:anchor
npm run test:sdk
npm run setup:devnet
```
