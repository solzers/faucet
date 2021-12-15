// Imports
import * as anchor from '@project-serum/anchor';
import * as spl from '@solana/spl-token';
import { Program } from '@project-serum/anchor';
import { SolzersFaucet } from '../target/types/solzers_faucet';
import * as assert from 'assert';
import { airdropSol, getProgramAddress, getSolBalance, getTokenAddress, 
         getTokenBalance, TOKEN_MINT, toNumber } from '../utils/Solana';

// Test Cases
describe('faucet', () => {

  // Configure the client to use the local cluster.
  anchor.setProvider(anchor.Provider.env());

  // The deployed program.
  const program = anchor.workspace.SolzersFaucet as Program<SolzersFaucet>;

  // Faucet account.
  const faucet = anchor.web3.Keypair.generate();

  // Sleep for 'milliseconds'.
  const sleep = (milliseconds: anchor.BN | number): Promise<void> => {
    return new Promise(resolve => setTimeout(resolve, toNumber(milliseconds)));
  }

  // Convert hours to seconds.
  // @param hours: Hours time value.
  const hoursToSeconds = (hours: anchor.BN | number): number => {
    return toNumber(hours) * 60 * 60;
  }

  // Convert seconds to hours.
  // @param seconds: Seconds time value.
  const secondsToHours = (seconds: anchor.BN | number): number => {
    return toNumber(seconds) / (60 * 60);
  }

  // Convert seconds to milliseconds.
  // @param seconds: Seconds time value.
  const secondsToMilliseconds = (seconds: anchor.BN | number): number => {
    return toNumber(seconds) * 1000;
  }

  // Pretty print a program-derived faucet account.
  const printFaucet = (description: string, faucetPda: any) => {
    console.log("--------------------------------------------------------------------------------");
    console.log("FAUCET ACCOUNT DATA", description);
    console.log("--------------------------------------------------------------------------------");
    console.log("PRICE:         ", faucetPda.price?.toString());
    console.log("AMOUNT:        ", faucetPda.amount?.toString());
    console.log("INTERVAL:      ", faucetPda.interval?.toString());
    console.log("MAX QUANTITY:  ", faucetPda.maxQuantity?.toString());
    console.log("AUTHORITY:     ", faucetPda.authority.toString());
    console.log("BENEFICIARY:   ", faucetPda.beneficiary.toString());
    console.log("TOKEN MINT:    ", faucetPda.tokenMint.toString());
    console.log("TOKEN BUMP:    ", faucetPda.tokenBump.toString());
    console.log("\n");
  }

  // Pretty print a program-derived payer account.
  const printTransactionPda = (description: string, transactionPda?: any) => {
    console.log("--------------------------------------------------------------------------------");
    console.log("TRANSACTION PDA", description);
    console.log("--------------------------------------------------------------------------------");
    console.log("TIMESTAMP:     ", transactionPda?.timestamp?.toString());
    console.log("COUNT:         ", transactionPda?.count?.toString());
    console.log("\n");
  }

  // Create a program-derived faucet account.
  it("creates a program-derived faucet account to store SLZR tokens.", async () => {
    
    // The owner of the faucet account.
    const authority = program.provider.wallet;

    // Get the faucet's token account.
    const [faucetPda, faucetBump] = await getProgramAddress(faucet.publicKey, program.programId);

    // Create a pda for the tokens.
    await program.rpc.create(faucetBump, {
      accounts: {
        faucet: faucet.publicKey,
        authority: authority.publicKey,
        tokenAccount: faucetPda,
        tokenMint: TOKEN_MINT,
        systemProgram: anchor.web3.SystemProgram.programId,
        tokenProgram: spl.TOKEN_PROGRAM_ID,
        rent: anchor.web3.SYSVAR_RENT_PUBKEY,
      },
      signers: [
        faucet,
      ],
    });
  });

  // Deposit tokens to a faucet account.
  it("send SLZR tokens to a faucet account.", async () => {
    
    // The account that's going to send tokens to the faucet.
    const sender = program.provider.wallet;

    // The "sender's" token account.
    const [tokenAccount] = await getTokenAddress(sender.publicKey, TOKEN_MINT);

    // Get the faucet's token account.
    const [faucetPda] = await getProgramAddress(faucet.publicKey, program.programId);

    // Get the current balances (sender + faucet).
    const tokenBalance = await getTokenBalance(program.provider, tokenAccount);
    const faucetBalance = await getTokenBalance(program.provider, faucetPda);

    // The number of tokens being deposited.
    const amount = new anchor.BN(1000);

    // Send 'amount' from 'tokenAccount' to 'faucetPda'.
    await program.rpc.deposit(amount, {
      accounts: {
        faucet: faucet.publicKey,
        authority: sender.publicKey,
        fromTokenAccount: tokenAccount,
        toTokenAccount: faucetPda,
        systemProgram: anchor.web3.SystemProgram.programId,
        tokenProgram: spl.TOKEN_PROGRAM_ID,
        rent: anchor.web3.SYSVAR_RENT_PUBKEY,
      },
    });

    // Validate the result.
    const tokenBalanceAfter = await getTokenBalance(program.provider, tokenAccount);
    const faucetBalanceAfter = await getTokenBalance(program.provider, faucetPda);
    console.log("SENDER'S TOKEN ACCOUNT BALANCE: (BEFORE)", tokenBalance.toString());
    console.log("SENDER'S TOKEN ACCOUNT BALANCE: (AFTER) ", tokenBalanceAfter.toString());
    console.log("FAUCET'S TOKEN ACCOUNT BALANCE: (BEFORE)", faucetBalance.toString());
    console.log("FAUCET'S TOKEN ACCOUNT BALANCE: (AFTER) ", faucetBalanceAfter.toString());
    assert.equal(tokenBalance.sub(amount).toString(), tokenBalanceAfter.toString());
    assert.equal(faucetBalance.add(amount).toString(), faucetBalanceAfter.toString());
  });

  // Withdraw tokens from a faucet account.
  it("withdraw SLZR tokens from a faucet account.", async () => {
  
    // The account that's going to receive the tokens from the faucet.
    const receiver = program.provider.wallet;

    // The "receiver's" token account.
    const [tokenAccount] = await getTokenAddress(receiver.publicKey, TOKEN_MINT);

    // Get the faucet's token account.
    const [faucetPda] = await getProgramAddress(faucet.publicKey, program.programId);

    // Get the current balance of the token account.
    const tokenBalance = await getTokenBalance(program.provider, tokenAccount);
    const faucetBalance = await getTokenBalance(program.provider, faucetPda);

    // The number of tokens being withdrawn.
    const amount = new anchor.BN(500);

    // Send 'amount' from 'faucetPda' to 'tokenAccount'.
    await program.rpc.withdraw(amount, {
      accounts: {
        faucet: faucet.publicKey,
        authority: receiver.publicKey,
        fromTokenAccount: faucetPda,
        toTokenAccount: tokenAccount,
        systemProgram: anchor.web3.SystemProgram.programId,
        tokenProgram: spl.TOKEN_PROGRAM_ID,
        rent: anchor.web3.SYSVAR_RENT_PUBKEY,
      },
    });

    // Validate the result.
    const tokenBalanceAfter = await getTokenBalance(program.provider, tokenAccount);
    const faucetBalanceAfter = await getTokenBalance(program.provider, faucetPda);
    console.log("SENDER'S TOKEN ACCOUNT BALANCE: (BEFORE)", tokenBalance.toString());
    console.log("SENDER'S TOKEN ACCOUNT BALANCE: (AFTER) ", tokenBalanceAfter.toString());
    console.log("FAUCET'S TOKEN ACCOUNT BALANCE: (BEFORE)", faucetBalance.toString());
    console.log("FAUCET'S TOKEN ACCOUNT BALANCE: (AFTER) ", faucetBalanceAfter.toString());
    assert.equal(tokenBalance.add(amount).toString(), tokenBalanceAfter.toString());
    assert.equal(faucetBalance.sub(amount).toString(), faucetBalanceAfter.toString());
  });

  // Update a program-derived faucet account.
  it("set properties of a faucet account.", async () => {
  
    // The account that created/owns the faucet.
    const owner = program.provider.wallet;

    // The new properties.
    const price =  new anchor.BN(Math.ceil(anchor.web3.LAMPORTS_PER_SOL * 0.06));
    const amount = new anchor.BN(10);
    const interval = new anchor.BN(2); // Seconds.
    const maxQuantity = 10; // N per `interval`.
    const authority = null;
    const beneficiary = null;
    const tokenMint = null;
    const tokenBump = null;
    
    // Get the faucet's token account.
    const faucetBefore = await program.account.faucet.fetch(faucet.publicKey);

    // Send 'amount' from 'faucetPda' to 'tokenAccount'.
    await program.rpc.update(
      price,
      amount,
      interval,
      maxQuantity,
      authority,
      beneficiary,
      tokenMint,
      tokenBump, {
      accounts: {
        faucet: faucet.publicKey,
        authority: owner.publicKey,
        systemProgram: anchor.web3.SystemProgram.programId,
      },
    });

    // Validate the result.
    const faucetAfter = await program.account.faucet.fetch(faucet.publicKey);
    printFaucet("AFTER ", faucetAfter);
    assert.equal(faucetAfter.price.toString(), price ?? faucetBefore.price.toString());
    assert.equal(faucetAfter.amount.toString(), amount ?? faucetBefore.amount.toString());
    assert.equal(faucetAfter.interval.toString(), interval ?? faucetBefore.interval.toString());
    assert.equal(faucetAfter.maxQuantity.toString(), maxQuantity ?? faucetBefore.maxQuantity.toString());
    assert.equal(faucetAfter.authority.toString(), authority ?? faucetBefore.authority.toString());
    assert.equal(faucetAfter.beneficiary.toString(), beneficiary ?? faucetBefore.beneficiary.toString());
    assert.equal(faucetAfter.tokenMint.toString(), tokenMint ?? faucetBefore.tokenMint.toString());
    assert.equal(faucetAfter.tokenBump.toString(), tokenBump ?? faucetBefore.tokenBump.toString());
  });

  // Payout `faucet.amount` * `quantity` tokens.
  it("payout the faucet's tokens to a token address.", async () => {
    const payer = anchor.web3.Keypair.generate();
    await payout(payer);
  });

  const payout = async (payer: anchor.web3.Keypair, quantity: number = 1) => {

    // Fund the account.
    await airdropSol(program.provider, payer.publicKey, 1);

    // Get the payer's payout transaction account.
    const [transactionPda, transactionBump] = await getProgramAddress(payer.publicKey, program.programId);

    // The "payer's" token account address.
    const [payerToken] = await getTokenAddress(payer.publicKey, TOKEN_MINT);

    // Get the faucet's pd account.
    const [faucetPda] = await getProgramAddress(faucet.publicKey, program.programId);

    // Get the faucet's account information.
    const faucetInfo = await program.account.faucet.fetch(faucet.publicKey);

    // The receiver of the faucet fee (SOL).
    const beneficiary = faucetInfo.beneficiary;

    // The SOL faucet fee being paid by the payer.
    const price = faucetInfo.price;

    // The token amount being paid out by the faucet.
    const amount = faucetInfo.amount;
    
    // Get the payer's transaction history.
    const transactionInfo = await program.account.transaction.fetch(transactionPda).catch(_ => undefined);

    // The number of payouts.
    quantity = Math.min(quantity, faucetInfo.maxQuantity);

    // Check the current state of the PDAs.
    printFaucet("PAYOUT BEFORE", faucetInfo);
    printTransactionPda("BEFORE", transactionInfo);
    
    // Check the current SOL balances (payer + faucet).
    const payerSolBalance = await getSolBalance(program.provider, payer.publicKey);
    const beneficiarySolBalance = await getSolBalance(program.provider, beneficiary);
    console.log("PAYER'S SOL ACCOUNT BALANCE:       (BEFORE)", payerSolBalance.toString());
    console.log("BENEFICIARY'S SOL ACCOUNT BALANCE: (BEFORE)", beneficiarySolBalance.toString());

    // Check the current Token balances (payer + faucet).
    const payerBalance = await getTokenBalance(program.provider, payerToken).catch(_ => undefined);
    const faucetBalance = await getTokenBalance(program.provider, faucetPda);
    console.log("PAYER'S TOKEN ACCOUNT BALANCE:     (BEFORE)", payerBalance?.toString());
    console.log("FAUCET'S TOKEN ACCOUNT BALANCE:    (BEFORE)", faucetBalance.toString());

    // Send `faucetInfo.amount` token to the payer's token account.
    await program.rpc.payout(quantity, transactionBump, {
      accounts: {
        faucet: faucet.publicKey,
        transaction: transactionPda,
        payer: payer.publicKey,
        beneficiary: beneficiary,
        fromTokenAccount: faucetPda,
        toTokenAccount: payerToken,
        tokenMint: TOKEN_MINT,
        systemProgram: anchor.web3.SystemProgram.programId,
        associatedTokenProgram: spl.ASSOCIATED_TOKEN_PROGRAM_ID,
        tokenProgram: spl.TOKEN_PROGRAM_ID,
        rent: anchor.web3.SYSVAR_RENT_PUBKEY,
      },
      signers: [
        payer,
      ],
    });

    // Totals.
    const totalPrice = price.mul(new anchor.BN(quantity));
    const totalAmount = amount.mul(new anchor.BN(quantity));

    // Get the current transaction count for the current interval.
    const timestamp = toNumber(transactionInfo?.timestamp ?? 0);
    const intervalElapsed = (Date.now() - timestamp) >= faucetInfo.interval.toNumber();
    const transactionCount = intervalElapsed ? 0 : transactionInfo?.count ?? 0

    // Check the updated state of the PDAs.
    const faucetInfoAfter = await program.account.faucet.fetch(faucet.publicKey);
    const transactionInfoAfter = await program.account.transaction.fetch(transactionPda);
    printFaucet("PAYOUT AFTER", faucetInfoAfter);
    printTransactionPda("AFTER", transactionInfoAfter);
    assert.equal(transactionCount + quantity, transactionInfoAfter.count);

    // Validate SOL balances.
    const payerSolBalanceAfter = await getSolBalance(program.provider, payer.publicKey);
    const beneficiarySolBalanceAfter = await getSolBalance(program.provider, beneficiary);
    console.log("PAYER'S SOL ACCOUNT BALANCE:        (AFTER)", payerSolBalanceAfter.toString());
    console.log("BENEFICIARY'S SOL ACCOUNT BALANCE:  (AFTER)", beneficiarySolBalanceAfter.toString());
    assert.ok(payerSolBalanceAfter <= payerSolBalance.sub(totalPrice)); // lte to account for gas fee.
    assert.ok(beneficiarySolBalanceAfter.sub(beneficiarySolBalance.add(totalPrice)) <= new anchor.BN(10000)); // 10000 lamports epsilon.

    // Validate Token balances.
    const payerBalanceAfter = await getTokenBalance(program.provider, payerToken).catch(_ => undefined);
    const faucetBalanceAfter = await getTokenBalance(program.provider, faucetPda);
    console.log("PAYER'S TOKEN ACCOUNT BALANCE:      (AFTER)", payerBalanceAfter?.toString());
    console.log("FAUCET'S TOKEN ACCOUNT BALANCE:     (AFTER)", faucetBalanceAfter.toString());
    assert.equal(payerBalance ? payerBalance.add(totalAmount).toString() : totalAmount, payerBalanceAfter.toString());
    assert.equal(faucetBalance.sub(totalAmount).toString(), faucetBalanceAfter.toString());
  }

  // Payout tokens across two interval.
  it("payout the faucet's tokens in two consecutive intervals.", async () => {

    // Create a payer account.
    const payer = anchor.web3.Keypair.generate();

    // Get the faucet's account information.
    const faucetInfo = await program.account.faucet.fetch(faucet.publicKey);

    // 1/2 the payout interval duration.
    const milliseconds = secondsToMilliseconds(faucetInfo.interval) * 0.5;

    // Payout 1 token.
    await payout(payer, 1);

    // Wait for half of the interval duration.
    console.log("\nWAITING FOR", milliseconds, "MILLISECONDS...\n");
    await sleep(milliseconds);

    // Payout 1 more token.
    await payout(payer, 1);

    // Wait for the interval to expire.
    console.log("\nWAITING FOR", milliseconds, "MILLISECONDS...\n");
    await sleep(milliseconds);

    // Payout the maximum number of tokens.
    await payout(payer, faucetInfo.maxQuantity);
  });

  // Payout `faucet.amount` * ()`faucet.maxQuantity` + 1) tokens.
  it("reject a payout of more than the maximum quantity.", async () => {

    // Create a random account.
    const payer = anchor.web3.Keypair.generate();
    await airdropSol(program.provider, payer.publicKey, 1);

    // Get the payer's payout transaction account.
    const [transactionPda, transactionBump] = await getProgramAddress(payer.publicKey, program.programId);

    // The "payer's" token account address.
    const [payerToken] = await getTokenAddress(payer.publicKey, TOKEN_MINT);

    // Get the faucet's pd account.
    const [faucetPda] = await getProgramAddress(faucet.publicKey, program.programId);

    // Get the faucet's account information.
    const faucetInfo = await program.account.faucet.fetch(faucet.publicKey);

    // The receiver of the faucet fee (SOL).
    const beneficiary = faucetInfo.beneficiary;
    
    // The number of payouts.
    const quantity = faucetInfo.maxQuantity + 1;

    // Send `faucetInfo.amount` * `quantity` tokens to the payer's token account.
    assert.rejects(
      program.rpc.payout(quantity, transactionBump, {
        accounts: {
          faucet: faucet.publicKey,
          transaction: transactionPda,
          payer: payer.publicKey,
          beneficiary: beneficiary,
          fromTokenAccount: faucetPda,
          toTokenAccount: payerToken,
          tokenMint: TOKEN_MINT,
          systemProgram: anchor.web3.SystemProgram.programId,
          associatedTokenProgram: spl.ASSOCIATED_TOKEN_PROGRAM_ID,
          tokenProgram: spl.TOKEN_PROGRAM_ID,
          rent: anchor.web3.SYSVAR_RENT_PUBKEY,
        },
        signers: [
          payer,
        ],
      })
    );
  });

  // Close the faucet account.
  it("close the faucet account and return the tokens to the account owner.", async () => {
    
    // The faucet account owner.
    const owner = program.provider.wallet;

    // The "owner's" token account.
    const [tokenAccount] = await getTokenAddress(owner.publicKey, TOKEN_MINT);

    // Get the faucet's token account.
    const [faucetPda] = await getProgramAddress(faucet.publicKey, program.programId);

    // Check the current balances (sender + faucet).
    const solBalance = await getSolBalance(program.provider, owner.publicKey);
    const tokenBalance = await getTokenBalance(program.provider, tokenAccount);
    const faucetBalance = await getTokenBalance(program.provider, faucetPda);
    console.log("SENDER'S SOLANA ACCOUNT BALANCE: (BEFORE)", solBalance.toString());
    console.log("SENDER'S TOKEN ACCOUNT BALANCE:  (BEFORE)", tokenBalance.toString());
    console.log("FAUCET'S TOKEN ACCOUNT BALANCE:  (BEFORE)", faucetBalance.toString());

    // Close `faucetPda` and return the tokens to `tokenAccount`.
    await program.rpc.close({
      accounts: {
        faucet: faucet.publicKey,
        authority: owner.publicKey,
        fromTokenAccount: faucetPda,
        toTokenAccount: tokenAccount,
        tokenProgram: spl.TOKEN_PROGRAM_ID,
      },
    });

    // Validate the result.
    const solBalanceAfter = await getSolBalance(program.provider, owner.publicKey);
    const tokenBalanceAfter = await getTokenBalance(program.provider, tokenAccount);
    const faucetBalanceAfter = await getTokenBalance(program.provider, faucetPda).catch(_ => undefined);
    console.log("SENDER'S SOLANA ACCOUNT BALANCE:  (AFTER)", solBalanceAfter.toString());
    console.log("SENDER'S TOKEN ACCOUNT BALANCE:   (AFTER)", tokenBalanceAfter.toString());
    console.log("FAUCET'S TOKEN ACCOUNT BALANCE:   (AFTER)", faucetBalanceAfter?.toString());
    assert.ok(solBalanceAfter >= solBalance); // The returned rent-exception fee.
    assert.equal(tokenBalance.add(faucetBalance).toString(), tokenBalanceAfter.toString());
    assert.equal(faucetBalanceAfter, undefined);
  });
});