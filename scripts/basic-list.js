const { network, deployments, ethers } = require("hardhat")

const PRICE = ethers.utils.parseEther("0.09")

async function mintAndList() {
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

  const basicNftInfo = await deployments.get("BasicNft")
  const basicNft = await ethers.getContractAt("BasicNft", basicNftInfo.address)
  // !!!W here are the desired addres and token id missing!

  //   basicNft = basicNftContract.connect(deployer)

  // console.log("Minting NFT")
  // const mintTx = await basicNft.mintNft()
  // const mintTxRc = await mintTx.wait(1)
  // const tokenId = mintTxRc.events[0].args.tokenId // this is how to get info from a specific event!
  // console.log("tokenId: " + tokenId)

  let tokenId = readlineSync.question("Please enter the Token ID to be listed: ")

  console.log("Approving NFT")
  const approvalTx = await basicNft.approve(nftMarketplace.address, tokenId)
  await approvalTx.wait(1)

  console.log("Listing NFT")
  const listTx = await nftMarketplace.listItem(basicNft.address, tokenId, PRICE) // this needs to be updated with the zero addresses for the desired nft
  await listTx.wait(1)

  console.log(`basicNft #${tokenId} approved and listed.`)

  //   await nftMarketplace.getListing(basicNftContract.address, TOKEN_ID)
}

mintAndList()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
