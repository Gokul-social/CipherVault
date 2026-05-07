# CipherVault App

Frontend for the CipherVault protocol.

## Live Link

- https://ciphervault-ui.vercel.app

## Frontend Runtime Flow

```mermaid
flowchart LR
    USER[Trader]
    UI[Next.js UI\nPages + Components]
    STORES[Zustand Stores\nVault / Orders / Collateral]
    SDK[@ciphervault/sdk]
    WALLET[Solana Wallet Adapter]
    SOLANA[Solana Devnet\nAnchor Programs]
    IKA[Ika dWallet Network]
    ENC[Encrypt FHE]

    USER --> UI
    UI --> STORES
    UI --> WALLET
    STORES --> SDK
    SDK --> SOLANA
    SDK --> IKA
    SDK --> ENC

    classDef edge fill:#eef7ff,stroke:#1e88e5,stroke-width:1.4px,color:#0d2a4a;
    classDef infra fill:#fff3e0,stroke:#ef6c00,stroke-width:1.4px,color:#4b2a00;

    class USER,UI,STORES,SDK,WALLET edge;
    class SOLANA,IKA,ENC infra;
```

## Run Locally

```bash
npm run dev --workspace=app
```

## Production Build

```bash
npm run build --workspace=app
npm run start --workspace=app
```
