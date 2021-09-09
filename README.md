# ipfs-w3auth-pinning-service
IPFS remote pinning service by using Crust

- create database and tables from sql files in sql dir
- config env or update config/config.ts according to .env-example
- yarn build & yarn start to start server
- sign AuthToken as `ChainType[substrate/eth/solana].PubKey:SignedMsg`, you can config chain name in table chain
- call psa api like ipfs pinning service api with AuthToken
