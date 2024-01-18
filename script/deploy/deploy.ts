import { config as dotenvConfig } from "dotenv";
dotenvConfig();
import { getMarketConfig } from "../helpers/utils";
import { Strategy } from "../../src";
import hre, { ethers } from "hardhat";
import { XERC20Factory, XERC20Lockbox } from "../../typechain-types";
import { ZEROADDRESS } from "../helpers/constants";
import {
  deployAAVEStrategy,
  deployAAVEStrategyImpl,
  deployETHAAVEStrategy,
  deployFactory,
  getERC20,
} from "../helpers/deployment";

/**
 * Deploys contracts for all networks
 */
export const main = async () => {
  const marketConfig = getMarketConfig();

  const factory: XERC20Factory = await deployFactory();

  const aaveStrategyImpl = await deployAAVEStrategyImpl();

  //deploy xToken and vault
  for (const key in marketConfig.Tokens) {
    if (Object.prototype.hasOwnProperty.call(marketConfig.Tokens, key)) {
      const tokenConfig = marketConfig.Tokens[key];

      const token = await getERC20(tokenConfig.address);
      const tokenSymbol = await token.symbol();
      const tokenName = await token.name();
      await factory.deployToken(
        tokenConfig.address,
        tokenConfig.address === ZEROADDRESS,
        `x${tokenName}`,
        `x${tokenSymbol}`,
        [],
        [],
        []
      );

      const lockBox = await factory.lockboxRegistry(tokenConfig.address);

      let strategy;
      switch (tokenConfig.strategy) {
        case Strategy.AAVE:
          strategy = await deployAAVEStrategy(
            aaveStrategyImpl,
            tokenConfig.strategyPool,
            lockBox,
            marketConfig.upgradeAdmin
          );
          break;
        case Strategy.ETHAAVE:
          strategy = await deployETHAAVEStrategy(
            marketConfig.wstETH!,
            tokenConfig.strategyPool,
            lockBox,
            marketConfig.upgradeAdmin
          );
          break;
        default:
          throw new Error("invalid strategy");
      }

      const lockboxFactory = await ethers.getContractFactory("XERC20Lockbox");
      const lockBoxContract = lockboxFactory.attach(
        lockBox
      ) as unknown as XERC20Lockbox;
      await lockBoxContract.setStrategy(strategy);
    }
  }
};

main()
  .then(() => process.exit(0))
  .catch((error: Error) => {
    console.error(error);
    process.exit(1);
  });
