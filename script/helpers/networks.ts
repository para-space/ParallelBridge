import { config as dotenvConfig } from "dotenv";
import { BigNumberish } from "ethers";
import { resolve } from "path";
import { eEthereumNetwork } from "../../script/types";

const dotenvConfigPath: string = process.env.DOTENV_CONFIG_PATH || "./.env";
dotenvConfig({ path: resolve(__dirname, dotenvConfigPath) });

export const gasLimit = undefined;
export const gasPrice = undefined;
export const type = 2;

export const overrides: {
  [network in eEthereumNetwork]?: {
    type: number | undefined;
    gasLimit: BigNumberish | undefined;
    gasPrice?: BigNumberish;
    maxFeePerGas?: BigNumberish;
    maxPriorityFeePerGas?: BigNumberish;
  };
} = {
  [eEthereumNetwork.hardhat]: {
    type,
    gasLimit: 20_000_000,
  },
  [eEthereumNetwork.mainnet]: {
    type: 2,
    gasLimit,
    maxFeePerGas: 30_000_000_000,
    maxPriorityFeePerGas: 1_000_000_000,
  },
  [eEthereumNetwork.sepolia]: {
    type: 2,
    gasLimit,
    maxFeePerGas: 30_000_000_000,
    maxPriorityFeePerGas: 1_000_000_000,
  },
  [eEthereumNetwork.arbitrum]: {
    type,
    gasLimit: 20_000_000,
    gasPrice,
  },
  [eEthereumNetwork.arbitrumSepolia]: {
    type: 1,
    gasLimit: 3_000_000,
    gasPrice: 100_000_000,
  },
};
