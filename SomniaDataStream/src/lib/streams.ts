import { SDK } from '@somnia-chain/streams'
import { publicClient, walletClient } from './viem'

export const sdk = new SDK({
  public: publicClient,
  wallet: walletClient ?? undefined,
})