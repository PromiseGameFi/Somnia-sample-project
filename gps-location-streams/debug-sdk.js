import * as SomniaSDK from '@somnia-chain/streams'
import { createWalletClient, createPublicClient, http, defineChain } from 'viem'
import { privateKeyToAccount } from 'viem/accounts'
import dotenv from 'dotenv'

// Check what's exported from the SDK
console.log('=== Somnia SDK Exports ===')
console.log('Available exports:', Object.keys(SomniaSDK))
for (const exportName of Object.keys(SomniaSDK)) {
  console.log(`${exportName}:`, typeof SomniaSDK[exportName])
}

dotenv.config()

// Define Somnia chain
const somniaChain = defineChain({
  id: parseInt(process.env.SOMNIA_CHAIN_ID) || 50312,
  name: 'Somnia Testnet',
  network: 'somnia-testnet',
  nativeCurrency: {
    decimals: 18,
    name: 'STT',
    symbol: 'STT',
  },
  rpcUrls: {
    default: {
      http: [process.env.SOMNIA_RPC_URL || 'https://dream-rpc.somnia.network'],
    },
  },
})

async function testSDK() {
  try {
    console.log('🔧 Testing SDK initialization...')
    
    // Create account from private key
    const account = privateKeyToAccount(process.env.SOMNIA_PRIVATE_KEY)
    console.log('✅ Account created:', account.address)
    
    // Create clients
    const publicClient = createPublicClient({
      chain: somniaChain,
      transport: http(process.env.SOMNIA_RPC_URL || 'https://dream-rpc.somnia.network')
    })
    
    const walletClient = createWalletClient({
      chain: somniaChain,
      account: account,
      transport: http(process.env.SOMNIA_RPC_URL || 'https://dream-rpc.somnia.network')
    })
    
    console.log('✅ Clients created')
    
    // Test SchemaEncoder
    console.log('\n=== Testing SchemaEncoder ===')
    const schemaEncoder = new SomniaSDK.SchemaEncoder()
    console.log('SchemaEncoder created')
    console.log('SchemaEncoder properties:', Object.getOwnPropertyNames(schemaEncoder))
    console.log('SchemaEncoder prototype methods:', Object.getOwnPropertyNames(Object.getPrototypeOf(schemaEncoder)))
    
    // Check for methods on SchemaEncoder
    const encoderProto = Object.getPrototypeOf(schemaEncoder)
    for (const prop of Object.getOwnPropertyNames(encoderProto)) {
      if (typeof encoderProto[prop] === 'function' && prop !== 'constructor') {
        console.log(`Found SchemaEncoder method: ${prop}`)
      }
    }
    
    // Initialize SDK
    const sdk = new SomniaSDK.SDK({
      public: publicClient,
      wallet: walletClient
    })
    
    console.log('✅ SDK initialized')
    
    // Explore all SDK properties and methods
    console.log('\n=== SDK Structure ===')
    console.log('SDK own properties:', Object.getOwnPropertyNames(sdk))
    console.log('SDK prototype methods:', Object.getOwnPropertyNames(Object.getPrototypeOf(sdk)))
    
    // Check all properties of SDK
    for (const prop of Object.getOwnPropertyNames(sdk)) {
      console.log(`sdk.${prop}:`, typeof sdk[prop], sdk[prop])
      
      if (typeof sdk[prop] === 'object' && sdk[prop] !== null) {
        console.log(`  ${prop} properties:`, Object.getOwnPropertyNames(sdk[prop]))
        
        // Check for methods in this property
        for (const subProp of Object.getOwnPropertyNames(sdk[prop])) {
          if (typeof sdk[prop][subProp] === 'function') {
            console.log(`    Found method: ${prop}.${subProp}`)
          }
        }
      }
    }
    
    // Check prototype methods
     const proto = Object.getPrototypeOf(sdk)
     console.log('\n=== SDK Prototype Methods ===')
     for (const prop of Object.getOwnPropertyNames(proto)) {
       if (typeof proto[prop] === 'function' && prop !== 'constructor') {
         console.log(`Found prototype method: ${prop}`)
       }
     }
     
     // Explore the viem property more deeply
     console.log('\n=== Exploring sdk.streams.viem ===')
     const viem = sdk.streams.viem
     console.log('viem properties:', Object.getOwnPropertyNames(viem))
     console.log('viem.chainId:', viem.chainId)
     console.log('viem.client:', viem.client)
     
     if (viem.client) {
       console.log('viem.client.public methods:', Object.getOwnPropertyNames(viem.client.public))
       console.log('viem.client.wallet methods:', Object.getOwnPropertyNames(viem.client.wallet))
       
       // Check if there are any contract-related methods
       if (viem.client.public) {
         const publicClient = viem.client.public
         console.log('Public client prototype methods:', Object.getOwnPropertyNames(Object.getPrototypeOf(publicClient)))
       }
     }
    
  } catch (error) {
    console.error('❌ SDK test failed:', error)
    console.error('Error details:', error.message)
    console.error('Stack trace:', error.stack)
  }
}

testSDK()