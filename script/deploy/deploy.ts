import { config as dotenvConfig } from "dotenv";
dotenvConfig();

import { Wallet } from "ethers";
import {
  overrides,
} from "../helpers/networks";
import {
getMarketConfig, getSinger,
} from "../helpers/utils";
import {
Strategy,
} from "../../src";
import { ethers } from "hardhat";
import { ParallelVault } from "../../typechain-types";

/**
 * Deploys contracts for all networks
 */
export const main = async () => {

  const marketConfig = getMarketConfig();
  const signer = getSinger();

  const vaultImpl = await deployVaultImpl(signer);

  const aaveStrategyImpl = await deployAAVEStrategyImpl(signer);

  for (const key in marketConfig.Tokens) {
    if (Object.prototype.hasOwnProperty.call(marketConfig.Tokens, key)) {
      const tokenConfig = marketConfig.Tokens[key];

      const vault = await deployVault(
          signer,
          vaultImpl,
          tokenConfig.address,
          marketConfig.vaultOwner,
          marketConfig.upgradeAdmin
      );

      switch (tokenConfig.strategy) {
        case Strategy.AAVE:
          await deployAAVEStrategy(signer, aaveStrategyImpl, tokenConfig.strategyPool, vault.address, marketConfig.upgradeAdmin);
          break;
        default:
          console.log("no strategy");
      }
    }
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
