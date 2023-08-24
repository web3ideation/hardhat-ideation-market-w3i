// SPDX-License-Identifier: MIT

// crate a mock of a actual utility nft like nike steps or sth

pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Enumerable.sol";
import "@openzeppelin/contracts/utils/Counters.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract RegularNFT is ERC721Enumerable, Ownable {
    using Counters for Counters.Counter;
    Counters.Counter private _tokenIdCounter;
    string private _baseTokenURI;

    constructor(
        string memory name,
        string memory symbol,
        string memory baseTokenURI
    ) ERC721(name, symbol) {
        _baseTokenURI = baseTokenURI;
    }

    function _baseURI() internal view override returns (string memory) {
        return _baseTokenURI;
    }

    function mint(address recipient) external onlyOwner {
        _tokenIdCounter.increment();
        uint256 newTokenId = _tokenIdCounter.current();
        _safeMint(recipient, newTokenId);
    }
}
