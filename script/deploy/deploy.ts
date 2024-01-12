import { config as dotenvConfig } from "dotenv";
dotenvConfig();

import { Wallet } from "ethers";
import { overrides } from "../helpers/networks";
import { getMarketConfig, getSinger } from "../helpers/utils";
import { Strategy, tEthereumAddress } from "../../src";
import { ethers } from "hardhat";
import { ERC20, ParallelVault } from "../../typechain-types";
import { ZEROADDRESS } from "../helpers/constants";

/**
 * Deploys contracts for all networks
 */
export const main = async () => {
  const marketConfig = getMarketConfig();
  const signer = getSinger();

  const factory = await deployFactory(signer);

  const aaveStrategyImpl = await deployAAVEStrategyImpl(signer);

  //deploy xToken and vault
  for (const key in marketConfig.Tokens) {
    if (Object.prototype.hasOwnProperty.call(marketConfig.Tokens, key)) {
      const tokenConfig = marketConfig.Tokens[key];

      const token = await getERC20(tokenConfig.address);
      const tokenSymbol = await token.symbol();
      const tokenName = await token.name();
      //issue is here
      const xToken = await factory
        .connect(signer)
        .deployXERC20(`x${tokenName}`, `x${tokenSymbol}`, factory.address);
      const vault = await factory
        .connect(signer)
        .deployLockbox(
          xToken.address,
          tokenConfig.address,
          tokenConfig.address === ZEROADDRESS
        );

      let strategy;
      switch (tokenConfig.strategy) {
        case Strategy.AAVE:
          strategy = await deployAAVEStrategy(
            signer,
            aaveStrategyImpl,
            tokenConfig.strategyPool,
            vault.address,
            marketConfig.upgradeAdmin
          );
          break;
        case Strategy.ETHAAVE:
          strategy = await deployETHAAVEStrategy(
            signer,
            marketConfig.wstETH!,
            tokenConfig.strategyPool,
            vault.address,
            marketConfig.upgradeAdmin
          );
          break;
        default:
          throw new Error("invalid strategy");
      }

      await vault.connect(signer).setStrategy(strategy);
    }
  }
};

const getERC20 = async (address: tEthereumAddress) => {
  const ERC20Factory = await ethers.getContractFactory("ERC20");
  return ERC20Factory.attach(address) as ERC20;
};

const deployFactory = async (signer: Wallet) => {
  const XERC20FactoryFactory = await ethers.getContractFactory("XERC20Factory");
  const XERC20Factory = await XERC20FactoryFactory.connect(signer).deploy({
    ...overrides[await signer.getChainId()],
  });
  console.log(
    "XERC20Factory.deployTransaction.hash:",
    XERC20Factory.deployTransaction.hash
  );
  await XERC20Factory.deployTransaction.wait(1);

  console.log("XERC20Factory deployed to:", XERC20Factory.address);

  return XERC20FactoryFactory.attach(XERC20Factory.address);
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
  impl: tEthereumAddress,
  aave: tEthereumAddress,
  vault: tEthereumAddress,
  proxyAdmin: tEthereumAddress
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

  return ParallelProxy.address;
};

const deployETHAAVEStrategy = async (
  signer: Wallet,
  wstETH: tEthereumAddress,
  aave: tEthereumAddress,
  vault: tEthereumAddress,
  proxyAdmin: tEthereumAddress
) => {
  const ETHAaveStrategyFactory = await ethers.getContractFactory(
    "ETHAaveStrategy"
  );
  const IMPL = await ETHAaveStrategyFactory.connect(signer).deploy(
    wstETH,
    aave,
    vault,
    {
      ...overrides[await signer.getChainId()],
    }
  );
  await IMPL.deployTransaction.wait(1);
  console.log("ETHAAVEStrategy IMPL deployed to:", IMPL.address);
  console.log("wstETH:", wstETH);
  console.log("aave:", aave);
  console.log("vault:", vault);

  const initData = ETHAaveStrategyFactory.interface.encodeFunctionData(
    "initialize",
    []
  );
  const ParallelProxyFactory = await ethers.getContractFactory("ParallelProxy");
  const ParallelProxy = await ParallelProxyFactory.connect(signer).deploy(
    IMPL.address,
    proxyAdmin,
    initData,
    {
      ...overrides[await signer.getChainId()],
    }
  );
  await ParallelProxy.deployTransaction.wait(1);

  console.log("ETHAAVEStrategy Proxy deployed to:", ParallelProxy.address);
  console.log("impl:", IMPL.address);
  console.log("proxyAdmin:", proxyAdmin);
  console.log("initData:", initData);

  return ParallelProxy.address;
};

main()
  .then(() => process.exit(0))
  .catch((error: Error) => {
    console.error(error);
    process.exit(1);
  });
