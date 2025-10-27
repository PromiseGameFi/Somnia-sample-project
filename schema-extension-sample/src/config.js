import { SDK } from '@somnia-chain/streams';
import { createPublicClient, createWalletClient, http } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { somniaTestnet } from 'viem/chains';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

// Load environment variables
dotenv.config()

// Validate required environment variables
if (!process.env.RPC_URL) {
  throw new Error('RPC_URL is required in .env file')
}

if (!process.env.PRIVATE_KEY) {
  throw new Error('PRIVATE_KEY is required in .env file')
}

// Network configuration
export const rpcUrl = process.env.RPC_URL
// Add 0x prefix to private key if not present
const privateKey = process.env.PRIVATE_KEY.startsWith('0x') 
  ? process.env.PRIVATE_KEY 
  : `0x${process.env.PRIVATE_KEY}`
export const account = privateKeyToAccount(privateKey)

// Create SDK instance
export const sdk = new SDK({
  public: createPublicClient({ 
    chain: somniaTestnet, 
    transport: http(rpcUrl) 
  }),
  wallet: createWalletClient({ 
    chain: somniaTestnet, 
    account, 
    transport: http(rpcUrl) 
  })
})

// Schema IDs persistence
const SCHEMA_IDS_FILE = path.join(process.cwd(), '.schema-ids.json')

function loadSchemaIds() {
  try {
    if (fs.existsSync(SCHEMA_IDS_FILE)) {
      const data = fs.readFileSync(SCHEMA_IDS_FILE, 'utf8')
      return JSON.parse(data)
    }
  } catch (error) {
    console.warn('⚠️  Could not load schema IDs:', error.message)
  }
  return {
    coordinates: null,
    driver: null,
    delivery: null
  }
}

export function saveSchemaIds(ids) {
  try {
    fs.writeFileSync(SCHEMA_IDS_FILE, JSON.stringify(ids, null, 2))
  } catch (error) {
    console.warn('⚠️  Could not save schema IDs:', error.message)
  }
}

// Schema IDs (loaded from file or defaults)
export const schemaIds = loadSchemaIds()

// Demo configuration
export const demoConfig = {
  driverId: process.env.DEMO_DRIVER_ID || '0x742d35Cc6634C0532925a3b8D0Ac6bc4ab60e001',
  deliveryId: process.env.DEMO_DELIVERY_ID || '0x742d35Cc6634C0532925a3b8D0Ac6bc4ab60e002'
}

console.log('✅ SDK configured successfully')
console.log(`📍 RPC URL: ${rpcUrl}`)
console.log(`👤 Account: ${account.address}`)