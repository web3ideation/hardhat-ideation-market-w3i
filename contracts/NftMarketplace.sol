// SPDX-License-Identifier: MIT
pragma solidity ^0.8.7;

import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

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
        uint256 listingId; // I want that every Listing has a uinque Lising Number, just like in the real world :) then it would make sense to just always let the functions also work if only the listingId is given in the args
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

    //nonReentrant Modifier is inheritet

    modifier notListed(address nftAddress, uint256 tokenId) {
        Listing memory listing = s_listings[nftAddress][tokenId];
        if (listing.price > 0) {
            // this makes sense bc if the listing doesnt exist the price wouldnt be greater than 0. but when it does exist the price IS greater than zero. !!! But i think it would be more professional to actually check if the nftAddress tokenId actually exists rather than this kinda workaround...
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
            // !!! test if the msg.sender would be the users address or actually the smartcontract calling its own function. if it works that way i can get rid of the user argument here as well when this modifier gets used in the other functions.
            revert NftMarketplace__NotOwner(tokenId, nftAddress, nft.ownerOf(tokenId));
        }
        _;
    }

    // !!! test if it gets reverted when the same nft gets registered twice.

    ////////////////////
    // Main Functions //
    ////////////////////

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
        // Challange: Have this contract accept payment i na subset of tokens as well
        // Hint: Use Chainlink Price Feeds to convert the price of the tokens between each other
        // !!! address tokenPayment - challange: use chainlink pricefeed to let the user decide which currency they want to use - so the user would set his price in eur or usd (or any other available chianlink pricefeed (?) ) and the frontend would always show this currency. when the nft gets bought the buyer would pay in ETH what the useres currency is worth at that time in eth. For that it is also necessary that the withdraw proceeds happens directly so the seller gets the eth asap to convert it back to their currency at a cex of their choice ... additionally i could also integrate an cex api where the seller could register their cexs account at this nft marketplace so that everything happens automatically and the seller gets the money they asked for automatically in their currency. (since it would probaly not be exactly the amount since there are fees and a little time delay from the buyer buying to the seller getting the eur, the marketplace owner should pay up for the difference (but also take if its too much since the price of eth could also go up)) --- NO! https://fravoll.github.io/solidity-patterns/pull_over_push.ht
        notListed(nftAddress, tokenId)
        nonReentrant // !!! check if this is really necessary here. what would an attacker get from reeantrancz attacking this function?
        isOwner(nftAddress, tokenId, msg.sender)
    {
        if (price <= 0) {
            revert NftMarketplace__PriceMustBeAboveZero();
        }

        // to do:
        // we have to get the approval - only the owner can give the approval.

        // approve the NFT Marketplace to transfer the NFT (that way the Owner is keeping the NFT in their wallet until someone bougt it from the marketplace)
        // one issue is that the owner can recall this approval and thus the marketplace smartcontract couldnt transfer it once its bought. !!! so i will make sure once the approval gets reverted that the listing will be paused.
        checkApproval(nftAddress, tokenId);
        s_listings[nftAddress][tokenId] = Listing(listingId++, price, msg.sender);
        emit ItemListed(msg.sender, nftAddress, tokenId, price, listingId);
    }

    function checkApproval(address nftAddress, uint tokenId) private {
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
        Listing memory listedItem = s_listings[nftAddress][tokenId];
        if (msg.value < listedItem.price) {
            revert NftMarketplace__PriceNotMet(nftAddress, tokenId, listedItem.price); // !!! I think it would be good to add msg.value as well so its visible how much eth has actually been tried to transfer, since i guess there are gas costs and stuff...
        }
        s_proceeds[listedItem.seller] += msg.value;
        delete (s_listings[nftAddress][tokenId]); // !!! I want the data to be available even after the nft has been sold. in a decentral way where it doesnt cost gas to be stored for a longer time. maybe in the events? mazbe in an array of this smart contract?
        IERC721(nftAddress).safeTransferFrom(listedItem.seller, msg.sender, tokenId);
        emit ItemBought(msg.sender, nftAddress, tokenId, listedItem.price, listedItem.listingId); // !!! Patrick said that the event emitted is technically not save from reantrancy attacks. figure out how and why and make it safe.
    }

    function cancelListing(
        address nftAddress,
        uint256 tokenId
    )
        external
        nonReentrant // !!! check if this is really necessary here. what would an attacker get from reeantrancz attacking this function?
        isListed(nftAddress, tokenId)
        isOwner(nftAddress, tokenId, msg.sender)
    {
        delete (s_listings[nftAddress][tokenId]);
        nft = IERC721(nftAddress);
        nft.approve(address(0), tokenId); // !!! patrick didnt revoke the approval in his contract -> test if it works and check if it makes sense to revoke.
        emit ItemCanceled(
            msg.sender,
            nftAddress,
            tokenId,
            s_listings[nftAddress][tokenId].listingId
        ); // !!! test if the listingId gets returned
    }

    function updateListing(
        address nftAddress,
        uint256 tokenId,
        uint256 newPrice
    )
        external
        nonReentrant // !!! check if this is really necessary here. what would an attacker get from reeantrancz attacking this function?
        isListed(nftAddress, tokenId)
        isOwner(nftAddress, tokenId, msg.sender)
    {
        if (newPrice <= 0) {
            // !!! patrick didnt make sure that the updated price would be above 0 in his contract -> test if it works and check if it makes sense.
            revert NftMarketplace__PriceMustBeAboveZero();
        }
        checkApproval(nftAddress, tokenId); // !!! patrick didnt check if the approval is still given in his contract -> test if it works and check if it makes sense.
        s_listings[nftAddress][tokenId].price = newPrice;
        emit ItemUpdated(msg.sender, nftAddress, tokenId, newPrice, listingId);
    }

    function withdrawProceeds() external payable nonReentrant {
        uint256 proceeds = s_proceeds[msg.sender];
        if (proceeds <= 0) {
            revert NftMarketplace__NoProceeds();
        }
        s_proceeds[msg.sender] = 0;
        (bool success, ) = payable(msg.sender).call{value: proceeds}("");
        if (!success) {
            revert NftMarketplace__TransferFailed();
        }
        //////// copy my common commands txt on this laptop!
        // why does patrick not use this way of sending eth?? payable(msg.sender).transfer(proceeds);
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
        // !!! test if this works since Patrick doesnt use ta listingId in his project
        return listingId;
    }

    // getter funcitons: next ListingId, s_listings, s_proceeds
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
