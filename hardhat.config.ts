import "@nomiclabs/hardhat-ethers";
import "@nomiclabs/hardhat-etherscan";
import "@typechain/hardhat";
import "hardhat-preprocessor";
import "hardhat-deploy";
import "hardhat-abi-exporter";
import "hardhat-change-network";

import { config as dotenvConfig } from "dotenv";
import type { HardhatUserConfig } from "hardhat/config";
import type {
  HardhatNetworkAccountUserConfig,
  NetworkUserConfig,
} from "hardhat/types";
import { resolve } from "path";
import fs from "fs";

import {eEthereumNetwork} from "./src";
import {
  ARBITRUM_ETHERSCAN_KEY,
  ARBITRUM_GOERLI_ETHERSCAN_KEY,
  BROWSER_URLS,
  CHAIN_ID,
  ETHERSCAN_APIS,
  ETHERSCAN_KEY,
  GOERLI_ETHERSCAN_KEY,
  NETWORKS_RPC_URL
} from "./hardhat-constants";

const dotenvConfigPath: string = process.env.DOTENV_CONFIG_PATH || "./.env";
dotenvConfig({ path: resolve(__dirname, dotenvConfigPath) });

// Ensure that we have all the environment variables we need.
if (!process.env.SOCKET_SIGNER_KEY) throw new Error("No private key found");
const privateKey: HardhatNetworkAccountUserConfig = process.env
  .SOCKET_SIGNER_KEY as unknown as HardhatNetworkAccountUserConfig;

function getChainConfig(network: eEthereumNetwork): NetworkUserConfig {
  return {
    accounts: [`0x${privateKey}`],
    chainId: CHAIN_ID[network],
    url: NETWORKS_RPC_URL[network],
  };
}

function getRemappings() {
  return fs
    .readFileSync("remappings.txt", "utf8")
    .split("\n")
    .filter(Boolean) // remove empty lines
    .map((line) => line.trim().split("="));
}

const config: HardhatUserConfig = {
  defaultNetwork: "hardhat",
  abiExporter: {
    path: "artifacts/abi",
    flat: true,
  },
  etherscan: {
    apiKey: {
        localhost: ETHERSCAN_KEY,
        mainnet: ETHERSCAN_KEY,
        goerli: GOERLI_ETHERSCAN_KEY,
        arbitrum: ARBITRUM_ETHERSCAN_KEY,
        arbitrumGoerli: ARBITRUM_GOERLI_ETHERSCAN_KEY,
    },
    customChains: [
      eEthereumNetwork.mainnet,
      eEthereumNetwork.sepolia,
      eEthereumNetwork.arbitrum,
      eEthereumNetwork.arbitrumSepolia,
    ].map((network) => ({
      network,
      chainId: CHAIN_ID[network]!,
      urls: {
        apiURL: ETHERSCAN_APIS[network],
        browserURL: BROWSER_URLS[network],
      },
    })),
  },
  networks: {
    [eEthereumNetwork.hardhat]: {
      chainId: CHAIN_ID[eEthereumNetwork.hardhat],
    },
    [eEthereumNetwork.mainnet]: getChainConfig(eEthereumNetwork.mainnet),
    [eEthereumNetwork.sepolia]: getChainConfig(eEthereumNetwork.sepolia),
    [eEthereumNetwork.arbitrum]: getChainConfig(eEthereumNetwork.arbitrum),
    [eEthereumNetwork.arbitrumSepolia]: getChainConfig(
        eEthereumNetwork.arbitrumSepolia
    ),
  },
  paths: {
    sources: "./contracts",
    cache: "./cache_hardhat",
    artifacts: "./artifacts",
    tests: "./test",
  },
  // This fully resolves paths for imports in the ./lib directory for Hardhat
  preprocess: {
    eachLine: (hre) => ({
      transform: (line: string) => {
        if (line.match(/^\s*import /i)) {
          getRemappings().forEach(([find, replace]) => {
            if (line.match(find)) {
              line = line.replace(find, replace);
            }
          });
        }
        return line;
      },
    }),
  },
  solidity: {
    version: "0.8.20",
    settings: {
      optimizer: {
        enabled: true,
        runs: 999999,
      },
    },
  },
};

export default config;
