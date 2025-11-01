import { createPublicClient, createWalletClient, http, parseAbiParameters, encodeAbiParameters, defineChain } from 'viem'
import { privateKeyToAccount } from 'viem/accounts'
import { SDK } from '@somnia-chain/streams'
import dotenv from 'dotenv'

dotenv.config()

export class GPSSchemaManager {
  constructor() {
    this.rpcUrl = process.env.SOMNIA_RPC_URL || process.env.RPC_URL
    this.chainId = parseInt(process.env.SOMNIA_CHAIN_ID || '50311')
    this.account = privateKeyToAccount(process.env.SOMNIA_PRIVATE_KEY || process.env.PRIVATE_KEY)
    
    // Define Somnia chain
    const somniaChain = defineChain({
      id: this.chainId,
      name: 'Somnia Testnet',
      network: 'somnia-testnet',
      nativeCurrency: {
        decimals: 18,
        name: 'STT',
        symbol: 'STT',
      },
      rpcUrls: {
        default: {
          http: [this.rpcUrl],
        },
        public: {
          http: [this.rpcUrl],
        },
      },
    })
    
    this.sdk = new SDK({
      public: createPublicClient({ 
        chain: somniaChain, 
        transport: http(this.rpcUrl) 
      }),
      wallet: createWalletClient({ 
        chain: somniaChain, 
        account: this.account, 
        transport: http(this.rpcUrl) 
      })
    })
  }

  async registerGPSSchema() {
    const gpsSchema = {
      id: "gps_location",
      schema: 'uint64 timestamp, int256 latitude, int256 longitude, int256 altitude, uint256 speed, bytes32 deviceId',
      parentSchemaId: '0x0000000000000000000000000000000000000000000000000000000000000000'
    }

    try {
      console.log('Registering GPS location schema...')
      await this.sdk.streams.registerDataSchemas([gpsSchema], true)
      console.log('✅ GPS schema registered successfully')
      return gpsSchema.id
    } catch (error) {
      console.error('❌ Schema registration failed:', error)
      throw error
    }
  }

  async registerGPSEvents() {
    const eventSchemas = ['LocationUpdate', 'DeviceStatusChange']
    const eventDefinitions = [
      {
        params: [
          { name: 'deviceId', paramType: 'bytes32', isIndexed: true },
          { name: 'timestamp', paramType: 'uint64', isIndexed: false }
        ],
        eventTopic: 'LocationUpdate(bytes32 indexed deviceId, uint64 timestamp)'
      },
      {
        params: [
          { name: 'deviceId', paramType: 'bytes32', isIndexed: true },
          { name: 'status', paramType: 'uint8', isIndexed: false }
        ],
        eventTopic: 'DeviceStatusChange(bytes32 indexed deviceId, uint8 status)'
      }
    ]

    try {
      console.log('Registering GPS events...')
      await this.sdk.streams.registerEventSchemas(eventSchemas, eventDefinitions)
      console.log('✅ GPS events registered successfully')
    } catch (error) {
      console.error('❌ Event registration failed:', error)
      throw error
    }
  }
}