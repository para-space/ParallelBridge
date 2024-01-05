import { config as dotenvConfig } from "dotenv";
import { BigNumberish, Wallet, ethers } from "ethers";
import { resolve } from "path";
import { socketSignerKey } from "./constants";
import {
  ChainSlug
} from "../../src";

const dotenvConfigPath: string = process.env.DOTENV_CONFIG_PATH || "./.env";
dotenvConfig({ path: resolve(__dirname, dotenvConfigPath) });


export const gasLimit = undefined;
export const gasPrice = undefined;
export const type = 2;

export const overrides: {
  [chain in ChainSlug]?: {
    type?: number | undefined;
    gasLimit: BigNumberish | undefined;
    gasPrice: BigNumberish | undefined;
  };
} = {
  [ChainSlug.ARBITRUM_SEPOLIA]: {
    type,
    gasLimit: 20_000_000,
    gasPrice,
  },
  [ChainSlug.SEPOLIA]: {
    type: 1,
    gasLimit,
    gasPrice: 10_000_000_000,
  },
  [ChainSlug.ARBITRUM]: {
    type,
    gasLimit: 20_000_000,
    gasPrice,
  },
  [ChainSlug.MAINNET]: {
    type: 1,
    gasLimit: 400_000,
    gasPrice: 25_000_000_000,
  },
  [ChainSlug.MODE_TESTNET]: {
    type: 1,
    gasLimit: 3_000_000,
    gasPrice: 100_000_000,
  },
};

export function getJsonRpcUrl(chain: ChainSlug): string {
  switch (chain) {
    case ChainSlug.ARBITRUM:
      if (!process.env.ARBITRUM_RPC)
        throw new Error("ARBITRUM_RPC not configured");
      return process.env.ARBITRUM_RPC;

    case ChainSlug.ARBITRUM_SEPOLIA:
      if (!process.env.ARB_SEPOLIA_RPC)
        throw new Error("ARB_SEPOLIA_RPC not configured");
      return process.env.ARB_SEPOLIA_RPC;

    case ChainSlug.MAINNET:
      if (!process.env.ETHEREUM_RPC)
        throw new Error("ETHEREUM_RPC not configured");
      return process.env.ETHEREUM_RPC;

    case ChainSlug.SEPOLIA:
      if (!process.env.SEPOLIA_RPC)
        throw new Error("SEPOLIA_RPC not configured");
      return process.env.SEPOLIA_RPC;

    // case ChainSlug.MODE_TESTNET:
    //   if (!process.env.MODE_TESTNET_RPC)
    //     throw new Error("MODE_TESTNET_RPC not configured");
    //   return process.env.MODE_TESTNET_RPC;

    case ChainSlug.HARDHAT:
      return "http://127.0.0.1:8545/";

    default:
      throw new Error(`Chain RPC not supported ${chain}`);
  }
}

export const getProviderFromChainSlug = (
  chainSlug: ChainSlug
): ethers.providers.StaticJsonRpcProvider => {
  const jsonRpcUrl = getJsonRpcUrl(chainSlug);
  return new ethers.providers.StaticJsonRpcProvider(jsonRpcUrl);
};

export const getSignerFromChainSlug = (chainSlug: ChainSlug): Wallet => {
  return new Wallet(socketSignerKey, getProviderFromChainSlug(chainSlug));
};
