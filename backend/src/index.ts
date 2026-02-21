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

const privateKey = process.env.STACKS_PRIVATE_KEY!;
const contractAddress = process.env.CONTRACT_ADDRESS!;
const contractName = process.env.CONTRACT_NAME ?? 'counter';
const requestedNetwork = (process.env.STACKS_NETWORK ?? 'testnet').toLowerCase();
const networkName = requestedNetwork === 'mainnet' ? 'mainnet' : 'testnet';

const network =
  networkName === 'mainnet' ? STACKS_MAINNET : STACKS_TESTNET;

type Method = 'increment' | 'decrement' | 'reset-counter';

async function invoke(method: Method) {
  const tx = await makeContractCall({
    contractAddress,
    contractName,
    functionName: method,
    functionArgs: [],
    senderKey: privateKey,
    network,
    postConditionMode: PostConditionMode.Allow,
    fee: 3000n,
  });

  const response = await broadcastTransaction({ transaction: tx, network });

  if ('error' in response) {
    throw new Error(response.error);
  }

  return response.txid;
}

app.post('/call', async (req, res) => {
  try {
    const { method } = req.body as { method: Method };

    if (!['increment', 'decrement', 'reset-counter'].includes(method)) {
      return res.status(400).json({ error: 'Invalid method' });
    }

    const txid = await invoke(method);
    res.json({ success: true, txid });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.get('/health', (_, res) => {
  res.json({ status: 'ok', network: networkName });
});

app.listen(PORT, () => {
  console.log(`Counter service running on port ${PORT}`);
});