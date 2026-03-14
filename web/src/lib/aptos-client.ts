/// Aptos SDK client configured for testnet
import { Aptos, AptosConfig, Network } from "@aptos-labs/ts-sdk";

const network = (process.env.NEXT_PUBLIC_APTOS_NETWORK ?? "testnet") as "testnet" | "devnet" | "mainnet";

const networkMap: Record<string, Network> = {
  testnet: Network.TESTNET,
  devnet: Network.DEVNET,
  mainnet: Network.MAINNET,
};

const config = new AptosConfig({ network: networkMap[network] ?? Network.TESTNET });
export const aptos = new Aptos(config);

export const MODULE_ADDRESS = process.env.NEXT_PUBLIC_MODULE_ADDRESS ?? "";
