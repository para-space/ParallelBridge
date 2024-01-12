import { config as dotenvConfig } from "dotenv";

export const INFURA_KEY = process.env.INFURA_KEY || "";
export const ALCHEMY_KEY = process.env.ALCHEMY_KEY || "";

export const ETHERSCAN_KEY = process.env.ETHERSCAN_KEY || "";
export const GOERLI_ETHERSCAN_KEY =
  process.env.GOERLI_ETHERSCAN_KEY || ETHERSCAN_KEY;
export const ARBITRUM_ETHERSCAN_KEY =
  process.env.ARBITRUM_ETHERSCAN_KEY || ETHERSCAN_KEY;
export const ARBITRUM_GOERLI_ETHERSCAN_KEY =
  process.env.ARBITRUM_GOERLI_ETHERSCAN_KEY || ARBITRUM_ETHERSCAN_KEY;
export const POLYGON_ETHERSCAN_KEY =
  process.env.POLYGON_ETHERSCAN_KEY || ETHERSCAN_KEY;
export const POLYGON_MUMBAI_ETHERSCAN_KEY =
  process.env.POLYGON_MUMBAI_ETHERSCAN_KEY || POLYGON_ETHERSCAN_KEY;
export const POLYGON_ZKEVM_ETHERSCAN_KEY =
  process.env.POLYGON_ZKEVM_ETHERSCAN_KEY || POLYGON_ETHERSCAN_KEY;
export const POLYGON_ZKEVM_GOERLI_ETHERSCAN_KEY =
  process.env.POLYGON_ZKEVM_GOERLI_ETHERSCAN_KEY || POLYGON_ZKEVM_ETHERSCAN_KEY;
export const MOONBEAM_ETHERSCAN_KEY =
  process.env.MOONBEAM_ETHERSCAN_KEY || ETHERSCAN_KEY;
export const MOONBASE_ETHERSCAN_KEY =
  process.env.MOONBASE_ETHERSCAN_KEY || MOONBEAM_ETHERSCAN_KEY;
export const LINEA_ETHERSCAN_KEY =
  process.env.LINEA_ETHERSCAN_KEY || ETHERSCAN_KEY;
export const LINEA_GOERLI_ETHERSCAN_KEY =
  process.env.LINEA_GOERLI_ETHERSCAN_KEY || LINEA_ETHERSCAN_KEY;

export const CHAIN_ID = {
  hardhat: 31337,
  mainnet: 1,
  sepolia: 11155111,
  arbitrum: 42161,
  arbitrumSepolia: 421614,
};

export const ETHERSCAN_APIS = {
  localhost: "http://localhost:4000/api",
  mainnet: "https://api.etherscan.io/api",
  goerli: "https://api-goerli.etherscan.io/api",
  arbitrum: "https://api.arbiscan.io/api",
  arbitrumGoerli: "https://api-goerli.arbiscan.io/api",
  polygon: "https://api.polygonscan.com/api",
  matic: "https://api.polygonscan.com/api",
  polygonMumbai: "https://api-mumbai.polygonscan.com/api",
  polygonZkevm: "https://api-zkevm.polygonscan.com/api",
  polygonZkevmGoerli: "https://api-testnet-zkevm.polygonscan.com/api",
  zksync: "https://zksync2-mainnet-explorer.zksync.io/contract_verification",
  zksyncGoerli:
    "https://zksync2-testnet-explorer.zksync.dev/contract_verification",
  moonbeam: "https://api-moonbeam.moonscan.io/api",
  moonbase: "https://api-moonbase.moonscan.io/api",
  linea: "http://explorer.linea.build/api",
  lineaGoerli: "https://explorer.goerli.linea.build/api",
};
export const BROWSER_URLS = {
  localhost: "http://localhost:4000",
  mainnet: "https://etherscan.io",
  goerli: "https://goerli.etherscan.io",
  arbitrum: "https://arbiscan.io",
  arbitrumGoerli: "https://goerli.arbiscan.io",
  polygonZkevm: "https://zkevm.polygonscan.com",
  polygonZkevmGoerli: "https://testnet-zkevm.polygonscan.com",
  polygon: "https://polygonscan.com",
  matic: "https://polygonscan.com",
  polygonMumbai: "https://mumbai.polygonscan.com",
  zksync: "https://zksync2-mainnet-explorer.zksync.io",
  zksyncGoerli: "https://zksync2-testnet-explorer.zksync.dev",
  moonbeam: "https://moonscan.io",
  moonbase: "https://moonbase.moonscan.io",
  linea: "https://explorer.linea.build",
  lineaGoerli: "https://explorer.goerli.linea.build",
};

export const NETWORKS_RPC_URL = {
  mainnet: ALCHEMY_KEY
    ? `https://eth-mainnet.alchemyapi.io/v2/${ALCHEMY_KEY}`
    : `https://mainnet.infura.io/v3/${INFURA_KEY}`,
  sepolia: ALCHEMY_KEY
    ? `https://eth-sepolia.alchemyapi.io/v2/${ALCHEMY_KEY}`
    : `https://sepolia.infura.io/v3/${INFURA_KEY}`,
  arbitrum: `https://arb-mainnet.g.alchemy.com/v2/${ALCHEMY_KEY}`,
  arbitrumSepolia: `https://arb-sepolia.g.alchemy.com/v2/${ALCHEMY_KEY}`,
};
