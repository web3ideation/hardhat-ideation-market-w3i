// this is just a mock to test the nft marketplace, orignial author (worldofwomen.art)
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Enumerable.sol";
import "@openzeppelin/contracts/utils/math/SafeMath.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

import "./clubsMock.sol";

//               ,{{}}}}}}.
//              {{{{{}}}}}}}.
//             {{{{  {{{{{}}}}
//            }}}}} _   _ {{{{{
//            }}}}  m   m  }}}}}
//           {{{{C    ^    {{{{{
//          }}}}}}\  '='  /}}}}}}
//         {{{{{{{{;.___.;{{{{{{{{
//         }}}}}}}}})   (}}}}}}}}}}
//        {{{{}}}}}':   :{{{{{{{{{{
//        {{{}}}}}} `WoW` {{{}}}}}}}
//         {{{{{{{{{    }}}}}}}}}
//           }}}}}}}}  {{{{{{{{{
//            {{{{{{{{  }}}}}}
//               }}}}}  {{{{
//                {{{    }}

contract WorldOfWomenMock is Ownable, Clubs, ERC721Enumerable {
    using SafeMath for uint256;

    uint256 public constant maxSupply = 100;
    uint256 private _price = 0.000001 ether;
    uint256 private _reserved = 2;

    string public WOW_PROVENANCE = "";
    uint256 public startingIndex;

    bool private _saleStarted;
    string public baseURI;

    address t1 = 0xE8dF60a93b2B328397a8CBf73f0d732aaa11e33D;
    address t2 = 0xE8dF60a93b2B328397a8CBf73f0d732aaa11e33D;

    constructor() ERC721("World Of Women", "WOW") {
        _saleStarted = true;
        baseURI = "ipfs://QmTNBQDbggLZdKF1fRgWnXsnRikd52zL5ciNu769g9JoUP/";
    }

    modifier whenSaleStarted() {
        require(_saleStarted);
        _;
    }

    function mint(uint256 _nbTokens) external payable whenSaleStarted {
        uint256 supply = totalSupply();
        require(_nbTokens < 3, "You cannot mint more than 3 Tokens at once!");
        require(supply + _nbTokens <= maxSupply - _reserved, "Not enough Tokens left.");
        require(_nbTokens * _price <= msg.value, "Inconsistent amount sent!");

        for (uint256 i; i < _nbTokens; i++) {
            _safeMint(msg.sender, supply + i);
        }
    }

    function flipSaleStarted() external onlyOwner {
        _saleStarted = !_saleStarted;

        if (_saleStarted && startingIndex == 0) {
            setStartingIndex();
        }
    }

    function saleStarted() public view returns (bool) {
        return _saleStarted;
    }

    function setBaseURI(string memory _URI) external onlyOwner {
        baseURI = _URI;
    }

    function _baseURI() internal view override(ERC721) returns (string memory) {
        return baseURI;
    }

    // Make it possible to change the price: just in case
    function setPrice(uint256 _newPrice) external onlyOwner {
        _price = _newPrice;
    }

    function getPrice() public view returns (uint256) {
        return _price;
    }

    function getReservedLeft() public view returns (uint256) {
        return _reserved;
    }

    // This should be set before sales open.
    function setProvenanceHash(string memory provenanceHash) public onlyOwner {
        WOW_PROVENANCE = provenanceHash;
    }

    // Helper to list all the Women of a wallet
    function walletOfOwner(address _owner) public view returns (uint256[] memory) {
        uint256 tokenCount = balanceOf(_owner);

        uint256[] memory tokensId = new uint256[](tokenCount);
        for (uint256 i; i < tokenCount; i++) {
            tokensId[i] = tokenOfOwnerByIndex(_owner, i);
        }
        return tokensId;
    }

    function claimReserved(uint256 _number, address _receiver) external onlyOwner {
        require(_number <= _reserved, "That would exceed the max reserved.");

        uint256 _tokenId = totalSupply();
        for (uint256 i; i < _number; i++) {
            _safeMint(_receiver, _tokenId + i);
        }

        _reserved = _reserved - _number;
    }

    function setStartingIndex() public {
        require(startingIndex == 0, "Starting index is already set");

        // BlockHash only works for the most 256 recent blocks.
        uint256 _block_shift = uint(
            keccak256(abi.encodePacked(block.difficulty, block.timestamp))
        );
        _block_shift = 1 + (_block_shift % 255);

        // This shouldn't happen, but just in case the blockchain gets a reboot?
        if (block.number < _block_shift) {
            _block_shift = 1;
        }

        uint256 _block_ref = block.number - _block_shift;
        startingIndex = uint(blockhash(_block_ref)) % maxSupply;

        // Prevent default sequence
        if (startingIndex == 0) {
            startingIndex = startingIndex + 1;
        }
    }

    function withdraw() public onlyOwner {
        uint256 _balance = address(this).balance;
        uint256 _split = _balance.mul(62).div(100);

        require(payable(t1).send(_split));
        require(payable(t2).send(_balance.sub(_split)));
    }

    function _beforeTokenTransfer(
        address from,
        address to,
        uint256 firstTokenId,
        uint256 batchSize
    ) internal override(ERC721Enumerable) {
        super._beforeTokenTransfer(from, to, firstTokenId, batchSize);
    }

    function supportsInterface(
        bytes4 interfaceId
    ) public view override(ERC721Enumerable) returns (bool) {
        return super.supportsInterface(interfaceId);
    }
}
