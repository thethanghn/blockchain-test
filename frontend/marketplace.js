let dcHeroCardContract;
let marvelHeroCardContract;
let marketplaceContract;

const MARKETPLACE_ADDRESS = "0x5A39afb65a8A574712D01671B8435De9Ba15e11E";
const DC_HERO_CARD_ADDRESS = "0xEDB0660aedB1641486d72B393C2022129C2FB24A";
const MARVEL_HERO_CARD_ADDRESS = "0x91A076072DaBA0D6e3a74EB4261AbC354c591c85";

const initWeb3 = async () => {
  if (window.ethereum) {
    await window.ethereum.request({
      method: "eth_requestAccounts",
    });
    window.web3 = new Web3(window.ethereum);
    return true;
  }

  return false;
};

const init = async () => {
  const result = await initWeb3();
  if (result) {
    initContracts();
  } else {
    console.log("Cannot init web3");
  }
};

const connectToMetamask = async () => {
  const result = initWeb3();
  if (result) {
    console.log("account:", web3.currentProvider.selectedAddress);
    $("#metamask-status").text("connected");
    renderMyNFTs();
    renderMarketplace();
  } else {
    console.log("cannot connect to metamask");
    $("#metamask-status").text("disconnected");
  }
};

const initContracts = async () => {
  const dcHeroCardResponse = $.getJSON({
    url: "../build/contracts/DCHeroCardUpgradeable.json",
    async: false,
  }).responseText;
  const dcHeroCardJSON = JSON.parse(dcHeroCardResponse);
  dcHeroCardContract = new web3.eth.Contract(
    dcHeroCardJSON.abi,
    DC_HERO_CARD_ADDRESS
  );

  const marvelHeroCardResponse = $.getJSON({
    url: "../build/contracts/MarvelHeroCardUpgradeable.json",
    async: false,
  }).responseText;
  const marvelHeroCardJSON = JSON.parse(marvelHeroCardResponse);
  marvelHeroCardContract = new web3.eth.Contract(
    marvelHeroCardJSON.abi,
    MARVEL_HERO_CARD_ADDRESS
  );

  const marketplaceResponse = $.getJSON({
    url: "../build/contracts/MarketplaceUpgradeable.json",
    async: false,
  }).responseText;
  const marketplaceJSON = JSON.parse(marketplaceResponse);
  marketplaceContract = new web3.eth.Contract(
    marketplaceJSON.abi,
    MARKETPLACE_ADDRESS
  );
};

const renderMyNFTs = async () => {
  const myAddress = web3.currentProvider.selectedAddress;
  const myDCBalance = await dcHeroCardContract.methods
    .balanceOf(myAddress)
    .call();
  let html = "";
  $("#my-nft").html(html);
  for (let i = 0; i < myDCBalance; ++i) {
    const tokenId = await dcHeroCardContract.methods
      .tokenOfOwnerByIndex(myAddress, i)
      .call();
    const tid = tokenId.toString();
    const data = await dcHeroCardContract.methods.idToCard(tokenId).call();
    const level = data?.level?.toString();
    const rarity = data?.rarity?.toString();

    html += `
    <div id="dc-card-${tid}">
      type: dc, id: ${tid}, level: ${level}, rarity: ${rarity} <br>
      <label for="dc-card-${tid}-price">Price:</label>
      <input type="text" id="dc-card-${tid}-price" name="price" />
      <button onClick="list('dc', ${tid})">list</button>
    </div>
    `;
  }
  $("#my-nft").html(html);
};

const renderMarketplace = async () => {
  try {
    console.log("render marketplace");
    const myAddress = web3.currentProvider.selectedAddress;
    const sellers = await marketplaceContract.methods.getSellers().call();
    let html = "";
    $("#marketplace").html(html);
    for (let i = 0; i < sellers.length; ++i) {
      const listingIds = await marketplaceContract.methods
        .getSellerListingIds(sellers[i])
        .call();
      for (let j = 0; j < listingIds.length; ++j) {
        const listingId = listingIds[j].toString();
        const listingData = await marketplaceContract.methods
          .idToListingData(listingId)
          .call();
        const type =
          listingData?.tokenAddress === DC_HERO_CARD_ADDRESS ? "dc" : "marvel";
        const tokenId = listingData?.tokenId?.toString();
        const price = listingData?.price.toString();
        let level, rarity;
        if (type === "dc") {
          const token = await dcHeroCardContract.methods
            .idToCard(tokenId)
            .call();
          level = token.level.toString();
          rarity = token.rarity.toString();
        } else if (type === "marvel") {
          const token = await marvelHeroCardContract.methods
            .idToCard(tokenId)
            .call();
          level = token.level.toString();
          rarity = token.rarity.toString();
        }
        let button = "";
        if (listingData.seller.toLowerCase() === myAddress.toLowerCase()) {
          button = `
            <button id="${type}-${tokenId}-delist" onClick="delist(${listingId})">delist</button>
          `;
        } else {
          button = `
          <button id="${type}-${tokenId}-purchase" onClick="purchase(${listingId})">purchase</button>
        `;
        }
        html += `
          <div id="marketplace-${type}-card-${tokenId}">
            type: ${type}, id: ${tokenId}, level: ${level}, rarity: ${rarity}, price: ${web3.utils.fromWei(
          price,
          "ether"
        )}
            ${button}
          </div>
        `;
      }
      $("#marketplace").html(html);
    }
  } catch (e) {
    console.log("renderMarketplace error");
    console.log(e);
  }
};

const list = async (type, tokenId) => {
  console.log("TYPE:", type);
  console.log("token id: ", tokenId);
  console.log("price:", $(`#${type}-card-${tokenId}-price`).val());
  if (!dcHeroCardContract) {
    return;
  }
  const price = $(`#${type}-card-${tokenId}-price`).val();
  const myAddress = web3.currentProvider.selectedAddress;
  if (type === "dc") {
    await dcHeroCardContract.methods
      .setApprovalForAll(MARKETPLACE_ADDRESS, true)
      .send({ from: myAddress });
    console.log("ADDRESS:", dcHeroCardContract.address);
    await marketplaceContract.methods
      .list(tokenId, DC_HERO_CARD_ADDRESS, web3.utils.toWei(price, "ether"))
      .send({ from: myAddress });
  } else if (type === "marvel") {
    await marvelHeroCardContract.methods
      .setApprovalForAll(MARKETPLACE_ADDRESS, true)
      .send({ from: myAddress });
    await marketplaceContract.methods
      .list(tokenId, MARVEL_HERO_CARD_ADDRESS, web3.utils.toWei(price, "ether"))
      .send({ from: myAddress });
  }

  refresh();
};

const delist = async (listingId) => {
  try {
    const myAddress = web3.currentProvider.selectedAddress;
    await marketplaceContract.methods
      .delist(listingId)
      .send({ from: myAddress });
    refresh();
  } catch (e) {
    console.log("delist error");
    console.log(e);
  }
};

const purchase = async (listingId) => {
  try {
    const myAddress = web3.currentProvider.selectedAddress;
    const listingData = await marketplaceContract.methods
      .idToListingData(listingId)
      .call();
    const price = listingData.price.toString();
    await marketplaceContract.methods
      .purchase(listingId)
      .send({ from: myAddress, value: price });
    refresh();
  } catch (e) {
    console.log("purchase error");
    console.log(e);
  }
};

const refresh = async () => {
  renderMyNFTs();
  renderMarketplace();
};

init();
