import 'dotenv/config';
import { randomInt } from 'node:crypto';
import { STACKS_MAINNET, STACKS_TESTNET } from '@stacks/network';
import {
  AnchorMode,
  PostConditionMode,
  broadcastTransaction,
  makeContractCall,
} from '@stacks/transactions';

const privateKey = process.env.STACKS_PRIVATE_KEY;
const contractAddress = process.env.CONTRACT_ADDRESS;
const contractName = process.env.CONTRACT_NAME ?? 'counter';
const intervalMs = Number(process.env.AUTOMATION_INTERVAL_MS ?? '600000');
const requestedNetwork = (process.env.STACKS_NETWORK ?? 'testnet').toLowerCase();
const networkName = requestedNetwork === 'mainnet' ? 'mainnet' : 'testnet';

const defaultApiUrl = networkName === 'mainnet'
  ? 'https://api.hiro.so'
  : 'https://api.testnet.hiro.so';
const apiUrl = process.env.STACKS_API_URL ?? defaultApiUrl;

if (!privateKey || !contractAddress) {
  throw new Error('Missing required env vars: STACKS_PRIVATE_KEY and CONTRACT_ADDRESS');
}

const pk: string = privateKey;
const ca: string = contractAddress;

const network = networkName === 'mainnet'
  ? STACKS_MAINNET
  : STACKS_TESTNET;

if (requestedNetwork !== networkName) {
  console.warn(`Unknown STACKS_NETWORK="${requestedNetwork}". Falling back to testnet.`);
}

type Method = 'increment' | 'decrement' | 'reset-counter';
const methods: Method[] = ['increment', 'decrement', 'reset-counter'];

async function invoke(method: Method) {
  const tx = await makeContractCall({
    contractAddress: ca,
    contractName,
    functionName: method,
    functionArgs: [],
    senderKey: pk,
    network,
    postConditionMode: PostConditionMode.Allow,
    fee: 3000n,
  });

  const response = await broadcastTransaction({ transaction: tx, network });

  if ('error' in response) {
    throw new Error(`${method} failed: ${response.error} (${response.reason})`);
  }

  console.log(`[${new Date().toISOString()}] ${method} tx: ${response.txid}`);
}

async function runCycle() {
  const selected = methods[randomInt(methods.length)];
  try {
    await invoke(selected);
  } catch (error) {
    console.error(`[${new Date().toISOString()}] ${selected} failed`, error);
  }
}

console.log(`Counter bot started. network=${networkName} api=${apiUrl} cadence=${intervalMs}ms`);
console.log(`Enabled methods: ${methods.join(', ')}`);
void runCycle();
setInterval(() => void runCycle(), intervalMs);
