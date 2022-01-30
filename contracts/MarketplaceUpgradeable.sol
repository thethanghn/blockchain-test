// SPDX-License-Identifier: MIT
pragma solidity 0.8.10;

import "@openzeppelin/contracts-upgradeable/utils/math/SafeMathUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/security/PausableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/security/ReentrancyGuardUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/CountersUpgradeable.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";

contract MarketplaceUpgradeable is
  OwnableUpgradeable,
  ReentrancyGuardUpgradeable
{
  using SafeMathUpgradeable for uint256;
  using CountersUpgradeable for CountersUpgradeable.Counter;

  CountersUpgradeable.Counter internal _listingIdCounter;

  event Listed(
    address indexed seller,
    uint256 indexed listingId,
    uint256 tokenId,
    address tokenAddress,
    uint256 price
  );

  event Delisted(uint256 indexed listingId);

  event Purchased(uint256 indexed listingId, address indexed buyer);

  event TaxChanged(uint256 taxPercentage);

  struct ListingData {
    address seller;
    uint256 tokenId;
    address tokenAddress;
    uint256 price;
  }

  uint256 public taxPercentage;
  mapping(uint256 => ListingData) public idToListingData;
  mapping(address => uint256[]) public sellerToIds;

  address[] public sellers;

  address payable public wallet;

  function initialize(uint256 _taxPercentage, address payable _wallet)
    public
    initializer
  {
    __Ownable_init();
    __ReentrancyGuard_init();

    taxPercentage = _taxPercentage;
    wallet = _wallet;
  }

  function setTaxPercentage(uint256 _taxPercentage) external virtual onlyOwner {
    taxPercentage = _taxPercentage;

    emit TaxChanged(_taxPercentage);
  }

  function list(
    uint256 _tokenId,
    address _tokenAddress,
    uint256 _price
  ) external virtual returns (uint256) {
    IERC721 erc721 = IERC721(_tokenAddress);
    require(erc721.ownerOf(_tokenId) == msg.sender, "caller is not the owner");

    uint256 currentId = _listingIdCounter.current();
    ListingData memory data = ListingData(
      msg.sender,
      _tokenId,
      _tokenAddress,
      _price
    );
    idToListingData[currentId] = data;

    if (sellerToIds[msg.sender].length == 0) {
      sellers.push(msg.sender);
    }
  
    sellerToIds[msg.sender].push(currentId);
    erc721.transferFrom(msg.sender, address(this), _tokenId);
    _listingIdCounter.increment();

    emit Listed(msg.sender, currentId, _tokenId, _tokenAddress, _price);

    return currentId;
  }

  function delist(uint256 _listingId) external virtual {
    ListingData memory data = idToListingData[_listingId];

    require(data.seller == msg.sender, "caller is not the seller");

    IERC721 erc721 = IERC721(data.tokenAddress);
    erc721.transferFrom(address(this), msg.sender, data.tokenId);

    _cleanUp(msg.sender, _listingId);

    emit Delisted(_listingId);
  }

  function purchase(uint256 _listingId) external payable virtual nonReentrant {
    ListingData memory data = idToListingData[_listingId];

    require(data.seller != address(0), "listingId does not exist");
    require(
      data.seller != msg.sender,
      "caller cannot purchase his own product"
    );

    uint256 taxAmount = getTaxAmount(_listingId);

    _cleanUp(data.seller, _listingId);

    require(
      msg.value == data.price,
      "paying amount is different from listed price"
    );

    (bool success, ) = data.seller.call{ value: data.price.sub(taxAmount) }("");
    require(success, "Transfer to seller failed.");
    (bool success2, ) = wallet.call{ value: taxAmount }("");
    require(success2, "Transfer to marketplace wallet failed");

    IERC721 erc721 = IERC721(data.tokenAddress);
    erc721.transferFrom(address(this), msg.sender, data.tokenId);

    emit Purchased(_listingId, msg.sender);
  }

  function getTaxAmount(uint256 _listingId)
    public
    view
    virtual
    returns (uint256)
  {
    ListingData memory data = idToListingData[_listingId];

    return data.price.mul(taxPercentage).div(10000);
  }

  function _cleanUp(address _sender, uint256 _listingId) internal virtual {
    for (uint256 i = 0; i < sellerToIds[_sender].length; ++i) {
      if (sellerToIds[_sender][i] == _listingId) {
        sellerToIds[_sender][i] = sellerToIds[_sender][
          sellerToIds[_sender].length.sub(1)
        ];
        sellerToIds[_sender].pop();
        delete idToListingData[_listingId];
        break;
      }
    }

    if (sellerToIds[_sender].length == 0) {
      for (uint256 i = 0; i < sellers.length; ++i) {
        if (sellers[i] == _sender) {
          sellers[i] = sellers[sellers.length.sub(1)];
          sellers.pop();
          break;
        }
      }
    }
  }

  function getSellers() public view returns (address[] memory) {
    return sellers;
  }

  function getSellerListingIds(address _seller) public view returns (uint256[] memory) {
    return sellerToIds[_seller];
  }
}
