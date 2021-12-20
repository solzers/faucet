# Setup
# --------------------------------------------------------------------------------------------------

- Add an `Anchor.toml` file to the root directory. See below for <PROGRAM_ID>.
  ```
  [programs.localnet]
  solzers_faucet = <PROGRAM_ID>

  [registry]
  url = "https://anchor.projectserum.com"

  [provider]
  cluster = "localnet"
  wallet = "<PATH_TO_YOUR_SOLANA_WALLET>"

  [scripts]
  test = "yarn run ts-mocha -p ./tsconfig.json -t 1000000 tests/**/*.ts"
  ```

- Run the local cluster.
  - `$ solana-test-validator`

<br/>

- Create an SPL token on the local cluster.
  - See: `https://spl.solana.com/token`

<br/>

- Build and deploy the program (/programs/solzers-faucet/src/lib.rs).
  - `$ anchor build`
  - `$ anchor deploy` - copy the Program ID output for the next step.

<br/>

- Update Program ID properties.
  - `solzers_faucet`: Anchor.toml
  - `PROMGRAM_ID`: utils/Solana.ts
  - `declare_id!(<PROGRAM_ID>)`: programs/solzers-faucet/src/lib.rs

<br/>

- Update Token Mint address properties.
  - `TOKEN_MINT`: utils/Solana.ts

<br/>

# Commands
# --------------------------------------------------------------------------------------------------

### Set Solana Config Cluster
  - solana config set --url https://api.devnet.solana.com

### Set Keypair File Path
  - solana config set --keypair <${HOME}/new-keypair.json>

### Build Program
  - anchor build

### Deploy Program
  - anchor deploy

### Test Program
  - anchor test
  
### Create IDL Account (this writes the .json file into a program owned account)
  - anchor idl init -f <target/idl/solzers_faucet.json> <program_id>


# Deployment
# --------------------------------------------------------------------------------------------------

1. Set Solana Config Cluster.
    - `solana config set --url <devnet | testnet | mainnet>`

2. Set Keypair File Path.
    - `solana config set --keypair <$HOME/.config/solana/FILE_NAME.json>`

3. Credit Account With SOL (6+ to be sure).
    - `solana airdrop 6 - OR - transaction to wallet address`

4. Update `Anchor.toml` file.
    - `'solzers_faucet'`, `'cluster'` and `'wallet'`

5. Build Program.
    - `anchor build`

6. Deploy Program.
    - `anchor deploy`

7. Update `.env` file (restart app after changing .env file).
    - `REACT_APP_SOLANA_NETWORK`
    - `REACT_APP_SOLANA_RPC_HOST`
    - `REACT_APP_FAUCET_TOKEN_MINT`

8. Update `server` env variables.
    - `REACT_APP_*`

9. Store IDL file on-chain.
    - `anchor idl init -f <target/idl/solzers_faucet.json> <program_id>`

10. Configure faucet account.
    - `Create faucet account`
    - `Configure faucet (Update/Deposit)`