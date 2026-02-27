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

const Faucet = ({ address, onSuccess }: { address: string | null, onSuccess: () => void }) => {
  const [amount, setAmount] = useState("1000000000"); // Default 10 APT

  const handleExecute = async () => {
    if (!address) throw new Error("No address derived.");
    
    const faucetUrl = `http://120.26.182.36:8081/mint?amount=${amount}&address=${address}`;
    const response = await fetch(faucetUrl, { method: 'POST' });
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Faucet failed: ${errorText || response.statusText}`);
    }
    
    // Faucet usually returns transaction hashes as JSON array or text
    const data = await response.text();
    console.log("Faucet response:", data);
    
    // Refresh balance
    onSuccess();
    
    return "Faucet request submitted successfully.";
  };

  return (
    <ActionCard 
      title="Aptos Faucet" 
      description="Get test APT for your account from the network faucet."
      onExecute={handleExecute}
    >
      <div className="form-group">
        <label>Target Address:</label>
        <input type="text" value={address || ""} disabled style={{ backgroundColor: '#f5f5f5' }} />
      </div>
      <div className="form-group">
        <label>Amount (Octas):</label>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <input 
            type="number" 
            value={amount} 
            onChange={(e) => setAmount(e.target.value)} 
            style={{ flex: 1 }}
          />
          <div style={{ minWidth: '80px', textAlign: 'right', fontWeight: 'bold' }}>
            {(parseInt(amount || "0") / 100_000_000).toFixed(2)} APT
          </div>
        </div>
      </div>
    </ActionCard>
  );
};

const Stake = ({ submitTransaction, validators, fetching, fetchValidators }: { 
  submitTransaction: (data: any) => Promise<string>, 
  validators: any[], 
  fetching: boolean, 
  fetchValidators: () => void 
}) => {
  const [validator, setValidator] = useState("");
  const [amount, setAmount] = useState("100000000"); // Default 1 APT

  useEffect(() => {
    if (validators.length > 0 && !validator) {
      setValidator(validators[0].pool_addr);
    }
  }, [validators]);

  const handleExecute = async () => {
    if (!validator) throw new Error("Please select a validator.");
    let val: bigint;
    try {
      val = BigInt(amount);
    } catch (e) {
      throw new Error("Invalid amount.");
    }
    if (val <= 0n) throw new Error("Amount must be positive.");

    return await submitTransaction({
      function: "0x1::delegation_pool::add_stake",
      functionArguments: [validator, val],
      typeArguments: [],
    });
  };

  return (
    <ActionCard 
      title="Stake APT (Delegation)" 
      description="Select a validator node and delegate your APT to start earning rewards."
      onExecute={handleExecute}
    >
      <div className="form-group">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '5px' }}>
          <label>Select Node (Validator):</label>
          <button 
            onClick={(e) => { e.preventDefault(); fetchValidators(); }} 
            style={{ padding: '2px 8px', fontSize: '0.8em', height: 'auto' }}
            disabled={fetching}
          >
            {fetching ? "..." : "Refresh"}
          </button>
        </div>
        <select 
          value={validator} 
          onChange={(e) => setValidator(e.target.value)}
        >
          <option value="">-- Select a Node --</option>
          {validators.map((v: any) => (
            <option key={v.pool_addr} value={v.pool_addr}>
              {v.pool_addr.substring(0, 14)}... (Power: {v.voting_power})
            </option>
          ))}
        </select>
      </div>

      <div className="form-group" style={{ marginTop: '15px' }}>
        <label>Amount (Octas):</label>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <input 
            type="number" 
            value={amount} 
            onChange={(e) => setAmount(e.target.value)} 
            style={{ flex: 1 }}
          />
          <div style={{ minWidth: '80px', textAlign: 'right', fontWeight: 'bold' }}>
            {(parseInt(amount || "0") / 100_000_000).toFixed(2)} APT
          </div>
        </div>
      </div>
    </ActionCard>
  );
};

const UnlockStake = ({ submitTransaction, validators }: { 
  submitTransaction: (data: any) => Promise<string>, 
  validators: any[] 
}) => {
  const [validator, setValidator] = useState("");
  const [amount, setAmount] = useState("100000000");

  useEffect(() => {
    if (validators.length > 0 && !validator) {
      setValidator(validators[0].pool_addr);
    }
  }, [validators]);

  const handleExecute = async () => {
    if (!validator) throw new Error("Please select a validator.");
    return await submitTransaction({
      function: "0x1::delegation_pool::unlock",
      functionArguments: [validator, BigInt(amount)],
      typeArguments: [],
    });
  };

  return (
    <ActionCard 
      title="Unstake APT (Unlock)" 
      description="Unstake your APT. It will enter a lockup period before it can be withdrawn."
      onExecute={handleExecute}
    >
      <div className="form-group">
        <label>Validator Node (Pool Address):</label>
        <select value={validator} onChange={(e) => setValidator(e.target.value)}>
          <option value="">-- Select a Node --</option>
          {validators.map((v: any) => (
            <option key={v.pool_addr} value={v.pool_addr}>{v.pool_addr.substring(0, 14)}...</option>
          ))}
        </select>
      </div>
      <div className="form-group">
        <label>Amount to Unstake (Octas):</label>
        <input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} />
      </div>
    </ActionCard>
  );
};

const WithdrawStake = ({ submitTransaction, validators }: { 
  submitTransaction: (data: any) => Promise<string>, 
  validators: any[] 
}) => {
  const [validator, setValidator] = useState("");
  const [amount, setAmount] = useState("100000000");

  useEffect(() => {
    if (validators.length > 0 && !validator) {
      setValidator(validators[0].pool_addr);
    }
  }, [validators]);

  const handleExecute = async () => {
    if (!validator) throw new Error("Please select a validator.");
    return await submitTransaction({
      function: "0x1::delegation_pool::withdraw",
      functionArguments: [validator, BigInt(amount)],
      typeArguments: [],
    });
  };

  return (
    <ActionCard 
      title="Withdraw APT" 
      description="Withdraw your unlocked APT back to your wallet."
      onExecute={handleExecute}
    >
      <div className="form-group">
        <label>Validator Node (Pool Address):</label>
        <select value={validator} onChange={(e) => setValidator(e.target.value)}>
          <option value="">-- Select a Node --</option>
          {validators.map((v: any) => (
            <option key={v.pool_addr} value={v.pool_addr}>{v.pool_addr.substring(0, 14)}...</option>
          ))}
        </select>
      </div>
      <div className="form-group">
        <label>Amount to Withdraw (Octas):</label>
        <input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} />
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

  // Staking Data
  const [validators, setValidators] = useState<any[]>([]);
  const [fetchingValidators, setFetchingValidators] = useState(false);

  const fetchValidators = async () => {
    setFetchingValidators(true);
    try {
      const resource = await aptos.getAccountResource({
        accountAddress: "0x1",
        resourceType: "0x1::stake::ValidatorSet",
      });
      const activeValidators = (resource as any).active_validators || [];
      
      // Fetch pool addresses for each validator
      const validatorsWithPools = await Promise.all(activeValidators.map(async (v: any) => {
        try {
          const poolAddress = await aptos.view({
            payload: {
              function: "0x1::delegation_pool::get_owned_pool_address",
              functionArguments: [v.addr],
              typeArguments: [],
            }
          });
          return { ...v, pool_addr: poolAddress[0] };
        } catch (e) {
          // If no pool address, return null or handle as needed
          return { ...v, pool_addr: null };
        }
      }));

      // Filter to only those that have a delegation pool (as required by delegation_pool functions)
      setValidators(validatorsWithPools.filter(v => v.pool_addr !== null));
    } catch (e) {
      console.error("Error fetching validators:", e);
    } finally {
      setFetchingValidators(false);
    }
  };

  useEffect(() => {
    fetchValidators();
  }, []);

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

        {/* 2. Faucet Section */}
        <div style={{ width: '100%', maxWidth: '800px', marginBottom: '40px' }}>
          <h3>2. Faucet (Get Test APT)</h3>
          <Faucet address={derivedAddress} onSuccess={fetchAccountData} />
        </div>

        {/* 3. Actions List */}
        <div style={{ width: '100%', maxWidth: '800px' }}>
          <h3>3. Transactions</h3>
          <TransferAptos submitTransaction={submitTransaction} />
          <RegisterCoin submitTransaction={submitTransaction} />
          <TransferCoin submitTransaction={submitTransaction} />
          
          <div style={{ margin: '40px 0 20px 0', borderTop: '2px solid #ddd', paddingTop: '20px' }}>
            <h3 style={{ color: '#2563eb' }}>Staking & Rewards</h3>
          </div>

          <Stake 
            submitTransaction={submitTransaction} 
            validators={validators} 
            fetching={fetchingValidators}
            fetchValidators={fetchValidators}
          />
          <WithdrawStake submitTransaction={submitTransaction} validators={validators} />
          <UnlockStake submitTransaction={submitTransaction} validators={validators} />
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

