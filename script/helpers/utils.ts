import { network } from "hardhat";
import { EAConfigs } from "./constants";
import { IConfiguration } from "../../src";

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
