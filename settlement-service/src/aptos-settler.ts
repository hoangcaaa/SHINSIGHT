/// Aptos transaction builder + signer for settlement operations
/// Uses @aptos-labs/ts-sdk for proper BCS-encoded, Ed25519-signed transactions

import {
  Aptos,
  AptosConfig,
  Network,
  Account,
  Ed25519PrivateKey,
  InputEntryFunctionData,
} from "@aptos-labs/ts-sdk";
import { fetchPythVaa } from "./pyth-helpers";

const NETWORK = (process.env.APTOS_NETWORK ?? "testnet") as "testnet" | "devnet" | "mainnet";
const MODULE_ADDRESS = process.env.MODULE_ADDRESS ?? "";

const networkMap: Record<string, Network> = {
  testnet: Network.TESTNET,
  devnet: Network.DEVNET,
  mainnet: Network.MAINNET,
};

const config = new AptosConfig({ network: networkMap[NETWORK] ?? Network.TESTNET });
const aptos = new Aptos(config);

/** Create oracle Account from private key env var */
function getOracleAccount(): Account {
  const privateKeyHex = process.env.ORACLE_PRIVATE_KEY;
  if (!privateKeyHex) throw new Error("ORACLE_PRIVATE_KEY not set");

  const clean = privateKeyHex.startsWith("0x") ? privateKeyHex.slice(2) : privateKeyHex;
  const privateKey = new Ed25519PrivateKey(clean);
  return Account.fromPrivateKey({ privateKey });
}

export interface SettleResult {
  hash: string;
  success: boolean;
  error?: string;
}

/**
 * Settle a call on-chain: fetch Pyth VAA, submit settle transaction.
 * The oracle account must be the admin that called initialize().
 */
export async function settleCall(callId: number, asset: number): Promise<SettleResult> {
  try {
    const oracle = getOracleAccount();

    // Fetch real price from Pyth Hermes API (off-chain)
    const { price } = await fetchPythVaa(asset);
    console.log(`[settle] Pyth price for asset ${asset}: ${price}`);

    // Call settle_with_price — admin provides the off-chain Pyth price directly
    // This bypasses uninitialized on-chain Pyth on testnet
    const payload: InputEntryFunctionData = {
      function: `${MODULE_ADDRESS}::oracle_settlement::settle_with_price`,
      functionArguments: [
        MODULE_ADDRESS,        // module_addr
        callId,                // call_id: u64
        price,                 // actual_price: u64 (from Pyth off-chain)
      ],
    };

    const txn = await aptos.transaction.build.simple({
      sender: oracle.accountAddress,
      data: payload,
    });

    const signedTxn = await aptos.transaction.sign({ signer: oracle, transaction: txn });
    const submitted = await aptos.transaction.submit.simple({
      transaction: txn,
      senderAuthenticator: signedTxn,
    });

    const result = await aptos.transaction.waitForTransaction({
      transactionHash: submitted.hash,
    });

    return {
      hash: submitted.hash,
      success: result.success,
      error: result.success ? undefined : String(result.vm_status),
    };
  } catch (err) {
    return {
      hash: "",
      success: false,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

/**
 * Expire a call on-chain: triggers full buyer refund.
 * Only callable after reveal_timestamp + EXPIRY_GRACE_PERIOD (1hr).
 */
export async function expireCall(callId: number): Promise<SettleResult> {
  try {
    const oracle = getOracleAccount();

    const payload: InputEntryFunctionData = {
      function: `${MODULE_ADDRESS}::oracle_settlement::expire`,
      functionArguments: [
        MODULE_ADDRESS,        // module_addr
        callId,                // call_id: u64
      ],
    };

    const txn = await aptos.transaction.build.simple({
      sender: oracle.accountAddress,
      data: payload,
    });

    const signedTxn = await aptos.transaction.sign({ signer: oracle, transaction: txn });
    const submitted = await aptos.transaction.submit.simple({
      transaction: txn,
      senderAuthenticator: signedTxn,
    });

    const result = await aptos.transaction.waitForTransaction({
      transactionHash: submitted.hash,
    });

    return {
      hash: submitted.hash,
      success: result.success,
      error: result.success ? undefined : String(result.vm_status),
    };
  } catch (err) {
    return {
      hash: "",
      success: false,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

/** Health check — verify oracle account exists and has balance */
export async function healthCheck(): Promise<{ address: string; balance: string }> {
  const oracle = getOracleAccount();
  const balance = await aptos.getAccountAPTAmount({
    accountAddress: oracle.accountAddress,
  });
  return {
    address: oracle.accountAddress.toString(),
    balance: `${(balance / 1e8).toFixed(4)} APT`,
  };
}
