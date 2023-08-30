const { network, deployments, ethers } = require("hardhat")

const PRICE = ethers.utils.parseEther("0.1")

async function regularMint() {
  const [deployer] = await ethers.getSigners()
  const deployerAddress = await deployer.getAddress()

  const regularNftInfo = await deployments.get("RegularNft")
  const regularNft = await ethers.getContractAt("RegularNft", regularNftInfo.address)

  console.log("Minting NFT")
  console.log("deployerAddress: " + deployerAddress)
  const mintTx = await regularNft.mint(deployerAddress)
  const mintTxRc = await mintTx.wait(1)
  const tokenId = mintTxRc.events[0].args.tokenId // this is how to get info from a specific event!
  console.log("tokenId: " + tokenId)
}

regularMint()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
