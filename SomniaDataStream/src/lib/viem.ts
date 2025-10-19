import { createPublicClient, createWalletClient, http, custom, defineChain } from 'viem'

// Somnia Testnet chain definition (adjust if official chain export available)
export const somniaTestnet = defineChain({
  id: 50312,
  name: 'Somnia Testnet',
  nativeCurrency: { name: 'Somnia Test Token', symbol: 'STT', decimals: 18 },
  rpcUrls: {
    default: {
      http: [import.meta.env.VITE_SOMNIA_RPC_URL ?? 'https://dream-rpc.somnia.network'],
    },
  },
})

export const publicClient = createPublicClient({
  chain: somniaTestnet,
  transport: http(import.meta.env.VITE_SOMNIA_RPC_URL ?? 'https://dream-rpc.somnia.network'),
})

export const walletClient = typeof window !== 'undefined' && (window as any).ethereum
  ? createWalletClient({ chain: somniaTestnet, transport: custom((window as any).ethereum) })
  : null