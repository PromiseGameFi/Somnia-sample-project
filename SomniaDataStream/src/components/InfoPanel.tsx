import React, { useState } from 'react'

export function InfoPanel() {
  const [open, setOpen] = useState(true)
  return (
    <div style={{ border: '1px solid #333', borderRadius: 8, padding: 12 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <strong>How Somnia Streams Works</strong>
        <button onClick={() => setOpen((o) => !o)}>{open ? 'Hide' : 'Show'}</button>
      </div>
      {open && (
        <div style={{ marginTop: 8, display: 'grid', gap: 8 }}>
          <p style={{ opacity: 0.9 }}>
            Somnia Streams lets you subscribe to real-time blockchain data (like events/logs) and react to it
            instantly in your app. You define filters (contract + topics), and the SDK pushes matching events to your
            callback.
          </p>
          <ul style={{ margin: 0, paddingLeft: 18 }}>
            <li>
              <strong>Subscription</strong>: Provide <code>eventContractSource</code> and <code>topicOverrides</code>. The SDK streams
              matching logs to <code>onData</code>.
            </li>
            <li>
              <strong>Event schema</strong>: Events are ABI-encoded. <code>topic0</code> is the signature (e.g., ERC20 Transfer),
              and additional topics index event params.
            </li>
            <li>
              <strong>onlyPushChanges</strong>: When enabled, the SDK reduces redundant updates and sends only changes.
            </li>
            <li>
              <strong>Viem clients</strong>: A <code>publicClient</code> handles RPC reads. A <code>walletClient</code> can be wired for
              write ops or signing.
            </li>
          </ul>
          <p style={{ opacity: 0.8 }}>
            Tip: Use known token contracts and the ERC20 Transfer signature to see live token transfer events. Click
            bubbles in the arena to collect events and learn by doing.
          </p>
        </div>
      )}
    </div>
  )
}