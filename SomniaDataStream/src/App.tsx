import { useState, useEffect } from 'react'
import './App.css'
import { StreamsGame } from './components/StreamsGame'

function App() {
  const [ready, setReady] = useState(false)
  useEffect(() => {
    setReady(true)
  }, [])

  return (
    <div style={{ maxWidth: 920, margin: '0 auto', padding: 24 }}>
      <h1>Somnia Data Streams Demo: Event Hunter</h1>
      <p style={{ marginTop: 8 }}>
        Subscribe to on-chain events on Somnia and react in real-time using the
        Somnia Streams SDK. Connect your wallet, pick a contract + event
        signature, and start hunting events for points.
      </p>
      {ready && <StreamsGame />}
    </div>
  )
}

export default App
