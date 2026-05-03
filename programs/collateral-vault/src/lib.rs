use anchor_lang::prelude::*;

declare_id!("4jJrbTHiAP5ocWhbUqJG6m1bQ6cRkNi7vJvHWpRABwBm");

/// CipherVault Collateral Vault Program — Phase 1
///
/// Manages per-user multi-chain collateral vaults. Each user has a single
/// VaultAccount PDA (seeded [b"vault", user]) holding up to 8 dWallet-backed
/// positions across BTC, ETH, SOL, and RWA chains. An oracle authority relays
/// deposit/withdrawal confirmations from Ika dWallets with current USD prices.

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/// Maximum number of dWallet positions per vault
const MAX_POSITIONS: usize = 8;

/// Maximum allowed LTV in basis points (80%)
const MAX_LTV_BPS: u16 = 8000;

/// Maximum allowed liquidation threshold in basis points (90%)
const MAX_LIQUIDATION_THRESHOLD_BPS: u16 = 9000;

/// USD price precision: 6 decimal places (1_000_000 = $1.00)
const USD_DECIMALS: u64 = 1_000_000;

/// Basis point denominator
const BPS_DENOMINATOR: u64 = 10_000;

// ---------------------------------------------------------------------------
// Program
// ---------------------------------------------------------------------------

#[program]
pub mod collateral_vault {
    use super::*;

    /// Initializes a per-user collateral vault with risk parameters.
    ///
    /// Seeds: [b"vault", user.key()]
    /// Validations:
    ///   - ltv_bps <= 8000 (max 80% LTV)
    ///   - liquidation_threshold_bps <= 9000 (max 90%)
    ///   - ltv_bps < liquidation_threshold_bps (LTV must be below liq. threshold)
    pub fn initialize_vault(
        ctx: Context<InitializeVault>,
        ltv_bps: u16,
        liquidation_threshold_bps: u16,
    ) -> Result<()> {
        require!(
            ltv_bps <= MAX_LTV_BPS,
            CollateralVaultError::InvalidLtvBps
        );
        require!(
            liquidation_threshold_bps <= MAX_LIQUIDATION_THRESHOLD_BPS,
            CollateralVaultError::InvalidLiquidationThreshold
        );
        require!(
            ltv_bps < liquidation_threshold_bps,
            CollateralVaultError::LtvExceedsLiquidationThreshold
        );

        let vault = &mut ctx.accounts.vault;
        vault.owner = ctx.accounts.user.key();
        vault.oracle_authority = ctx.accounts.oracle_authority.key();
        vault.ltv_bps = ltv_bps;
        vault.liquidation_threshold_bps = liquidation_threshold_bps;
        vault.total_collateral_usd = 0;
        vault.used_credit_usd = 0;
        vault.dwallet_ids = Vec::new();
        vault.positions = Vec::new();
        vault.is_frozen = false;
        vault.bump = ctx.bumps.vault;

        emit!(VaultInitialized {
            owner: vault.owner,
            ltv_bps,
            liquidation_threshold_bps,
        });

        Ok(())
    }

    /// Registers an Ika dWallet for a specific chain+asset pair.
    ///
    /// The dWallet must already be created via the Ika SDK off-chain. This
    /// instruction records the binding between the dWallet ID and the user's
    /// vault, creating an empty CollateralPosition ready for deposits.
    ///
    /// Validations:
    ///   - Vault not frozen
    ///   - Less than 8 wallets registered
    ///   - dwallet_id not already in the vault
    ///   - chain in {0=BTC, 1=ETH, 2=SOL, 3=RWA}
    pub fn register_dwallet(
        ctx: Context<RegisterDwallet>,
        dwallet_id: [u8; 32],
        chain: u8,
        asset: u8,
    ) -> Result<()> {
        let vault = &mut ctx.accounts.vault;

        require!(!vault.is_frozen, CollateralVaultError::VaultFrozen);

        // Validate chain enum
        require!(chain <= 3, CollateralVaultError::InvalidChainAsset);

        // Validate asset enum (0-6 maps to BtcNative..TokenizedGold)
        require!(asset <= 6, CollateralVaultError::InvalidChainAsset);

        // Enforce max position limit
        require!(
            vault.dwallet_ids.len() < MAX_POSITIONS,
            CollateralVaultError::ExceedsWalletLimit
        );

        // Check for duplicate registration
        for existing in vault.dwallet_ids.iter() {
            require!(
                *existing != dwallet_id,
                CollateralVaultError::DWalletAlreadyRegistered
            );
        }

        // Register the dWallet
        vault.dwallet_ids.push(dwallet_id);

        // Create initial empty position
        let slot = Clock::get()?.slot;
        vault.positions.push(CollateralPosition {
            dwallet_id,
            chain,
            asset,
            raw_amount: 0,
            usd_value: 0,
            last_updated_slot: slot,
        });

        // [IKA-VERIFY: In production, CPI to the Ika dWallet verifier program
        // (87W54kGYFQ1rgWqMeu4XTPHWXWmXSQCcjm8vCTfiq1oY on devnet) to confirm
        // that the dwallet_id exists on-chain and its authority has been transferred
        // to this vault's PDA. The CPI would look like:
        //
        //   ika_verifier::cpi::verify_dwallet_ownership(
        //     CpiContext::new_with_signer(
        //       ctx.accounts.ika_program.to_account_info(),
        //       ika_verifier::cpi::accounts::VerifyOwnership {
        //         dwallet_account: ...,
        //         expected_authority: vault.to_account_info(),
        //       },
        //       &[&[b"vault", vault.owner.as_ref(), &[vault.bump]]],
        //     ),
        //     dwallet_id,
        //   )?;
        //
        // Skipped in Phase 1 because the Ika Solana pre-alpha does not yet
        // expose a public verification CPI interface.]

        emit!(DWalletRegistered {
            owner: vault.owner,
            dwallet_id,
            chain,
            asset,
        });

        Ok(())
    }

    /// Records a collateral deposit confirmed by the oracle/relayer.
    ///
    /// This is called by the oracle_authority after it observes a confirmed
    /// deposit on the foreign chain (via Ika dWallet monitoring). The oracle
    /// provides both the raw asset amount and the current USD price.
    ///
    /// Authority: Only the vault's stored oracle_authority can call this.
    pub fn record_deposit(
        ctx: Context<RecordDeposit>,
        dwallet_id: [u8; 32],
        raw_amount: u64,
        usd_price_6dec: u64,
    ) -> Result<()> {
        let vault = &mut ctx.accounts.vault;

        require!(!vault.is_frozen, CollateralVaultError::VaultFrozen);

        // Authority gate: only the oracle can record deposits
        require!(
            ctx.accounts.oracle_authority.key() == vault.oracle_authority,
            CollateralVaultError::UnauthorizedOracle
        );

        require!(raw_amount > 0, CollateralVaultError::InvalidAmount);
        require!(usd_price_6dec > 0, CollateralVaultError::InvalidOraclePrice);

        // Find the position matching this dwallet_id
        let position_idx = vault
            .positions
            .iter()
            .position(|p| p.dwallet_id == dwallet_id)
            .ok_or(CollateralVaultError::DWalletNotFound)?;

        // Update position
        let position = &mut vault.positions[position_idx];
        position.raw_amount = position
            .raw_amount
            .checked_add(raw_amount)
            .ok_or(CollateralVaultError::Overflow)?;

        // Calculate USD value: (total_raw_amount * usd_price_6dec) / 1_000_000
        position.usd_value = position
            .raw_amount
            .checked_mul(usd_price_6dec)
            .ok_or(CollateralVaultError::Overflow)?
            .checked_div(USD_DECIMALS)
            .ok_or(CollateralVaultError::Overflow)?;

        position.last_updated_slot = Clock::get()?.slot;

        // Recalculate total collateral across all positions
        let new_total: u64 = vault
            .positions
            .iter()
            .map(|p| p.usd_value)
            .try_fold(0u64, |acc, v| acc.checked_add(v))
            .ok_or(CollateralVaultError::Overflow)?;

        vault.total_collateral_usd = new_total;

        let deposit_usd = raw_amount
            .checked_mul(usd_price_6dec)
            .ok_or(CollateralVaultError::Overflow)?
            .checked_div(USD_DECIMALS)
            .ok_or(CollateralVaultError::Overflow)?;

        emit!(CollateralDeposited {
            owner: vault.owner,
            dwallet_id,
            raw_amount,
            usd_value: deposit_usd,
            new_total: vault.total_collateral_usd,
        });

        Ok(())
    }

    /// Records a collateral withdrawal, enforcing health factor constraints.
    ///
    /// Before updating, projects the post-withdrawal health factor. If the
    /// vault has outstanding credit (used_credit_usd > 0), the projected
    /// health must remain above the liquidation threshold.
    pub fn record_withdrawal(
        ctx: Context<RecordWithdrawal>,
        dwallet_id: [u8; 32],
        raw_amount: u64,
        usd_price_6dec: u64,
    ) -> Result<()> {
        let vault = &mut ctx.accounts.vault;

        require!(!vault.is_frozen, CollateralVaultError::VaultFrozen);

        // Authority gate
        require!(
            ctx.accounts.oracle_authority.key() == vault.oracle_authority,
            CollateralVaultError::UnauthorizedOracle
        );

        require!(raw_amount > 0, CollateralVaultError::InvalidAmount);
        require!(usd_price_6dec > 0, CollateralVaultError::InvalidOraclePrice);

        // Find position
        let position_idx = vault
            .positions
            .iter()
            .position(|p| p.dwallet_id == dwallet_id)
            .ok_or(CollateralVaultError::DWalletNotFound)?;

        // Validate sufficient balance
        require!(
            raw_amount <= vault.positions[position_idx].raw_amount,
            CollateralVaultError::InsufficientBalance
        );

        // Calculate projected USD removal
        let projected_usd_removed = raw_amount
            .checked_mul(usd_price_6dec)
            .ok_or(CollateralVaultError::Overflow)?
            .checked_div(USD_DECIMALS)
            .ok_or(CollateralVaultError::Overflow)?;

        let projected_total = vault
            .total_collateral_usd
            .checked_sub(projected_usd_removed)
            .ok_or(CollateralVaultError::InsufficientCollateral)?;

        // Health check: if there's outstanding credit, ensure we stay above threshold
        if vault.used_credit_usd > 0 {
            let projected_health = projected_total
                .checked_mul(BPS_DENOMINATOR)
                .ok_or(CollateralVaultError::Overflow)?
                .checked_div(vault.used_credit_usd)
                .ok_or(CollateralVaultError::Overflow)?;

            require!(
                projected_health >= vault.liquidation_threshold_bps as u64,
                CollateralVaultError::InsufficientCollateral
            );
        }

        // Update position
        let position = &mut vault.positions[position_idx];
        position.raw_amount = position
            .raw_amount
            .checked_sub(raw_amount)
            .ok_or(CollateralVaultError::InsufficientBalance)?;

        // Recalculate position USD value from new raw_amount
        position.usd_value = position
            .raw_amount
            .checked_mul(usd_price_6dec)
            .ok_or(CollateralVaultError::Overflow)?
            .checked_div(USD_DECIMALS)
            .ok_or(CollateralVaultError::Overflow)?;

        position.last_updated_slot = Clock::get()?.slot;

        // Recalculate total
        vault.total_collateral_usd = vault
            .positions
            .iter()
            .map(|p| p.usd_value)
            .try_fold(0u64, |acc, v| acc.checked_add(v))
            .ok_or(CollateralVaultError::Overflow)?;

        emit!(CollateralWithdrawn {
            owner: vault.owner,
            dwallet_id,
            raw_amount,
            usd_value: projected_usd_removed,
            new_total: vault.total_collateral_usd,
        });

        Ok(())
    }

    /// Checks the health factor of a vault.
    ///
    /// Health is computed as: (total_collateral_usd * 10_000) / used_credit_usd
    /// If used_credit_usd is 0, returns u64::MAX (fully collateralized).
    ///
    /// This instruction is permissionless — anyone can check any vault's health
    /// (e.g., liquidation bots, frontends, dashboards).
    pub fn check_health(ctx: Context<CheckHealth>) -> Result<u64> {
        let vault = &ctx.accounts.vault;

        if vault.used_credit_usd == 0 {
            emit!(HealthChecked {
                owner: vault.owner,
                health_bps: u64::MAX,
                total_collateral_usd: vault.total_collateral_usd,
                used_credit_usd: 0,
            });
            return Ok(u64::MAX);
        }

        let health_bps = vault
            .total_collateral_usd
            .checked_mul(BPS_DENOMINATOR)
            .ok_or(CollateralVaultError::Overflow)?
            .checked_div(vault.used_credit_usd)
            .ok_or(CollateralVaultError::Overflow)?;

        emit!(HealthChecked {
            owner: vault.owner,
            health_bps,
            total_collateral_usd: vault.total_collateral_usd,
            used_credit_usd: vault.used_credit_usd,
        });

        Ok(health_bps)
    }

    /// Admin: updates the used_credit_usd field on a vault.
    ///
    /// In production this would be CPI'd by ciphervault-core after trade
    /// settlement adjusts margin requirements. For Phase 1 testing, the
    /// vault owner can call this directly to simulate outstanding loans.
    pub fn update_credit(ctx: Context<UpdateCredit>, new_used_credit_usd: u64) -> Result<()> {
        let vault = &mut ctx.accounts.vault;

        require!(
            ctx.accounts.user.key() == vault.owner,
            CollateralVaultError::Unauthorized
        );

        vault.used_credit_usd = new_used_credit_usd;

        Ok(())
    }
}

// ---------------------------------------------------------------------------
// Account Contexts
// ---------------------------------------------------------------------------

#[derive(Accounts)]
pub struct InitializeVault<'info> {
    #[account(
        init,
        payer = user,
        // 8 discriminator + 32 owner + 32 oracle + 2 ltv + 2 liq_threshold
        // + 8 total_col + 8 used_credit + 4 vec_len + (32*8) dwallet_ids
        // + 4 vec_len + (58*8) positions + 1 frozen + 1 bump = 862
        space = 8 + 32 + 32 + 2 + 2 + 8 + 8 + (4 + 32 * 8) + (4 + 58 * 8) + 1 + 1,
        seeds = [b"vault", user.key().as_ref()],
        bump
    )]
    pub vault: Account<'info, VaultAccount>,

    #[account(mut)]
    pub user: Signer<'info>,

    /// The oracle/relayer authority that will be allowed to record deposits
    /// and withdrawals. Stored in the vault at initialization time.
    /// CHECK: This is an arbitrary pubkey stored as the oracle authority.
    /// It is not read as an account; it's only stored as a Pubkey field.
    pub oracle_authority: UncheckedAccount<'info>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct RegisterDwallet<'info> {
    #[account(
        mut,
        seeds = [b"vault", user.key().as_ref()],
        bump = vault.bump,
        constraint = vault.owner == user.key() @ CollateralVaultError::Unauthorized
    )]
    pub vault: Account<'info, VaultAccount>,

    #[account(mut)]
    pub user: Signer<'info>,
}

#[derive(Accounts)]
pub struct RecordDeposit<'info> {
    #[account(
        mut,
        seeds = [b"vault", vault.owner.as_ref()],
        bump = vault.bump
    )]
    pub vault: Account<'info, VaultAccount>,

    /// The oracle authority — must match vault.oracle_authority
    pub oracle_authority: Signer<'info>,
}

#[derive(Accounts)]
pub struct RecordWithdrawal<'info> {
    #[account(
        mut,
        seeds = [b"vault", vault.owner.as_ref()],
        bump = vault.bump
    )]
    pub vault: Account<'info, VaultAccount>,

    /// The oracle authority — must match vault.oracle_authority
    pub oracle_authority: Signer<'info>,
}

#[derive(Accounts)]
pub struct CheckHealth<'info> {
    #[account(
        seeds = [b"vault", vault.owner.as_ref()],
        bump = vault.bump
    )]
    pub vault: Account<'info, VaultAccount>,
}

#[derive(Accounts)]
pub struct UpdateCredit<'info> {
    #[account(
        mut,
        seeds = [b"vault", user.key().as_ref()],
        bump = vault.bump,
        constraint = vault.owner == user.key() @ CollateralVaultError::Unauthorized
    )]
    pub vault: Account<'info, VaultAccount>,

    #[account(mut)]
    pub user: Signer<'info>,
}

// ---------------------------------------------------------------------------
// State
// ---------------------------------------------------------------------------

/// Per-user collateral vault. Holds up to 8 cross-chain positions, each
/// backed by an Ika dWallet. The vault tracks aggregate USD collateral
/// and outstanding credit for health factor computation.
#[account]
pub struct VaultAccount {
    /// The trader who owns this vault
    pub owner: Pubkey,
    /// Authorized oracle/relayer that can record deposits and withdrawals
    pub oracle_authority: Pubkey,
    /// Loan-to-value ratio in basis points (e.g., 7000 = 70%)
    pub ltv_bps: u16,
    /// Liquidation threshold in basis points (e.g., 8500 = 85%)
    pub liquidation_threshold_bps: u16,
    /// Aggregate USD value of all collateral (6 decimal precision)
    pub total_collateral_usd: u64,
    /// Outstanding credit/margin used (6 decimal precision)
    pub used_credit_usd: u64,
    /// List of registered dWallet IDs (max 8)
    pub dwallet_ids: Vec<[u8; 32]>,
    /// Collateral positions corresponding to each dWallet (max 8)
    pub positions: Vec<CollateralPosition>,
    /// Emergency freeze flag
    pub is_frozen: bool,
    /// PDA bump seed
    pub bump: u8,
}

/// A single collateral position backed by an Ika dWallet.
#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq, Eq, Debug)]
pub struct CollateralPosition {
    /// The Ika dWallet ID (32-byte identifier)
    pub dwallet_id: [u8; 32],
    /// Chain identifier: 0=BTC, 1=ETH, 2=SOL, 3=RWA
    pub chain: u8,
    /// Asset identifier within the chain
    pub asset: u8,
    /// Amount in the asset's native denomination
    pub raw_amount: u64,
    /// USD value of this position (6 decimal precision)
    pub usd_value: u64,
    /// Solana slot of the last update
    pub last_updated_slot: u64,
}

// ---------------------------------------------------------------------------
// Events
// ---------------------------------------------------------------------------

#[event]
pub struct VaultInitialized {
    pub owner: Pubkey,
    pub ltv_bps: u16,
    pub liquidation_threshold_bps: u16,
}

#[event]
pub struct DWalletRegistered {
    pub owner: Pubkey,
    pub dwallet_id: [u8; 32],
    pub chain: u8,
    pub asset: u8,
}

#[event]
pub struct CollateralDeposited {
    pub owner: Pubkey,
    pub dwallet_id: [u8; 32],
    pub raw_amount: u64,
    pub usd_value: u64,
    pub new_total: u64,
}

#[event]
pub struct CollateralWithdrawn {
    pub owner: Pubkey,
    pub dwallet_id: [u8; 32],
    pub raw_amount: u64,
    pub usd_value: u64,
    pub new_total: u64,
}

#[event]
pub struct HealthChecked {
    pub owner: Pubkey,
    pub health_bps: u64,
    pub total_collateral_usd: u64,
    pub used_credit_usd: u64,
}

// ---------------------------------------------------------------------------
// Errors
// ---------------------------------------------------------------------------

#[error_code]
pub enum CollateralVaultError {
    #[msg("Unauthorized: caller is not the vault owner")]
    Unauthorized,

    #[msg("Insufficient collateral: withdrawal would breach liquidation threshold")]
    InsufficientCollateral,

    #[msg("Vault frozen: operations are temporarily halted")]
    VaultFrozen,

    #[msg("dWallet already registered in this vault")]
    DWalletAlreadyRegistered,

    #[msg("dWallet not found in this vault")]
    DWalletNotFound,

    #[msg("Exceeds maximum wallet limit of 8 per vault")]
    ExceedsWalletLimit,

    #[msg("Invalid chain or asset identifier")]
    InvalidChainAsset,

    #[msg("Invalid health factor after operation")]
    InvalidHealthFactor,

    #[msg("Unauthorized oracle: signer is not the registered oracle authority")]
    UnauthorizedOracle,

    #[msg("LTV basis points exceeds maximum of 8000 (80%)")]
    InvalidLtvBps,

    #[msg("Liquidation threshold exceeds maximum of 9000 (90%)")]
    InvalidLiquidationThreshold,

    #[msg("LTV must be strictly less than liquidation threshold")]
    LtvExceedsLiquidationThreshold,

    #[msg("Arithmetic overflow")]
    Overflow,

    #[msg("Insufficient balance for withdrawal")]
    InsufficientBalance,

    #[msg("Invalid oracle price")]
    InvalidOraclePrice,

    #[msg("Invalid amount: must be greater than zero")]
    InvalidAmount,
}
