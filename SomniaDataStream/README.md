# Somnia Data Streams Demo (Event Hunter)

A production-ready mini-project demonstrating how to subscribe to on-chain events on Somnia Testnet using the `@somnia-chain/streams` SDK with a React + Vite + TypeScript frontend.

This demo lets you:
- Connect a wallet (MetaMask) on Somnia Testnet.
- Specify a contract address and event topics.
- Subscribe to events in real-time via Somnia Streams, and view payloads.
- Earn a “score” as events arrive (+1 point per event).

## Quick Start

### Prerequisites
- Node.js 18+
- Web wallet (MetaMask)
- Somnia Testnet configured
- STT from faucet

### Setup

```bash
cd SomniaDataStream
npm install
# optional: .env.local
# VITE_SOMNIA_RPC_URL=https://dream-rpc.somnia.network
npm run dev
```

Open `http://localhost:5173`.

### Using the Demo
- Click `Connect Wallet`.
- Enter a contract address (e.g., ERC20).
- Keep `Topic0` as ERC20 Transfer by default, or change.
- Optionally set `Topic1`, `Topic2`.
- Toggle `Only push changes`.
- Click `Start Subscription` and watch events stream.

## Project Structure

```
SomniaDataStream/
├─ src/components/StreamsGame.tsx
├─ src/lib/viem.ts
├─ src/lib/streams.ts
├─ src/App.tsx
├─ src/main.tsx
└─ index.css
```

## SDK Integration

```ts
// src/lib/streams.ts
import { SDK } from '@somnia-chain/streams'
import { publicClient, walletClient } from './viem'
export const sdk = new SDK({ public: publicClient, wallet: walletClient ?? undefined })
```

```ts
// StreamsGame.tsx (subscribe)
const initParams = {
  ethCalls: [],
  onData: (data) => setEvents((p) => [data, ...p].slice(0, 200)),
  onError: (e) => console.error(e),
  eventContractSource: contract,
  topicOverrides,
  onlyPushChanges,
}
await sdk.streams.subscribe(initParams)
```

- ERC20 Transfer signature (Topic0):
  `0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef`

## Environment & Chain

```ts
// src/lib/viem.ts
export const somniaTestnet = defineChain({
  id: 50312,
  name: 'Somnia Testnet',
  nativeCurrency: { name: 'Somnia Test Token', symbol: 'STT', decimals: 18 },
  rpcUrls: { default: { http: [import.meta.env.VITE_SOMNIA_RPC_URL ?? 'https://dream-rpc.somnia.network'] } },
})
```

RPC defaults to `https://dream-rpc.somnia.network` or `VITE_SOMNIA_RPC_URL`.

## Browser Polyfills

Vite does not polyfill Node globals. Add minimal polyfills in `src/main.tsx`:

```ts
import { Buffer } from 'buffer'
;(globalThis as any).Buffer = (globalThis as any).Buffer || Buffer
;(globalThis as any).global = (globalThis as any).global || globalThis
```

If `Buffer is not defined`, confirm the above and refresh.

## Production Readiness

- Error handling for subscriptions
- Event list capped to 200 entries
- Configurable RPC and topics
- Minimal dependencies (`@somnia-chain/streams`, `viem`)

## Extend

- Add `ethCalls` to read state alongside events
- Persist scoreboard
- Provide curated contract presets
- Add tests for event parsing/UI

## Troubleshooting

- Wallet connection: ensure MetaMask + Somnia Testnet
- No events: check address/topics and trigger activity
- Buffer error: verify polyfill
- RPC issues: set `VITE_SOMNIA_RPC_URL`

## Resources

- Somnia docs & GitBook
- `@somnia-chain/streams` npm
- viem docs
