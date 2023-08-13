const { network } = require("hardhat")
const { developmentChains } = require("../helper-hardhat-config")
const { verify } = require("../utils/verify")

module.exports = async ({ getNamedAccounts, deployments }) => {
  const { deploy, log } = deployments
  const { deployer } = await getNamedAccounts()

  log("----------------------------------------------------")
  const arguments = []
  const nftMarketplace = await deploy("NftMarketplace", {
    from: deployer,
    args: arguments,
    log: true,
    waitConfirmations: network.config.blockConfirmations || 1,
  })

  // Verify the deployment
  if (!developmentChains.includes(network.name) && process.env.ETHERSCAN_API_KEY) {
    log("Verifying...")
    await verify(nftMarketplace.address, arguments)
  }
  log("----------------------------------------------------")
}

module.exports.tags = ["all", "nftMarketplace", "main"]

// !!!W test if i can use the hh console to get the NextListingId:

// cGPT
// Based on the error message you received, it seems like you have not defined the nftMarketplace variable in the console. To interact with your smart contract in the console, you first need to create an instance of the contract using its ABI and address. Here's how you can do it:

// First, you need to retrieve the ABI and address of your deployed smart contract. You can do this by running the following command in the terminal:

// css
// Copy code
// hh deployments --network <network_name>
// Replace <network_name> with the name of the network you deployed your contract to, such as localhost or rinkeby.

// This command should output a list of deployed contracts on the specified network. Find the NftMarketplace contract in the list and copy its address and abi properties.

// In the console, you can use the ethers library to create an instance of your contract. Install the library by running the following command in the terminal:

// Copy code
// npm install ethers
// In the console, you can create an instance of your contract like this:

// javascript
// Copy code
// const ethers = require('ethers')
// const abi = <contract_abi>
// const address = <contract_address>
// const provider = new ethers.providers.JsonRpcProvider()
// const contract = new ethers.Contract(address, abi, provider)
// Replace <contract_abi> and <contract_address> with the values you copied from the hh deployments command. provider is an instance of the JSON-RPC provider that connects to your local Hardhat network.

// Now that you have an instance of your contract, you can call its functions. To call the getNextListingId function, you can do:

// scss
// Copy code
// contract.getNextListingId()
// This should return the value of listingId from your contract.

// Make sure to replace <contract_abi> and <contract_address> with the correct values from your deployment, and also ensure that you have a running Hardhat node for the network you deployed to.

// accounts = ethers.getSigners()
// deployer = accounts[0]
// await deployments.fixture(["NftMarketplace"])
// nftMarketplace = await ethers.getContract("NftMarketplace")

// You can check the Windows Firewall settings on Windows 10 by following these steps:

////////////
// ICH GLAUBE MEIN PROBLEM IST DAS DIESER RECHNER DEN LOCAL HOST NICHT ZULÄSST (SIEHE CGPT) WENN ICH ALSO DIE EINTSELLUNGEN NICHT ERFOLGREICH ÄNDERN KANN BRAUCHE ICH EINEN ANDEREN RECHNER MIT 16GB RAM
//////////

// Click on the Start menu and search for "Windows Security" or "Windows Defender Security Center".
// Click on the "Firewall & network protection" option.
// Ensure that the firewall is turned on and that the "Block all incoming connections, including those in the list of allowed apps" option is unchecked.
// Scroll down to the "Advanced settings" section and click on it.
// In the left-hand pane, click on "Inbound Rules".
// Look for a rule that may be blocking incoming connections to your localhost node. If you don't see a rule for your application, you can create a new rule by clicking on "New Rule..." in the right-hand pane and following the prompts.
// If you find a rule that may be blocking your connections, you can disable it by right-clicking on the rule and selecting "Disable Rule".
// It's also possible that your antivirus software may be blocking incoming connections, so you may want to check those settings as well.

// This is a way of connecting the hh console with the local host node
// hh console --network hardhat
// > const Web3 = require('web3');
// undefined
// > const web3 = new Web3('http://localhost:8545');
// undefined
// > web3.eth.net.getId().then(console.log);
// Promise {
//   <pending>,
//   [Symbol(async_id_symbol)]: 1543,
//   [Symbol(trigger_async_id_symbol)]: 1539,
//   [Symbol(destroyed)]: { destroyed: false }
// }
// > 31337
// > await deployments.all()
// {}
// >

// I think thats übertrieben. hh console and then const nftMarketplace = await ethers.getContractFactory("NftMarketplace") is probably enough. But it still tells me that Uncaught TypeError: nftMarketplace.getNextListingId is not a function... try using the test scripts and then see if i find the error there. if the testscripts work I need to dig into how to use the console, again.
