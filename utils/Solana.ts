// Imports
import * as anchor from "@project-serum/anchor";
import * as spl from '@solana/spl-token';

// Deployed program id.
export const PROGRAM_ID = new anchor.web3.PublicKey(
  "EuETm5rXbYJ9Ra6GmeyqSjiFRR5X3GCfB5tkQSLWzxTH"
);

// Token mint address.
export const TOKEN_MINT = new anchor.web3.PublicKey(
  "BdKgU9SriTTf8z7iNbfAeBVYVRU9uk2Sc9PRjAehMzQ8"
);

// Convert 'value' to a typescript 'number.
// @param value: The value to normalise.
export const toNumber = (value: anchor.BN | number): number => {
  return value instanceof anchor.BN ? value.toNumber() : value;
}

// Convert SOL to Lamports.
// @param sol: SOL value.
export const solToLamports = (sol: anchor.BN | number): anchor.BN => {
  return new anchor.BN(Math.ceil(toNumber(sol) * anchor.web3.LAMPORTS_PER_SOL));
}

// Convert Lamports to SOL.
// @param lamports: Lamports value.
export const lamportsToSol = (lamports: anchor.BN | number): number => {
  const LAMPORTS_PER_SOL_BN = new anchor.BN(anchor.web3.LAMPORTS_PER_SOL);
  return new anchor.BN(lamports).div(LAMPORTS_PER_SOL_BN).toNumber();
}

// Airdrop 'sol' to account 'pubKey'.
// *************************************************************************************************
// Devnet/Testnet only.
// *************************************************************************************************
// @param provider: The wallet provider.
// @param pubKey: A solana wallet address.
// @param sol: The amount of SOL to airdrop.
export const airdropSol = async (
  provider: anchor.Provider, 
  pubKey: anchor.web3.PublicKey, 
  sol: number,
) => {
  const lamports = Math.ceil(anchor.web3.LAMPORTS_PER_SOL * sol);
  const tx = await provider.connection.requestAirdrop(pubKey, lamports);
  await provider.connection.confirmTransaction(tx);
}

// Return the sol balance of the given address.
// @param provider: The wallet provider.
// @param pubKey: A solana wallet address.
export const getSolBalance = async (
  provider: anchor.Provider, 
  pubKey: anchor.web3.PublicKey,
): Promise<anchor.BN> => {
  const amount = await provider.connection.getBalance(pubKey);
  return new anchor.BN(amount.toString());
}

// Return the token balance of the given address.
// @param provider: The wallet provider.
// @param pubKey: A solana wallet address.
export const getTokenBalance = async (
  provider: anchor.Provider, 
  pubKey: anchor.web3.PublicKey,
): Promise<anchor.BN> => {
  const amount = await provider.connection.getTokenAccountBalance(pubKey);
  return new anchor.BN(amount.value.amount);
}

// Return the token address of the given account.
// @param pubKey: A solana wallet address.
// @param tokenMint: The token's mint address.
export const getTokenAddress = async (
  pubKey: anchor.web3.PublicKey, 
  tokenMint: anchor.web3.PublicKey,
): Promise<[anchor.web3.PublicKey, number]> => {
  return anchor.web3.PublicKey.findProgramAddress(
    [pubKey.toBuffer(), spl.TOKEN_PROGRAM_ID.toBuffer(), tokenMint.toBuffer()],
    spl.ASSOCIATED_TOKEN_PROGRAM_ID,
  );
};

// Return the program address of the given account.
// @param pubKey: A solana wallet address.
// @param programId: The deployed program's id (default: PROGRAM_ID).
export const getProgramAddress = (
  pubKey: anchor.web3.PublicKey, 
  programId?: anchor.web3.PublicKey,
): Promise<[anchor.web3.PublicKey, number]> => {
  return anchor.web3.PublicKey.findProgramAddress(
    [pubKey.toBuffer()],
    programId ?? PROGRAM_ID,
  );
}

// Return the program address for a named program account.
// @param name: The name of the account.
// @param programId: The deployed program's id (default: PROGRAM_ID).
export const getNamedAddress = (
  name: string, 
  programId?: anchor.web3.PublicKey,
): Promise<[anchor.web3.PublicKey, number]> => {
  return anchor.web3.PublicKey.findProgramAddress(
    [Buffer.from(anchor.utils.bytes.utf8.encode(name))],
    programId ?? PROGRAM_ID,
  );
}