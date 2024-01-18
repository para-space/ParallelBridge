import { tEthereumAddress } from "../../src";
import hre, { ethers } from "hardhat";
import {
  AaveStrategy,
  ERC20,
  ETHAaveStrategy,
  MintableERC20,
  MockAAVE,
  MockLido,
  MockWstETH,
  XERC20,
  XERC20Factory,
} from "../../typechain-types";
import { overrides } from "./networks";

export const getERC20 = async (address: tEthereumAddress) => {
  const ERC20Factory = await ethers.getContractFactory("ERC20");
  return ERC20Factory.attach(address) as unknown as ERC20;
};

export const deployFactory = async () => {
  const XERC20FactoryFactory = await ethers.getContractFactory("XERC20Factory");
  const XERC20Factory = await XERC20FactoryFactory.deploy({
    ...overrides[hre.network.name],
  });
  console.log(
    "XERC20Factory.deployTransaction.hash:",
    XERC20Factory.deploymentTransaction().hash
  );
  await XERC20Factory.deploymentTransaction().wait(1);

  console.log("XERC20Factory deployed to:", await XERC20Factory.getAddress());

  return XERC20FactoryFactory.attach(
    await XERC20Factory.getAddress()
  ) as unknown as XERC20Factory;
};

export const deployAAVEStrategyImpl = async () => {
  const AaveStrategyFactory = await ethers.getContractFactory("AaveStrategy");
  const AaveStrategyImpl = await AaveStrategyFactory.deploy({
    ...overrides[hre.network.name],
  });
  await AaveStrategyImpl.deploymentTransaction().wait(1);
  const implAddress = await AaveStrategyImpl.getAddress();

  console.log("AaveStrategyImpl deployed to:", implAddress);

  return implAddress;
};

export const deployAAVEStrategy = async (
  impl: tEthereumAddress,
  aave: tEthereumAddress,
  vault: tEthereumAddress,
  proxyAdmin: tEthereumAddress
) => {
  console.log("impl:", impl);
  console.log("aave:", aave);
  console.log("vault:", vault);
  console.log("proxyAdmin:", proxyAdmin);
  const AaveStrategyFactory = await ethers.getContractFactory("AaveStrategy");
  const initData = AaveStrategyFactory.interface.encodeFunctionData(
    "initialize",
    [aave, vault]
  );

  const ParallelProxyFactory = await ethers.getContractFactory("ParallelProxy");
  const ParallelProxy = await ParallelProxyFactory.deploy(
    impl,
    proxyAdmin,
    initData,
    {
      ...overrides[hre.network.name],
    }
  );
  await ParallelProxy.deploymentTransaction().wait(1);

  console.log(
    "AAVEStrategy Proxy deployed to:",
    await ParallelProxy.getAddress()
  );
  console.log("impl:", impl);
  console.log("proxyAdmin:", proxyAdmin);
  console.log("initData:", initData);

  return AaveStrategyFactory.attach(
    await ParallelProxy.getAddress()
  ) as unknown as AaveStrategy;
};

export const deployETHAAVEStrategy = async (
  wstETH: tEthereumAddress,
  aave: tEthereumAddress,
  vault: tEthereumAddress,
  proxyAdmin: tEthereumAddress
) => {
  const ETHAaveStrategyFactory = await ethers.getContractFactory(
    "ETHAaveStrategy"
  );
  const IMPL = await ETHAaveStrategyFactory.deploy(wstETH, aave, vault, {
    ...overrides[hre.network.name],
  });
  await IMPL.deploymentTransaction().wait(1);
  console.log("ETHAAVEStrategy IMPL deployed to:", await IMPL.getAddress());
  console.log("wstETH:", wstETH);
  console.log("aave:", aave);
  console.log("vault:", vault);

  const initData = ETHAaveStrategyFactory.interface.encodeFunctionData(
    "initialize",
    []
  );
  const ParallelProxyFactory = await ethers.getContractFactory("ParallelProxy");
  const ParallelProxy = await ParallelProxyFactory.deploy(
    await IMPL.getAddress(),
    proxyAdmin,
    initData,
    {
      ...overrides[hre.network.name],
    }
  );
  await ParallelProxy.deploymentTransaction().wait(1);
  const proxyAddr = await ParallelProxy.getAddress();

  console.log("ETHAAVEStrategy Proxy deployed to:", proxyAddr);
  console.log("impl:", await IMPL.getAddress());
  console.log("proxyAdmin:", proxyAdmin);
  console.log("initData:", initData);

  return ETHAaveStrategyFactory.attach(proxyAddr) as unknown as ETHAaveStrategy;
};

export const deployMOCKAAVE = async () => {
  const MockAAVEFactory = await ethers.getContractFactory("MockAAVE");

  const aave = await MockAAVEFactory.deploy({
    ...overrides[hre.network.name],
  });
  await aave.deploymentTransaction().wait(1);

  return aave as unknown as MockAAVE;
};

export const deployMOCKLICO = async () => {
  const MockLIDOFactory = await ethers.getContractFactory("MockLido");

  const lido = await MockLIDOFactory.deploy({
    ...overrides[hre.network.name],
  });
  await lido.deploymentTransaction().wait(1);

  return lido as unknown as MockLido;
};

export const deployMOCKWSTETH = async (stETH: tEthereumAddress) => {
  const MockWstETHFactory = await ethers.getContractFactory("MockWstETH");

  const wstETH = await MockWstETHFactory.deploy(stETH, {
    ...overrides[hre.network.name],
  });
  await wstETH.deploymentTransaction().wait(1);

  return wstETH as unknown as MockWstETH;
};

export const deployMintableERC20 = async () => {
  const MintableERC20Factory = await ethers.getContractFactory("MintableERC20");

  const token = await MintableERC20Factory.deploy(
    "Test Token Name",
    "Test Token symbol",
    {
      ...overrides[hre.network.name],
    }
  );
  await token.deploymentTransaction().wait(1);

  return token as unknown as MintableERC20;
};
