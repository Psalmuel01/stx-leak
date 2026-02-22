import { useEffect, useMemo, useState } from 'react';
import { connect, disconnect, getLocalStorage, request } from '@stacks/connect';
import { cvToValue, hexToCV } from '@stacks/transactions';

type StacksNetwork = 'mainnet' | 'testnet';

type ContractAction = 'increment' | 'decrement' | 'reset-counter';

const defaultNetwork = (import.meta.env.VITE_STACKS_NETWORK ?? 'testnet') as StacksNetwork;
const contractName = import.meta.env.VITE_CONTRACT_NAME ?? 'counter';

const contractAddresses: Record<StacksNetwork, string> = {
  mainnet: import.meta.env.VITE_CONTRACT_ADDRESS_MAINNET ?? import.meta.env.VITE_CONTRACT_ADDRESS ?? '',
  testnet: import.meta.env.VITE_CONTRACT_ADDRESS_TESTNET ?? import.meta.env.VITE_CONTRACT_ADDRESS ?? '',
};

const apiBases: Record<StacksNetwork, string> = {
  mainnet: import.meta.env.VITE_STACKS_API_BASE_MAINNET ?? 'https://api.hiro.so',
  testnet: import.meta.env.VITE_STACKS_API_BASE_TESTNET ?? import.meta.env.VITE_STACKS_API_BASE ?? 'https://api.testnet.hiro.so',
};

export function App() {
  const [network, setNetwork] = useState<StacksNetwork>(defaultNetwork);
  const [stxAddress, setStxAddress] = useState('');
  const [lastTxId, setLastTxId] = useState('');
  const [counterValue, setCounterValue] = useState<string>('0');
  const [counterError, setCounterError] = useState('');
  const [loading, setLoading] = useState(false);

  const contractAddress = useMemo(() => contractAddresses[network], [network]);
  const apiBase = useMemo(() => apiBases[network], [network]);
  const txExplorerLink = useMemo(() => {
    if (!lastTxId) return '';
    return `https://explorer.hiro.so/txid/${lastTxId}?chain=${network}`;
  }, [lastTxId, network]);

  useEffect(() => {
    const localData = getLocalStorage();
    const localAddress = localData?.addresses?.stx?.find(entry => entry.symbol?.toLowerCase() === network)?.address;
    setStxAddress(localAddress ?? '');
  }, [network]);

  const readCounter = async () => {
    if (!contractAddress) return;

    const senderAddress = stxAddress || contractAddress;

    try {
      const response = await fetch(`${apiBase}/v2/contracts/call-read/${contractAddress}/${contractName}/get-count`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sender: senderAddress,
          arguments: [],
        }),
      });

      if (!response.ok) {
        throw new Error(`Read-only call failed with status ${response.status}`);
      }

      const data = (await response.json()) as { okay: boolean; result?: string; cause?: string };
      if (!data.okay || !data.result) {
        throw new Error(data.cause ?? 'Read-only call failed');
      }

      const cv = hexToCV(data.result);
      const value = cvToValue(cv);
      setCounterValue(String(value));
      setCounterError('');
    } catch (error) {
      console.error('Failed to read counter', error);
      setCounterError('Unable to load current counter value');
    }
  };

  useEffect(() => {
    void readCounter();
    const intervalId = window.setInterval(() => {
      void readCounter();
    }, 10000);

    return () => window.clearInterval(intervalId);
  }, [network, contractAddress, stxAddress]);

  const connectWallet = async () => {
    try {
      const result = await connect({
        network,
        forceWalletSelect: true,
        enableLocalStorage: true,
      });
      const address = result.addresses[0]?.address ?? '';
      setStxAddress(address);
    } catch (error) {
      console.error('Wallet connection canceled or failed', error);
    }
  };

  const disconnectWallet = () => {
    disconnect();
    setStxAddress('');
  };

  const callWrite = async (functionName: ContractAction) => {
    if (!contractAddress) return;

    setLoading(true);
    try {
      const result = await request('stx_callContract', {
        contract: `${contractAddress}.${contractName}`,
        functionName,
        functionArgs: [],
        network,
      });

      setLastTxId(result.txid ?? '');
      await readCounter();
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="app-shell">
      <section className="app-card">
        <div className="header-row">
          <div>
            <p className="eyebrow">Stacks Integration</p>
            <h1>Counter Control Panel</h1>
          </div>
          <label className="network-switcher">
            <span>Network</span>
            <select value={network} onChange={event => setNetwork(event.target.value as StacksNetwork)}>
              <option value="testnet">Testnet</option>
              <option value="mainnet">Mainnet</option>
            </select>
          </label>
        </div>

        <div className="meta-grid">
          <p>
            Contract
            <code>{contractAddress ? `${contractAddress}.${contractName}` : `Missing ${network} contract address`}</code>
          </p>
          <p>
            API
            <code>{apiBase}</code>
          </p>
        </div>

        <div className="wallet-row">
          {!stxAddress ? (
            <button onClick={() => void connectWallet()}>Connect Wallet</button>
          ) : (
            <>
              <p>
                Connected
                <code>{stxAddress}</code>
              </p>
              <button className="ghost" onClick={disconnectWallet}>Disconnect</button>
            </>
          )}
        </div>

        <div className="actions">
          <button disabled={loading || !stxAddress || !contractAddress} onClick={() => void callWrite('increment')}>Increment</button>
          <button disabled={loading || !stxAddress || !contractAddress} onClick={() => void callWrite('decrement')}>Decrement</button>
          <button disabled={loading || !stxAddress || !contractAddress} onClick={() => void callWrite('reset-counter')}>Reset</button>
        </div>

        <div className="meta-grid">
          <p>
            Counter Value
            <code>{counterError ? counterError : counterValue}</code>
          </p>
          <p>
            Sync
            <button className="ghost" disabled={!contractAddress} onClick={() => void readCounter()}>Refresh</button>
          </p>
        </div>

        {lastTxId && (
          <p className="tx-row">
            Last TX
            <a href={txExplorerLink} target="_blank" rel="noreferrer">
              {lastTxId}
            </a>
          </p>
        )}
      </section>
    </main>
  );
}
