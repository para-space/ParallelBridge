import {IntegrationTypes } from "./core";

export type tEthereumAddress = string;

export enum ChainSlug {
  ARBITRUM = 42161,
  ARBITRUM_GOERLI = 421613,
  ARBITRUM_SEPOLIA = 421614,
  OPTIMISM = 10,
  OPTIMISM_GOERLI = 420,
  OPTIMISM_SEPOLIA = 11155420,
  BSC = 56,
  BSC_TESTNET = 97,
  MAINNET = 1,
  GOERLI = 5,
  SEPOLIA = 11155111,
  POLYGON_MAINNET = 137,
  POLYGON_MUMBAI = 80001,
  AEVO_TESTNET = 11155112,
  AEVO = 2999,
  HARDHAT = 31337,
  AVALANCHE = 43114,
  LYRA_TESTNET = 901,
  LYRA = 957,
  XAI_TESTNET = 1399904803,
  SX_NETWORK_TESTNET = 647,
  MODE_TESTNET = 919,
  VICTION_TESTNET = 89,
  CDK_TESTNET = 686669576,
  BASE = 8453,
  MODE = 34443
}

export enum eEthereumNetwork {
  hardhat = "hardhat",
  mainnet = "mainnet",
  sepolia = "sepolia",
  arbitrum = "arbitrum",
  arbitrumSepolia = "arbitrumSepolia",
}

export enum eContractid {
  MintableToken = "MintableToken",
  NonMintableToken = "NonMintableToken",
  AaveStrategyImpl = "AaveStrategyImpl",
  VaultImpl = "VaultImpl",
  ParallelProxy = "ParallelProxy",
}

export enum Tokens {
  USDC = "USDC",
  WETH = "WETH",
  // USDT = "USDT",
  // DAI = "DAI",
  // WBTC = "WBTC",
  // stETH = "stETH",
  // rETH = "rETH",
  // cbETH = "cbETH",
}

export interface IConfiguration {
  chainid: number;
  vaultOwner: tEthereumAddress;
  vaultUpgradeAdmin: tEthereumAddress;
  strategyOwner: tEthereumAddress;

}



export enum Project {
  AEVO = "aevo",
  LYRA = "lyra",
  SX_NETWORK_TESTNET = "sx-network-testnet",
  Parallel = "Parallel",
}

export enum SuperBridgeContracts {
  MintableToken = "MintableToken",
  NonMintableToken = "NonMintableToken",
  ParallelVault = "ParallelVault",
  AaveStrategy = "AaveStrategy",
  VaultProxy = "VaultProxy",
  VaultImpl = "VaultImpl",
  Controller = "Controller",
  FiatTokenV2_1_Controller = "FiatTokenV2_1_Controller",
  ExchangeRate = "ExchangeRate",
  ConnectorPlug = "ConnectorPlug",
}

export type ProjectAddresses = {
  [chainSlug in ChainSlug]?: ChainAddresses;
};

export type ChainAddresses = {
  [token in Tokens]?: TokenAddresses;
};

export type TokenAddresses = AppChainAddresses | NonAppChainAddresses;

export interface AppChainAddresses {
  isAppChain: true;
  [SuperBridgeContracts.MintableToken]?: string;
  [SuperBridgeContracts.Controller]?: string;
  [SuperBridgeContracts.ExchangeRate]?: string;
  connectors?: Connectors;
}

export interface NonAppChainAddresses {
  isAppChain: false;
  [SuperBridgeContracts.NonMintableToken]?: string;
  [SuperBridgeContracts.VaultProxy]?: string;
  [SuperBridgeContracts.VaultImpl]?: string;
  [SuperBridgeContracts.AaveStrategy]?: string;
  connectors?: Connectors;
}

export type Connectors = {
  [chainSlug in ChainSlug]?: ConnectorAddresses;
};

export type ConnectorAddresses = {
  [integration in IntegrationTypes]?: string;
};

// export const ChainSlugToProject: { [chainSlug in ChainSlug]?: Project } = {
//   [ChainSlug.SEPOLIA]: Project.Sepolia,
// };
