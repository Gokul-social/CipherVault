use anchor_lang::prelude::*;

declare_id!("8Voz2Petb9Q4xYMCqjNVXSyTzkmzMsK3cTrSVGGLF8Ug");

/// CipherVault Core Protocol
///
/// Manages the encrypted order book, trade settlement, and cross-chain
/// collateral positions using Ika dWallets for custody and Encrypt FHE
/// for confidential computation. This is the central coordination program
/// that other CipherVault programs CPI into.

#[program]
pub mod ciphervault_core {
    use super::*;

    /// Initializes the CipherVault protocol with an authority and global parameters.
    /// Called once at deployment to bootstrap the protocol state PDA.
    pub fn initialize(
        ctx: Context<Initialize>,
        max_leverage_bps: u16,
        settlement_window_slots: u64,
        fee_rate_bps: u16,
    ) -> Result<()> {
        let protocol = &mut ctx.accounts.protocol;
        protocol.authority = ctx.accounts.authority.key();
        protocol.max_leverage_bps = max_leverage_bps;
        protocol.settlement_window_slots = settlement_window_slots;
        protocol.fee_rate_bps = fee_rate_bps;
        protocol.total_vaults = 0;
        protocol.total_orders = 0;
        protocol.total_settlements = 0;
        protocol.is_frozen = false;
        protocol.bump = ctx.bumps.protocol;

        emit!(ProtocolInitialized {
            authority: protocol.authority,
            max_leverage_bps,
            settlement_window_slots,
        });

        Ok(())
    }

    /// Records a collateral deposit from an Ika dWallet on a foreign chain.
    /// The actual custody is handled by the dWallet; this instruction records
    /// the accounting entry and updates the trader's health factor.
    pub fn deposit_collateral(
        ctx: Context<DepositCollateral>,
        chain_asset: ChainAsset,
        amount: u64,
        dwallet_id: [u8; 32],
    ) -> Result<()> {
        require!(!ctx.accounts.protocol.is_frozen, CipherVaultError::VaultFrozen);
        require!(amount > 0, CipherVaultError::InsufficientCollateral);

        let vault = &mut ctx.accounts.collateral_vault;
        vault.owner = ctx.accounts.trader.key();
        vault.chain_asset = chain_asset;
        vault.deposited_amount = vault.deposited_amount.checked_add(amount)
            .ok_or(CipherVaultError::ExceedsCollateralLimit)?;
        vault.dwallet_id = dwallet_id;
        vault.last_update_slot = Clock::get()?.slot;
        vault.bump = ctx.bumps.collateral_vault;

        let protocol = &mut ctx.accounts.protocol;
        protocol.total_vaults = protocol.total_vaults.checked_add(1)
            .ok_or(CipherVaultError::ExceedsCollateralLimit)?;

        emit!(CollateralDeposited {
            trader: vault.owner,
            chain_asset,
            amount,
            dwallet_id,
            slot: vault.last_update_slot,
        });

        Ok(())
    }

    /// Withdraws collateral by instructing the dWallet to release assets.
    /// Enforces health factor constraints before permitting withdrawal.
    pub fn withdraw_collateral(
        ctx: Context<WithdrawCollateral>,
        amount: u64,
    ) -> Result<()> {
        require!(!ctx.accounts.protocol.is_frozen, CipherVaultError::VaultFrozen);

        let vault = &mut ctx.accounts.collateral_vault;
        require!(
            ctx.accounts.trader.key() == vault.owner,
            CipherVaultError::Unauthorized
        );
        require!(
            vault.deposited_amount >= amount,
            CipherVaultError::InsufficientCollateral
        );

        // Health factor check: ensure remaining collateral maintains minimum ratio
        let remaining = vault.deposited_amount.checked_sub(amount)
            .ok_or(CipherVaultError::InsufficientCollateral)?;
        require!(
            remaining == 0 || passes_health_check(remaining, vault.borrowed_amount),
            CipherVaultError::InvalidHealthFactor
        );

        vault.deposited_amount = remaining;
        vault.last_update_slot = Clock::get()?.slot;

        emit!(CollateralWithdrawn {
            trader: vault.owner,
            chain_asset: vault.chain_asset,
            amount,
            remaining_amount: remaining,
            slot: vault.last_update_slot,
        });

        Ok(())
    }

    /// Places an encrypted order on the FHE order book.
    /// The order size and price are encrypted using the Encrypt FHE cluster's
    /// public key; validators and indexers cannot read the order contents.
    pub fn place_order(
        ctx: Context<PlaceOrder>,
        encrypted_size: Vec<u8>,
        encrypted_price: Vec<u8>,
        direction: OrderDirection,
    ) -> Result<()> {
        require!(!ctx.accounts.protocol.is_frozen, CipherVaultError::VaultFrozen);
        require!(
            !encrypted_size.is_empty() && !encrypted_price.is_empty(),
            CipherVaultError::EncryptionFailure
        );

        let order = &mut ctx.accounts.encrypted_order;
        let protocol = &mut ctx.accounts.protocol;

        order.order_id = protocol.total_orders;
        order.trader = ctx.accounts.trader.key();
        order.encrypted_size = encrypted_size;
        order.encrypted_price = encrypted_price;
        order.direction = direction;
        order.timestamp = Clock::get()?.unix_timestamp;
        order.is_filled = false;
        order.is_cancelled = false;
        order.bump = ctx.bumps.encrypted_order;

        protocol.total_orders = protocol.total_orders.checked_add(1)
            .ok_or(CipherVaultError::ExceedsCollateralLimit)?;

        emit!(OrderPlaced {
            order_id: order.order_id,
            trader: order.trader,
            direction,
            timestamp: order.timestamp,
        });

        Ok(())
    }

    /// Settles a matched trade between two encrypted orders.
    /// Called by the off-chain matching engine after FHE computation confirms
    /// a valid match. The settlement references decrypted sizes and prices
    /// obtained via Encrypt's threshold decryption.
    pub fn settle_trade(
        ctx: Context<SettleTrade>,
        settled_size: u64,
        settled_price: u64,
    ) -> Result<()> {
        require!(!ctx.accounts.protocol.is_frozen, CipherVaultError::VaultFrozen);

        let buy_order = &ctx.accounts.buy_order;
        let sell_order = &ctx.accounts.sell_order;

        require!(!buy_order.is_cancelled, CipherVaultError::OrderNotFound);
        require!(!sell_order.is_cancelled, CipherVaultError::OrderNotFound);
        require!(
            buy_order.direction == OrderDirection::Long
                && sell_order.direction == OrderDirection::Short,
            CipherVaultError::InvalidSettlement
        );
        require!(settled_size > 0 && settled_price > 0, CipherVaultError::InvalidSettlement);

        let settlement = &mut ctx.accounts.trade_settlement;
        let protocol = &mut ctx.accounts.protocol;

        settlement.settlement_id = protocol.total_settlements;
        settlement.buyer = buy_order.trader;
        settlement.seller = sell_order.trader;
        settlement.buy_order_id = buy_order.order_id;
        settlement.sell_order_id = sell_order.order_id;
        settlement.settled_size = settled_size;
        settlement.settled_price = settled_price;
        settlement.settlement_slot = Clock::get()?.slot;
        settlement.fee_amount = settled_size
            .checked_mul(settled_price)
            .and_then(|v| v.checked_mul(protocol.fee_rate_bps as u64))
            .and_then(|v| v.checked_div(10_000))
            .ok_or(CipherVaultError::InvalidSettlement)?;
        settlement.bump = ctx.bumps.trade_settlement;

        protocol.total_settlements = protocol.total_settlements.checked_add(1)
            .ok_or(CipherVaultError::ExceedsCollateralLimit)?;

        emit!(TradeSettled {
            settlement_id: settlement.settlement_id,
            buyer: settlement.buyer,
            seller: settlement.seller,
            settled_size,
            settled_price,
            fee_amount: settlement.fee_amount,
            slot: settlement.settlement_slot,
        });

        Ok(())
    }
}

// ---------------------------------------------------------------------------
// Helper implementations
// ---------------------------------------------------------------------------

/// Minimum health factor: collateral must be at least 150% of borrowed amount.
/// health_factor = (collateral * 10_000) / borrowed >= 15_000 (150%)
fn passes_health_check(collateral: u64, borrowed: u64) -> bool {
    if borrowed == 0 {
        return true;
    }
    let health_bps = collateral
        .checked_mul(10_000)
        .and_then(|v| v.checked_div(borrowed));
    match health_bps {
        Some(hf) => hf >= 15_000,
        None => false,
    }
}

// ---------------------------------------------------------------------------
// Account Contexts
// ---------------------------------------------------------------------------

#[derive(Accounts)]
pub struct Initialize<'info> {
    #[account(
        init,
        payer = authority,
        space = 8 + Protocol::INIT_SPACE,
        seeds = [b"protocol"],
        bump
    )]
    pub protocol: Account<'info, Protocol>,

    #[account(mut)]
    pub authority: Signer<'info>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
#[instruction(chain_asset: ChainAsset, amount: u64, dwallet_id: [u8; 32])]
pub struct DepositCollateral<'info> {
    #[account(
        mut,
        seeds = [b"protocol"],
        bump = protocol.bump
    )]
    pub protocol: Account<'info, Protocol>,

    #[account(
        init_if_needed,
        payer = trader,
        space = 8 + CollateralVault::INIT_SPACE,
        seeds = [b"vault", trader.key().as_ref(), &[chain_asset as u8]],
        bump
    )]
    pub collateral_vault: Account<'info, CollateralVault>,

    #[account(mut)]
    pub trader: Signer<'info>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct WithdrawCollateral<'info> {
    #[account(
        mut,
        seeds = [b"protocol"],
        bump = protocol.bump
    )]
    pub protocol: Account<'info, Protocol>,

    #[account(
        mut,
        seeds = [b"vault", trader.key().as_ref(), &[collateral_vault.chain_asset as u8]],
        bump = collateral_vault.bump
    )]
    pub collateral_vault: Account<'info, CollateralVault>,

    #[account(mut)]
    pub trader: Signer<'info>,
}

#[derive(Accounts)]
#[instruction(encrypted_size: Vec<u8>, encrypted_price: Vec<u8>, direction: OrderDirection)]
pub struct PlaceOrder<'info> {
    #[account(
        mut,
        seeds = [b"protocol"],
        bump = protocol.bump
    )]
    pub protocol: Account<'info, Protocol>,

    #[account(
        init,
        payer = trader,
        space = 8 + EncryptedOrder::INIT_SPACE,
        seeds = [b"order", trader.key().as_ref(), protocol.total_orders.to_le_bytes().as_ref()],
        bump
    )]
    pub encrypted_order: Account<'info, EncryptedOrder>,

    #[account(mut)]
    pub trader: Signer<'info>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct SettleTrade<'info> {
    #[account(
        mut,
        seeds = [b"protocol"],
        bump = protocol.bump
    )]
    pub protocol: Account<'info, Protocol>,

    #[account(
        mut,
        constraint = buy_order.direction == OrderDirection::Long @ CipherVaultError::InvalidSettlement
    )]
    pub buy_order: Account<'info, EncryptedOrder>,

    #[account(
        mut,
        constraint = sell_order.direction == OrderDirection::Short @ CipherVaultError::InvalidSettlement
    )]
    pub sell_order: Account<'info, EncryptedOrder>,

    #[account(
        init,
        payer = settler,
        space = 8 + TradeSettlement::INIT_SPACE,
        seeds = [
            b"settlement".as_ref(),
            buy_order.order_id.to_le_bytes().as_ref(),
            sell_order.order_id.to_le_bytes().as_ref()
        ],
        bump
    )]
    pub trade_settlement: Account<'info, TradeSettlement>,

    /// The settlement authority — in production this would be the FHE executor PDA
    /// or a protocol-authorized crank. For scaffold, any signer works.
    #[account(mut)]
    pub settler: Signer<'info>,

    pub system_program: Program<'info, System>,
}

// ---------------------------------------------------------------------------
// State Accounts
// ---------------------------------------------------------------------------

/// Global protocol configuration. One instance per deployment, stored as a PDA.
#[account]
#[derive(InitSpace)]
pub struct Protocol {
    /// The protocol admin who can freeze/unfreeze and update parameters
    pub authority: Pubkey,
    /// Maximum leverage in basis points (e.g., 50_000 = 5x)
    pub max_leverage_bps: u16,
    /// Number of slots a settlement window remains open
    pub settlement_window_slots: u64,
    /// Fee rate in basis points applied to settled trade notional
    pub fee_rate_bps: u16,
    /// Running count of collateral vaults created
    pub total_vaults: u64,
    /// Running count of encrypted orders placed
    pub total_orders: u64,
    /// Running count of trade settlements executed
    pub total_settlements: u64,
    /// Emergency kill switch — halts all deposits, orders, and settlements
    pub is_frozen: bool,
    /// PDA bump seed for derivation
    pub bump: u8,
}

/// Per-trader, per-asset collateral position. Tracks deposited amounts and
/// the associated Ika dWallet ID that custodies the actual assets on the
/// foreign chain.
#[account]
#[derive(InitSpace)]
pub struct CollateralVault {
    /// The trader who owns this collateral position
    pub owner: Pubkey,
    /// Which chain+asset this collateral represents
    pub chain_asset: ChainAsset,
    /// Total deposited amount in the asset's native denomination
    pub deposited_amount: u64,
    /// Amount currently borrowed against this collateral
    pub borrowed_amount: u64,
    /// The Ika dWallet ID that custodies the actual assets
    pub dwallet_id: [u8; 32],
    /// Slot of the last state change for staleness checks
    pub last_update_slot: u64,
    /// PDA bump seed
    pub bump: u8,
}

/// An order on the encrypted order book. Size and price are FHE ciphertexts
/// encrypted to the Encrypt cluster's public key. The matching engine operates
/// on these ciphertexts homomorphically without ever seeing plaintext values.
#[account]
#[derive(InitSpace)]
pub struct EncryptedOrder {
    /// Monotonically increasing order identifier
    pub order_id: u64,
    /// The trader who placed this order
    pub trader: Pubkey,
    /// FHE-encrypted order size (ciphertext bytes)
    #[max_len(256)]
    pub encrypted_size: Vec<u8>,
    /// FHE-encrypted limit price (ciphertext bytes)
    #[max_len(256)]
    pub encrypted_price: Vec<u8>,
    /// Long or Short
    pub direction: OrderDirection,
    /// Unix timestamp when the order was placed
    pub timestamp: i64,
    /// Whether this order has been fully matched
    pub is_filled: bool,
    /// Whether the trader has cancelled this order
    pub is_cancelled: bool,
    /// PDA bump seed
    pub bump: u8,
}

/// Record of a completed trade settlement between a buyer and seller.
/// Created after the FHE matching engine confirms a valid price/size overlap
/// and threshold decryption reveals the settlement parameters.
#[account]
#[derive(InitSpace)]
pub struct TradeSettlement {
    /// Monotonically increasing settlement identifier
    pub settlement_id: u64,
    /// The buyer's public key
    pub buyer: Pubkey,
    /// The seller's public key
    pub seller: Pubkey,
    /// Reference to the buy-side encrypted order
    pub buy_order_id: u64,
    /// Reference to the sell-side encrypted order
    pub sell_order_id: u64,
    /// Decrypted matched size
    pub settled_size: u64,
    /// Decrypted matched price
    pub settled_price: u64,
    /// Slot at which settlement was recorded on-chain
    pub settlement_slot: u64,
    /// Fee charged on this settlement (in quote asset denomination)
    pub fee_amount: u64,
    /// PDA bump seed
    pub bump: u8,
}

// ---------------------------------------------------------------------------
// Enums
// ---------------------------------------------------------------------------

/// Identifies which blockchain and asset a collateral position represents.
/// Used as a PDA seed component to ensure one vault per trader per asset.
#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq, Eq, InitSpace)]
pub enum ChainAsset {
    /// Bitcoin on the Bitcoin mainchain
    BtcNative,
    /// Ether on Ethereum mainnet
    EthNative,
    /// SOL on Solana (native or wrapped)
    SolNative,
    /// USDC on any supported chain (chain specified via context)
    Usdc,
    /// Tokenized US Treasury Bills (RWA)
    TokenizedTBill,
    /// Tokenized real estate (RWA)
    TokenizedRealEstate,
    /// Tokenized gold (RWA)
    TokenizedGold,
}

/// Direction of a trading order.
#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq, Eq, InitSpace)]
pub enum OrderDirection {
    Long,
    Short,
}

// ---------------------------------------------------------------------------
// Events
// ---------------------------------------------------------------------------

#[event]
pub struct ProtocolInitialized {
    pub authority: Pubkey,
    pub max_leverage_bps: u16,
    pub settlement_window_slots: u64,
}

#[event]
pub struct CollateralDeposited {
    pub trader: Pubkey,
    pub chain_asset: ChainAsset,
    pub amount: u64,
    pub dwallet_id: [u8; 32],
    pub slot: u64,
}

#[event]
pub struct CollateralWithdrawn {
    pub trader: Pubkey,
    pub chain_asset: ChainAsset,
    pub amount: u64,
    pub remaining_amount: u64,
    pub slot: u64,
}

#[event]
pub struct OrderPlaced {
    pub order_id: u64,
    pub trader: Pubkey,
    pub direction: OrderDirection,
    pub timestamp: i64,
}

#[event]
pub struct TradeSettled {
    pub settlement_id: u64,
    pub buyer: Pubkey,
    pub seller: Pubkey,
    pub settled_size: u64,
    pub settled_price: u64,
    pub fee_amount: u64,
    pub slot: u64,
}

// ---------------------------------------------------------------------------
// Errors
// ---------------------------------------------------------------------------

#[error_code]
pub enum CipherVaultError {
    /// The signer is not authorized to perform this action
    #[msg("Unauthorized: signer does not have the required authority")]
    Unauthorized,

    /// Collateral amount is zero or below the required minimum
    #[msg("Insufficient collateral: deposit amount is below required minimum")]
    InsufficientCollateral,

    /// Referenced order does not exist or has been cancelled
    #[msg("Order not found: the referenced order ID does not exist or was cancelled")]
    OrderNotFound,

    /// Settlement parameters are invalid (mismatched directions, zero values)
    #[msg("Invalid settlement: trade parameters do not satisfy matching constraints")]
    InvalidSettlement,

    /// The protocol is in emergency freeze mode — all operations halted
    #[msg("Vault frozen: protocol is in emergency freeze mode")]
    VaultFrozen,

    /// Operation would exceed the per-vault or protocol-wide collateral cap
    #[msg("Exceeds collateral limit: operation would overflow the vault capacity")]
    ExceedsCollateralLimit,

    /// The provided chain+asset identifier is not supported by the protocol
    #[msg("Invalid chain asset: the specified chain and asset pair is not supported")]
    InvalidChainAsset,

    /// FHE encryption or decryption operation failed
    #[msg("Encryption failure: the FHE operation did not complete successfully")]
    EncryptionFailure,

    /// An Ika dWallet CPI operation (create, sign, approve) failed
    #[msg("dWallet operation failed: the Ika dWallet CPI call returned an error")]
    DwalletOperationFailed,

    /// Withdrawal would drop the health factor below the liquidation threshold
    #[msg("Invalid health factor: withdrawal would breach the minimum collateralization ratio")]
    InvalidHealthFactor,
}
