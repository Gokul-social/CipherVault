# Verified SDK Integrations

This file tracks the resolution of all `[IKA-VERIFY]` and `[ENCRYPT-VERIFY]` markers from the Phase 0 scaffolding. As the project progresses, verified parameters and API signatures will be documented here to maintain technical credibility and ensure integration against real network interfaces rather than hallucinatory placeholders.

## Ika dWallet Network

### 1. Devnet Program ID
**Status:** Verified ✅
- **Value:** `87W54kGYFQ1rgWqMeu4XTPHWXWmXSQCcjm8vCTfiq1oY`
- **Context:** The official Ika Solana Pre-Alpha devnet verifier program ID. This replaces the placeholder `dWa11etXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX` in `ika-client.ts`.

### 2. `approve_message` CPI Signature
**Status:** Verified ✅
- **Signature Expected:** 
  ```rust
  ctx.approve_message(
      message_approval, 
      dwallet, 
      payer, 
      system_program, 
      message_hash, 
      user_pubkey, 
      signature_scheme, 
      bump
  )
  ```
- **Context:** The `approve_message` instruction expects a raw `message_hash` (e.g., a SHA512 hash for Solana or DoubleSHA256 for Bitcoin) rather than a pre-formatted transaction. The Anchor program must verify its logic first, then issue the CPI to the Ika program with the payload hash.

## Encrypt Protocol (FHE)

*(To be verified in subsequent phases)*
