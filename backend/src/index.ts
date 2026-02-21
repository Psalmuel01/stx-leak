import 'dotenv/config';
import { randomInt } from 'node:crypto';
import { StacksMainnet, StacksTestnet } from '@stacks/network';
import {
  AnchorMode,
  PostConditionMode,
  makeContractCall,
  broadcastTransaction,
} from '@stacks/transactions';

const privateKey = process.env.STACKS_PRIVATE_KEY;
const contractAddress = process.env.CONTRACT_ADDRESS;
const contractName = process.env.CONTRACT_NAME ?? 'counter';
const intervalMs = Number(process.env.AUTOMATION_INTERVAL_MS ?? '600000');
const apiUrl = process.env.STACKS_API_URL;
const networkName = process.env.STACKS_NETWORK ?? 'testnet';

if (!privateKey || !contractAddress) {
  throw new Error('Missing required env vars: STACKS_PRIVATE_KEY and CONTRACT_ADDRESS');
}

const network = networkName === 'mainnet'
  ? new StacksMainnet({ url: apiUrl })
  : new StacksTestnet({ url: apiUrl });

type Method = 'increment' | 'decrement' | 'reset-counter';
const methods: Method[] = ['increment', 'decrement', 'reset-counter'];

async function invoke(method: Method) {
  const tx = await makeContractCall({
    contractAddress,
    contractName,
    functionName: method,
    functionArgs: [],
    senderKey: privateKey,
    network,
    postConditionMode: PostConditionMode.Allow,
    anchorMode: AnchorMode.Any,
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

console.log(`Counter bot started. interval=${intervalMs}ms network=${networkName}`);
void runCycle();
setInterval(() => void runCycle(), intervalMs);
