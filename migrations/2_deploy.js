const DCHeroCardUpgradeable = artifacts.require("DCHeroCardUpgradeable");
const MarvelHeroCardUpgradeable = artifacts.require(
  "MarvelHeroCardUpgradeable"
);
const MarketplaceUpgradeable = artifacts.require("MarketplaceUpgradeable");
const DCHeroCardProxy = artifacts.require("DCHeroCardProxy");
const MarvelHeroCardProxy = artifacts.require("DCHeroCardProxy");
const MarketplaceProxy = artifacts.require("DCHeroCardProxy");
const { proxyAdminAddress, walletAddress } = require("../secrets-local.json");

module.exports = async (deployer) => {
  await deployer.deploy(DCHeroCardUpgradeable);
  const dcHeroCard = await DCHeroCardUpgradeable.deployed();
  await deployer.deploy(
    DCHeroCardProxy,
    dcHeroCard.address,
    proxyAdminAddress,
    "0x8129fc1c"
  );

  const dcHeroCardProxy = await DCHeroCardProxy.deployed();
  console.log("dcHeroCardProxyAddress:", dcHeroCardProxy.address);

  await deployer.deploy(MarvelHeroCardUpgradeable);
  const marvelHeroCard = await MarvelHeroCardUpgradeable.deployed();
  await deployer.deploy(
    MarvelHeroCardProxy,
    marvelHeroCard.address,
    proxyAdminAddress,
    "0x8129fc1c"
  );

  const marvelHeroCardProxy = await MarvelHeroCardProxy.deployed();
  console.log("marvelHeroCardProxyAddress:", marvelHeroCardProxy.address);

  await deployer.deploy(MarketplaceUpgradeable);
  const marketplace = await MarketplaceUpgradeable.deployed();
  const marketplaceParams = web3.eth.abi.encodeFunctionCall(
    {
      name: "initialize",
      type: "function",
      inputs: [
        { type: "uint256", name: "_taxPercentage" },
        { type: "address", name: "_wallet" },
      ],
    },
    [1000, walletAddress]
  );
  // console.log("marketplaceParams");
  // console.log(marketplaceParams);
  await deployer.deploy(
    MarketplaceProxy,
    marketplace.address,
    proxyAdminAddress,
    marketplaceParams
  );

  const marketplaceProxy = await MarketplaceProxy.deployed();
  console.log("marketplaceProxyAddress:", marketplaceProxy.address);
};
