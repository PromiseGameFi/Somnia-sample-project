import { useMemo, useRef, useState } from 'react'
import type { Address, Hex } from 'viem'
import { sdk } from '../lib/streams'
import { walletClient } from '../lib/viem'

// ERC20 Transfer signature hash
const ERC20_TRANSFER_SIG: Hex = '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef'

// Some known contract addresses from Somnia docs (may vary by network)
const PRESETS: { label: string; address: string; signature?: string }[] = [
  { label: 'USDC', address: '0x28bec7e30e6faee657a03e19bf1128aad7632a00', signature: ERC20_TRANSFER_SIG },
  { label: 'WETH', address: '0x936Ab8C674bcb567CD5dEB85D8A216494704E9D8', signature: ERC20_TRANSFER_SIG },
  { label: 'USDT', address: '0x67B302E35Aef5EEE8c32D934F5856869EF428330', signature: ERC20_TRANSFER_SIG },
]

// Simple utility to validate hex strings
function isHex(value: string) {
  return /^0x[0-9a-fA-F]*$/.test(value)
}

export function StreamsGame() {
  const [contract, setContract] = useState<string>('')
  const [topic0, setTopic0] = useState<string>(ERC20_TRANSFER_SIG)
  const [topic1, setTopic1] = useState<string>('')
  const [topic2, setTopic2] = useState<string>('')
  const [onlyPushChanges, setOnlyPushChanges] = useState<boolean>(false)

  const [subscribing, setSubscribing] = useState(false)
  const [events, setEvents] = useState<any[]>([])
  const [score, setScore] = useState(0)
  const subscriptionRef = useRef<any>(null)

  const topicOverrides = useMemo<Hex[]>(() => {
    const topics: string[] = []
    if (topic0 && isHex(topic0)) topics.push(topic0)
    if (topic1 && isHex(topic1)) topics.push(topic1)
    if (topic2 && isHex(topic2)) topics.push(topic2)
    return topics as Hex[]
  }, [topic0, topic1, topic2])

  async function connectWallet() {
    try {
      if (!walletClient) {
        // Fallback request
        await (window as any).ethereum?.request?.({ method: 'eth_requestAccounts' })
        return
      }
      await (window as any).ethereum?.request?.({ method: 'eth_requestAccounts' })
    } catch (err) {
      console.error('Wallet connect error', err)
      alert('Failed to connect wallet. Ensure MetaMask is installed and Somnia Testnet is added.')
    }
  }

  async function startSubscription() {
    if (!contract || !isHex(contract) || contract.length !== 42) {
      alert('Enter a valid contract address (0x...).')
      return
    }
    if (!topicOverrides.length) {
      alert('Enter at least topic0 (event signature).')
      return
    }

    setSubscribing(true)
    setEvents([])
    setScore(0)

    try {
      const initParams: any = {
        ethCalls: [],
        onData: (data: any) => {
          setEvents((prev) => [data, ...prev].slice(0, 200))
          setScore((s) => s + 1)
        },
        onError: (error: Error) => {
          console.error('Streams subscribe error', error)
        },
        eventContractSource: contract as Address,
        topicOverrides,
        onlyPushChanges,
      }

      const sub = await sdk.streams.subscribe(initParams)
      subscriptionRef.current = sub
    } catch (err) {
      console.error(err)
      alert('Failed to subscribe. Check RPC and parameters.')
      setSubscribing(false)
    }
  }

  async function stopSubscription() {
    try {
      await subscriptionRef.current?.close?.()
    } catch {}
    subscriptionRef.current = null
    setSubscribing(false)
  }

  function applyPreset(addr: string, sig?: string) {
    setContract(addr)
    if (sig) setTopic0(sig)
  }

  return (
    <div style={{ marginTop: 24 }}>
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
        <button onClick={connectWallet}>Connect Wallet</button>
        {!subscribing ? (
          <button onClick={startSubscription}>Start Subscription</button>
        ) : (
          <button onClick={stopSubscription}>Stop Subscription</button>
        )}
      </div>

      <div style={{ marginTop: 12, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        {PRESETS.map((p) => (
          <button key={p.address} onClick={() => applyPreset(p.address, p.signature)}>
            Use {p.label} preset
          </button>
        ))}
      </div>

      <div style={{ marginTop: 16, display: 'grid', gap: 12 }}>
        <label>
          Contract Address
          <input
            placeholder="0x..."
            value={contract}
            onChange={(e) => setContract(e.target.value.trim())}
            style={{ width: '100%', padding: 8 }}
          />
        </label>
        <label>
          Topic0 (event signature)
          <input
            placeholder={ERC20_TRANSFER_SIG}
            value={topic0}
            onChange={(e) => setTopic0(e.target.value.trim())}
            style={{ width: '100%', padding: 8 }}
          />
        </label>
        <label>
          Topic1 (optional)
          <input
            placeholder="0x..."
            value={topic1}
            onChange={(e) => setTopic1(e.target.value.trim())}
            style={{ width: '100%', padding: 8 }}
          />
        </label>
        <label>
          Topic2 (optional)
          <input
            placeholder="0x..."
            value={topic2}
            onChange={(e) => setTopic2(e.target.value.trim())}
            style={{ width: '100%', padding: 8 }}
          />
        </label>
        <label style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <input
            type="checkbox"
            checked={onlyPushChanges}
            onChange={(e) => setOnlyPushChanges(e.target.checked)}
          />
          Only push changes
        </label>
      </div>

      <div style={{ marginTop: 24 }}>
        <h2>Score: {score}</h2>
        <p style={{ opacity: 0.8 }}>You earn +1 point per event received.</p>
      </div>

      <div style={{ marginTop: 16 }}>
        <h3>Recent Events</h3>
        <div style={{ maxHeight: 360, overflow: 'auto', border: '1px solid #333', borderRadius: 8 }}>
          {events.length === 0 ? (
            <div style={{ padding: 12, opacity: 0.7 }}>No events yet. Subscribe above.</div>
          ) : (
            events.map((ev, idx) => (
              <pre key={idx} style={{ padding: 12, borderBottom: '1px solid #333', margin: 0 }}>
                {JSON.stringify(ev, null, 2)}
              </pre>
            ))
          )}
        </div>
      </div>

      <div style={{ marginTop: 24, opacity: 0.8 }}>
        <p>
          Tip: Use an ERC20 token address on Somnia Testnet and keep topic0 as
          the Transfer signature to see token transfer events. You can send test
          STT via the faucet and interact with dApps like QuickSwap.
        </p>
      </div>
    </div>
  )
}