const { network, deployments, ethers } = require("hardhat")
const readlineSync = require("readline-sync")

const PRICE = ethers.utils.parseEther("0.1")

async function list() {
  //   let nftMarketplace, nftMarketplaceContract, basicNft, basicNftContract
  //   const PRICE = ethers.utils.parseEther("0.1")
  //   const NEW_PRICE = ethers.utils.parseEther("0.05")
  //   const TOKEN_ID = 0
  //   accounts = await ethers.getSigners()
  //   deployer = accounts[0]
  //   user = accounts[1]
  //   await deployments.fixture(["nftMarketplace", "basicNft"])
  //   const nftMarketplaceInfo = await deployments.get("NftMarketplace")

  const nftMarketplaceInfo = await deployments.get("NftMarketplace")
  const nftMarketplace = await ethers.getContractAt("NftMarketplace", nftMarketplaceInfo.address)

  //   nftMarketplace = nftMarketplaceContract.connect(deployer)
  //   const basicNftInfo = await deployments.get("BasicNft")

  const wowInfo = await deployments.get("WorldOfWomenMock")
  const wow = await ethers.getContractAt("WorldOfWomenMock", wowInfo.address)

  //   basicNft = basicNftContract.connect(deployer)

  //   console.log("Minting NFT")
  //   const mintTx = await wow.mintNft(1)
  //   const mintTxRc = await mintTx.wait(1)
  //   const tokenId = mintTxRc.events[0].args.tokenId // this is how to get info from a specific event!
  //   console.log("tokenId from events: " + tokenId)

  let tokenId = readlineSync.question("Please enter the Token ID to be listed: ")

  // Rest of your code that uses tokenId goes here

  console.log("Approving NFT")
  const approvalTx = await wow.approve(nftMarketplace.address, tokenId)
  await approvalTx.wait(1)

  console.log("Listing NFT")
  const listTx = await nftMarketplace.listItem(
    wow.address,
    tokenId,
    PRICE,
    "0x0000000000000000000000000000000000000000",
    "0x0000000000000000000000000000000000000000"
  )
  await listTx.wait(1)

  console.log(`NFT ${tokenId} minted, approved and listed.`)

  //   await nftMarketplace.getListing(basicNftContract.address, TOKEN_ID)
}

list()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
