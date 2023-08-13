Create a decentralized NFT Marketplace:
1. `listItem`: List NFTs on the marketplace
2. `buyItem`: Buy NFTs
3. `cancelItem`: Cancel a listing
4. `updateListing`: to update the price
5. `withdrawproceeds`: Withdraw payment for my bought NFTs (when sbd buys the nft they will pay the price to the smartcontract of the nft marketplace. When the seller calls this function the smartcontract will send that money to their own wallet) -- But why dont we set up the smart contract to directly pay it out?? 

!!!W make this upgradable using the upgrades plugin from openzeppelin (29:34:50)
problem with upgradable: I think I will have to use a second contract for governance where I would have only me being able to reroute the calls to the actual marketplace smartcontract. Where I could deploy a new updated version and then use my centraliced power to reroute the calls to that one. but that makes it centralized and also not able to change this centralization. or does it? I think I remember that there was this routing contract, the actual function contract AND a governance contract, so maybe I can programm it in a way that I can eventually change it to decentralized





# Getting Started

## Requirements

- [git](https://git-scm.com/book/en/v2/Getting-Started-Installing-Git)
  - You'll know you did it right if you can run `git --version` and you see a response like `git version x.x.x`
- [Nodejs](https://nodejs.org/en/)
  - You'll know you've installed nodejs right if you can run:
    - `node --version` and get an ouput like: `vx.x.x`
- [Yarn](https://yarnpkg.com/getting-started/install) instead of `npm`
  - You'll know you've installed yarn right if you can run:
    - `yarn --version` and get an output like: `x.x.x`
    - You might need to [install it with `npm`](https://classic.yarnpkg.com/lang/en/docs/install/) or `corepack`

## Quickstart

```
git clone https://github.com/PatrickAlphaC/hardhat-nft-fcc
cd hardhat-nft-fcc
yarn
```

## Typescript

If you want to get to typescript and you cloned the javascript version, just run:

```
git checkout typescript
```


# Useage

Deploy:

```
yarn hardhat deploy
```

## Testing

```
yarn hardhat test
```

### Test Coverage

```
yarn hardhat coverage
```



# Deployment to a testnet or mainnet

1. Setup environment variabltes

You'll want to set your `SEPOLIA_RPC_URL` and `PRIVATE_KEY` as environment variables. You can add them to a `.env` file, similar to what you see in `.env.example`.

- `PRIVATE_KEY`: The private key of your account (like from [metamask](https://metamask.io/)). **NOTE:** FOR DEVELOPMENT, PLEASE USE A KEY THAT DOESN'T HAVE ANY REAL FUNDS ASSOCIATED WITH IT.
  - You can [learn how to export it here](https://metamask.zendesk.com/hc/en-us/articles/360015289632-How-to-Export-an-Account-Private-Key).
- `SEPOLIA_RPC_URL`: This is url of the sepolia testnet node you're working with. You can get setup with one for free from [Alchemy](https://alchemy.com/?a=673c802981)

2. Get testnet ETH

Head over to [faucets.chain.link](https://faucets.chain.link/) and get some tesnet ETH & LINK. You should see the ETH and LINK show up in your metamask. [You can read more on setting up your wallet with LINK.](https://docs.chain.link/docs/deploy-your-first-contract/#install-and-fund-your-metamask-wallet)

3. Setup a Chainlink VRF Subscription ID

Head over to [vrf.chain.link](https://vrf.chain.link/) and setup a new subscription, and get a subscriptionId. You can reuse an old subscription if you already have one. 

[You can follow the instructions](https://docs.chain.link/docs/get-a-random-number/) if you get lost. You should leave this step with:

1. A subscription ID
2. Your subscription should be funded with LINK

3. Deploy

In your `helper-hardhat-config.ts` add your `subscriptionId` under the section of the chainId you're using (aka, if you're deploying to sepolia, add your `subscriptionId` in the `subscriptionId` field under the `11155111` section.)

Then run:
```
yarn hardhat deploy --network sepolia --tags main
```

We only deploy the `main` tags, since we need to add our `RandomIpfsNft` contract as a consumer. 

4. Add your contract address as a Chainlink VRF Consumer

Go back to [vrf.chain.link](https://vrf.chain.link) and under your subscription add `Add consumer` and add your contract address. You should also fund the contract with a minimum of 1 LINK. 

5. Mint NFTs

Then run:

```
yarn hardhat deploy --network sepolia --tags mint
```


### Estimate gas cost in USD

To get a USD estimation of gas cost, you'll need a `COINMARKETCAP_API_KEY` environment variable. You can get one for free from [CoinMarketCap](https://pro.coinmarketcap.com/signup). 

Then, uncomment the line `coinmarketcap: COINMARKETCAP_API_KEY,` in `hardhat.config.ts` to get the USD estimation. Just note, everytime you run your tests it will use an API call, so it might make sense to have using coinmarketcap disabled until you need it. You can disable it by just commenting the line back out. 



## Verify on etherscan

If you deploy to a testnet or mainnet, you can verify it if you get an [API Key](https://etherscan.io/myapikey) from Etherscan and set it as an environemnt variable named `ETHERSCAN_API_KEY`. You can pop it into your `.env` file as seen in the `.env.example`.

In it's current state, if you have your api key set, it will auto verify sepolia contracts!

However, you can manual verify with:

```
yarn hardhat verify --constructor-args arguments.ts DEPLOYED_CONTRACT_ADDRESS
```

### Typescript differences
1. `.js` files are now `.ts`
2. We added a bunch of typescript and typing packages to our `package.json`. They can be installed with:
   1. `yarn add @typechain/ethers-v5 @typechain/hardhat @types/chai @types/node ts-node typechain typescript`
3. The biggest one being [typechain](https://github.com/dethcrypto/TypeChain)
   1. This gives your contracts static typing, meaning you'll always know exactly what functions a contract can call. 
   2. This gives us `factories` that are specific to the contracts they are factories of. See the tests folder for a version of how this is implemented. 
4. We use `imports` instead of `require`. Confusing to you? [Watch this video](https://www.youtube.com/watch?v=mK54Cn4ceac)
5. Add `tsconfig.json`

# Linting

To check linting / code formatting:
```
yarn lint
```
or, to fix: 
```
yarn lint:fix
```

# Thank you!

If you appreciated this, feel free to follow me or donate!

ETH/Polygon/Avalanche/etc Address: 0x9680201d9c93d65a3603d2088d125e955c73BD65

[![Patrick Collins Twitter](https://img.shields.io/badge/Twitter-1DA1F2?style=for-the-badge&logo=twitter&logoColor=white)](https://twitter.com/PatrickAlphaC)
[![Patrick Collins YouTube](https://img.shields.io/badge/YouTube-FF0000?style=for-the-badge&logo=youtube&logoColor=white)](https://www.youtube.com/channel/UCn-3f8tw_E1jZvhuHatROwA)
[![Patrick Collins Linkedin](https://img.shields.io/badge/LinkedIn-0077B5?style=for-the-badge&logo=linkedin&logoColor=white)](https://www.linkedin.com/in/patrickalphac/)
[![Patrick Collins Medium](https://img.shields.io/badge/Medium-000000?style=for-the-badge&logo=medium&logoColor=white)](https://medium.com/@patrick.collins_58673/)

!!!W there are newer NFT ERCs which this marketplace does not support. I think if we want to have an utility marketplace we should support ALL NFT ERCs. Here is the info that cGPT4 gave me:

Ethereum Improvement Proposals (EIPs) describe standards for the Ethereum platform, including core protocol specifications, client APIs, and contract standards. The ERC (Ethereum Request for Comments) section of EIPs specifically deals with application-level standards and conventions.

Here are some of the notable ERCs related to NFTs (Non-Fungible Tokens) and their brief descriptions:

ERC-721 (Non-Fungible Token Standard): Introduced by William Entriken, Dieter Shirley, Jacob Evans, and Nastassia Sachs, this is the most well-known standard for representing individual tokens that are distinct from each other, making them suitable for representing ownership of unique items.

ERC-1155 (Multi Token Standard): Proposed by Witek Radomski, Andrew Cooke, Philippe Castonguay, James Therien, Eric Binet, and Ronan Sandford, this standard allows a single contract to produce both fungible and non-fungible tokens. It's especially useful for games and apps that require multiple token types.

ERC-2981 (NFT Royalty Standard): Proposed by Zach Burks and James Morgan, this standard outlines a way for NFTs to have royalties automatically paid out to creators when their NFTs are sold on secondary markets.

ERC-5007 (Rental NFT, NFT User Extension): Proposed by Anders, Lance, and Shrug, this standard extends the ERC-721 to allow for the rental of NFTs.

ERC-5570 (Digital Receipt Non-Fungible Tokens): Proposed by Sean Darcy, this standard represents a digital receipt as an NFT.

ERC-5606 (Multiverse NFTs): Proposed by Gaurang Torvekar, Khemraj Adhawade, and Nikhil Asrani, this standard introduces the concept of multiverse NFTs, which can exist across multiple virtual worlds or platforms.

ERC-5646 (Token State Fingerprint): Proposed by Naim Ashhab, this standard provides a way to fingerprint the state of an NFT.

ERC-6672 (Multi-redeemable NFTs): Proposed by RE:DREAMER Lab, Archie Chang, Kai Yu, Yonathan Randyanto, Boyu Chu, Boxi Li, and Jason Cheng, this standard allows for NFTs that can be redeemed multiple times.

ERC-6809 (Non-Fungible Key Bound Token): Proposed by Mihai Onila, Nick Zeman, and Narcis Cotaie, this standard ties non-fungible tokens to specific keys.

ERC-7053 (Interoperable Digital Media Indexing): Proposed by Bofu Chen and Tammy Yang, this standard focuses on indexing digital media in an interoperable manner.

These are just a few of the many ERCs related to NFTs. Each ERC serves a specific purpose and addresses different use cases within the Ethereum ecosystem. If you'd like more detailed information on any specific ERC or another list, please let me know!




User
when i create a nft marketplace based on the ERC721, will all types of nfts which are based on those ERCs be able to be bought and sold from it?
ChatGPT
If you create an NFT marketplace based on the ERC-721 standard, it will primarily support the buying and selling of NFTs that conform to the ERC-721 standard. However, NFTs based on other ERC standards may not be directly compatible with your marketplace unless you specifically design and implement support for those standards. Here's a breakdown:

ERC-721: Your marketplace will natively support NFTs based on this standard since it's designed around it. ERC-721 tokens represent unique assets and have a distinct set of functions to transfer, approve, and query ownership.

ERC-1155: This is a multi-token standard that can represent both fungible (like ERC-20) and non-fungible tokens (like ERC-721) within a single contract. If you want your marketplace to support ERC-1155 tokens, you'll need to implement additional logic to handle the specific functions and behaviors of this standard.

Other NFT-related ERCs: Many of the other ERCs related to NFTs (like ERC-2981 for royalties, ERC-5007 for rentals, etc.) are extensions or modifications of the base ERC-721 standard. Depending on the specific ERC, you might need to implement additional features or logic to support them. For example, if you want to support ERC-2981 royalties, you'd need to ensure that a portion of secondary sales goes to the original creator.

In summary, while an ERC-721 based marketplace will natively support ERC-721 NFTs, supporting other types of NFTs or additional features requires extra development and integration. If you're planning to create a versatile marketplace, it's essential to consider the range of standards and features you want to support from the outset.


!!! add licence file in github