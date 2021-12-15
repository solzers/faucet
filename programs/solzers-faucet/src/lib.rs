// Imports
use anchor_lang::prelude::*;
use anchor_lang::solana_program;
use anchor_spl::{
  associated_token::AssociatedToken,
  token::{Mint, Token, TokenAccount},
};

// Program ID
declare_id!("EuETm5rXbYJ9Ra6GmeyqSjiFRR5X3GCfB5tkQSLWzxTH");

// Solzers Faucet
#[program]
pub mod solzers_faucet {

  use super::*;

  // Create a token account to store a specific type of SPL token (`token_mint`) in the faucet.
  pub fn create(
    ctx: Context<Create>,
    token_bump: u8,
  ) -> ProgramResult {
    let faucet = &mut ctx.accounts.faucet;
    faucet.authority = ctx.accounts.authority.key();
    faucet.beneficiary = ctx.accounts.authority.key();
    faucet.token_mint = ctx.accounts.token_mint.key();
    faucet.token_bump = token_bump;
    Ok(())
  }

  // Update the faucet's properties.
  pub fn update(
    ctx: Context<Update>,
    price: Option<u64>,
    amount: Option<u64>,
    interval: Option<i64>,
    max_quantity: Option<u16>,
    authority: Option<Pubkey>,
    beneficiary: Option<Pubkey>,
    token_mint: Option<Pubkey>,
    token_bump: Option<u8>,
  ) -> ProgramResult {
    let faucet = &mut ctx.accounts.faucet;
    if price.is_some() {
      faucet.price = price.unwrap();
    }
    if amount.is_some() {
      faucet.amount = amount.unwrap();
    }
    if interval.is_some() {
      faucet.interval = interval.unwrap();
    }
    if max_quantity.is_some() {
      faucet.max_quantity = max_quantity.unwrap();
    }
    if authority.is_some() {
      faucet.authority = authority.unwrap();
    }
    if beneficiary.is_some() {
      faucet.beneficiary = beneficiary.unwrap();
    }
    if token_mint.is_some() {
      faucet.token_mint = token_mint.unwrap();
    }
    if token_bump.is_some() {
      faucet.token_bump = token_bump.unwrap();
    }
    Ok(())
  }

  // Send `amount` from a token account (`from_token_account`) to the faucet account 
  // (`to_token_account`).
  pub fn deposit(
    ctx: Context<Deposit>,
    amount: u64,
  ) -> ProgramResult {
    anchor_spl::token::transfer(
      CpiContext::new(
        ctx.accounts.token_program.to_account_info(),
        anchor_spl::token::Transfer {
          from: ctx.accounts.from_token_account.to_account_info(),
          to: ctx.accounts.to_token_account.to_account_info(),
          authority: ctx.accounts.authority.to_account_info(),
        },
      ),
      amount,
    )
  }

  // Send `amount` from the faucet account (`from_token_account`) to a token account 
  // (`to_token_account`).
  pub fn withdraw(
    ctx: Context<Withdraw>,
    amount: u64,
  ) -> ProgramResult {
    anchor_spl::token::transfer(
      CpiContext::new_with_signer(
        ctx.accounts.token_program.to_account_info(),
        anchor_spl::token::Transfer {
          from: ctx.accounts.from_token_account.to_account_info(),
          to: ctx.accounts.to_token_account.to_account_info(),
          authority: ctx.accounts.from_token_account.to_account_info(),
        },
        &[&[
          ctx.accounts.faucet.key().as_ref(),
          &[ctx.accounts.faucet.token_bump],
        ]],
      ),
      amount,
    )
  }

  // Send `faucet.amount` * `quantity` from the faucet account (`from_token_account`) to a token 
  // account (`to_token_account`) for a fee of `faucet.price` * `quantity` SOL.
  #[access_control(payout_limit(quantity, &ctx.accounts.faucet, &ctx.accounts.transaction))]
  pub fn payout(
    ctx: Context<Payout>,
    quantity: u16,
    _transaction_bump: u8,
  ) -> ProgramResult {
    
    // The stored faucet data.
    let faucet = &mut ctx.accounts.faucet;

    // The payer's transaction history.
    let transaction = &mut ctx.accounts.transaction;

    // The faucet fee (SOL).
    let price = faucet.price * u64::from(quantity);

    // The number of tokens sent to the payer's token account (`to_token_account`).
    let amount = faucet.amount * u64::from(quantity);

    // Transfer the faucet fee (`price` SOL) to the beneficiary's account.
    solana_program::program::invoke(
      &solana_program::system_instruction::transfer(
        ctx.accounts.payer.key,
        ctx.accounts.beneficiary.key,
        price,
      ),
      &[
        ctx.accounts.payer.to_account_info(),
        ctx.accounts.beneficiary.to_account_info(),
        ctx.accounts.system_program.to_account_info(),
      ],
    )?;

    // Transfer `amount` tokens from the faucet account (`from_token_account`) to the given token
    // account (`to_token_account`).
    anchor_spl::token::transfer(
      CpiContext::new_with_signer(
        ctx.accounts.token_program.to_account_info(),
        anchor_spl::token::Transfer {
          from: ctx.accounts.from_token_account.to_account_info(),
          to: ctx.accounts.to_token_account.to_account_info(),
          authority: ctx.accounts.from_token_account.to_account_info(),
        },
        &[&[
          ctx.accounts.faucet.key().as_ref(),
          &[ctx.accounts.faucet.token_bump],
        ]],
      ),
      amount,
    )?;

    // Get the current timestamp.
    let now = timestamp();

    // Get the payout count for the current interval.
    let count = transaction_count(&ctx.accounts.faucet, &transaction, &now);

    // Update the payer's tranaction details.
    if count == 0 {
      transaction.timestamp = now;
      transaction.count = quantity;
    } else {
      transaction.count += quantity;
    }

    Ok(())
  }

  // Send all tokens in the faucet account (`from_token_account`) to the owner's token account 
  // (`to_token_account`). Then close the faucet account (`from_token_account`) and return the 
  // rent-exception fee back to the owner (`authority`).
  pub fn close(
    ctx: Context<Close>,
  ) -> ProgramResult {

    // Transfer all tokens from the faucet account to the owner's account.
    anchor_spl::token::transfer(
      CpiContext::new_with_signer(
        ctx.accounts.token_program.to_account_info(),
        anchor_spl::token::Transfer {
          from: ctx.accounts.from_token_account.to_account_info(),
          to: ctx.accounts.to_token_account.to_account_info(),
          authority: ctx.accounts.from_token_account.to_account_info(),
        },
        &[&[
          ctx.accounts.faucet.key().as_ref(),
          &[ctx.accounts.faucet.token_bump],
        ]],
      ),
      ctx.accounts.from_token_account.amount,
    )?;

    // Close the account and return the rent-exemption fee to the owner.
    anchor_spl::token::close_account(
      CpiContext::new_with_signer(
        ctx.accounts.token_program.to_account_info(),
        anchor_spl::token::CloseAccount {
          account: ctx.accounts.from_token_account.to_account_info(),
          destination: ctx.accounts.authority.to_account_info(),
          authority: ctx.accounts.from_token_account.to_account_info(),
        },
        &[&[
          ctx.accounts.faucet.key().as_ref(),
          &[ctx.accounts.faucet.token_bump],
        ]],
      )
    )
  }
}

// Return the current timestamp in seconds.
fn timestamp() -> i64 {
  return Clock::get().unwrap().unix_timestamp;
}

// Return the payout count for the current interval.
fn transaction_count(faucet: &Faucet, transaction: &Transaction, now: &i64) -> u16 {
  let elapsed = now - transaction.timestamp;
  return if elapsed >= faucet.interval { 0 } else { transaction.count }
}

// Return an error if the payout frequency exceeds the time interval.
fn payout_limit(quantity: u16, faucet: &Faucet, transaction: &Transaction) -> ProgramResult {
  
  // Validate minimum quantity.
  if quantity <= 0 {
    return Err(ErrorCode::MinQuantity.into());
  }

  // Check if faucet is closed.
  if faucet.max_quantity <= 0 {
    return Err(ErrorCode::FaucetClosed.into());
  }
  
  // Get the payout count for the current interval.
  let count = transaction_count(faucet, transaction, &timestamp());
  
  // Get the remaining payouts for the current `interval`.
  let remaining = faucet.max_quantity - count;

  // Check if the payout limit has been reached.
  if remaining <= 0 {
    return Err(ErrorCode::PayoutLimit.into());
  }

  // Check if the given quantity exceeds the remaining available payouts.
  if quantity > remaining {
    return Err(ErrorCode::MaxQuantity.into());
  }

  Ok(())
}

// Faucet
#[account]
pub struct Faucet {
  // The faucet fee is SOL.
  pub price: u64,

  // The amount of token's paid out.
	pub amount: u64,

  // The time interval between `quantity` payouts.
  pub interval: i64,

  // The max number of payouts within `interval`.
  pub max_quantity: u16,

  // We store the faucet owner's key so that we can verify the account when changes are made to the 
  // faucet.
  pub authority: Pubkey,

  // The account that receives the faucet fee (default: `authority`).
  pub beneficiary: Pubkey,

  // The faucet token's mint address.
  pub token_mint: Pubkey,

  // We store the faucet's tokens in an account that lives at a program-derived address, with seeds 
  // given by the `Faucet` account's address. Storing the corresponding bump here means the client 
  // doesn't have to keep passing it.
  pub token_bump: u8,
}

// Create
#[derive(Accounts)]
#[instruction(token_bump: u8)]
pub struct Create<'info> {

  // The faucet account.
  #[account(init, payer = authority, space = 8 + 8 + 8 + 8 + 2 + 32 + 32 + 32 + 1)]
  pub faucet: Account<'info, Faucet>,

  // The account that creates/owns the faucet.
  #[account(mut)]
  pub authority: Signer<'info>,

  // The faucet's token account.
  #[account(
    init,
    payer = authority,
    seeds = [faucet.key().as_ref()],
    bump = token_bump,
    token::mint = token_mint,
    // We want the program itself to have authority over the token account, so we need to use some 
    // program-derived address here. The token account itself already lives at a program-derived 
    // address, so we can set its authority to be its own address.
    token::authority = token_account,
  )]
  pub token_account: Account<'info, TokenAccount>,

  // The faucet token's mint address.
  pub token_mint: Account<'info, Mint>,

  // Program ids.
  pub system_program: Program<'info, System>,
  pub token_program: Program<'info, Token>,
  pub rent: Sysvar<'info, Rent>,
}

// Update
#[derive(Accounts)]
pub struct Update<'info> {
  
  // The faucet account to update.
  #[account(mut, constraint = faucet.authority == *authority.key)]
  pub faucet: Account<'info, Faucet>,

  // The account that created/owns the faucet.
  #[account(mut)]
  pub authority: Signer<'info>,
  
  // Program ids.
  pub system_program: Program<'info, System>,
}

// Deposit
#[derive(Accounts)]
pub struct Deposit<'info> {

  // The faucet account to send tokens to.
  #[account(
    mut, 
    constraint = faucet.token_mint == from_token_account.mint
              && faucet.token_mint == to_token_account.mint
  )]
  pub faucet: Account<'info, Faucet>,

  // The `from_token_account` owner.
  #[account(mut)]
  pub authority: Signer<'info>,

  // The token account to withdraw tokens from.
  #[account(mut)]
  pub from_token_account: Account<'info, TokenAccount>,

  // The faucet account to deposit tokens to.
  #[account(mut, seeds = [faucet.key().as_ref()], bump = faucet.token_bump)]
  pub to_token_account: Account<'info, TokenAccount>,

  // Program ids.
  pub system_program: Program<'info, System>,
  pub token_program: Program<'info, Token>,
  pub rent: Sysvar<'info, Rent>,
}

// Withdraw
#[derive(Accounts)]
pub struct Withdraw<'info> {

  // The faucet account to withdraw tokens from.
  #[account(
    mut, 
    constraint = faucet.token_mint == from_token_account.mint 
              && faucet.token_mint == to_token_account.mint
              && faucet.authority == *authority.key
  )]
  pub faucet: Account<'info, Faucet>,

  // The account that created/owns the faucet.
  #[account(mut)]
  pub authority: Signer<'info>,

  // The faucet account to withdraw tokens from.
  #[account(mut, seeds = [faucet.key().as_ref()], bump = faucet.token_bump)]
  pub from_token_account: Account<'info, TokenAccount>,

  // The token account to deposit tokens to.
  #[account(mut)]
  pub to_token_account: Account<'info, TokenAccount>,

  // Program ids.
  pub system_program: Program<'info, System>,
  pub token_program: Program<'info, Token>,
  pub rent: Sysvar<'info, Rent>,
}

// Payout Data
#[account]
#[derive(Default)]
pub struct Transaction {
  pub timestamp: i64,
  pub count: u16,
}

// Payout
#[derive(Accounts)]
#[instruction(quantity: u16, transaction_bump: u8)]
pub struct Payout<'info> {

  // The faucet account to withdraw tokens from.
  #[account(
    mut, 
    constraint = faucet.token_mint == from_token_account.mint 
              && faucet.token_mint == to_token_account.mint
  )]
  pub faucet: Account<'info, Faucet>,

  // The information stored for the last payout. This is used to restrict the number of payouts sent
  // to the same account within the specified interval (`faucet.interval`).
  #[account(
    init_if_needed, 
    payer = payer,
    seeds = [payer.key.as_ref()], 
    bump = transaction_bump,
  )]
  pub transaction: Account<'info, Transaction>,

  // The account that pays the faucet fee and receives the faucet tokens.
  #[account(mut)]
  pub payer: Signer<'info>,
  
  // The account that receives the faucet fee.
  #[account(mut, address = faucet.beneficiary)]
  pub beneficiary: AccountInfo<'info>,

  // The faucet account to withdraw tokens from.
  #[account(mut, seeds = [faucet.key().as_ref()], bump = faucet.token_bump)]
  pub from_token_account: Account<'info, TokenAccount>,

  // The token account to send tokens to (i.e. payer's token account).
  #[account(
    init_if_needed,
    payer = payer,
    associated_token::mint = token_mint,
    associated_token::authority = payer,
  )]
  pub to_token_account: Account<'info, TokenAccount>,

  // The faucet token's mint address.
  #[account(address = faucet.token_mint)]
  pub token_mint: Account<'info, Mint>,

  // Program ids.
  pub system_program: Program<'info, System>,
  pub associated_token_program: Program<'info, AssociatedToken>,
  pub token_program: Program<'info, Token>,
  pub rent: Sysvar<'info, Rent>,
}

// Close
#[derive(Accounts)]
pub struct Close<'info> {

  // The faucet account to empty and close.
  #[account(
    mut, 
    constraint = faucet.token_mint == from_token_account.mint 
              && faucet.token_mint == to_token_account.mint
              && faucet.authority == *authority.key
  )]
  pub faucet: Account<'info, Faucet>,

  // The account that created/owns the faucet.
  #[account(mut)]
  pub authority: Signer<'info>,

  // The faucet account to withdraw tokens from.
  #[account(mut, seeds = [faucet.key().as_ref()], bump = faucet.token_bump)]
  pub from_token_account: Account<'info, TokenAccount>,

  // The token account to deposit tokens to (i.e. authority's token account).
  #[account(mut)]
  pub to_token_account: Account<'info, TokenAccount>,

  // Program ids.
  pub token_program: Program<'info, Token>,
}

// Errors
#[error]
pub enum ErrorCode {
  #[msg("The faucet is closed.")]
  FaucetClosed,
  #[msg("A minimum of 1 is required.")]
  MinQuantity,
  #[msg("Maximum quantity exceeded.")]
  MaxQuantity,
  #[msg("The payout limit has been reached.")]
  PayoutLimit,
}