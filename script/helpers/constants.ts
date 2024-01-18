import { config as dotenvConfig } from "dotenv";
dotenvConfig();

import { eEthereumNetwork, IConfiguration, Strategy } from "../types";

export const ZEROADDRESS = "0x0000000000000000000000000000000000000000";

export const SepoliaConfig: IConfiguration = {
  upgradeAdmin: "0x018281853eCC543Aa251732e8FDaa7323247eBeB",
  vaultOwner: "0x018281853eCC543Aa251732e8FDaa7323247eBeB",
  Tokens: {
    DAI: {
      address: "0xFF34B3d4Aee8ddCd6F9AFFFB6Fe49bD371b8a357",
      strategy: Strategy.AAVE,
      strategyPool: "0x6Ae43d3271ff6888e7Fc43Fd7321a503ff738951",
    },
    LINK: {
      address: "0xf8Fb3713D459D7C1018BD0A49D19b4C44290EBE5",
      strategy: Strategy.AAVE,
      strategyPool: "0x6Ae43d3271ff6888e7Fc43Fd7321a503ff738951",
    },
    USDC: {
      address: "0x94a9D9AC8a22534E3FaCa9F4e7F2E2cf85d5E4C8",
      strategy: Strategy.AAVE,
      strategyPool: "0x6Ae43d3271ff6888e7Fc43Fd7321a503ff738951",
    },
    WBTC: {
      address: "0x29f2D40B0605204364af54EC677bD022dA425d03",
      strategy: Strategy.AAVE,
      strategyPool: "0x6Ae43d3271ff6888e7Fc43Fd7321a503ff738951",
    },
    WETH: {
      address: "0xC558DBdd856501FCd9aaF1E62eae57A9F0629a3c",
      strategy: Strategy.ETHAAVE,
      strategyPool: "0x6Ae43d3271ff6888e7Fc43Fd7321a503ff738951",
    },
    USDT: {
      address: "0xaA8E23Fb1079EA71e0a56F48a2aA51851D8433D0",
      strategy: Strategy.AAVE,
      strategyPool: "0x6Ae43d3271ff6888e7Fc43Fd7321a503ff738951",
    },
    AAVE: {
      address: "0x88541670E55cC00bEEFD87eB59EDd1b7C511AC9a",
      strategy: Strategy.AAVE,
      strategyPool: "0x6Ae43d3271ff6888e7Fc43Fd7321a503ff738951",
    },
  },
};

export const EAConfigs: Partial<Record<eEthereumNetwork, IConfiguration>> = {
  //[eEthereumNetwork.hardhat]: HardhatConfig,
  //[eEthereumNetwork.mainnet]: MainnetConfig,
  [eEthereumNetwork.sepolia]: SepoliaConfig,
  //[eEthereumNetwork.arbitrum]: ArbitrumConfig,
};
