import { config as dotenvConfig } from "dotenv";
dotenvConfig();

import { Contract, Wallet, utils, providers } from "ethers";
import {
  getProviderFromChainSlug,
  getSignerFromChainSlug,
  overrides,
} from "../helpers/networks";
import { ChainSlug, getAddresses } from "@socket.tech/dl-core";
import {
  integrationTypes,
  isAppChain,
  mode,
  projectConstants,
  socketSignerKey,
  token,
  tokenDecimals,
  tokenName,
  tokenSymbol,
} from "../helpers/constants";
import {
  DeployParams,
  createObj,
  getProjectAddresses,
  getOrDeploy,
  storeAddresses,
  deployContractWithArgs,
} from "../helpers/utils";
import {
  AppChainAddresses,
  SuperBridgeContracts,
  NonAppChainAddresses,
  ProjectAddresses,
  TokenAddresses,
  eContractid,
} from "../../src";
import { ethers } from "hardhat";
import { ParallelVault } from "../../typechain-types";

export interface ReturnObj {
  allDeployed: boolean;
  deployedAddresses: TokenAddresses;
}

const globalOveride = {
  gasLimit: "5000000",
  type: 2,
  maxFeePerGas: "30000000000", //30G
  maxPriorityFeePerGas: "1000000000", //1G
};

/**
 * Deploys contracts for all networks
 */
export const main = async () => {
  const chainSlug = ChainSlug.SEPOLIA;
  const signer = getSignerFromChainSlug(chainSlug);

  const aave = "0x6Ae43d3271ff6888e7Fc43Fd7321a503ff738951";
  const proxyAdmin = signer.address;
  const vaultOwner = signer.address;

  console.log("------start");
  const vaultImpl = await deployVaultImpl(signer);

  const aaveStrategyImpl = await deployAAVEStrategyImpl(signer);

  //sepolia
  // const tokens = [
  //     "0xFF34B3d4Aee8ddCd6F9AFFFB6Fe49bD371b8a357",//dai
  //     "0xf8Fb3713D459D7C1018BD0A49D19b4C44290EBE5",//link
  //     "0x94a9D9AC8a22534E3FaCa9F4e7F2E2cf85d5E4C8",//usdc
  //     "0x29f2D40B0605204364af54EC677bD022dA425d03",//wbtc
  //     "0xC558DBdd856501FCd9aaF1E62eae57A9F0629a3c",//weth
  //     "0xaA8E23Fb1079EA71e0a56F48a2aA51851D8433D0",//usdt
  //     "0x88541670E55cC00bEEFD87eB59EDd1b7C511AC9a",//AAVE
  // ];
  //goerli
  const tokens = [
    "0xa59f61b73bF92D9A9B11c73aD1b913E1e79A1fCD", //usdt
    "0xB4FBF271143F4FBf7B91A5ded31805e42b2208d6", //weth
  ];

  for (let i = 0; i < tokens.length; i++) {
    const vault = await deployVault(
      signer,
      vaultImpl,
      tokens[i],
      vaultOwner,
      proxyAdmin
    );

    // await deployAAVEStrategy(signer, aaveStrategyImpl, aave, vault.address, proxyAdmin);
    //
    // await vault.connect(signer).setDebtRatio(10000);
  }
};

const deployVaultImpl = async (signer: Wallet) => {
  const ParallelVaultFactory = await ethers.getContractFactory("ParallelVault");
  const ParallelVaultImpl = await ParallelVaultFactory.connect(signer).deploy({
    ...overrides[await signer.getChainId()],
  });
  console.log(
    "ParallelVaultImpl.deployTransaction.hash:",
    ParallelVaultImpl.deployTransaction.hash
  );
  await ParallelVaultImpl.deployTransaction.wait(1);

  console.log("ParallelVaultImpl deployed to:", ParallelVaultImpl.address);

  return ParallelVaultImpl.address;
};

const deployVault = async (
  signer: Wallet,
  impl: string,
  token: string,
  vaultOwner: string,
  proxyAdmin: string
) => {
  const ParallelVaultFactory = await ethers.getContractFactory("ParallelVault");
  const initData = ParallelVaultFactory.interface.encodeFunctionData(
    "initialize",
    [token, vaultOwner]
  );

  const ParallelProxyFactory = await ethers.getContractFactory("ParallelProxy");
  const ParallelProxy = await ParallelProxyFactory.connect(signer).deploy(
    impl,
    proxyAdmin,
    initData,
    {
      ...overrides[await signer.getChainId()],
    }
  );
  await ParallelProxy.deployTransaction.wait(1);

  console.log("ParallelProxy deployed to:", ParallelProxy.address);
  console.log("impl:", impl);
  console.log("proxyAdmin:", proxyAdmin);
  console.log("initData:", initData);

  return ParallelVaultFactory.attach(ParallelProxy.address) as ParallelVault;
};

const deployAAVEStrategyImpl = async (signer: Wallet) => {
  const AaveStrategyFactory = await ethers.getContractFactory("AaveStrategy");
  const AaveStrategyImpl = await AaveStrategyFactory.connect(signer).deploy({
    ...overrides[await signer.getChainId()],
  });
  await AaveStrategyImpl.deployTransaction.wait(1);

  console.log("AaveStrategyImpl deployed to:", AaveStrategyImpl.address);

  return AaveStrategyImpl.address;
};

const deployAAVEStrategy = async (
  signer: Wallet,
  impl: string,
  aave: string,
  vault: string,
  proxyAdmin: string
) => {
  const AaveStrategyFactory = await ethers.getContractFactory("AaveStrategy");
  const initData = AaveStrategyFactory.interface.encodeFunctionData(
    "initialize",
    [aave, vault]
  );

  const ParallelProxyFactory = await ethers.getContractFactory("ParallelProxy");
  const ParallelProxy = await ParallelProxyFactory.connect(signer).deploy(
    impl,
    proxyAdmin,
    initData,
    {
      ...overrides[await signer.getChainId()],
    }
  );
  await ParallelProxy.deployTransaction.wait(1);

  console.log("AAVEStrategy Proxy deployed to:", ParallelProxy.address);
  console.log("impl:", impl);
  console.log("proxyAdmin:", proxyAdmin);
  console.log("initData:", initData);
};

main()
  .then(() => process.exit(0))
  .catch((error: Error) => {
    console.error(error);
    process.exit(1);
  });
