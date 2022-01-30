const {
  BN,
  expectRevert,
  expectEvent,
  time,
  ether,
} = require("@openzeppelin/test-helpers");

const MarvelHeroCard = artifacts.require("MarvelHeroCardUpgradeable");
const DCHeroCard = artifacts.require("DCHeroCardUpgradeable");
const Marketplace = artifacts.require("MarketplaceUpgradeable");

const TAX = 100;

contract("MarketplaceUpgradeable", (accounts) => {
  let marvelHeroCard;
  let dcHeroCard;
  let marketplace;

  const marketWalletAddress = accounts[9];

  before(async () => {
    marvelHeroCard = await MarvelHeroCard.new();
    await marvelHeroCard.initialize();

    dcHeroCard = await DCHeroCard.new();
    await dcHeroCard.initialize();

    marketplace = await Marketplace.new();
    await marketplace.initialize(TAX, marketWalletAddress);

    await marvelHeroCard.mint(accounts[1], 1, 1);
    await marvelHeroCard.mint(accounts[1], 2, 1);
    await dcHeroCard.mint(accounts[1], 1, 1);
    await dcHeroCard.mint(accounts[1], 2, 1);
  });

  describe("List", async () => {
    it("account 2 should not able to list an item which does not belong to him", async () => {
      await expectRevert(
        marketplace.list(0, marvelHeroCard.address, ether("10"), {
          from: accounts[2],
        }),
        "caller is not the owner"
      );
    });

    it("account 1 should be able to list for sale", async () => {
      await marvelHeroCard.setApprovalForAll(marketplace.address, true, {
        from: accounts[1],
      });

      const tx = await marketplace.list(
        0,
        marvelHeroCard.address,
        ether("10"),
        {
          from: accounts[1],
        }
      );

      expectEvent.inLogs(tx.logs, "Listed", {
        seller: accounts[1],
        listingId: "0",
        tokenId: "0",
        tokenAddress: marvelHeroCard.address,
        price: ether("10"),
      });
    });
  });

  describe("Delist", async () => {
    it("account 2 should not be able to delist an item which is listed by account 1", async () => {
      await expectRevert(
        marketplace.delist(0, { from: accounts[2] }),
        "caller is not the seller"
      );
    });

    it("account 1 should be able to delist an item which is listed by himself", async () => {
      const tx = await marketplace.delist(0, {
        from: accounts[1],
      });

      expectEvent.inLogs(tx.logs, "Delisted", {
        listingId: "0",
      });
    });
  });

  describe("Purchase", async () => {
    before(async () => {
      await marketplace.list(0, marvelHeroCard.address, ether("8"), {
        from: accounts[1],
      });
    });

    it("account 2 purchase an item which is listed by account 1", async () => {
      const tx = await marketplace.purchase(1, {
        from: accounts[2],
        value: ether("8"),
      });

      expectEvent.inLogs(tx.logs, "Purchased", {
        listingId: "1",
        buyer: accounts[2],
      });
    });
  });
});
