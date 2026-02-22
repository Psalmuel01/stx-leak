import 'dotenv/config';
import express from 'express';
import { randomInt } from 'node:crypto';
import { STACKS_MAINNET, STACKS_TESTNET } from '@stacks/network';
import {
  AnchorMode,
  PostConditionMode,
  broadcastTransaction,
  makeContractCall,
} from '@stacks/transactions';

/* ------------------ NETWORK CONFIG ------------------ */

// Cadence per network
const cadence = {
  mainnet: 10 * 60 * 1000, // 10 minutes
  testnet: 2 * 60 * 1000,  // 2 minutes
};

// Network configs
const networks = {
  mainnet: {
    name: 'mainnet',
    privateKey: process.env.STACKS_PRIVATE_KEY_MAINNET!,
    contractAddress: process.env.CONTRACT_ADDRESS_MAINNET!,
    networkObj: STACKS_MAINNET,
  },
  testnet: {
    name: 'testnet',
    privateKey: process.env.STACKS_PRIVATE_KEY_TESTNET!,
    contractAddress: process.env.CONTRACT_ADDRESS_TESTNET!,
    networkObj: STACKS_TESTNET,
  },
};

const contractName = process.env.CONTRACT_NAME ?? 'counter';

for (const key of Object.keys(networks)) {
  const net = networks[key as 'mainnet' | 'testnet'];
  if (!net.privateKey || !net.contractAddress) {
    throw new Error(`Missing private key or contract address for ${net.name}`);
  }
}

/* ------------------ BOT LOGIC ------------------ */
type Method = 'increment' | 'decrement' | 'reset-counter';
const methods: Method[] = ['increment', 'decrement', 'reset-counter'];

async function invoke(
  method: Method,
  netName: 'mainnet' | 'testnet'
) {
  const net = networks[netName];
  try {
    const tx = await makeContractCall({
      contractAddress: net.contractAddress,
      contractName,
      functionName: method,
      functionArgs: [],
      senderKey: net.privateKey,
      network: net.networkObj,
      postConditionMode: PostConditionMode.Allow,
      fee: 3000n,
    });

    const response = await broadcastTransaction({ transaction: tx, network: net.networkObj });

    if ('error' in response) {
      console.error(`[${new Date().toISOString()}] ${net.name} ${method} failed`, response);
      return;
    }

    console.log(
      `[${new Date().toISOString()}] ${net.name} ${method} tx: ${response.txid}`
    );
  } catch (err: any) {
    console.error(`[${new Date().toISOString()}] ${net.name} ${method} error`, err.message);
  }
}

async function runCycle(netName: 'mainnet' | 'testnet') {
  const selected = methods[randomInt(methods.length)];
  await invoke(selected, netName);
}

/* ------------------ EXPRESS & PORT ------------------ */
const app = express();
const PORT = Number(process.env.PORT || 3000);

// Health check for Render
app.get('/health', (_, res) => {
  res.json({
    status: 'ok',
    networks: Object.keys(networks),
    cadence: { mainnet: cadence.mainnet, testnet: cadence.testnet },
    contract: `${contractName}`,
  });
});

/* ------------------ START SERVER & BOT ------------------ */
app.listen(PORT, () => {
  console.log(`Counter bot webservice listening on port ${PORT}`);
  console.log(`Contract=${contractName} | Mainnet cadence=${cadence.mainnet}ms | Testnet cadence=${cadence.testnet}ms`);

  // Start autonomous loops
  for (const netName of Object.keys(networks) as ('mainnet' | 'testnet')[]) {
    void runCycle(netName); // initial run
    setInterval(() => void runCycle(netName), cadence[netName]);
  }
});