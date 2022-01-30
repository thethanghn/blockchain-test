// SPDX-License-Identifier: MIT
pragma solidity 0.8.10;

import "@openzeppelin/contracts-upgradeable/token/ERC721/ERC721Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC721/extensions/ERC721EnumerableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC721/extensions/ERC721URIStorageUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/AccessControlEnumerableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/utils/CountersUpgradeable.sol";

contract DCHeroCardUpgradeable is
  Initializable,
  ERC721Upgradeable,
  ERC721EnumerableUpgradeable,
  ERC721URIStorageUpgradeable,
  AccessControlEnumerableUpgradeable
{
  using CountersUpgradeable for CountersUpgradeable.Counter;

  struct DCHeroCard {
    uint256 rarity;
    uint256 level;
  }

  bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");

  CountersUpgradeable.Counter internal _tokenIdCounter;
  string internal _baseTokenURI;
  mapping(uint256 => DCHeroCard) public idToCard;

  event DCHeroCardMinted(address indexed owner, uint256 indexed id);

  function initialize() public initializer {
    __ERC721_init("DC Hero Card", "DCHC");
    __ERC721Enumerable_init();
    __ERC721URIStorage_init();
    __AccessControl_init();
    _baseTokenURI = "https://nft-game.io/dc-hero-card/";

    _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
    _grantRole(MINTER_ROLE, msg.sender);
  }

  function _baseURI() internal view override returns (string memory) {
    return _baseTokenURI;
  }

  function setBaseTokenURI(string memory _uri)
    public
    onlyRole(DEFAULT_ADMIN_ROLE)
  {
    _baseTokenURI = _uri;
  }

  function _beforeTokenTransfer(
    address from,
    address to,
    uint256 tokenId
  ) internal virtual override(ERC721Upgradeable, ERC721EnumerableUpgradeable) {
    super._beforeTokenTransfer(from, to, tokenId);
  }

  function mint(
    address _to,
    uint256 _rarity,
    uint256 _level
  ) public virtual onlyRole(MINTER_ROLE) returns (uint256) {
    uint256 tokenId = _tokenIdCounter.current();
    _tokenIdCounter.increment();
    _safeMint(_to, tokenId);

    DCHeroCard memory card = DCHeroCard(_rarity, _level);
    idToCard[tokenId] = card;

    emit DCHeroCardMinted(_to, tokenId);

    return tokenId;
  }

  function _burn(uint256 tokenId)
    internal
    virtual
    override(ERC721Upgradeable, ERC721URIStorageUpgradeable)
  {
    super._burn(tokenId);
    delete idToCard[tokenId];
  }

  function tokenURI(uint256 tokenId)
    public
    view
    virtual
    override(ERC721Upgradeable, ERC721URIStorageUpgradeable)
    returns (string memory)
  {
    return super.tokenURI(tokenId);
  }

  function supportsInterface(bytes4 interfaceId)
    public
    view
    virtual
    override(
      ERC721Upgradeable,
      ERC721EnumerableUpgradeable,
      AccessControlEnumerableUpgradeable
    )
    returns (bool)
  {
    return super.supportsInterface(interfaceId);
  }
}
