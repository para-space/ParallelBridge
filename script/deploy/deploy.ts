import { config as dotenvConfig } from "dotenv";
dotenvConfig();

import { Contract, Wallet, utils } from "ethers";
import { getSignerFromChainSlug } from "../helpers/networks";
import { ChainSlug, getAddresses } from "@socket.tech/dl-core";
import {
  integrationTypes,
  isAppChain,
  mode,
  projectConstants,
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
  storeAddresses, deployContractWithArgs,
} from "../helpers/utils";
import {
  AppChainAddresses,
  SuperBridgeContracts,
  NonAppChainAddresses,
  ProjectAddresses,
  TokenAddresses, ParallelContracts,
} from "../../src";

export interface ReturnObj {
  allDeployed: boolean;
  deployedAddresses: TokenAddresses;
}

/**
 * Deploys contracts for all networks
 */
export const main = async () => {

  deployContractWithArgs()
  // try {
  //   let addresses: ProjectAddresses;
  //   try {
  //     addresses = await getProjectAddresses();
  //   } catch (error) {
  //     addresses = {} as ProjectAddresses;
  //   }
  //
  //   await Promise.all(
  //     [projectConstants.appChain, ...projectConstants.nonAppChains].map(
  //       async (chain: ChainSlug) => {
  //         let allDeployed = false;
  //         const signer = getSignerFromChainSlug(chain);
  //
  //         let chainAddresses: TokenAddresses = addresses[chain]?.[token]
  //           ? (addresses[chain]?.[token] as TokenAddresses)
  //           : ({} as TokenAddresses);
  //
  //         const siblings = isAppChain(chain)
  //           ? projectConstants.nonAppChains
  //           : [projectConstants.appChain];
  //
  //         while (!allDeployed) {
  //           const results: ReturnObj = await deploy(
  //             isAppChain(chain),
  //             signer,
  //             chain,
  //             siblings,
  //             chainAddresses
  //           );
  //
  //           allDeployed = results.allDeployed;
  //           chainAddresses = results.deployedAddresses;
  //         }
  //       }
  //     )
  //   );
  // } catch (error) {
  //   console.log("Error in deploying contracts", error);
  // }
};

const deployVaultImpl = async (
    signer: Wallet,
    deployParams: DeployParams
): Promise<DeployParams> => {
  const vaultImpl: Contract = await getOrDeploy(
      ParallelContracts.ParallelVault,
      "contracts/superbridge/ParallelVault.sol",
      [],
      deployParams
      );

  deployParams.addresses = createObj(
      deployParams.addresses,
      ["ParallelVault"],
      vaultImpl.address
  );

  return deployParams;
}

/**
 * Deploys network-independent contracts
 */
const deploy = async (
  isAppChain: boolean,
  socketSigner: Wallet,
  chainSlug: number,
  siblings: number[],
  deployedAddresses: TokenAddresses
): Promise<ReturnObj> => {
  let allDeployed = false;

  let deployUtils: DeployParams = {
    addresses: deployedAddresses,
    signer: socketSigner,
    currentChainSlug: chainSlug,
  };

  try {
    deployUtils.addresses.isAppChain = isAppChain;
    if (isAppChain) {
      deployUtils = await deployAppChainContracts(deployUtils);
    } else {
      deployUtils = await deployNonAppChainContracts(deployUtils);
    }

    for (let sibling of siblings) {
      deployUtils = await deployConnectors(sibling, deployUtils);
    }
    allDeployed = true;
    console.log(deployUtils.addresses);
    console.log("Contracts deployed!");
  } catch (error) {
    console.log(
      `Error in deploying setup contracts for ${deployUtils.currentChainSlug}`,
      error
    );
  }

  await storeAddresses(deployUtils.addresses, deployUtils.currentChainSlug);
  return {
    allDeployed,
    deployedAddresses: deployUtils.addresses,
  };
};

const deployConnectors = async (
  sibling: ChainSlug,
  deployParams: DeployParams
): Promise<DeployParams> => {
  try {
    if (!deployParams.addresses) throw new Error("Addresses not found!");

    const socket: string = getAddresses(
      deployParams.currentChainSlug,
      mode
    ).Socket;
    let hub: string;
    const addr: TokenAddresses = deployParams.addresses;
    if (addr.isAppChain) {
      const a = addr as AppChainAddresses;
      if (!a.Controller) throw new Error("Controller not found!");
      hub = a.Controller;
    } else {
      const a = addr as NonAppChainAddresses;
      if (!a.Vault) throw new Error("Vault not found!");
      hub = a.Vault;
    }

    for (let intType of integrationTypes) {
      console.log(hub, socket, sibling);
      const connector: Contract = await getOrDeploy(
        SuperBridgeContracts.ConnectorPlug,
        "contracts/superbridge/ConnectorPlug.sol",
        [hub, socket, sibling],
        deployParams
      );

      console.log("connectors", sibling.toString(), intType, connector.address);

      deployParams.addresses = createObj(
        deployParams.addresses,
        ["connectors", sibling.toString(), intType],
        connector.address
      );
    }

    console.log(deployParams.addresses);
    console.log("Connector Contracts deployed!");
  } catch (error) {
    console.log("Error in deploying connector contracts", error);
  }

  return deployParams;
};

const deployAppChainContracts = async (
  deployParams: DeployParams
): Promise<DeployParams> => {
  try {
    const exchangeRate: Contract = await getOrDeploy(
      SuperBridgeContracts.ExchangeRate,
      "contracts/superbridge/ExchangeRate.sol",
      [],
      deployParams
    );
    deployParams.addresses[SuperBridgeContracts.ExchangeRate] =
      exchangeRate.address;

    if (!deployParams.addresses[SuperBridgeContracts.MintableToken])
      throw new Error("Token not found on app chain");

    const controller: Contract = await getOrDeploy(
      projectConstants.isFiatTokenV2_1
        ? SuperBridgeContracts.FiatTokenV2_1_Controller
        : SuperBridgeContracts.Controller,
      projectConstants.isFiatTokenV2_1
        ? "contracts/superbridge/FiatTokenV2_1/FiatTokenV2_1_Controller.sol"
        : "contracts/superbridge/Controller.sol",
      [
        deployParams.addresses[SuperBridgeContracts.MintableToken],
        exchangeRate.address,
      ],
      deployParams
    );
    deployParams.addresses[SuperBridgeContracts.Controller] =
      controller.address;
    console.log(deployParams.addresses);
    console.log("Chain Contracts deployed!");
  } catch (error) {
    console.log("Error in deploying chain contracts", error);
  }
  return deployParams;
};

const deployNonAppChainContracts = async (
  deployParams: DeployParams
): Promise<DeployParams> => {
  try {
    if (!deployParams.addresses[SuperBridgeContracts.NonMintableToken])
      throw new Error("Token not found on chain");

    const vault: Contract = await getOrDeploy(
      SuperBridgeContracts.Vault,
      "contracts/superbridge/Vault.sol",
      [deployParams.addresses[SuperBridgeContracts.NonMintableToken]],
      deployParams
    );
    deployParams.addresses[SuperBridgeContracts.Vault] = vault.address;
    console.log(deployParams.addresses);
    console.log("Chain Contracts deployed!");
  } catch (error) {
    console.log("Error in deploying chain contracts", error);
  }
  return deployParams;
};

main()
  .then(() => process.exit(0))
  .catch((error: Error) => {
    console.error(error);
    process.exit(1);
  });
