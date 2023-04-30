const fs = require("fs")
const { network } = require("hardhat")
require("hardhat-deploy")

const frontEndContractsFile = "../nextjs-nft-marketplace-fcc/constants/networkMapping.json"
const frontEndAbiLocation = "../nextjs-nft-marketplace-fcc/constants/"

module.exports = async () => {
  if (process.env.UPDATE_FRONT_END) {
    console.log("Writing to front end...")
    await updateContractAddresses()
    await updateAbi()
    console.log("Front end written!")
  }
}

async function updateAbi() {
  await deployments.fixture(["main"])

  const nftMarketplaceInfo = await deployments.get("NftMarketplace")
  const nftMarketplace = await ethers.getContractAt("NftMarketplace", nftMarketplaceInfo.address)

  fs.writeFileSync(
    `${frontEndAbiLocation}NftMarketplace.json`,
    nftMarketplace.interface.format(ethers.utils.FormatTypes.json)
  )
  const basicNftInfo = await deployments.get("BasicNft")
  const basicNft = await ethers.getContractAt("BasicNft", nftMarketplaceInfo.address)
  fs.writeFileSync(
    `${frontEndAbiLocation}BasicNft.json`,
    basicNft.interface.format(ethers.utils.FormatTypes.json)
  )
}

async function updateContractAddresses() {
  await deployments.fixture(["main"])

  const chainId = network.config.chainId.toString()
  const nftMarketplaceInfo = await deployments.get("NftMarketplace")
  const nftMarketplace = await ethers.getContractAt("NftMarketplace", nftMarketplaceInfo.address)
  const contractAddresses = JSON.parse(fs.readFileSync(frontEndContractsFile, "utf8"))
  if (chainId in contractAddresses) {
    if (!contractAddresses[chainId]["NftMarketplace"].includes(nftMarketplace.address)) {
      contractAddresses[chainId]["NftMarketplace"].push(nftMarketplace.address)
    }
  } else {
    contractAddresses[chainId] = { NftMarketplace: [nftMarketplace.address] }
  }
  fs.writeFileSync(frontEndContractsFile, JSON.stringify(contractAddresses))
}
module.exports.tags = ["all", "frontend"]
