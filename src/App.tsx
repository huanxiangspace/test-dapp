import { useState, useEffect, type ReactNode } from 'react';
import { Aptos, AptosConfig, Network, SignedTransaction, Ed25519Account, TransactionAuthenticatorEd25519, Deserializer } from "@aptos-labs/ts-sdk";
import './App.css';

// Custom Network Configuration
const CUSTOM_NODE_URL = "http://120.26.182.36:8080/v1";
const CHAIN_ID = 164;

const aptosConfig = new AptosConfig({ 
  network: Network.CUSTOM,
  fullnode: CUSTOM_NODE_URL,
});
const aptos = new Aptos(aptosConfig);

// --- Reusable Action Card Component ---
interface ActionCardProps {
  title: string;
  description: string;
  onExecute: () => Promise<string>; // Returns txHash
  children?: ReactNode;
}

const ActionCard = ({ title, description, onExecute, children }: ActionCardProps) => {
  const [status, setStatus] = useState<string>("");
  const [txHash, setTxHash] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleClick = async () => {
    setLoading(true);
    setStatus("Processing...");
    setTxHash(null);
    try {
      const hash = await onExecute();
      setTxHash(hash);
      setStatus("Success!");
    } catch (e: any) {
      console.error(e);
      setStatus(`Failed: ${e.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="card full-width" style={{ marginBottom: '20px', textAlign: 'left' }}>
      <h4 style={{ margin: '0 0 10px 0' }}>{title}</h4>
      <p style={{ fontSize: '0.9em', color: '#666', marginBottom: '15px' }}>{description}</p>
      
      <div style={{ marginBottom: '15px' }}>
        {children}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        <button onClick={handleClick} disabled={loading}>
          {loading ? "Executing..." : "Execute"}
        </button>
        <span style={{ fontSize: '0.9em' }}>{status}</span>
      </div>

      {txHash && (
        <div style={{ marginTop: '10px', fontSize: '0.85em', wordBreak: 'break-all' }}>
          Tx: <a href="#" onClick={(e) => e.preventDefault()}>{txHash}</a>
        </div>
      )}
    </div>
  );
};

// --- Specific Action Components ---

const TransferAptos = ({ submitTransaction }: { submitTransaction: (data: any) => Promise<string> }) => {
  const [receiver, setReceiver] = useState("0x943afee6808b7a7722be33278eb186e2ac0d0310b96f0478ed461dd97ccd9bea");
  const [amount, setAmount] = useState("1000");

  const handleExecute = async () => {
    return await submitTransaction({
      function: "0x1::aptos_account::transfer",
      functionArguments: [receiver, parseInt(amount)],
      typeArguments: [],
    });
  };

  return (
    <ActionCard 
      title="Transfer APT" 
      description="Transfers APT. Auto-creates account if it doesn't exist."
      onExecute={handleExecute}
    >
      <div className="form-group">
        <label>Receiver:</label>
        <input type="text" value={receiver} onChange={(e) => setReceiver(e.target.value)} />
      </div>
      <div className="form-group">
        <label>Amount (units):</label>
        <input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} />
      </div>
    </ActionCard>
  );
};

const RegisterCoin = ({ submitTransaction }: { submitTransaction: (data: any) => Promise<string> }) => {
  const [coinType, setCoinType] = useState("0x1::aptos_coin::AptosCoin");

  const handleExecute = async () => {
    return await submitTransaction({
      function: "0x1::managed_coin::register",
      functionArguments: [],
      typeArguments: [coinType],
    });
  };

  return (
    <ActionCard 
      title="Register Coin" 
      description="Registers account to receive a specific CoinType."
      onExecute={handleExecute}
    >
      <div className="form-group">
        <label>Coin Type:</label>
        <input type="text" value={coinType} onChange={(e) => setCoinType(e.target.value)} />
      </div>
    </ActionCard>
  );
};

const TransferCoin = ({ submitTransaction }: { submitTransaction: (data: any) => Promise<string> }) => {
  const [receiver, setReceiver] = useState("0x943afee6808b7a7722be33278eb186e2ac0d0310b96f0478ed461dd97ccd9bea");
  const [amount, setAmount] = useState("1000");
  const [coinType, setCoinType] = useState("0x1::aptos_coin::AptosCoin");

  const handleExecute = async () => {
    return await submitTransaction({
      function: "0x1::coin::transfer",
      functionArguments: [receiver, parseInt(amount)],
      typeArguments: [coinType],
    });
  };

  return (
    <ActionCard 
      title="Transfer Custom Coin" 
      description="Transfers a specific CoinType. Receiver must be registered."
      onExecute={handleExecute}
    >
      <div className="form-group">
        <label>Receiver:</label>
        <input type="text" value={receiver} onChange={(e) => setReceiver(e.target.value)} />
      </div>
      <div className="form-group">
        <label>Amount:</label>
        <input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} />
      </div>
      <div className="form-group">
        <label>Coin Type:</label>
        <input type="text" value={coinType} onChange={(e) => setCoinType(e.target.value)} />
      </div>
    </ActionCard>
  );
};

// --- Main App Component ---

function App() {
  const [mnemonic, setMnemonic] = useState<string>("hindrance knot logic game decrease owner equals over history chuckle strip save");
  const [derivedAddress, setDerivedAddress] = useState<string | null>(null);
  const [balance, setBalance] = useState<string | null>(null);
  const [networkInfo, setNetworkInfo] = useState<any>(null);

  const getAccountFromMnemonic = () => {
    try {
      if (!mnemonic) return null;
      return Ed25519Account.fromDerivationPath({
        path: "m/44'/637'/0'/0'/0'",
        mnemonic: mnemonic,
      });
    } catch (e) {
      console.error("Invalid mnemonic", e);
      return null;
    }
  };

  const submitTransaction = async (entryFunctionData: any): Promise<string> => {
    const account = getAccountFromMnemonic();
    if (!account) throw new Error("Invalid mnemonic or account not derived.");

    // 1. Build Transaction
    const transaction = await aptos.transaction.build.simple({
      sender: account.accountAddress,
      data: entryFunctionData,
    });

    console.log("Signing transaction:", transaction);

    // 2. Sign Transaction with Account
    const accountAuthenticator = account.signTransactionWithAuthenticator(transaction);
    
    const transactionAuthenticator = new TransactionAuthenticatorEd25519(
      accountAuthenticator.public_key,
      accountAuthenticator.signature
    );

    const signedTxn = new SignedTransaction(transaction.rawTransaction, transactionAuthenticator);
    const signedTxnBytes = signedTxn.bcsToBytes();

    // Debug: Parse and print
    try {
      const deserializer = new Deserializer(signedTxnBytes);
      const decodedSignedTxn = SignedTransaction.deserialize(deserializer);
      console.log("Decoded Raw Transaction:", decodedSignedTxn.raw_txn);
    } catch (e) {
      console.warn("Logging decode failed:", e);
    }

    // 3. Submit Transaction directly to node via fetch
    const fetchResponse = await fetch(`${CUSTOM_NODE_URL}/transactions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x.aptos.signed_transaction+bcs',
      },
      body: new Blob([signedTxnBytes as any]),
    });

    if (!fetchResponse.ok) {
      const errorBody = await fetchResponse.json();
      throw new Error(errorBody.message || `Submission failed: ${fetchResponse.statusText}`);
    }

    const pendingTransaction = await fetchResponse.json();
    console.log("Transaction submitted:", pendingTransaction);
    
    await aptos.waitForTransaction({ transactionHash: pendingTransaction.hash });
    
    // Refresh balance after successful transaction
    fetchAccountData();
    
    return pendingTransaction.hash;
  };

  const fetchAccountData = async () => {
    const account = getAccountFromMnemonic();
    if (account) {
      setDerivedAddress(account.accountAddress.toString());
      try {
        const amt = await aptos.getAccountAPTAmount({ accountAddress: account.accountAddress });
        setBalance(amt.toString());
      } catch (e) {
        setBalance("0");
      }
    } else {
      setDerivedAddress(null);
      setBalance(null);
    }
  };

  useEffect(() => {
    fetchAccountData();
    const fetchNetworkInfo = async () => {
      try {
        const info = await aptos.getLedgerInfo();
        setNetworkInfo(info);
      } catch (e) {
        console.error("Error fetching network info", e);
      }
    };
    fetchNetworkInfo();
  }, [mnemonic]);

  return (
    <div className="App">
      <header className="App-header">
        <h1>Aptos Functional Examples</h1>
        <p style={{ fontSize: "0.8em" }}>Chain ID: {CHAIN_ID} | Node: {CUSTOM_NODE_URL}</p>

        {/* 1. Account Config */}
        <div className="card full-width">
          <h3>1. Account Setup (Mnemonic)</h3>
          <textarea 
            value={mnemonic} 
            onChange={(e) => setMnemonic(e.target.value)}
            rows={2}
            placeholder="Enter mnemonic phrase..."
            style={{ width: "100%", padding: "8px", fontSize: "0.9em" }}
          />
          <div style={{ marginTop: "10px", textAlign: "left" }}>
            <p><strong>Derived Address:</strong> <code style={{ fontSize: "0.9em" }}>{derivedAddress || "Invalid Mnemonic"}</code></p>
            <p><strong>APT Balance:</strong> {balance !== null ? (parseInt(balance) / 100_000_000).toFixed(4) : "..."} APT</p>
          </div>
        </div>

        {/* 2. Actions List */}
        <div style={{ width: '100%', maxWidth: '800px' }}>
          <h3>2. Execute Action</h3>
          <TransferAptos submitTransaction={submitTransaction} />
          <RegisterCoin submitTransaction={submitTransaction} />
          <TransferCoin submitTransaction={submitTransaction} />
        </div>

        {/* Network Info */}
        <div className="card full-width network-info">
          <div className="network-card-header">
            <h3>
              Network Status
              <span className="node-url">
                {CUSTOM_NODE_URL}
              </span>
            </h3>
          </div>
          
          {networkInfo ? (
            <div className="network-grid">
              
              {/* Identity Group */}
              <div className="network-group-label">
                Node Identity
              </div>
              
              <div className="info-box">
                <div className="info-label">Chain ID</div>
                <div className="info-value">{networkInfo.chain_id}</div>
              </div>
              <div className="info-box">
                <div className="info-label">Node Role</div>
                <div className="info-value">{networkInfo.node_role}</div>
              </div>
              <div className="info-box">
                <div className="info-label">Git Hash</div>
                <div className="info-value" title={networkInfo.git_hash}>
                  {networkInfo.git_hash?.substring(0, 12)}...
                </div>
              </div>

              {/* Sync Group */}
              <div className="network-group-label">
                Synchronization
              </div>

              <div className="info-box">
                <div className="info-label">Epoch</div>
                <div className="info-value">{networkInfo.epoch}</div>
              </div>
              <div className="info-box">
                <div className="info-label">Ledger Version</div>
                <div className="info-value">{parseInt(networkInfo.ledger_version).toLocaleString()}</div>
              </div>
              <div className="info-box">
                <div className="info-label">Block Height</div>
                <div className="info-value">{parseInt(networkInfo.block_height).toLocaleString()}</div>
              </div>
              <div className="info-box">
                <div className="info-label">Timestamp</div>
                <div className="info-value">
                  {new Date(parseInt(networkInfo.ledger_timestamp) / 1000).toLocaleString()}
                </div>
              </div>

            </div>
          ) : (
            <div style={{ padding: '20px', color: '#888', fontStyle: 'italic' }}>
              Connecting to node...
            </div>
          )}
        </div>
      </header>
    </div>
  );
}

export default App;

