# blockchain-test

hero card trading

## Setup

1. Prepare 4 accounts (deployer, proxy admin, marketplace wallet, seller) on `Rinkeby` testnet
2. Go to `https://infura.io` and register a project id on `Rinkeby`
3. Open secrets.json, fill in these values:

- `projectId`: `project id` at step 2 (ex: 2ec8adf59000482b9b251804b6e80ddc)
- `mnemonic`: `mnemonic` or `private key` of deployer account (ex: 112aabce0b94972ce8efda22e18146e123a6ba8e6a24b0000c9ea29b2b3fc83e)
- `proxyAdminAddress`: (ex: 0x7999C3C8139340C9C697Ddc55E3a48908DBB4dFF)
- `walletAddress`: marketplace wallet address (ex: 0x8123F3F8139340C9C697Ddc55E3a48908DBB40AA)
- `seller`: (ex: 0x9013F3F8139340C9C697Ddc55E3a48908DBB41BC)

4. run `npm install`
5. run `truffle migrate --network rinkeby`
6. copy `dcHeroCardProxyAddress`, `marvelHeroCardProxyAddress` and `marketplaceProxyAddress` from console and replace into `frontend/marketplace.js` file (`DC_HERO_CARD_ADDRESS`, `MARVEL_HERO_CARD_ADDRESS`, `MARKETPLACE_ADDRESS`)
7. install `Live Server` plugin in VSCode
8. right click `frontend/index.htm` and select `Open with Live Server`
9. select account `seller` on metamask and click `connect metamask`. Wait for few seconds and you will see seller's nfts
