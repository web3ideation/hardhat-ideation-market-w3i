// SPDX-License-Identifier: MIT
// created with cGPT on ERC721 basis

pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Enumerable.sol";
import "@openzeppelin/contracts/utils/Counters.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract RegularNft is ERC721Enumerable, Ownable {
    using Counters for Counters.Counter;
    Counters.Counter private _tokenIdCounter;

    // Hardcoded values
    string private constant _baseTokenURI =
        "ipfs://bafybeiebybpizpuwg7dddeqeeengk2uro6qmzjm5gpcxmnded47jcdpwmu/metadata.json";
    string private constant TOKEN_NAME = "w3iDoge #1";
    string private constant TOKEN_SYMBOL = "WID";

    constructor() ERC721(TOKEN_NAME, TOKEN_SYMBOL) {}

    function _baseURI() internal pure override returns (string memory) {
        return _baseTokenURI;
    }

    function mint(address recipient) external onlyOwner {
        _tokenIdCounter.increment();
        uint256 newTokenId = _tokenIdCounter.current();
        _safeMint(recipient, newTokenId);
    }

    // Override tokenURI to always return the hardcoded _baseTokenURI
    function tokenURI(uint256 tokenId) public view override returns (string memory) {
        require(_exists(tokenId), "ERC721Metadata: URI query for nonexistent token");
        return _baseTokenURI;
    }
}
