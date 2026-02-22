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

const app = express();
app.use(express.json());


const PORT = Number(process.env.PORT || 3000);
const intervalMs = Number(process.env.AUTOMATION_INTERVAL_MS ?? '300000');

const privateKey = process.env.STACKS_PRIVATE_KEY;
const contractAddress = process.env.CONTRACT_ADDRESS;
const contractName = process.env.CONTRACT_NAME ?? 'counter';
const requestedNetwork = (process.env.STACKS_NETWORK ?? 'testnet').toLowerCase();
const networkName = requestedNetwork === 'mainnet' ? 'mainnet' : 'testnet';

if (!privateKey || !contractAddress) {
  throw new Error(
    'Missing required env vars: STACKS_PRIVATE_KEY and CONTRACT_ADDRESS'
  );
}

const pk: string = privateKey;
const ca: string = contractAddress;


const network =
  networkName === 'mainnet' ? STACKS_MAINNET : STACKS_TESTNET;

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

  const response = await broadcastTransaction({
    transaction: tx,
    network,
  });

  if ('error' in response) {
    throw new Error(`${method} failed: ${response.error}`);
  }

  console.log(
    `[${new Date().toISOString()}] ${method} tx: ${response.txid}`
  );

  return response.txid;
}

async function runCycle() {
  const selected = methods[randomInt(methods.length)];
  try {
    await invoke(selected);
  } catch (error) {
    console.error(
      `[${new Date().toISOString()}] ${selected} failed`,
      error
    );
  }
}


// Manual trigger from frontend
app.post('/call', async (req, res) => {
  try {
    const { method } = req.body as { method: Method };

    if (!methods.includes(method)) {
      return res.status(400).json({ error: 'Invalid method' });
    }

    const txid = await invoke(method);
    res.json({ success: true, txid });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Health check for Render
app.get('/health', (_, res) => {
  res.json({
    status: 'ok',
    network: networkName,
    cadenceMs: intervalMs,
  });
});


app.listen(PORT, () => {
  console.log(`Counter service running on port ${PORT}`);
  console.log(
    `Network=${networkName} | cadence=${intervalMs}ms | contract=${contractAddress}.${contractName}`
  );

  runCycle();
  setInterval(() => {
    runCycle();
  }, intervalMs);
});