const { deployments, ethers } = require("hardhat")

async function getTokenURI() {
  const basicNft = await ethers.getContract("BasicNft")
  console.log("calling tokenURI function")
  const tx = await basicNft.tokenURI(0)

  console.log("tokenURI: " + tx)
}

getTokenURI()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
