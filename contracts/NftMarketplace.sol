// SPDX-License-Identifier: MIT
pragma solidity ^0.8.7;

import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "hardhat/console.sol";

error NftMarketplace__PriceMustBeAboveZero();
error NftMarketplace__NotApprovedForMarketplace();
error NftMarketplace__AlreadyListed(address nftAddress, uint256 tokenId);
error NftMarketplace__NotOwner(uint256 tokenId, address nftAddress, address nftOwner); // !!! all those arguments might be too much unnecessary information. does it safe gas or sth if i leave it out?
error NftMarketplace__NotListed(address nftAddress, uint256 tokenId);
error NftMarketplace__PriceNotMet(address nftAddress, uint256 tokenId, uint256 price);
error NftMarketplace__NoProceeds();
error NftMarketplace__TransferFailed();

contract NftMarketplace is ReentrancyGuard {
    struct Listing {
        uint256 listingId; // *** I want that every Listing has a uinque Lising Number, just like in the real world :) then it would make sense to just always let the functions also work if only the listingId is given in the args
        uint256 price;
        address seller;
    }

    event ItemListed(
        address indexed seller,
        address indexed nftAddress,
        uint256 indexed tokenId,
        uint256 price,
        uint256 listingId
    );

    event ItemBought(
        address indexed buyer,
        address indexed nftAddress,
        uint256 indexed tokenId,
        uint256 price,
        uint256 listingId
    );

    event ItemCanceled(
        address indexed buyer,
        address indexed nftAddress,
        uint256 indexed tokenId,
        uint256 listingId
    );
    event ItemUpdated(
        address indexed seller,
        address indexed nftAddress,
        uint256 indexed tokenId,
        uint256 price,
        uint256 listingId
    );
    event EventEmitted();

    // NFT Contract address -> NFT TokenID -> Listing
    mapping(address => mapping(uint256 => Listing)) private s_listings;

    // seller address -> amount earned
    mapping(address => uint256) private s_proceeds;

    IERC721 nft; // !!! test if its a problem to have this declared here and not in every function extra, if multiple users use the contracts functions at the same time. I think i actually could just declare this in each function again and again and work with the input arguments and returns to let the data flow
    uint256 listingId = 0; // !!! add that all the info of the s_listings mapping can be returned when calling a getter function with the listingId as the parameter/argument
    // !!! does listingId need to be s_listingId?
    // !!! wouldn a uint256 limit me in how many NFTs can be offered on my marketplace? Which datatype should I use to make sure this nft marketplace can be run for 1000 Years, looking at how many nfts open Sea has registered since the NFT Boom and calculating that value up to 1000 Years?

    ///////////////
    // Modifiers //
    ///////////////

    //nonReentrant Modifier is inherited

    modifier notListed(address nftAddress, uint256 tokenId) {
        Listing memory listing = s_listings[nftAddress][tokenId];
        if (listing.price > 0) {
            // this makes sense bc if the listing doesnt exist the price wouldnt be greater than 0. but when it does exist the price IS greater than zero.
            // !!! But i think it would be more professional to actually check if the nftAddress tokenId actually exists rather than this kinda workaround...
            revert NftMarketplace__AlreadyListed(nftAddress, tokenId);
        }
        _;
    }

    modifier isListed(address nftAddress, uint256 tokenId) {
        Listing memory listing = s_listings[nftAddress][tokenId];
        if (listing.price <= 0) {
            revert NftMarketplace__NotListed(nftAddress, tokenId);
        }
        _;
    }

    modifier isOwner(
        address nftAddress,
        uint256 tokenId,
        address owner
    ) {
        nft = IERC721(nftAddress);
        if (msg.sender != nft.ownerOf(tokenId)) {
            revert NftMarketplace__NotOwner(tokenId, nftAddress, nft.ownerOf(tokenId));
        }
        _;
    }

    ////////////////////
    // Main Functions //
    ////////////////////

    // !!! add NatSpec for every function

    /*
     * @notice Method for listing your NFT on the marketplace
     * @param nftAddress: Address of the NFT to be listed
     * @param tokenId: TokenId of that NFT
     * @param price: The price the owner wants the NFT to sell for
     * @dev: Using approve() the user keeps on owning the NFT while it is listed
     */

    function listItem(
        address nftAddress,
        uint256 tokenId,
        uint256 price
    )
        external
        // Challenge: Have this contract accept payment in a subset of tokens as well
        // Hint: Use Chainlink Price Feeds to convert the price of the tokens between each other
        // !!! address tokenPayment - challange: use chainlink pricefeed to let the user decide which currency they want to use - so the user would set his price in eur or usd (or any other available chianlink pricefeed (?) ) and the frontend would always show this currency. when the nft gets bought the buyer would pay in ETH what the useres currency is worth at that time in eth. For that it is also necessary that the withdraw proceeds happens directly so the seller gets the eth asap to convert it back to their currency at a cex of their choice ... additionally i could also integrate an cex api where the seller could register their cexs account at this nft marketplace so that everything happens automatically and the seller gets the money they asked for automatically in their currency. (since it would probaly not be exactly the amount since there are fees and a little time delay from the buyer buying to the seller getting the eur, the marketplace owner should pay up for the difference (but also take if its too much since the price of eth could also go up)) --- NO! https://fravoll.github.io/solidity-patterns/pull_over_push.ht
        notListed(nftAddress, tokenId)
        isOwner(nftAddress, tokenId, msg.sender)
    {
        if (price <= 0) {
            revert NftMarketplace__PriceMustBeAboveZero();
        }

        // !!! we have to get the approval - only the owner can give the approval. (maybe a button on the frontend for the user to approve and once that is done the list item gets called automatically)

        // info: approve the NFT Marketplace to transfer the NFT (that way the Owner is keeping the NFT in their wallet until someone bougt it from the marketplace)
        checkApproval(nftAddress, tokenId);
        s_listings[nftAddress][tokenId] = Listing(listingId, price, msg.sender);
        emit ItemListed(msg.sender, nftAddress, tokenId, price, listingId);
        listingId++;
        // !!! is there a way to listen to the BasicNft event for if the approval has been revoked, to then cancel the listing automatically?
    }

    function checkApproval(address nftAddress, uint tokenId) internal {
        // !!! would it make sense to have this being a modifier?
        nft = IERC721(nftAddress);
        if (nft.getApproved(tokenId) != address(this)) {
            revert NftMarketplace__NotApprovedForMarketplace();
        }
    }

    function buyItem(
        address nftAddress,
        uint256 tokenId
    ) external payable nonReentrant isListed(nftAddress, tokenId) {
        checkApproval(nftAddress, tokenId); // !!! add a test that confirms that the buyItem function fails if the approval has been revoked in the meantime!
        Listing memory listedItem = s_listings[nftAddress][tokenId];
        if (msg.value < listedItem.price) {
            revert NftMarketplace__PriceNotMet(nftAddress, tokenId, listedItem.price); // !!! I think it would be good to add msg.value as well so its visible how much eth has actually been tried to transfer, since i guess there are gas costs and stuff...
        }
        s_proceeds[listedItem.seller] += msg.value;
        delete (s_listings[nftAddress][tokenId]); // !!! I want the data to be available even after the nft has been sold. in a decentral way where it doesnt cost gas to be stored for a longer time. maybe in the events? maybe in an array of this smart contract?
        IERC721(nftAddress).safeTransferFrom(listedItem.seller, msg.sender, tokenId); // !!! this needs an revert catch thingy bc if it fails to transfer the nft, for example because the approval has been revoked, the whole function has to be reverted.
        emit ItemBought(msg.sender, nftAddress, tokenId, listedItem.price, listedItem.listingId); // !!! Patrick said that the event emitted is technically not save from reantrancy attacks. figure out how and why and make it safe.
    }

    function cancelListing(
        address nftAddress,
        uint256 tokenId
    ) external isListed(nftAddress, tokenId) isOwner(nftAddress, tokenId, msg.sender) {
        delete (s_listings[nftAddress][tokenId]);

        emit ItemCanceled(
            msg.sender,
            nftAddress,
            tokenId,
            s_listings[nftAddress][tokenId].listingId
        );
        // nft = IERC721(nftAddress); nft.approve(address(0), tokenId); // !!! patrick didnt revoke the approval in his contract -> I guess bc its not possible. bc that call can only come from the owner or from the approved for all, while this call here is coming from the contract which is not. But I think it would make sense if the address that is approved would be able to revoke its onw approval, check out why it is not!
    }

    function updateListing(
        // take notice: when the listing gets updated the ListingId also gets updated!
        address nftAddress,
        uint256 tokenId,
        uint256 newPrice
    ) external isListed(nftAddress, tokenId) isOwner(nftAddress, tokenId, msg.sender) {
        if (newPrice <= 0) {
            // *** patrick didnt make sure that the updated price would be above 0 in his contract
            revert NftMarketplace__PriceMustBeAboveZero();
        }
        checkApproval(nftAddress, tokenId); // *** patrick didnt check if the approval is still given in his contract
        s_listings[nftAddress][tokenId].price = newPrice;
        emit ItemUpdated(msg.sender, nftAddress, tokenId, newPrice, listingId);
    }

    // to try out the ReentrancyAttack.sol,  comment out the `nonReentrant` , move the `s_proceeds[msg.sender] = 0;` to after the ETH transfer and change the `payable(msg.sender).transfer(proceeds);` to `(bool success, ) = payable(msg.sender).call{value: proceeds, gas: 30000000}("");` because Hardhat has an issue estimating the gas for the receive fallback function... The Original should work on the testnet, tho! !!! Try on the testnet if reentrancy attack is possible
    function withdrawProceeds() external payable nonReentrant {
        uint256 proceeds = s_proceeds[msg.sender];
        if (proceeds <= 0) {
            revert NftMarketplace__NoProceeds();
        }
        s_proceeds[msg.sender] = 0;
        payable(msg.sender).transfer(proceeds); // *** I'm using this instead of Patricks (bool success, ) = payable(msg.sender).call{value: proceeds}(""); require(success, "NftMarketplace__TransferFailed");`bc mine reverts on its own when it doesnt succeed, and therby I consider it better!
    }

    //////////////////////
    // getter Functions //
    //////////////////////

    function getListing(
        address nftAddress,
        uint256 tokenId
    ) external view returns (Listing memory) {
        return s_listings[nftAddress][tokenId];
    }

    function getProceeds(address seller) external view returns (uint256) {
        return s_proceeds[seller];
    }

    function getNextListingId() external view returns (uint256) {
        return listingId; // *** With this function people can find out what the next Listing Id would be
    }

    function getBalance() external view returns (uint256) {
        return address(this).balance;
    }
}
// !!! test if the approval works as a separate function
// !!! test if the listingId starts with 1 and than counts up for every time the listItem function has been called
// !!! how do I actually test this while programming? do i have to write the deploy script already? or is there a way to use the hh console to test on the fly?

// Create a decentralized NFT Marketplace:
// !!! 0.1. `approve`: approve the smartcontract to transfer the NFT
// 1. `listItem`: List NFTs on the marketplace (/)
// 2. `buyItem`: Buy NFTs
// 3. `cancelItem`: Cancel a listing
// 4. `updateListing`: to update the price
// 5. `withdrawproceeds`: Withdraw payment for my bought NFTs

// !!! understand when to use the memory keyword, for example for strings and for structs
// !!! make a nice description/comments/documentation like the zepplin project does.
// !!! create a good ReadMe.md
// !!! how do I give myself the option to update this code once it is deployed?
// !!! set it up that I get 0.1% of all proceeds of every sucessfull(!) sale

// !!! how can i see emited events on hardhat local host?

// !!! Partner would like a function that you can swap nfts directly, so you offer yournfts against another specific nft, or multiple?
