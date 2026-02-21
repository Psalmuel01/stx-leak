import { useMemo, useState } from 'react';
import { AppConfig, UserSession, showConnect, openContractCall } from '@stacks/connect';
import { StacksMainnet, StacksTestnet } from '@stacks/network';

const networkName = import.meta.env.VITE_STACKS_NETWORK ?? 'testnet';
const contractAddress = import.meta.env.VITE_CONTRACT_ADDRESS ?? '';
const contractName = import.meta.env.VITE_CONTRACT_NAME ?? 'counter';
const apiBase = import.meta.env.VITE_STACKS_API_BASE ?? 'https://api.testnet.hiro.so';

const appConfig = new AppConfig(['store_write', 'publish_data']);
const userSession = new UserSession({ appConfig });

export function App() {
  const [stxAddress, setStxAddress] = useState<string>('');
  const [lastTxId, setLastTxId] = useState<string>('');
  const [loading, setLoading] = useState(false);

  const network = useMemo(
    () => (networkName === 'mainnet' ? new StacksMainnet() : new StacksTestnet()),
    [],
  );

  const connectWallet = () => {
    showConnect({
      appDetails: { name: 'Counter UI', icon: window.location.origin + '/favicon.ico' },
      redirectTo: '/',
      onFinish: ({ userSession: session }) => {
        const data = session.loadUserData();
        const addr = networkName === 'mainnet'
          ? data.profile?.stxAddress?.mainnet
          : data.profile?.stxAddress?.testnet;
        setStxAddress(addr ?? '');
      },
      userSession,
    });
  };

  const callWrite = async (functionName: 'increment' | 'decrement' | 'reset-counter') => {
    setLoading(true);
    try {
      await openContractCall({
        contractAddress,
        contractName,
        functionName,
        functionArgs: [],
        network,
        onFinish: ({ txId }) => setLastTxId(txId),
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="app">
      <h1>Stacks Counter</h1>
      <p>Contract: <code>{contractAddress}.{contractName}</code></p>
      <p>Network: <code>{networkName}</code></p>

      {!stxAddress ? (
        <button onClick={connectWallet}>Connect Wallet</button>
      ) : (
        <p>Connected: <code>{stxAddress}</code></p>
      )}

      <div className="actions">
        <button disabled={loading || !stxAddress} onClick={() => void callWrite('increment')}>Increment</button>
        <button disabled={loading || !stxAddress} onClick={() => void callWrite('decrement')}>Decrement</button>
        <button disabled={loading || !stxAddress} onClick={() => void callWrite('reset-counter')}>Reset (interval-gated)</button>
      </div>

      {lastTxId && (
        <p>
          Last TX: <a href={`${apiBase}/extended/v1/tx/${lastTxId}`} target="_blank">{lastTxId}</a>
        </p>
      )}
    </main>
  );
}
