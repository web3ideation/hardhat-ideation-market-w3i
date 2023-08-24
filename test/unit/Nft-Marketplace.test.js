// !!!W i didnt do staging tests - think which ones would make sense or if i can just run this test also on the testnet.
// !!!W try running this test on the forked hh network
const { assert, expect } = require("chai")
const { network, deployments, ethers } = require("hardhat")
const { developmentChains } = require("../../helper-hardhat-config")

!developmentChains.includes(network.name)
  ? describe.skip
  : describe("Nft Marketplace Unit Tests", function () {
      let nftMarketplace, nftMarketplaceContract, basicNft, basicNftContract
      const ZERO_PRICE = ethers.utils.parseEther("0")
      const PRICE = ethers.utils.parseEther("0.1")
      const NEW_PRICE = ethers.utils.parseEther("0.05")
      const TOKEN_ID = 0
      const NEXTTOKEN_ID = 1
      const ZERO_DESIREDNFTADDRESS = "0x0000000000000000000000000000000000000000"
      // const DESIREDNFTADDRESS = "0x111111111111111111111111111111111111111" // !!!W Try using the new NFT contract address here
      const DESIREDNFTTOKENID = 1

      beforeEach(async () => {
        accounts = await ethers.getSigners()
        deployer = accounts[0]
        user = accounts[1]
        await deployments.fixture(["all"])
        const nftMarketplaceInfo = await deployments.get("NftMarketplace")
        nftMarketplaceContract = await ethers.getContractAt(
          "NftMarketplace",
          nftMarketplaceInfo.address
        )
        nftMarketplace = nftMarketplaceContract.connect(deployer)
        const basicNftInfo = await deployments.get("BasicNft")
        basicNftContract = await ethers.getContractAt("BasicNft", basicNftInfo.address)
        basicNft = basicNftContract.connect(deployer)

        await basicNft.mintNft()
        await basicNft.approve(nftMarketplaceContract.address, TOKEN_ID)
      })

      describe("Basic function test", () => {
        it("is possible to list and buy an Item for Eth", async function () {
          await nftMarketplace.listItem(
            basicNft.address,
            TOKEN_ID,
            PRICE,
            ZERO_DESIREDNFTADDRESS,
            DESIREDNFTTOKENID
          )
          const userConnectedNftMarketplace = await nftMarketplace.connect(user)
          await userConnectedNftMarketplace.buyItem(basicNft.address, TOKEN_ID, {
            value: PRICE,
          })
          const newOwner = await basicNft.ownerOf(TOKEN_ID)
          const deployerProceeds = await nftMarketplace.getProceeds(deployer.address)
          assert(newOwner.toString() == user.address)
          assert(deployerProceeds.toString() == PRICE.toString())
        })
      })

      describe("cancelListing", () => {
        it("reverts if not listed", async function () {
          await expect(
            nftMarketplace.cancelListing(basicNft.address, TOKEN_ID)
          ).to.be.revertedWith("NftMarketplace__NotListed")
        })

        it("reverts if not Owner", async function () {
          await nftMarketplace.listItem(
            basicNft.address,
            TOKEN_ID,
            PRICE,
            ZERO_DESIREDNFTADDRESS,
            DESIREDNFTTOKENID
          )
          nftMarketplace = nftMarketplaceContract.connect(user)
          await expect(
            nftMarketplace.cancelListing(basicNft.address, TOKEN_ID)
          ).to.be.revertedWith("NftMarketplace__NotOwner")
        })

        it("deletes the s_listing mapping", async function () {
          await nftMarketplace.listItem(
            basicNft.address,
            TOKEN_ID,
            PRICE,
            ZERO_DESIREDNFTADDRESS,
            DESIREDNFTTOKENID
          )
          await nftMarketplace.cancelListing(basicNft.address, TOKEN_ID)
          listing = await nftMarketplace.getListing(basicNftContract.address, TOKEN_ID)
          expect(listing.listingId.toString()).to.equal("0")
          expect(listing.price.toString()).to.equal("0")
          expect(listing.seller.toString()).to.equal("0x0000000000000000000000000000000000000000")
          expect(listing.desiredNftAddress.toString()).to.equal(
            "0x0000000000000000000000000000000000000000"
          )
          expect(listing.desiredNftTokenId.toString()).to.equal("0")
        })

        it("emits the correct event", async function () {
          await nftMarketplace.listItem(
            basicNft.address,
            TOKEN_ID,
            PRICE,
            ZERO_DESIREDNFTADDRESS,
            DESIREDNFTTOKENID
          )
          await expect(nftMarketplace.cancelListing(basicNft.address, TOKEN_ID))
            .to.emit(nftMarketplace, "ItemCanceled")
            .withArgs(
              deployer.address,
              basicNft.address,
              TOKEN_ID,
              "1",
              ZERO_DESIREDNFTADDRESS,
              DESIREDNFTTOKENID
            )
        })
      })

      describe("listItem for Eth", () => {
        it("reverts if already listed from same user", async function () {
          await nftMarketplace.listItem(
            basicNft.address,
            TOKEN_ID,
            PRICE,
            ZERO_DESIREDNFTADDRESS,
            DESIREDNFTTOKENID
          )
          await expect(
            nftMarketplace.listItem(
              basicNft.address,
              TOKEN_ID,
              PRICE,
              ZERO_DESIREDNFTADDRESS,
              DESIREDNFTTOKENID
            )
          ).to.be.revertedWith("NftMarketplace__AlreadyListed")
        })

        it("reverts if already listed from different user", async function () {
          await nftMarketplace.listItem(
            basicNft.address,
            TOKEN_ID,
            PRICE,
            ZERO_DESIREDNFTADDRESS,
            DESIREDNFTTOKENID
          )
          await expect(basicNft.transferFrom(deployer.address, user.address, TOKEN_ID))
            .to.emit(basicNft, "Transfer")
            .withArgs(deployer.address, user.address, TOKEN_ID)
          nftMarketplace = nftMarketplaceContract.connect(user)
          await expect(
            nftMarketplace.listItem(
              basicNft.address,
              TOKEN_ID,
              PRICE,
              ZERO_DESIREDNFTADDRESS,
              DESIREDNFTTOKENID
            )
          ).to.be.revertedWith("NftMarketplace__AlreadyListed")
        })

        it("reverts if not Owner", async function () {
          nftMarketplace = await nftMarketplaceContract.connect(user)
          await expect(
            nftMarketplace.listItem(
              basicNft.address,
              TOKEN_ID,
              PRICE,
              ZERO_DESIREDNFTADDRESS,
              DESIREDNFTTOKENID
            )
          ).to.be.revertedWith("NftMarketplace__NotOwner")
        })

        it("reverts if price AND desiredNftAddress is zero", async function () {
          await expect(
            nftMarketplace.listItem(
              basicNft.address,
              TOKEN_ID,
              ZERO_PRICE,
              ZERO_DESIREDNFTADDRESS,
              DESIREDNFTTOKENID
            )
          ).to.be.revertedWith("NftMarketplace__PriceMustBeAboveZeroOrNoDesiredNftGiven")
        })

        it("reverts if price < 0", async function () {
          await expect(
            nftMarketplace.listItem(
              basicNft.address,
              TOKEN_ID,
              -1,
              ZERO_DESIREDNFTADDRESS,
              DESIREDNFTTOKENID
            )
          ).to.be.reverted
        })

        it("reverts if not approved", async function () {
          await basicNft.approve("0x0000000000000000000000000000000000000000", TOKEN_ID)
          await expect(
            nftMarketplace.listItem(
              basicNft.address,
              TOKEN_ID,
              PRICE,
              ZERO_DESIREDNFTADDRESS,
              DESIREDNFTTOKENID
            )
          ).to.be.revertedWith("NftMarketplace__NotApprovedForMarketplace")
        })

        it("creates the Listing", async function () {
          await nftMarketplace.listItem(
            basicNft.address,
            TOKEN_ID,
            PRICE,
            ZERO_DESIREDNFTADDRESS,
            DESIREDNFTTOKENID
          )
          let listing = await nftMarketplace.getListing(basicNftContract.address, TOKEN_ID)
          expect(listing.listingId.toString()).to.equal("1")
          expect(listing.price.toString()).to.equal(PRICE.toString())
          expect(listing.seller.toString()).to.equal(deployer.address.toString())
          expect(listing.desiredNftAddress.toString()).to.equal(ZERO_DESIREDNFTADDRESS.toString())
          expect(listing.desiredNftTokenId.toString()).to.equal(DESIREDNFTTOKENID.toString())
        })

        it("emits the ItemListed event", async function () {
          await expect(
            nftMarketplace.listItem(
              basicNft.address,
              TOKEN_ID,
              PRICE,
              ZERO_DESIREDNFTADDRESS,
              DESIREDNFTTOKENID
            )
          )
            .to.emit(nftMarketplace, "ItemListed")
            .withArgs(
              deployer.address,
              basicNft.address,
              TOKEN_ID,
              PRICE,
              "1",
              ZERO_DESIREDNFTADDRESS,
              DESIREDNFTTOKENID
            )
        })

        it("updates the listingId", async function () {
          await nftMarketplace.listItem(
            basicNft.address,
            TOKEN_ID,
            PRICE,
            ZERO_DESIREDNFTADDRESS,
            DESIREDNFTTOKENID
          )
          expect(await nftMarketplace.getNextListingId()).to.equal("1")
        })
      })

      describe("BuyItem for Eth", () => {
        it("reverts if not listed", async function () {
          await expect(
            nftMarketplace.buyItem(basicNft.address, TOKEN_ID, { value: PRICE })
          ).to.be.revertedWith("NftMarketplace__NotListed")
        })

        it("reverts if value is zero", async function () {
          await nftMarketplace.listItem(
            basicNft.address,
            TOKEN_ID,
            PRICE,
            ZERO_DESIREDNFTADDRESS,
            DESIREDNFTTOKENID
          )
          nftMarketplace = nftMarketplaceContract.connect(user)
          await expect(
            nftMarketplace.buyItem(basicNft.address, TOKEN_ID, { value: 0 })
          ).to.be.revertedWith("NftMarketplace__PriceNotMet")
        })

        it("reverts if value is too low", async function () {
          await nftMarketplace.listItem(
            basicNft.address,
            TOKEN_ID,
            PRICE,
            ZERO_DESIREDNFTADDRESS,
            DESIREDNFTTOKENID
          )
          nftMarketplace = nftMarketplaceContract.connect(user)
          await expect(
            nftMarketplace.buyItem(basicNft.address, TOKEN_ID, {
              value: ethers.utils.parseEther("0.09"),
            })
          ).to.be.revertedWith("NftMarketplace__PriceNotMet")
        })

        it("emits the correct event", async function () {
          await nftMarketplace.listItem(
            basicNft.address,
            TOKEN_ID,
            PRICE,
            ZERO_DESIREDNFTADDRESS,
            DESIREDNFTTOKENID
          )
          nftMarketplace = nftMarketplaceContract.connect(user)
          await expect(nftMarketplace.buyItem(basicNft.address, TOKEN_ID, { value: PRICE }))
            .to.emit(nftMarketplace, "ItemBought")
            .withArgs(
              user.address,
              basicNft.address,
              TOKEN_ID,
              PRICE,
              "1",
              ZERO_DESIREDNFTADDRESS,
              DESIREDNFTTOKENID
            )
        })

        it("also works if price is too high", async function () {
          await nftMarketplace.listItem(
            basicNft.address,
            TOKEN_ID,
            PRICE,
            ZERO_DESIREDNFTADDRESS,
            DESIREDNFTTOKENID
          )
          nftMarketplace = nftMarketplaceContract.connect(user)
          await expect(
            nftMarketplace.buyItem(basicNft.address, TOKEN_ID, {
              value: ethers.utils.parseEther("0.11"),
            })
          )
            .to.emit(nftMarketplace, "ItemBought")
            .withArgs(
              user.address,
              basicNft.address,
              TOKEN_ID,
              PRICE,
              "1",
              ZERO_DESIREDNFTADDRESS,
              DESIREDNFTTOKENID
            )
        })

        it("adds the amount to the proceeds mapping", async function () {
          await nftMarketplace.listItem(
            basicNft.address,
            TOKEN_ID,
            PRICE,
            ZERO_DESIREDNFTADDRESS,
            DESIREDNFTTOKENID
          )
          nftMarketplace = nftMarketplaceContract.connect(user)
          await nftMarketplace.buyItem(basicNft.address, TOKEN_ID, { value: PRICE })
          expect(await nftMarketplace.getProceeds(deployer.address)).to.equal(PRICE)
        })

        it("deletes the s_listing mapping", async function () {
          await nftMarketplace.listItem(
            basicNft.address,
            TOKEN_ID,
            PRICE,
            ZERO_DESIREDNFTADDRESS,
            DESIREDNFTTOKENID
          )
          nftMarketplace = nftMarketplaceContract.connect(user)
          await nftMarketplace.buyItem(basicNft.address, TOKEN_ID, { value: PRICE })
          nftMarketplace = nftMarketplaceContract.connect(deployer)
          let listing = await nftMarketplace.getListing(basicNftContract.address, TOKEN_ID)
          expect(listing.listingId.toString()).to.equal("0")
          expect(listing.price.toString()).to.equal("0")
          expect(listing.seller.toString()).to.equal("0x0000000000000000000000000000000000000000")
          expect(listing.desiredNftAddress.toString()).to.equal(
            "0x0000000000000000000000000000000000000000"
          )
          expect(listing.desiredNftTokenId.toString()).to.equal("0")
        })

        it("actually transfers the correct nft from the seller to the user ", async function () {
          await nftMarketplace.listItem(
            basicNft.address,
            TOKEN_ID,
            PRICE,
            ZERO_DESIREDNFTADDRESS,
            DESIREDNFTTOKENID
          )
          nftMarketplace = nftMarketplaceContract.connect(user)
          await nftMarketplace.buyItem(basicNft.address, TOKEN_ID, { value: PRICE })
          expect(await basicNft.ownerOf(TOKEN_ID)).to.equal(user.address)
        })

        it("transfers the ETH correctly", async function () {
          await nftMarketplace.listItem(
            basicNft.address,
            TOKEN_ID,
            PRICE,
            ZERO_DESIREDNFTADDRESS,
            DESIREDNFTTOKENID
          )
          nftMarketplace = nftMarketplaceContract.connect(user)

          const userStartingBalance = await user.getBalance()
          const nftMarketplaceStartingBalance = await nftMarketplace.getBalance()

          // this is calling the buyItem function, but also extracting the GasCosts, so that they can be considered when comapring the starting and ending balance.
          let buyItemGasCosts = null
          {
            const txRp = await nftMarketplace.buyItem(basicNft.address, TOKEN_ID, {
              value: PRICE,
            })
            const txRc = await txRp.wait(1)
            const { gasUsed, effectiveGasPrice } = txRc
            buyItemGasCosts = gasUsed.mul(effectiveGasPrice)
          }

          const userEndingBalance = await user.getBalance()
          const nftMarketplaceEndingBalance = await nftMarketplace.getBalance()

          expect(userStartingBalance.sub(PRICE).sub(buyItemGasCosts).toString()).to.equal(
            userEndingBalance.toString()
          )
          expect(nftMarketplaceStartingBalance.add(PRICE).toString()).to.equal(
            nftMarketplaceEndingBalance.toString()
          )
        })
      })

      describe("updateListing for Eth", () => {
        it("reverts if not listed", async function () {
          await expect(
            nftMarketplace.updateListing(
              basicNft.address,
              TOKEN_ID,
              NEW_PRICE,
              ZERO_DESIREDNFTADDRESS,
              DESIREDNFTTOKENID
            )
          ).to.be.revertedWith("NftMarketplace__NotListed")
        })

        it("reverts if not Owner", async function () {
          await nftMarketplace.listItem(
            basicNft.address,
            TOKEN_ID,
            PRICE,
            ZERO_DESIREDNFTADDRESS,
            DESIREDNFTTOKENID
          )
          nftMarketplace = nftMarketplaceContract.connect(user)
          await expect(
            nftMarketplace.updateListing(
              basicNft.address,
              TOKEN_ID,
              NEW_PRICE,
              ZERO_DESIREDNFTADDRESS,
              DESIREDNFTTOKENID
            )
          ).to.be.revertedWith("NftMarketplace__NotOwner")
        })

        it("reverts if updated price AND desiredNftAddress is zero", async function () {
          await nftMarketplace.listItem(
            basicNft.address,
            TOKEN_ID,
            PRICE,
            ZERO_DESIREDNFTADDRESS,
            DESIREDNFTTOKENID
          )
          await expect(
            nftMarketplace.updateListing(
              basicNft.address,
              TOKEN_ID,
              0,
              ZERO_DESIREDNFTADDRESS,
              DESIREDNFTTOKENID
            )
          ).to.be.revertedWith("NftMarketplace__PriceMustBeAboveZeroOrNoDesiredNftGiven")
        })

        it("reverts if not approved", async function () {
          await nftMarketplace.listItem(
            basicNft.address,
            TOKEN_ID,
            PRICE,
            ZERO_DESIREDNFTADDRESS,
            DESIREDNFTTOKENID
          )
          await basicNft.approve("0x0000000000000000000000000000000000000000", TOKEN_ID)
          await expect(
            nftMarketplace.updateListing(
              basicNft.address,
              TOKEN_ID,
              NEW_PRICE,
              ZERO_DESIREDNFTADDRESS,
              DESIREDNFTTOKENID
            )
          ).to.be.revertedWith("NftMarketplace__NotApprovedForMarketplace")
        })

        it("updates the Listing", async function () {
          await nftMarketplace.listItem(
            basicNft.address,
            TOKEN_ID,
            PRICE,
            ZERO_DESIREDNFTADDRESS,
            DESIREDNFTTOKENID
          )
          let listing = await nftMarketplace.getListing(basicNftContract.address, TOKEN_ID)
          expect(listing.listingId.toString()).to.equal("1")
          expect(listing.price.toString()).to.equal(PRICE.toString())
          expect(listing.seller.toString()).to.equal(deployer.address.toString())
          await nftMarketplace.updateListing(
            basicNft.address,
            TOKEN_ID,
            NEW_PRICE,
            ZERO_DESIREDNFTADDRESS,
            DESIREDNFTTOKENID
          )
          listing = await nftMarketplace.getListing(basicNftContract.address, TOKEN_ID)
          expect(listing.listingId.toString()).to.equal("1")
          expect(listing.price.toString()).to.equal(NEW_PRICE.toString())
          expect(listing.seller.toString()).to.equal(deployer.address.toString())
          expect(listing.desiredNftAddress.toString()).to.equal(ZERO_DESIREDNFTADDRESS.toString())
          expect(listing.desiredNftTokenId.toString()).to.equal(DESIREDNFTTOKENID.toString())
        })

        it("emits the correct event", async function () {
          await nftMarketplace.listItem(
            basicNft.address,
            TOKEN_ID,
            PRICE,
            ZERO_DESIREDNFTADDRESS,
            DESIREDNFTTOKENID
          )
          await expect(
            nftMarketplace.updateListing(
              basicNft.address,
              TOKEN_ID,
              NEW_PRICE,
              ZERO_DESIREDNFTADDRESS,
              DESIREDNFTTOKENID
            )
          )
            .to.emit(nftMarketplace, "ItemUpdated")
            .withArgs(
              deployer.address,
              basicNft.address,
              TOKEN_ID,
              NEW_PRICE,
              "1",
              ZERO_DESIREDNFTADDRESS,
              DESIREDNFTTOKENID
            )
        })
      })
      describe("withdrawProceeds for Eth", () => {
        it("transfers the ETH correctly", async function () {
          await nftMarketplace.listItem(
            basicNft.address,
            TOKEN_ID,
            PRICE,
            ZERO_DESIREDNFTADDRESS,
            DESIREDNFTTOKENID
          )
          nftMarketplace = nftMarketplaceContract.connect(user)

          const deployerStartingBalance = await deployer.getBalance()
          const userStartingBalance = await user.getBalance()

          let buyItemGasCosts = null
          {
            const txRp = await nftMarketplace.buyItem(basicNft.address, TOKEN_ID, {
              value: PRICE,
            })
            const txRc = await txRp.wait(1)
            const { gasUsed, effectiveGasPrice } = txRc
            buyItemGasCosts = gasUsed.mul(effectiveGasPrice)
          }

          const userEndingBalance = await user.getBalance()
          const nftMarketplaceStartingBalance = await nftMarketplace.getBalance()

          nftMarketplace = nftMarketplaceContract.connect(deployer)

          let withdrawProceedsGasCosts = null
          {
            const txRp = await nftMarketplace.withdrawProceeds()
            const txRc = await txRp.wait(1)
            const { gasUsed, effectiveGasPrice } = txRc
            withdrawProceedsGasCosts = gasUsed.mul(effectiveGasPrice)
          }

          const deployerEndingBalance = await deployer.getBalance()
          const nftMarketplaceEndingBalance = await nftMarketplace.getBalance()

          expect(
            deployerStartingBalance.add(PRICE).sub(withdrawProceedsGasCosts).toString()
          ).to.equal(deployerEndingBalance.toString())

          expect(userStartingBalance.sub(PRICE).sub(buyItemGasCosts).toString()).to.equal(
            userEndingBalance.toString()
          )
          expect(nftMarketplaceStartingBalance.sub(PRICE).toString()).to.equal(
            nftMarketplaceEndingBalance.toString()
          )
        })

        it("reverts when no Proceeds", async function () {
          await nftMarketplace.listItem(
            basicNft.address,
            TOKEN_ID,
            PRICE,
            ZERO_DESIREDNFTADDRESS,
            DESIREDNFTTOKENID
          )
          nftMarketplace = nftMarketplaceContract.connect(user)
          await nftMarketplace.buyItem(basicNft.address, TOKEN_ID, { value: PRICE })
          nftMarketplace = nftMarketplaceContract.connect(deployer)
          await nftMarketplace.withdrawProceeds()
          await expect(nftMarketplace.withdrawProceeds()).to.be.revertedWith(
            "NftMarketplace__NoProceeds"
          )
        })

        it("resets the s_proceeds mapping", async function () {
          await nftMarketplace.listItem(
            basicNft.address,
            TOKEN_ID,
            PRICE,
            ZERO_DESIREDNFTADDRESS,
            DESIREDNFTTOKENID
          )
          nftMarketplace = nftMarketplaceContract.connect(user)
          await nftMarketplace.buyItem(basicNft.address, TOKEN_ID, { value: PRICE })
          nftMarketplace = nftMarketplaceContract.connect(deployer)
          await nftMarketplace.withdrawProceeds()
          expect(await nftMarketplace.getProceeds(deployer.address)).to.equal("0")
        })
      })

      describe("listItem for Nft", () => {
        beforeEach(async () => {
          otherUser = accounts[2]
          basicNft = basicNftContract.connect(otherUser)
          await basicNft.mintNft()
          await basicNft.approve(nftMarketplaceContract.address, NEXTTOKEN_ID)
          basicNft = basicNftContract.connect(deployer)
          DESIREDNFTADDRESS = basicNft.address
        })

        it("reverts if already listed from same user", async function () {
          await nftMarketplace.listItem(
            basicNft.address,
            TOKEN_ID,
            ZERO_PRICE,
            DESIREDNFTADDRESS,
            DESIREDNFTTOKENID
          )
          await expect(
            nftMarketplace.listItem(
              basicNft.address,
              TOKEN_ID,
              ZERO_PRICE,
              DESIREDNFTADDRESS,
              DESIREDNFTTOKENID
            )
          ).to.be.revertedWith("NftMarketplace__AlreadyListed")
        })

        it("reverts if already listed from different user", async function () {
          // !!!W This should actually work, since the person who owns the nft since it got sold is in charge. So once they try to make a new listing it should delete the old one and create a new one. // !!!W in general the marketplace should be able to keep track if the approvals have been revoked (which also happens if the nft gets transfered manually). that could be possible by letting the graph track each listed nfts conract events and once a new approval or transfer gets emitted it could delete this item from the active listings table. it is still in the listings array/mapping of the nftmarketplace.sol tho...
          await nftMarketplace.listItem(
            basicNft.address,
            TOKEN_ID,
            ZERO_PRICE,
            DESIREDNFTADDRESS,
            DESIREDNFTTOKENID
          )
          await expect(basicNft.transferFrom(deployer.address, user.address, TOKEN_ID))
            .to.emit(basicNft, "Transfer")
            .withArgs(deployer.address, user.address, TOKEN_ID)
          nftMarketplace = nftMarketplaceContract.connect(user)
          await expect(
            nftMarketplace.listItem(
              basicNft.address,
              TOKEN_ID,
              ZERO_PRICE,
              DESIREDNFTADDRESS,
              DESIREDNFTTOKENID
            )
          ).to.be.revertedWith("NftMarketplace__AlreadyListed")
        })

        it("reverts if not Owner", async function () {
          nftMarketplace = await nftMarketplaceContract.connect(user)
          await expect(
            nftMarketplace.listItem(
              basicNft.address,
              TOKEN_ID,
              ZERO_PRICE,
              DESIREDNFTADDRESS,
              DESIREDNFTTOKENID
            )
          ).to.be.revertedWith("NftMarketplace__NotOwner")
        })

        it("reverts if price AND desiredNftAddress is zero", async function () {
          await expect(
            nftMarketplace.listItem(
              basicNft.address,
              TOKEN_ID,
              ZERO_PRICE,
              ZERO_DESIREDNFTADDRESS,
              DESIREDNFTTOKENID
            )
          ).to.be.revertedWith("NftMarketplace__PriceMustBeAboveZeroOrNoDesiredNftGiven")
        })

        it("reverts if price < 0", async function () {
          await expect(
            nftMarketplace.listItem(
              basicNft.address,
              TOKEN_ID,
              -1,
              DESIREDNFTADDRESS,
              DESIREDNFTTOKENID
            )
          ).to.be.reverted
        })

        it("reverts if not approved", async function () {
          await basicNft.approve("0x0000000000000000000000000000000000000000", TOKEN_ID)
          await expect(
            nftMarketplace.listItem(
              basicNft.address,
              TOKEN_ID,
              ZERO_PRICE,
              DESIREDNFTADDRESS,
              DESIREDNFTTOKENID
            )
          ).to.be.revertedWith("NftMarketplace__NotApprovedForMarketplace")
        })

        it("creates the Listing", async function () {
          await nftMarketplace.listItem(
            basicNft.address,
            TOKEN_ID,
            ZERO_PRICE,
            DESIREDNFTADDRESS,
            DESIREDNFTTOKENID
          )
          let listing = await nftMarketplace.getListing(basicNftContract.address, TOKEN_ID)
          expect(listing.listingId.toString()).to.equal("1")
          expect(listing.price.toString()).to.equal(ZERO_PRICE.toString())
          expect(listing.seller.toString()).to.equal(deployer.address.toString())
          expect(listing.desiredNftAddress.toString()).to.equal(DESIREDNFTADDRESS.toString())
          expect(listing.desiredNftTokenId.toString()).to.equal(DESIREDNFTTOKENID.toString())
        })

        it("emits the ItemListed event", async function () {
          await expect(
            nftMarketplace.listItem(
              basicNft.address,
              TOKEN_ID,
              ZERO_PRICE,
              DESIREDNFTADDRESS,
              DESIREDNFTTOKENID
            )
          )
            .to.emit(nftMarketplace, "ItemListed")
            .withArgs(
              deployer.address,
              basicNft.address,
              TOKEN_ID,
              ZERO_PRICE,
              "1",
              DESIREDNFTADDRESS,
              DESIREDNFTTOKENID
            )
        })

        it("updates the listingId", async function () {
          await nftMarketplace.listItem(
            basicNft.address,
            TOKEN_ID,
            ZERO_PRICE,
            DESIREDNFTADDRESS,
            DESIREDNFTTOKENID
          )
          expect(await nftMarketplace.getNextListingId()).to.equal("1")
        })
      })

      describe("BuyItem for Nft", () => {
        beforeEach(async () => {
          otherUser = accounts[2]
          basicNft = basicNftContract.connect(otherUser)
          await basicNft.mintNft()
          await basicNft.approve(nftMarketplaceContract.address, NEXTTOKEN_ID)
          basicNft = basicNftContract.connect(deployer)
          DESIREDNFTADDRESS = basicNft.address
        })

        it("reverts if not listed", async function () {
          await expect(nftMarketplace.buyItem(basicNft.address, TOKEN_ID)).to.be.revertedWith(
            "NftMarketplace__NotListed"
          )
        })

        it("reverts if buyer doesnt own desired NFT", async function () {
          anotherUser = accounts[3]
          await nftMarketplace.listItem(
            basicNft.address,
            TOKEN_ID,
            ZERO_PRICE,
            DESIREDNFTADDRESS,
            DESIREDNFTTOKENID
          )
          nftMarketplace = nftMarketplaceContract.connect(anotherUser) // otherUser is the one owning the desiredNft.
          await expect(nftMarketplace.buyItem(basicNft.address, TOKEN_ID)).to.be.revertedWith(
            "You don't own the desired NFT for swap"
          )
        })

        it("reverts if buyer doesnt own desiredNFTTokenId", async function () {
          await nftMarketplace.listItem(
            basicNft.address,
            TOKEN_ID,
            ZERO_PRICE,
            DESIREDNFTADDRESS,
            DESIREDNFTTOKENID
          )
          nftMarketplace = nftMarketplaceContract.connect(user) // otherUser is the one owning the desiredNft.
          await expect(nftMarketplace.buyItem(basicNft.address, TOKEN_ID)).to.be.revertedWith(
            "You don't own the desired NFT for swap"
          )
        })

        it("emits the correct event", async function () {
          await nftMarketplace.listItem(
            basicNft.address,
            TOKEN_ID,
            ZERO_PRICE,
            DESIREDNFTADDRESS,
            DESIREDNFTTOKENID
          )
          nftMarketplace = nftMarketplaceContract.connect(otherUser)
          await expect(nftMarketplace.buyItem(basicNft.address, TOKEN_ID))
            .to.emit(nftMarketplace, "ItemBought")
            .withArgs(
              otherUser.address,
              basicNft.address,
              TOKEN_ID,
              ZERO_PRICE,
              "1",
              DESIREDNFTADDRESS,
              DESIREDNFTTOKENID
            )
        })

        it("also works if price is too high", async function () {
          // I actually want the nftMarketplace contract to deduct the amount that has been sent too much from what the seller gets in the proceeds to get into the buyers proceeds, so that the buyer can get them back.
          await nftMarketplace.listItem(
            basicNft.address,
            TOKEN_ID,
            ZERO_PRICE,
            DESIREDNFTADDRESS,
            DESIREDNFTTOKENID
          )
          nftMarketplace = nftMarketplaceContract.connect(otherUser)
          await expect(
            nftMarketplace.buyItem(basicNft.address, TOKEN_ID, {
              value: ethers.utils.parseEther("0.11"),
            })
          )
            .to.emit(nftMarketplace, "ItemBought")
            .withArgs(
              otherUser.address,
              basicNft.address,
              TOKEN_ID,
              ZERO_PRICE,
              "1",
              DESIREDNFTADDRESS,
              DESIREDNFTTOKENID
            )
        })

        it("transfers the desiredNft to the seller", async function () {
          await nftMarketplace.listItem(
            basicNft.address,
            TOKEN_ID,
            ZERO_PRICE,
            DESIREDNFTADDRESS,
            DESIREDNFTTOKENID
          )
          nftMarketplace = nftMarketplaceContract.connect(otherUser)
          await nftMarketplace.buyItem(basicNft.address, TOKEN_ID)
          expect(await basicNft.ownerOf(DESIREDNFTTOKENID)).to.equal(deployer.address)
        })

        it("deletes the s_listing mapping", async function () {
          await nftMarketplace.listItem(
            basicNft.address,
            TOKEN_ID,
            ZERO_PRICE,
            DESIREDNFTADDRESS,
            DESIREDNFTTOKENID
          )
          nftMarketplace = nftMarketplaceContract.connect(otherUser)
          await nftMarketplace.buyItem(basicNft.address, TOKEN_ID)
          nftMarketplace = nftMarketplaceContract.connect(deployer)
          let listing = await nftMarketplace.getListing(basicNftContract.address, TOKEN_ID)
          expect(listing.listingId.toString()).to.equal("0")
          expect(listing.price.toString()).to.equal("0")
          expect(listing.seller.toString()).to.equal("0x0000000000000000000000000000000000000000")
          expect(listing.desiredNftAddress.toString()).to.equal(
            "0x0000000000000000000000000000000000000000"
          )
          expect(listing.desiredNftTokenId.toString()).to.equal("0")
        })

        it("actually transfers the correct nft from the seller to the user ", async function () {
          await nftMarketplace.listItem(
            basicNft.address,
            TOKEN_ID,
            ZERO_PRICE,
            DESIREDNFTADDRESS,
            DESIREDNFTTOKENID
          )
          nftMarketplace = nftMarketplaceContract.connect(otherUser)
          await nftMarketplace.buyItem(basicNft.address, TOKEN_ID)
          expect(await basicNft.ownerOf(TOKEN_ID)).to.equal(otherUser.address)
        })
      })

      // !!!W To test the updateListing I need to have deployed a new NFT Smart contract!
      // describe("updateListing for Nft", () => {
      //   it("reverts if not listed", async function () {
      //     await expect(
      //       nftMarketplace.updateListing(
      //         basicNft.address,
      //         TOKEN_ID,
      //         ZERO_PRICE,
      //         NEW_DESIREDNFTADDRESS,
      //         NEW_DESIREDNFTTOKENID
      //       )
      //     ).to.be.revertedWith("NftMarketplace__NotListed")
      //   })

      //   it("reverts if not Owner", async function () {
      //     await nftMarketplace.listItem(
      //       basicNft.address,
      //       TOKEN_ID,
      //       PRICE,
      //       ZERO_DESIREDNFTADDRESS,
      //       DESIREDNFTTOKENID
      //     )
      //     nftMarketplace = nftMarketplaceContract.connect(user)
      //     await expect(
      //       nftMarketplace.updateListing(
      //         basicNft.address,
      //         TOKEN_ID,
      //         NEW_PRICE,
      //         ZERO_DESIREDNFTADDRESS,
      //         DESIREDNFTTOKENID
      //       )
      //     ).to.be.revertedWith("NftMarketplace__NotOwner")
      //   })

      //   it("reverts if updated price AND desiredNftAddress is zero", async function () {
      //     await nftMarketplace.listItem(
      //       basicNft.address,
      //       TOKEN_ID,
      //       PRICE,
      //       ZERO_DESIREDNFTADDRESS,
      //       DESIREDNFTTOKENID
      //     )
      //     await expect(
      //       nftMarketplace.updateListing(
      //         basicNft.address,
      //         TOKEN_ID,
      //         0,
      //         ZERO_DESIREDNFTADDRESS,
      //         DESIREDNFTTOKENID
      //       )
      //     ).to.be.revertedWith("NftMarketplace__PriceMustBeAboveZeroOrNoDesiredNftGiven")
      //   })

      //   it("reverts if not approved", async function () {
      //     await nftMarketplace.listItem(
      //       basicNft.address,
      //       TOKEN_ID,
      //       PRICE,
      //       ZERO_DESIREDNFTADDRESS,
      //       DESIREDNFTTOKENID
      //     )
      //     await basicNft.approve("0x0000000000000000000000000000000000000000", TOKEN_ID)
      //     await expect(
      //       nftMarketplace.updateListing(
      //         basicNft.address,
      //         TOKEN_ID,
      //         NEW_PRICE,
      //         ZERO_DESIREDNFTADDRESS,
      //         DESIREDNFTTOKENID
      //       )
      //     ).to.be.revertedWith("NftMarketplace__NotApprovedForMarketplace")
      //   })

      //   it("updates the Listing", async function () {
      //     await nftMarketplace.listItem(
      //       basicNft.address,
      //       TOKEN_ID,
      //       PRICE,
      //       ZERO_DESIREDNFTADDRESS,
      //       DESIREDNFTTOKENID
      //     )
      //     let listing = await nftMarketplace.getListing(basicNftContract.address, TOKEN_ID)
      //     expect(listing.listingId.toString()).to.equal("1")
      //     expect(listing.price.toString()).to.equal(PRICE.toString())
      //     expect(listing.seller.toString()).to.equal(deployer.address.toString())
      //     await nftMarketplace.updateListing(
      //       basicNft.address,
      //       TOKEN_ID,
      //       NEW_PRICE,
      //       ZERO_DESIREDNFTADDRESS,
      //       DESIREDNFTTOKENID
      //     )
      //     listing = await nftMarketplace.getListing(basicNftContract.address, TOKEN_ID)
      //     expect(listing.listingId.toString()).to.equal("1")
      //     expect(listing.price.toString()).to.equal(NEW_PRICE.toString())
      //     expect(listing.seller.toString()).to.equal(deployer.address.toString())
      //     expect(listing.desiredNftAddress.toString()).to.equal(ZERO_DESIREDNFTADDRESS.toString())
      //     expect(listing.desiredNftTokenId.toString()).to.equal(DESIREDNFTTOKENID.toString())
      //   })

      //   it("emits the correct event", async function () {
      //     await nftMarketplace.listItem(
      //       basicNft.address,
      //       TOKEN_ID,
      //       PRICE,
      //       ZERO_DESIREDNFTADDRESS,
      //       DESIREDNFTTOKENID
      //     )
      //     await expect(
      //       nftMarketplace.updateListing(
      //         basicNft.address,
      //         TOKEN_ID,
      //         NEW_PRICE,
      //         ZERO_DESIREDNFTADDRESS,
      //         DESIREDNFTTOKENID
      //       )
      //     )
      //       .to.emit(nftMarketplace, "ItemUpdated")
      //       .withArgs(
      //         deployer.address,
      //         basicNft.address,
      //         TOKEN_ID,
      //         NEW_PRICE,
      //         "1",
      //         ZERO_DESIREDNFTADDRESS,
      //         DESIREDNFTTOKENID
      //       )
      //   })
      // })

      describe("listItem for Eth AND NFT", () => {
        beforeEach(async () => {
          otherUser = accounts[2]
          basicNft = basicNftContract.connect(otherUser)
          await basicNft.mintNft()
          await basicNft.approve(nftMarketplaceContract.address, NEXTTOKEN_ID)
          basicNft = basicNftContract.connect(deployer)
          DESIREDNFTADDRESS = basicNft.address
        })

        it("reverts if already listed from same user", async function () {
          await nftMarketplace.listItem(
            basicNft.address,
            TOKEN_ID,
            PRICE,
            DESIREDNFTADDRESS,
            DESIREDNFTTOKENID
          )
          await expect(
            nftMarketplace.listItem(
              basicNft.address,
              TOKEN_ID,
              PRICE,
              DESIREDNFTADDRESS,
              DESIREDNFTTOKENID
            )
          ).to.be.revertedWith("NftMarketplace__AlreadyListed")
        })

        it("reverts if already listed from different user", async function () {
          await nftMarketplace.listItem(
            basicNft.address,
            TOKEN_ID,
            PRICE,
            DESIREDNFTADDRESS,
            DESIREDNFTTOKENID
          )
          await expect(basicNft.transferFrom(deployer.address, user.address, TOKEN_ID))
            .to.emit(basicNft, "Transfer")
            .withArgs(deployer.address, user.address, TOKEN_ID)
          nftMarketplace = nftMarketplaceContract.connect(user)
          await expect(
            nftMarketplace.listItem(
              basicNft.address,
              TOKEN_ID,
              PRICE,
              DESIREDNFTADDRESS,
              DESIREDNFTTOKENID
            )
          ).to.be.revertedWith("NftMarketplace__AlreadyListed")
        })

        it("reverts if not Owner", async function () {
          nftMarketplace = await nftMarketplaceContract.connect(user)
          await expect(
            nftMarketplace.listItem(
              basicNft.address,
              TOKEN_ID,
              PRICE,
              DESIREDNFTADDRESS,
              DESIREDNFTTOKENID
            )
          ).to.be.revertedWith("NftMarketplace__NotOwner")
        })

        it("reverts if not approved", async function () {
          await basicNft.approve("0x0000000000000000000000000000000000000000", TOKEN_ID)
          await expect(
            nftMarketplace.listItem(
              basicNft.address,
              TOKEN_ID,
              PRICE,
              DESIREDNFTADDRESS,
              DESIREDNFTTOKENID
            )
          ).to.be.revertedWith("NftMarketplace__NotApprovedForMarketplace")
        })

        it("creates the Listing", async function () {
          await nftMarketplace.listItem(
            basicNft.address,
            TOKEN_ID,
            PRICE,
            DESIREDNFTADDRESS,
            DESIREDNFTTOKENID
          )
          let listing = await nftMarketplace.getListing(basicNftContract.address, TOKEN_ID)
          expect(listing.listingId.toString()).to.equal("1")
          expect(listing.price.toString()).to.equal(PRICE.toString())
          expect(listing.seller.toString()).to.equal(deployer.address.toString())
          expect(listing.desiredNftAddress.toString()).to.equal(DESIREDNFTADDRESS.toString())
          expect(listing.desiredNftTokenId.toString()).to.equal(DESIREDNFTTOKENID.toString())
        })

        it("emits the ItemListed event", async function () {
          await expect(
            nftMarketplace.listItem(
              basicNft.address,
              TOKEN_ID,
              PRICE,
              DESIREDNFTADDRESS,
              DESIREDNFTTOKENID
            )
          )
            .to.emit(nftMarketplace, "ItemListed")
            .withArgs(
              deployer.address,
              basicNft.address,
              TOKEN_ID,
              PRICE,
              "1",
              DESIREDNFTADDRESS,
              DESIREDNFTTOKENID
            )
        })

        it("updates the listingId", async function () {
          await nftMarketplace.listItem(
            basicNft.address,
            TOKEN_ID,
            PRICE,
            DESIREDNFTADDRESS,
            DESIREDNFTTOKENID
          )
          expect(await nftMarketplace.getNextListingId()).to.equal("1")
        })
      })

      describe("BuyItem for Eth AND NFT", () => {
        beforeEach(async () => {
          otherUser = accounts[2]
          basicNft = basicNftContract.connect(otherUser)
          await basicNft.mintNft()
          await basicNft.approve(nftMarketplaceContract.address, NEXTTOKEN_ID)
          basicNft = basicNftContract.connect(deployer)
          DESIREDNFTADDRESS = basicNft.address
        })

        it("reverts if not listed", async function () {
          await expect(
            nftMarketplace.buyItem(basicNft.address, TOKEN_ID, { value: PRICE })
          ).to.be.revertedWith("NftMarketplace__NotListed")
        })

        it("reverts if value is zero", async function () {
          await nftMarketplace.listItem(
            basicNft.address,
            TOKEN_ID,
            PRICE,
            DESIREDNFTADDRESS,
            DESIREDNFTTOKENID
          )
          nftMarketplace = nftMarketplaceContract.connect(otherUser)
          await expect(
            nftMarketplace.buyItem(basicNft.address, TOKEN_ID, { value: 0 })
          ).to.be.revertedWith("NftMarketplace__PriceNotMet")
        })

        it("reverts if value is too low", async function () {
          await nftMarketplace.listItem(
            basicNft.address,
            TOKEN_ID,
            PRICE,
            DESIREDNFTADDRESS,
            DESIREDNFTTOKENID
          )
          nftMarketplace = nftMarketplaceContract.connect(otherUser)
          await expect(
            nftMarketplace.buyItem(basicNft.address, TOKEN_ID, {
              value: ethers.utils.parseEther("0.09"),
            })
          ).to.be.revertedWith("NftMarketplace__PriceNotMet")
        })
        it("reverts if buyer doesnt own desired NFT", async function () {
          anotherUser = accounts[3]
          await nftMarketplace.listItem(
            basicNft.address,
            TOKEN_ID,
            PRICE,
            DESIREDNFTADDRESS,
            DESIREDNFTTOKENID
          )
          nftMarketplace = nftMarketplaceContract.connect(anotherUser) // otherUser is the one owning the desiredNft.
          await expect(
            nftMarketplace.buyItem(basicNft.address, TOKEN_ID, { value: PRICE })
          ).to.be.revertedWith("You don't own the desired NFT for swap")
        })

        it("reverts if buyer doesnt own desiredNFTTokenId", async function () {
          await nftMarketplace.listItem(
            basicNft.address,
            TOKEN_ID,
            PRICE,
            DESIREDNFTADDRESS,
            DESIREDNFTTOKENID
          )
          nftMarketplace = nftMarketplaceContract.connect(user) // otherUser is the one owning the desiredNft.
          await expect(
            nftMarketplace.buyItem(basicNft.address, TOKEN_ID, { value: PRICE })
          ).to.be.revertedWith("You don't own the desired NFT for swap")
        })

        it("emits the correct event", async function () {
          await nftMarketplace.listItem(
            basicNft.address,
            TOKEN_ID,
            PRICE,
            DESIREDNFTADDRESS,
            DESIREDNFTTOKENID
          )
          nftMarketplace = nftMarketplaceContract.connect(otherUser)
          await expect(nftMarketplace.buyItem(basicNft.address, TOKEN_ID, { value: PRICE }))
            .to.emit(nftMarketplace, "ItemBought")
            .withArgs(
              otherUser.address,
              basicNft.address,
              TOKEN_ID,
              PRICE,
              "1",
              DESIREDNFTADDRESS,
              DESIREDNFTTOKENID
            )
        })

        it("also works if price is too high", async function () {
          await nftMarketplace.listItem(
            basicNft.address,
            TOKEN_ID,
            PRICE,
            DESIREDNFTADDRESS,
            DESIREDNFTTOKENID
          )
          nftMarketplace = nftMarketplaceContract.connect(otherUser)
          await expect(
            nftMarketplace.buyItem(basicNft.address, TOKEN_ID, {
              value: ethers.utils.parseEther("0.11"),
            })
          )
            .to.emit(nftMarketplace, "ItemBought")
            .withArgs(
              otherUser.address,
              basicNft.address,
              TOKEN_ID,
              PRICE,
              "1",
              DESIREDNFTADDRESS,
              DESIREDNFTTOKENID
            )
        })

        it("adds the amount to the proceeds mapping", async function () {
          await nftMarketplace.listItem(
            basicNft.address,
            TOKEN_ID,
            PRICE,
            DESIREDNFTADDRESS,
            DESIREDNFTTOKENID
          )
          nftMarketplace = nftMarketplaceContract.connect(otherUser)
          await nftMarketplace.buyItem(basicNft.address, TOKEN_ID, { value: PRICE })
          expect(await nftMarketplace.getProceeds(deployer.address)).to.equal(PRICE)
        })

        it("transfers the desiredNft to the seller", async function () {
          await nftMarketplace.listItem(
            basicNft.address,
            TOKEN_ID,
            PRICE,
            DESIREDNFTADDRESS,
            DESIREDNFTTOKENID
          )
          nftMarketplace = nftMarketplaceContract.connect(otherUser)
          await nftMarketplace.buyItem(basicNft.address, TOKEN_ID, { value: PRICE })
          expect(await basicNft.ownerOf(DESIREDNFTTOKENID)).to.equal(deployer.address)
        })

        it("deletes the s_listing mapping", async function () {
          await nftMarketplace.listItem(
            basicNft.address,
            TOKEN_ID,
            PRICE,
            DESIREDNFTADDRESS,
            DESIREDNFTTOKENID
          )
          nftMarketplace = nftMarketplaceContract.connect(otherUser)
          await nftMarketplace.buyItem(basicNft.address, TOKEN_ID, { value: PRICE })
          nftMarketplace = nftMarketplaceContract.connect(deployer)
          let listing = await nftMarketplace.getListing(basicNftContract.address, TOKEN_ID)
          expect(listing.listingId.toString()).to.equal("0")
          expect(listing.price.toString()).to.equal("0")
          expect(listing.seller.toString()).to.equal("0x0000000000000000000000000000000000000000")
          expect(listing.desiredNftAddress.toString()).to.equal(
            "0x0000000000000000000000000000000000000000"
          )
          expect(listing.desiredNftTokenId.toString()).to.equal("0")
        })

        it("actually transfers the correct nft from the seller to the user ", async function () {
          await nftMarketplace.listItem(
            basicNft.address,
            TOKEN_ID,
            PRICE,
            DESIREDNFTADDRESS,
            DESIREDNFTTOKENID
          )
          nftMarketplace = nftMarketplaceContract.connect(otherUser)
          await nftMarketplace.buyItem(basicNft.address, TOKEN_ID, { value: PRICE })
          expect(await basicNft.ownerOf(TOKEN_ID)).to.equal(otherUser.address)
        })

        it("transfers the ETH correctly", async function () {
          await nftMarketplace.listItem(
            basicNft.address,
            TOKEN_ID,
            PRICE,
            DESIREDNFTADDRESS,
            DESIREDNFTTOKENID
          )
          nftMarketplace = nftMarketplaceContract.connect(otherUser)

          const otherUserStartingBalance = await otherUser.getBalance()
          const nftMarketplaceStartingBalance = await nftMarketplace.getBalance()

          // this is calling the buyItem function, but also extracting the GasCosts, so that they can be considered when comapring the starting and ending balance.
          let buyItemGasCosts = null
          {
            const txRp = await nftMarketplace.buyItem(basicNft.address, TOKEN_ID, {
              value: PRICE,
            })
            const txRc = await txRp.wait(1)
            const { gasUsed, effectiveGasPrice } = txRc
            buyItemGasCosts = gasUsed.mul(effectiveGasPrice)
          }

          const otherUserEndingBalance = await otherUser.getBalance()
          const nftMarketplaceEndingBalance = await nftMarketplace.getBalance()

          expect(otherUserStartingBalance.sub(PRICE).sub(buyItemGasCosts).toString()).to.equal(
            otherUserEndingBalance.toString()
          )
          expect(nftMarketplaceStartingBalance.add(PRICE).toString()).to.equal(
            nftMarketplaceEndingBalance.toString()
          )
        })
      })

      // !!!W To test the updateListing I need to have deployed a new NFT Smart contract!
      // describe("updateListing for Nft AND Eth", () => { // !!!W try if i can update an for eth or nft only to eth AND nft
      //   it("reverts if not listed", async function () {
      //     await expect(
      //       nftMarketplace.updateListing(
      //         basicNft.address,
      //         TOKEN_ID,
      //         ZERO_PRICE,
      //         NEW_DESIREDNFTADDRESS,
      //         NEW_DESIREDNFTTOKENID
      //       )
      //     ).to.be.revertedWith("NftMarketplace__NotListed")
      //   })

      //   it("reverts if not Owner", async function () {
      //     await nftMarketplace.listItem(
      //       basicNft.address,
      //       TOKEN_ID,
      //       PRICE,
      //       ZERO_DESIREDNFTADDRESS,
      //       DESIREDNFTTOKENID
      //     )
      //     nftMarketplace = nftMarketplaceContract.connect(user)
      //     await expect(
      //       nftMarketplace.updateListing(
      //         basicNft.address,
      //         TOKEN_ID,
      //         NEW_PRICE,
      //         ZERO_DESIREDNFTADDRESS,
      //         DESIREDNFTTOKENID
      //       )
      //     ).to.be.revertedWith("NftMarketplace__NotOwner")
      //   })

      //   it("reverts if updated price AND desiredNftAddress is zero", async function () {
      //     await nftMarketplace.listItem(
      //       basicNft.address,
      //       TOKEN_ID,
      //       PRICE,
      //       ZERO_DESIREDNFTADDRESS,
      //       DESIREDNFTTOKENID
      //     )
      //     await expect(
      //       nftMarketplace.updateListing(
      //         basicNft.address,
      //         TOKEN_ID,
      //         0,
      //         ZERO_DESIREDNFTADDRESS,
      //         DESIREDNFTTOKENID
      //       )
      //     ).to.be.revertedWith("NftMarketplace__PriceMustBeAboveZeroOrNoDesiredNftGiven")
      //   })

      //   it("reverts if not approved", async function () {
      //     await nftMarketplace.listItem(
      //       basicNft.address,
      //       TOKEN_ID,
      //       PRICE,
      //       ZERO_DESIREDNFTADDRESS,
      //       DESIREDNFTTOKENID
      //     )
      //     await basicNft.approve("0x0000000000000000000000000000000000000000", TOKEN_ID)
      //     await expect(
      //       nftMarketplace.updateListing(
      //         basicNft.address,
      //         TOKEN_ID,
      //         NEW_PRICE,
      //         ZERO_DESIREDNFTADDRESS,
      //         DESIREDNFTTOKENID
      //       )
      //     ).to.be.revertedWith("NftMarketplace__NotApprovedForMarketplace")
      //   })

      //   it("updates the Listing", async function () {
      //     await nftMarketplace.listItem(
      //       basicNft.address,
      //       TOKEN_ID,
      //       PRICE,
      //       ZERO_DESIREDNFTADDRESS,
      //       DESIREDNFTTOKENID
      //     )
      //     let listing = await nftMarketplace.getListing(basicNftContract.address, TOKEN_ID)
      //     expect(listing.listingId.toString()).to.equal("1")
      //     expect(listing.price.toString()).to.equal(PRICE.toString())
      //     expect(listing.seller.toString()).to.equal(deployer.address.toString())
      //     await nftMarketplace.updateListing(
      //       basicNft.address,
      //       TOKEN_ID,
      //       NEW_PRICE,
      //       ZERO_DESIREDNFTADDRESS,
      //       DESIREDNFTTOKENID
      //     )
      //     listing = await nftMarketplace.getListing(basicNftContract.address, TOKEN_ID)
      //     expect(listing.listingId.toString()).to.equal("1")
      //     expect(listing.price.toString()).to.equal(NEW_PRICE.toString())
      //     expect(listing.seller.toString()).to.equal(deployer.address.toString())
      //     expect(listing.desiredNftAddress.toString()).to.equal(ZERO_DESIREDNFTADDRESS.toString())
      //     expect(listing.desiredNftTokenId.toString()).to.equal(DESIREDNFTTOKENID.toString())
      //   })

      //   it("emits the correct event", async function () {
      //     await nftMarketplace.listItem(
      //       basicNft.address,
      //       TOKEN_ID,
      //       PRICE,
      //       ZERO_DESIREDNFTADDRESS,
      //       DESIREDNFTTOKENID
      //     )
      //     await expect(
      //       nftMarketplace.updateListing(
      //         basicNft.address,
      //         TOKEN_ID,
      //         NEW_PRICE,
      //         ZERO_DESIREDNFTADDRESS,
      //         DESIREDNFTTOKENID
      //       )
      //     )
      //       .to.emit(nftMarketplace, "ItemUpdated")
      //       .withArgs(
      //         deployer.address,
      //         basicNft.address,
      //         TOKEN_ID,
      //         NEW_PRICE,
      //         "1",
      //         ZERO_DESIREDNFTADDRESS,
      //         DESIREDNFTTOKENID
      //       )
      //   })
      // })

      // !!!W Recreate a better simulation of a reentrancy attack and test it on the testnet

      // describe("Attacks", () => {
      //   it("is protected against reentry attacks", async function () {
      //     await nftMarketplace.listItem(
      //       basicNft.address,
      //       TOKEN_ID,
      //       PRICE,
      //       ZERO_DESIREDNFTADDRESS,
      //       DESIREDNFTTOKENID
      //     )
      //     nftMarketplace = nftMarketplaceContract.connect(user)
      //     await nftMarketplace.buyItem(basicNft.address, TOKEN_ID, { value: PRICE })
      //     nftMarketplace = nftMarketplaceContract.connect(deployer)

      //     await basicNft.mintNft()
      //     await basicNft.approve(nftMarketplaceContract.address, 1)
      //     await nftMarketplace.listItem(
      //       basicNft.address,
      //       1,
      //       PRICE,
      //       ZERO_DESIREDNFTADDRESS,
      //       DESIREDNFTTOKENID
      //     )
      //     nftMarketplace = nftMarketplaceContract.connect(user)
      //     await nftMarketplace.buyItem(basicNft.address, 1, { value: PRICE })
      //     nftMarketplace = nftMarketplaceContract.connect(deployer)

      //     await basicNft.mintNft()
      //     await basicNft.approve(nftMarketplaceContract.address, 2)
      //     await nftMarketplace.listItem(
      //       basicNft.address,
      //       2,
      //       PRICE,
      //       ZERO_DESIREDNFTADDRESS,
      //       DESIREDNFTTOKENID
      //     )
      //     nftMarketplace = nftMarketplaceContract.connect(user)
      //     await nftMarketplace.buyItem(basicNft.address, 2, { value: PRICE })
      //     nftMarketplace = nftMarketplaceContract.connect(deployer)

      //     const nMSB = await nftMarketplace.getBalance()

      //     attacker = accounts[2]
      //     // await deployments.fixture(["reentrancyAttack"]) if i do this here the Smartcontract gets deployed to a different address than in the hh node... thats why in the before each i let get "all" fixtured
      //     const reentrancyAttackInfo = await deployments.get("ReentrancyAttack")
      //     const reentrancyAttack = await ethers.getContractAt(
      //       "ReentrancyAttack",
      //       reentrancyAttackInfo.address,
      //       attacker
      //     )
      //     await reentrancyAttack.fund({ value: ethers.utils.parseEther("0.1") })
      //     const rASB = await reentrancyAttack.getBalance()

      //     await reentrancyAttack.mintNft(3)

      //     await expect(reentrancyAttack.attack()).to.be.reverted
      //     const nMEB = await nftMarketplace.getBalance()
      //     await expect(nMEB).to.equal(nMSB)
      //     const rAEB = await reentrancyAttack.getBalance()
      //     await expect(rAEB).to.equal(rASB)
      //   })
      // })
    })
