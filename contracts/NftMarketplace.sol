// SPDX-License-Identifier: MIT
pragma solidity ^0.8.7;

import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "hardhat/console.sol";

error NftMarketplace__PriceMustBeAboveZeroOrNoDesiredNftGiven();
error NftMarketplace__NotApprovedForMarketplace();
error NftMarketplace__AlreadyListed(address nftAddress, uint256 tokenId);
error NftMarketplace__NotOwner(uint256 tokenId, address nftAddress, address nftOwner); // !!!W all those arguments might be too much unnecessary information. does it safe gas or sth if i leave it out?
error NftMarketplace__NotListed(address nftAddress, uint256 tokenId);
error NftMarketplace__PriceNotMet(address nftAddress, uint256 tokenId, uint256 price);
error NftMarketplace__NoProceeds();
error NftMarketplace__TransferFailed();

contract NftMarketplace is ReentrancyGuard {
    struct Listing {
        uint256 listingId; // *** I want that every Listing has a uinque Lising Number, just like in the real world :) then it would make sense to just always let the functions also work if only the listingId is given in the args
        uint256 price;
        address seller;
        address desiredNftAddress; // Desired NFTs for swap !!!W find a way to have multiple desiredNftAddresses ( and / or ) - maybe by using an array here(?)
        uint256 desiredNftTokenId; // Desired token IDs for swap !!!W find a way to have multiple desiredNftAddresses ( and / or ) - maybe by using an array here(?)
    } // !!!W also find a way to have the seller list their nft for swap WITH additional ETH. so that they can say i want my 1ETH worth NFT to be swapped against this specific NFT AND 0.3 ETH.

    event ItemListed(
        address indexed seller,
        address indexed nftAddress,
        uint256 indexed tokenId,
        uint256 price,
        uint256 listingId,
        address desiredNftAddress,
        uint256 desiredNftTokenId
    );

    event ItemBought(
        address indexed buyer,
        address indexed nftAddress,
        uint256 indexed tokenId,
        uint256 price,
        uint256 listingId,
        address desiredNftAddress,
        uint256 desiredNftTokenId
    );

    event ItemCanceled(
        address indexed seller,
        address indexed nftAddress,
        uint256 indexed tokenId,
        uint256 listingId,
        address desiredNftAddress,
        uint256 desiredNftTokenId
    );
    event ItemUpdated(
        address indexed seller,
        address indexed nftAddress,
        uint256 indexed tokenId,
        uint256 price,
        uint256 listingId,
        address desiredNftAddress,
        uint256 desiredNftTokenId
    );

    // !!!W the listing mapping could be aswell be defined by listing ID instead of NFT. That would be a more streamlined experience
    // NFT Contract address -> NFT TokenID -> Listing
    mapping(address => mapping(uint256 => Listing)) private s_listings;

    // seller address -> amount earned
    mapping(address => uint256) private s_proceeds;

    IERC721 nft; // !!!W test if its a problem to have this declared here and not in every function extra, if multiple users use the contracts functions at the same time. I think i actually could just declare this in each function again and again and work with the input arguments and returns to let the data flow
    // !!!W cGPT mentioned: Declaring nft at the contract level can lead to potential issues if multiple functions are called concurrently. It's safer to declare it within each function where it's needed.
    uint256 listingId = 0; // !!!W add that all the info of the s_listings mapping can be returned when calling a getter function with the listingId as the parameter/argument
    // !!!W does listingId need to be s_listingId?
    // !!!W wouldn a uint256 limit me in how many NFTs can be offered on my marketplace? Which datatype should I use to make sure this nft marketplace can be run for 1000 Years, looking at how many nfts open Sea has registered since the NFT Boom and calculating that value up to 1000 Years?

    ///////////////
    // Modifiers //
    ///////////////

    // nonReentrant Modifier is inherited
    // !!!W cGPT mentioned: Your modifiers are well-structured. For gas efficiency, it's often better to use require statements instead of multiple modifiers, but for clarity and reusability, modifiers are great.

    modifier notListed(address nftAddress, uint256 tokenId) {
        Listing memory listing = s_listings[nftAddress][tokenId];
        if (listing.price > 0 || listing.desiredNftAddress != address(0)) {
            // this makes sense bc if the listing doesnt exist the price wouldnt be greater than 0. but when it does exist the price IS greater than zero.
            // !!!W But i think it would be more professional to actually check if the nftAddress tokenId actually exists rather than this kinda workaround...
            revert NftMarketplace__AlreadyListed(nftAddress, tokenId);
        }
        _;
    }
    // !!!W cGPT mentioned: Checking for the existence of a listing based on its price might not be the most intuitive. It's better to have an explicit bool field, say isListed, in the Listing struct.

    modifier isListed(address nftAddress, uint256 tokenId) {
        Listing memory listing = s_listings[nftAddress][tokenId];
        if (listing.price <= 0 && listing.desiredNftAddress == address(0)) {
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

    // !!!W add NatSpec for every function

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
        uint256 price,
        address desiredNftAddress,
        uint256 desiredNftTokenId
    )
        external
        // Challenge: Have this contract accept payment in a subset of tokens as well
        // Hint: Use Chainlink Price Feeds to convert the price of the tokens between each other
        // !!!W address tokenPayment - challange: use chainlink pricefeed to let the user decide which currency they want to use - so the user would set his price in eur or usd (or any other available chianlink pricefeed (?) ) and the frontend would always show this currency. when the nft gets bought the buyer would pay in ETH what the useres currency is worth at that time in eth. For that it is also necessary that the withdraw proceeds happens directly so the seller gets the eth asap to convert it back to their currency at a cex of their choice ... additionally i could also integrate an cex api where the seller could register their cexs account at this nft marketplace so that everything happens automatically and the seller gets the money they asked for automatically in their currency. (since it would probaly not be exactly the amount since there are fees and a little time delay from the buyer buying to the seller getting the eur, the marketplace owner should pay up for the difference (but also take if its too much since the price of eth could also go up)) --- NO! https://fravoll.github.io/solidity-patterns/pull_over_push.ht
        notListed(nftAddress, tokenId)
        isOwner(nftAddress, tokenId, msg.sender)
    {
        if (price <= 0 && desiredNftAddress == address(0)) {
            // !!!W this is a quick fix for what cGPT mentioned. Check if thats a good solution or if i should enhance. -  It seems that the listItem function checks for the price to be above zero, even for swap listings. This restriction should probably be removed or modified in the contract for swap listings since the price is not necessarily relevant in such cases.
            revert NftMarketplace__PriceMustBeAboveZeroOrNoDesiredNftGiven();
        }

        // info: approve the NFT Marketplace to transfer the NFT (that way the Owner is keeping the NFT in their wallet until someone bougt it from the marketplace)
        checkApproval(nftAddress, tokenId);
        listingId++;
        s_listings[nftAddress][tokenId] = Listing(
            listingId,
            price,
            msg.sender,
            desiredNftAddress,
            desiredNftTokenId
        );
        emit ItemListed(
            msg.sender,
            nftAddress,
            tokenId,
            price,
            listingId,
            desiredNftAddress,
            desiredNftTokenId
        );

        // !!!W is there a way to listen to the BasicNft event for if the approval has been revoked, to then cancel the listing automatically?
    }

    function checkApproval(address nftAddress, uint tokenId) internal {
        // !!!W would it make sense to have this being a modifier?
        nft = IERC721(nftAddress);
        if (nft.getApproved(tokenId) != address(this)) {
            revert NftMarketplace__NotApprovedForMarketplace();
        }
    }

    function buyItem(
        address nftAddress, // !!!W should i rather work with the listingId of the struct? that seems more streamlined...
        uint256 tokenId
    ) external payable nonReentrant isListed(nftAddress, tokenId) {
        // !!!W if two users call the function concurrently the second user will be blocked. what happens then? is there a way to not even have the user notice that and just try again?
        // checkApproval(nftAddress, tokenId); // !!!W I want to check if the nftmarketplace still has the rights to transfer the nft when it is about to be bought. but i probably have to change this function sincec this time its the buyer calling it, not the seller so it needs to get the sellers addres via the listingStruct// !!!W add a test that confirms that the buyItem function fails if the approval has been revoked in the meantime!
        Listing memory listedItem = s_listings[nftAddress][tokenId];

        if (msg.value < listedItem.price) {
            revert NftMarketplace__PriceNotMet(nftAddress, tokenId, listedItem.price); // !!!W I think it would be good to add msg.value as well so its visible how much eth has actually been tried to transfer, since i guess there are gas costs and stuff...
            // !!!W i could also do this with `require(msg.value == listedItem.price, "Incorrect Ether sent");` - is this better? like safer and or gas efficient?
        } else {
            s_proceeds[listedItem.seller] += msg.value;
            if (listedItem.desiredNftAddress != address(0)) {
                require( // should i have this as a modifier just like the isOwner one i use for the listItem?
                    IERC721(listedItem.desiredNftAddress).ownerOf(listedItem.desiredNftTokenId) ==
                        msg.sender,
                    "You don't own the desired NFT for swap"
                );
                checkApproval(listedItem.desiredNftAddress, listedItem.desiredNftTokenId); // !!!W this is a quick fix. cGPT said there was an issue about the approval.

                // Swap the NFTs
                IERC721(nftAddress).safeTransferFrom(listedItem.seller, msg.sender, tokenId);
                IERC721(listedItem.desiredNftAddress).safeTransferFrom(
                    msg.sender,
                    listedItem.seller,
                    listedItem.desiredNftTokenId
                );
                // !!!W when implementing the swap + eth option, i need to have the s_proceeds here aswell.
            }
            // maybe its safer to not use else but start a new if with `if (!listedItem.isForSwap) {`

            IERC721(nftAddress).safeTransferFrom(listedItem.seller, msg.sender, tokenId); // !!!W this needs an revert catch thingy bc if it fails to transfer the nft, for example because the approval has been revoked, the whole function has to be reverted.

            delete (s_listings[nftAddress][tokenId]);
            emit ItemBought(
                msg.sender,
                nftAddress,
                tokenId,
                listedItem.price,
                listedItem.listingId,
                listedItem.desiredNftAddress,
                listedItem.desiredNftTokenId
            ); // !!!W Patrick said that the event emitted is technically not save from reantrancy attacks. figure out how and why and make it safe.
        }
    }

    function cancelListing(
        address nftAddress,
        uint256 tokenId
    ) external isListed(nftAddress, tokenId) isOwner(nftAddress, tokenId, msg.sender) {
        Listing memory listedItem = s_listings[nftAddress][tokenId];
        delete (s_listings[nftAddress][tokenId]);

        emit ItemCanceled(
            msg.sender,
            nftAddress,
            tokenId,
            listedItem.listingId,
            listedItem.desiredNftAddress,
            listedItem.desiredNftTokenId
        );
        // nft = IERC721(nftAddress); nft.approve(address(0), tokenId); // !!!W patrick didnt revoke the approval in his contract -> I guess bc its not possible. bc that call can only come from the owner or from the approved for all, while this call here is coming from the contract which is not. But I think it would make sense if the address that is approved would be able to revoke its onw approval, check out why it is not!
    }

    function updateListing(
        // !!!W this needs to get adjusted for swapping nfts.
        // take notice: when the listing gets updated the ListingId also gets updated!
        address nftAddress,
        uint256 tokenId,
        uint256 newPrice,
        address newDesiredNftAddress,
        uint256 newdesiredNftTokenId
    ) external isListed(nftAddress, tokenId) isOwner(nftAddress, tokenId, msg.sender) {
        if (newPrice <= 0 || newDesiredNftAddress != address(0)) {
            // *** patrick didnt make sure that the updated price would be above 0 in his contract
            revert NftMarketplace__PriceMustBeAboveZeroOrNoDesiredNftGiven();
        }
        checkApproval(nftAddress, tokenId); // *** patrick didnt check if the approval is still given in his contract
        Listing memory listedItem = s_listings[nftAddress][tokenId];
        listedItem.price = newPrice;
        listedItem.desiredNftAddress = newDesiredNftAddress;
        listedItem.desiredNftTokenId = newdesiredNftTokenId;
        s_listings[nftAddress][tokenId] = listedItem;
        emit ItemUpdated(
            msg.sender,
            nftAddress,
            tokenId,
            listedItem.price,
            listedItem.listingId, // !!!W check if the listingId stays the same, even if between the listItem creation and the updateListing have been other listings created and deleted
            listedItem.desiredNftAddress,
            listedItem.desiredNftTokenId
        );
    }

    // to try out the ReentrancyAttack.sol,  comment out the `nonReentrant` , move the `s_proceeds[msg.sender] = 0;` to after the ETH transfer and change the `payable(msg.sender).transfer(proceeds);` to `(bool success, ) = payable(msg.sender).call{value: proceeds, gas: 30000000}("");` because Hardhat has an issue estimating the gas for the receive fallback function... The Original should work on the testnet, tho! !!!W Try on the testnet if reentrancy attack is possible
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
// !!!W test if the approval works as a separate function
// !!!W test if the listingId starts with 1 and than counts up for every time the listItem function has been called
// !!!W how do I actually test this while programming? do i have to write the deploy script already? or is there a way to use the hh console to test on the fly?

// Create a decentralized NFT Marketplace:
// !!!W 0.1. `approve`: approve the smartcontract to transfer the NFT
// 1. `listItem`: List NFTs on the marketplace (/)
// 2. `buyItem`: Buy NFTs
// 3. `cancelItem`: Cancel a listing
// 4. `updateListing`: to update the price
// 5. `withdrawproceeds`: Withdraw payment for my bought NFTs

// !!!W understand when to use the memory keyword, for example for strings and for structs
// !!!W make a nice description/comments/documentation like the zepplin project does.
// !!!W create a good ReadMe.md
// !!!W how do I give myself the option to update this code once it is deployed?
// !!!W set it up that I get 0.1% of all proceeds of every sucessfull(!) sale

// !!!W how can i see emited events on hardhat local host?

// !!!W Partner would like a function that you can swap nfts directly, so you offer yournfts against another specific nft, or multiple?

// !!!W cGPT mentioned Security tests for edge cases. Just copy the code into cGPT again and ask it for all possible edge cases and how i can write my test for those.
