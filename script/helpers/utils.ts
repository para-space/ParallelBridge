import { Wallet } from "ethers";
import { network, ethers, run } from "hardhat";
import { Contract } from "ethers";
import { Address } from "hardhat-deploy/dist/types";
import {
  EAConfigs,
socketSignerKey,
} from "./constants";
import {IConfiguration} from "../../src";
import {NETWORKS_RPC_URL} from "../../hardhat-constants";

export const sleep = (delay: number) =>
  new Promise((resolve) => setTimeout(resolve, delay * 1000));

export const getInstance = async (
  contractName: string,
  address: Address
): Promise<Contract> => ethers.getContractAt(contractName, address);

export const createObj = function (obj: any, keys: string[], value: any): any {
  if (keys.length === 1) {
    obj[keys[0]] = value;
  } else {
    const key = keys.shift();
    if (key === undefined) return obj;
    obj[key] = createObj(
      typeof obj[key] === "undefined" ? {} : obj[key],
      keys,
      value
    );
  }
  return obj;
};

export const getMarketConfig = (): IConfiguration => {
  return EAConfigs[network.name];
};

export const getSinger =  (): Wallet => {
  return new Wallet(socketSignerKey, NETWORKS_RPC_URL[network.name]);
}
