const { network } = require("hardhat")
const { developmentChains } = require("../../helper-hardhat-config")

module.exports = async ({ getNamedAccounts, deployments }) => {
  const { deploy, log } = deployments
  const { deployer } = await getNamedAccounts()

  log("----------------------------------------------------")
  const arguments = [
    "0x5FbDB2315678afecb367f032d93F642f64180aa3" /* !!!W hier muss irgendwie was hin, dass die argumente aus dem deployment vom testscript kommen oder so, oder brauche ich dieses deployment script gar nicht??? */,
    "0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512",
  ]
  const reentrancyAttack = await deploy("ReentrancyAttack", {
    from: deployer,
    args: arguments,
    log: true,
    waitConfirmations: network.config.blockConfirmations || 1,
  })
}
module.exports.tags = ["reentrancyAttack", "all"]
