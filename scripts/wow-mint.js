const { network, deployments, ethers } = require("hardhat")

// const PRICE = ethers.utils.parseEther("0.1")

async function WOWMint() {
  //   let ideationMarket, ideationMarketContract, basicNft, basicNftContract
  //   const PRICE = ethers.utils.parseEther("0.1")
  //   const NEW_PRICE = ethers.utils.parseEther("0.05")
  //   const TOKEN_ID = 0
  //   accounts = await ethers.getSigners()
  //   deployer = accounts[0]
  //   user = accounts[1]
  //   await deployments.fixture(["ideationMarket", "basicNft"])
  //   const ideationMarketInfo = await deployments.get("IdeationMarket")

  // const ideationMarketInfo = await deployments.get("IdeationMarket")
  // const ideationMarket = await ethers.getContractAt("IdeationMarket", ideationMarketInfo.address)

  //   ideationMarket = ideationMarketContract.connect(deployer)
  //   const basicNftInfo = await deployments.get("BasicNft")

  const wowInfo = await deployments.get("WorldOfWomenMock")
  const wow = await ethers.getContractAt("WorldOfWomenMock", wowInfo.address)

  //   basicNft = basicNftContract.connect(deployer)

  console.log("Minting NFT")
  const mintTx = await wow.mint(1, { value: ethers.utils.parseEther("0.000001") })
  const mintTxRc = await mintTx.wait(1)
  const tokenId = mintTxRc.events[0].args.tokenId // this is how to get info from a specific event!
  console.log("tokenId from events: " + tokenId)

  // console.log("Approving NFT")
  // const approvalTx = await basicNft.approve(ideationMarket.address, tokenId)
  // await approvalTx.wait(1)

  // console.log("Listing NFT")
  // const listTx = await ideationMarket.listItem(basicNft.address, tokenId, PRICE)
  // await listTx.wait(1)

  // console.log("NFT minted, approved and listed.")

  //   await ideationMarket.getListing(basicNftContract.address, TOKEN_ID)
}

WOWMint()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
