const fs = require("fs")
const { network } = require("hardhat")
require("hardhat-deploy")

const frontEndContractsFile = "../nextjs-nft-marketplace-w3i/constants/networkMapping.json"
const frontEndAbiLocation = "../nextjs-nft-marketplace-w3i/constants/"

module.exports = async () => {
  if (process.env.UPDATE_FRONT_END) {
    console.log("Writing to front end...")
    await updateContractAddresses()
    await updateAbi()
    console.log("Front end written!")
  }
}

async function updateAbi() {
  const ideationMarket = await ethers.getContract("IdeationMarket")

  fs.writeFileSync(
    `${frontEndAbiLocation}IdeationMarket.json`,
    ideationMarket.interface.format(ethers.utils.FormatTypes.json)
  )
  // const basicNft = await ethers.getContract("BasicNft")

  // fs.writeFileSync(
  //   `${frontEndAbiLocation}BasicNft.json`,
  //   basicNft.interface.format(ethers.utils.FormatTypes.json)
  // )
}

async function updateContractAddresses() {
  const chainId = network.config.chainId.toString()
  const ideationMarket = await ethers.getContract("IdeationMarket")

  const contractAddresses = JSON.parse(fs.readFileSync(frontEndContractsFile, "utf8"))
  if (chainId in contractAddresses) {
    if (!contractAddresses[chainId]["IdeationMarket"].includes(ideationMarket.address)) {
      contractAddresses[chainId]["IdeationMarket"].push(ideationMarket.address)
    }
  } else {
    contractAddresses[chainId] = { IdeationMarket: [ideationMarket.address] }
  }
  fs.writeFileSync(frontEndContractsFile, JSON.stringify(contractAddresses))
}
module.exports.tags = ["all", "frontend"]
