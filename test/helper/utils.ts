import {
  AaveStrategy,
  ETHAaveStrategy,
  MintableERC20,
  MockAAVE,
  MockLido,
  MockWstETH,
  XERC20,
  XERC20Factory,
  XERC20Lockbox,
} from "../../typechain-types";
import {
  deployAAVEStrategy,
  deployAAVEStrategyImpl,
  deployETHAAVEStrategy,
  deployFactory,
  deployMintableERC20,
  deployMOCKAAVE,
  deployMOCKLICO,
  deployMOCKWSTETH,
} from "../../script/helpers/deployment";
import { ZEROADDRESS } from "../../script/helpers/constants";

const hre = require("hardhat");

export const MAX_UINT_AMOUNT =
  "115792089237316195423570985008687907853269984665640564039457584007913129639935";

export interface TestDeploymentEnv {
  erc20: MintableERC20;
  xERC20: XERC20;
  lockBox: XERC20Lockbox;
  ethXERC20: XERC20;
  ethLockBox: XERC20Lockbox;
  aaveStrategy: AaveStrategy;
  ethStrategy: ETHAaveStrategy;
  aave: MockAAVE;
  lido: MockLido;
}

export const deployFixture = async function () {
  const [, user1] = await hre.ethers.getSigners();

  const erc20: MintableERC20 = await deployMintableERC20();
  const tokenAddress = await erc20.getAddress();
  const aave: MockAAVE = await deployMOCKAAVE();
  const lido: MockLido = await deployMOCKLICO();
  const wstETH: MockWstETH = await deployMOCKWSTETH(await lido.getAddress());

  const factory: XERC20Factory = await deployFactory();
  const lockBoxFactory = await hre.ethers.getContractFactory("XERC20Lockbox");
  const xERC20Factory = await hre.ethers.getContractFactory("XERC20");

  await factory.deployToken(
    tokenAddress,
    false,
    "Test Token Name",
    "Test Token symbol",
    [],
    [],
    []
  );
  const testLockBoxAddress = await factory.lockboxRegistry(tokenAddress);
  const lockBox = lockBoxFactory.attach(testLockBoxAddress);
  let xERC20Address = await lockBox.XERC20();
  const xERC20: XERC20 = xERC20Factory.attach(xERC20Address);

  await factory.deployToken(
    ZEROADDRESS,
    true,
    "ETHXERC20",
    "ETHXERC20",
    [],
    [],
    []
  );
  const ethLockBoxAddress = await factory.lockboxRegistry(ZEROADDRESS);
  const ethLockBox = lockBoxFactory.attach(ethLockBoxAddress);
  xERC20Address = await ethLockBox.XERC20();
  const ethXERC20: XERC20 = xERC20Factory.attach(xERC20Address);

  const aaveStrategyImpl = await deployAAVEStrategyImpl();
  const aaveStrategy = await deployAAVEStrategy(
    aaveStrategyImpl,
    await aave.getAddress(),
    testLockBoxAddress,
    await user1.getAddress()
  );

  const ethStrategy = await deployETHAAVEStrategy(
    await wstETH.getAddress(),
    await aave.getAddress(),
    ethLockBoxAddress,
    await user1.getAddress()
  );

  await lockBox.setStrategy(await aaveStrategy.getAddress());
  await ethLockBox.setStrategy(await ethStrategy.getAddress());

  return {
    erc20: erc20,
    xERC20: xERC20,
    lockBox: lockBox,
    ethXERC20: ethXERC20,
    ethLockBox: ethLockBox,
    aaveStrategy: aaveStrategy,
    ethStrategy: ethStrategy,
    aave: aave,
    lido: lido,
  } as TestDeploymentEnv;
};
