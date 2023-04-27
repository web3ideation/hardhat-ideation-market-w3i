const { assert, expect } = require("chai")
const { network, deployments, ethers } = require("hardhat")
const { developmentChains } = require("../../helper-hardhat-config")

!developmentChains.includes(network.name)
  ? describe.skip
  : describe("Nft Marketplace Unit Tests", function () {
      let nftMarketplace, nftMarketplaceContract, basicNft, basicNftContract
      const PRICE = ethers.utils.parseEther("0.1")
      const NEW_PRICE = ethers.utils.parseEther("0.05")
      const TOKEN_ID = 0
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
        it("is possible to list and buy an Item", async function () {
          await nftMarketplace.listItem(basicNft.address, TOKEN_ID, PRICE)
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

      describe("listItem", () => {
        it("reverts if already listed from same user", async function () {
          await nftMarketplace.listItem(basicNft.address, TOKEN_ID, PRICE)
          await expect(
            nftMarketplace.listItem(basicNft.address, TOKEN_ID, PRICE)
          ).to.be.revertedWith("NftMarketplace__AlreadyListed")
        })

        it("reverts if already listed from different user", async function () {
          await nftMarketplace.listItem(basicNft.address, TOKEN_ID, PRICE)
          await expect(basicNft.transferFrom(deployer.address, user.address, TOKEN_ID))
            .to.emit(basicNft, "Transfer")
            .withArgs(deployer.address, user.address, TOKEN_ID)
          nftMarketplace = nftMarketplaceContract.connect(user)
          await expect(
            nftMarketplace.listItem(basicNft.address, TOKEN_ID, PRICE)
          ).to.be.revertedWith("NftMarketplace__AlreadyListed")
        })

        it("reverts if not Owner", async function () {
          nftMarketplace = await nftMarketplaceContract.connect(user)
          await expect(
            nftMarketplace.listItem(basicNft.address, TOKEN_ID, PRICE)
          ).to.be.revertedWith("NftMarketplace__NotOwner")
        })

        it("reverts if price =0", async function () {
          await expect(nftMarketplace.listItem(basicNft.address, TOKEN_ID, 0)).to.be.revertedWith(
            "NftMarketplace__PriceMustBeAboveZero"
          )
        })

        it("reverts if price < 0", async function () {
          await expect(nftMarketplace.listItem(basicNft.address, TOKEN_ID, -1)).to.be.reverted
        })

        it("reverts if not approved", async function () {
          await basicNft.approve("0x0000000000000000000000000000000000000000", TOKEN_ID)
          await expect(
            nftMarketplace.listItem(basicNft.address, TOKEN_ID, PRICE)
          ).to.be.revertedWith("NftMarketplace__NotApprovedForMarketplace")
        })

        it("creates the Listing", async function () {
          await nftMarketplace.listItem(basicNft.address, TOKEN_ID, PRICE)
          let listing = await nftMarketplace.getListing(basicNftContract.address, TOKEN_ID)
          expect(listing.listingId.toString()).to.equal("0")
          expect(listing.price.toString()).to.equal(PRICE.toString())
          expect(listing.seller.toString()).to.equal(deployer.address.toString())
        })

        it("emits the ItemListed event", async function () {
          await expect(nftMarketplace.listItem(basicNft.address, TOKEN_ID, PRICE))
            .to.emit(nftMarketplace, "ItemListed")
            .withArgs(deployer.address, basicNft.address, TOKEN_ID, PRICE, "0")
        })

        it("updates the listingId", async function () {
          await nftMarketplace.listItem(basicNft.address, TOKEN_ID, PRICE)
          expect(await nftMarketplace.getNextListingId()).to.equal("1")
        })
      })

      describe("BuyItem", () => {
        it("reverts if not listed", async function () {
          await expect(
            nftMarketplace.buyItem(basicNft.address, TOKEN_ID, { value: PRICE })
          ).to.be.revertedWith("NftMarketplace__NotListed")
        })

        it("reverts if value is zero", async function () {
          await nftMarketplace.listItem(basicNft.address, TOKEN_ID, PRICE)
          nftMarketplace = nftMarketplaceContract.connect(user)
          await expect(
            nftMarketplace.buyItem(basicNft.address, TOKEN_ID, { value: 0 })
          ).to.be.revertedWith("NftMarketplace__PriceNotMet")
        })

        it("reverts if value is too low", async function () {
          await nftMarketplace.listItem(basicNft.address, TOKEN_ID, PRICE)
          nftMarketplace = nftMarketplaceContract.connect(user)
          await expect(
            nftMarketplace.buyItem(basicNft.address, TOKEN_ID, {
              value: ethers.utils.parseEther("0.09"),
            })
          ).to.be.revertedWith("NftMarketplace__PriceNotMet")
        })

        it("emits the correct event", async function () {
          await nftMarketplace.listItem(basicNft.address, TOKEN_ID, PRICE)
          nftMarketplace = nftMarketplaceContract.connect(user)
          await expect(nftMarketplace.buyItem(basicNft.address, TOKEN_ID, { value: PRICE }))
            .to.emit(nftMarketplace, "ItemBought")
            .withArgs(user.address, basicNft.address, TOKEN_ID, PRICE, "0")
        })

        it("also works if price is too high", async function () {
          await nftMarketplace.listItem(basicNft.address, TOKEN_ID, PRICE)
          nftMarketplace = nftMarketplaceContract.connect(user)
          await expect(
            nftMarketplace.buyItem(basicNft.address, TOKEN_ID, {
              value: ethers.utils.parseEther("0.11"),
            })
          )
            .to.emit(nftMarketplace, "ItemBought")
            .withArgs(user.address, basicNft.address, TOKEN_ID, PRICE, "0")
        })

        it("adds the amount to the proceeds mapping", async function () {
          await nftMarketplace.listItem(basicNft.address, TOKEN_ID, PRICE)
          nftMarketplace = nftMarketplaceContract.connect(user)
          await nftMarketplace.buyItem(basicNft.address, TOKEN_ID, { value: PRICE })
          expect(await nftMarketplace.getProceeds(deployer.address)).to.equal(PRICE)
        })

        it("deletes the s_listing mapping", async function () {
          await nftMarketplace.listItem(basicNft.address, TOKEN_ID, PRICE)
          nftMarketplace = nftMarketplaceContract.connect(user)
          await nftMarketplace.buyItem(basicNft.address, TOKEN_ID, { value: PRICE })
          nftMarketplace = nftMarketplaceContract.connect(deployer)
          let listing = await nftMarketplace.getListing(basicNftContract.address, TOKEN_ID)
          expect(listing.listingId.toString()).to.equal("0")
          expect(listing.price.toString()).to.equal("0")
          expect(listing.seller.toString()).to.equal("0x0000000000000000000000000000000000000000")
        })

        it("actually transfers the correct nft from the seller to the user ", async function () {
          await nftMarketplace.listItem(basicNft.address, TOKEN_ID, PRICE)
          nftMarketplace = nftMarketplaceContract.connect(user)
          await nftMarketplace.buyItem(basicNft.address, TOKEN_ID, { value: PRICE })
          expect(await basicNft.ownerOf(TOKEN_ID)).to.equal(user.address)
        })

        it("transfers the ETH correctly", async function () {
          await nftMarketplace.listItem(basicNft.address, TOKEN_ID, PRICE)
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

      describe("cancelListing", () => {
        it("reverts if not listed", async function () {
          await expect(
            nftMarketplace.cancelListing(basicNft.address, TOKEN_ID)
          ).to.be.revertedWith("NftMarketplace__NotListed")
        })

        it("reverts if not Owner", async function () {
          await nftMarketplace.listItem(basicNft.address, TOKEN_ID, PRICE)
          nftMarketplace = nftMarketplaceContract.connect(user)
          await expect(
            nftMarketplace.cancelListing(basicNft.address, TOKEN_ID)
          ).to.be.revertedWith("NftMarketplace__NotOwner")
        })

        it("deletes the s_listing mapping", async function () {
          await nftMarketplace.listItem(basicNft.address, TOKEN_ID, PRICE)
          await nftMarketplace.cancelListing(basicNft.address, TOKEN_ID)
          listing = await nftMarketplace.getListing(basicNftContract.address, TOKEN_ID)
          expect(listing.listingId.toString()).to.equal("0")
          expect(listing.price.toString()).to.equal("0")
          expect(listing.seller.toString()).to.equal("0x0000000000000000000000000000000000000000")
        })

        it("emits the correct event", async function () {
          await nftMarketplace.listItem(basicNft.address, TOKEN_ID, PRICE)
          await expect(nftMarketplace.cancelListing(basicNft.address, TOKEN_ID))
            .to.emit(nftMarketplace, "ItemCanceled")
            .withArgs(deployer.address, basicNft.address, TOKEN_ID, "0")
        })
      })

      describe("updateListing", () => {
        it("reverts if not listed", async function () {
          await expect(
            nftMarketplace.updateListing(basicNft.address, TOKEN_ID, NEW_PRICE)
          ).to.be.revertedWith("NftMarketplace__NotListed")
        })

        it("reverts if not Owner", async function () {
          await nftMarketplace.listItem(basicNft.address, TOKEN_ID, PRICE)
          nftMarketplace = nftMarketplaceContract.connect(user)
          await expect(
            nftMarketplace.updateListing(basicNft.address, TOKEN_ID, NEW_PRICE)
          ).to.be.revertedWith("NftMarketplace__NotOwner")
        })

        it("reverts if newPrice is too low", async function () {
          await nftMarketplace.listItem(basicNft.address, TOKEN_ID, PRICE)
          await expect(
            nftMarketplace.updateListing(basicNft.address, TOKEN_ID, 0)
          ).to.be.revertedWith("NftMarketplace__PriceMustBeAboveZero")
        })

        it("reverts if not approved", async function () {
          await nftMarketplace.listItem(basicNft.address, TOKEN_ID, PRICE)
          await basicNft.approve("0x0000000000000000000000000000000000000000", TOKEN_ID)
          await expect(
            nftMarketplace.updateListing(basicNft.address, TOKEN_ID, NEW_PRICE)
          ).to.be.revertedWith("NftMarketplace__NotApprovedForMarketplace")
        })

        it("updates the Listing", async function () {
          await nftMarketplace.listItem(basicNft.address, TOKEN_ID, PRICE)
          let listing = await nftMarketplace.getListing(basicNftContract.address, TOKEN_ID)
          expect(listing.listingId.toString()).to.equal("0")
          expect(listing.price.toString()).to.equal(PRICE.toString())
          expect(listing.seller.toString()).to.equal(deployer.address.toString())
          await nftMarketplace.updateListing(basicNft.address, TOKEN_ID, NEW_PRICE)
          listing = await nftMarketplace.getListing(basicNftContract.address, TOKEN_ID)
          expect(listing.listingId.toString()).to.equal("0")
          expect(listing.price.toString()).to.equal(NEW_PRICE.toString())
          expect(listing.seller.toString()).to.equal(deployer.address.toString())
        })

        it("emits the correct event", async function () {
          await nftMarketplace.listItem(basicNft.address, TOKEN_ID, PRICE)
          await expect(nftMarketplace.updateListing(basicNft.address, TOKEN_ID, NEW_PRICE))
            .to.emit(nftMarketplace, "ItemUpdated")
            .withArgs(deployer.address, basicNft.address, TOKEN_ID, NEW_PRICE, "1")
        })
      })
      describe("withdrawProceeds", () => {
        it("transfers the ETH correctly", async function () {
          await nftMarketplace.listItem(basicNft.address, TOKEN_ID, PRICE)
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
          await nftMarketplace.listItem(basicNft.address, TOKEN_ID, PRICE)
          nftMarketplace = nftMarketplaceContract.connect(user)
          await nftMarketplace.buyItem(basicNft.address, TOKEN_ID, { value: PRICE })
          nftMarketplace = nftMarketplaceContract.connect(deployer)
          await nftMarketplace.withdrawProceeds()
          await expect(nftMarketplace.withdrawProceeds()).to.be.revertedWith(
            "NftMarketplace__NoProceeds"
          )
        })

        it("resets the s_proceeds mapping", async function () {
          await nftMarketplace.listItem(basicNft.address, TOKEN_ID, PRICE)
          nftMarketplace = nftMarketplaceContract.connect(user)
          await nftMarketplace.buyItem(basicNft.address, TOKEN_ID, { value: PRICE })
          nftMarketplace = nftMarketplaceContract.connect(deployer)
          await nftMarketplace.withdrawProceeds()
          expect(await nftMarketplace.getProceeds(deployer.address)).to.equal("0")
        })
      })

      describe("Attacks", () => {
        it("is protected against reentry attacks", async function () {
          await nftMarketplace.listItem(basicNft.address, TOKEN_ID, PRICE)
          nftMarketplace = nftMarketplaceContract.connect(user)
          await nftMarketplace.buyItem(basicNft.address, TOKEN_ID, { value: PRICE })
          nftMarketplace = nftMarketplaceContract.connect(deployer)

          await basicNft.mintNft()
          await basicNft.approve(nftMarketplaceContract.address, 1)
          await nftMarketplace.listItem(basicNft.address, 1, PRICE)
          nftMarketplace = nftMarketplaceContract.connect(user)
          await nftMarketplace.buyItem(basicNft.address, 1, { value: PRICE })
          nftMarketplace = nftMarketplaceContract.connect(deployer)

          await basicNft.mintNft()
          await basicNft.approve(nftMarketplaceContract.address, 2)
          await nftMarketplace.listItem(basicNft.address, 2, PRICE)
          nftMarketplace = nftMarketplaceContract.connect(user)
          await nftMarketplace.buyItem(basicNft.address, 2, { value: PRICE })
          nftMarketplace = nftMarketplaceContract.connect(deployer)

          const nMSB = await nftMarketplace.getBalance()

          attacker = accounts[2]
          // await deployments.fixture(["reentrancyAttack"]) if i do this here the Smartcontract gets deployed to a different address than in the hh node... thats why in the before each i let get "all" fixtured
          const reentrancyAttackInfo = await deployments.get("ReentrancyAttack")
          const reentrancyAttack = await ethers.getContractAt(
            "ReentrancyAttack",
            reentrancyAttackInfo.address,
            attacker
          )
          await reentrancyAttack.fund({ value: ethers.utils.parseEther("0.1") })
          const rASB = await reentrancyAttack.getBalance()

          await reentrancyAttack.mintNft(3)

          await expect(reentrancyAttack.attack()).to.be.reverted
          const nMEB = await nftMarketplace.getBalance()
          await expect(nMEB).to.equal(nMSB)
          const rAEB = await reentrancyAttack.getBalance()
          await expect(rAEB).to.equal(rASB)
        })
      })
    })
