const { network } = require("hardhat")
const { developmentChains } = require("../helper-hardhat-config")
const { verify } = require("../utils/verify")

module.exports = async ({ getNamedAccounts, deployments }) => {
  const { deploy, log } = deployments
  const { deployer } = await getNamedAccounts()

  log("----------------------------------------------------")

  // Deploy the Clubs contract first
  const clubs = await deploy("Clubs", {
    from: deployer,
    args: [],
    log: true,
    waitConfirmations: network.config.blockConfirmations || 1,
  })

  // Deploy the WorldOfWomenMock contract
  const worldOfWomenMock = await deploy("WorldOfWomenMock", {
    from: deployer,
    args: [],
    log: true,
    waitConfirmations: network.config.blockConfirmations || 1,
  })

  //   // Verify the deployments
  //   if (!developmentChains.includes(network.name) && process.env.ETHERSCAN_API_KEY) {
  //     log("Verifying Clubs...")
  //     await verify(clubs.address, [])
  //     log("Verifying WorldOfWomenMock...")
  //     await verify(worldOfWomenMock.address, [])
  //   }

  log("----------------------------------------------------")
}

module.exports.tags = ["all", "clubs", "worldOfWomenMock", "main"]
