import { SDK } from '@somnia-chain/streams'
import { createPublicClient, createWalletClient, http, defineChain } from 'viem'
import { privateKeyToAccount } from 'viem/accounts'
import dotenv from 'dotenv'

dotenv.config()

// Somnia chain configuration
const somniaChain = defineChain({
  id: parseInt(process.env.SOMNIA_CHAIN_ID || process.env.CHAIN_ID || '50312'),
  name: 'Somnia Testnet',
  network: 'somnia-testnet',
  nativeCurrency: {
    decimals: 18,
    name: 'STT',
    symbol: 'STT',
  },
  rpcUrls: {
    default: {
      http: [process.env.SOMNIA_RPC_URL || process.env.RPC_URL || 'https://dream-rpc.somnia.network'],
    },
    public: {
      http: [process.env.SOMNIA_RPC_URL || process.env.RPC_URL || 'https://dream-rpc.somnia.network'],
    },
  },
})

export class GPSSchemaManager {
  constructor() {
    this.sdk = null
    this.account = null
  }

  // Initialize SDK with proper Streams configuration
  async initializeSDK() {
    try {
      console.log('🔧 Initializing Somnia Streams SDK for Schema Management...')
      
      // Create account from private key
      const privateKey = process.env.SOMNIA_PRIVATE_KEY || process.env.PRIVATE_KEY
      if (!privateKey) {
        throw new Error('SOMNIA_PRIVATE_KEY (or PRIVATE_KEY) not found in environment variables')
      }
      
      this.account = privateKeyToAccount(privateKey)
      console.log(`👤 Account: ${this.account.address}`)

      // Create clients for Streams SDK
      const publicClient = createPublicClient({
        chain: somniaChain,
        transport: http()
      })

      const walletClient = createWalletClient({
        account: this.account,
        chain: somniaChain,
        transport: http()
      })

      // Initialize Streams SDK with proper configuration
      this.sdk = new SDK({
        public: publicClient,
        wallet: walletClient
      })

      console.log('✅ Somnia Streams SDK initialized successfully for Schema Management')
      
    } catch (error) {
      console.error('❌ Failed to initialize Streams SDK:', error)
      throw error
    }
  }

  // Define GPS location schema
  getGPSLocationSchema() {
    return {
      id: 'gps_location',
      name: 'GPS Location Data',
      description: 'Real-time GPS location data from IoT devices for logistics and fleet management',
      version: '1.0.0',
      fields: [
        {
          name: 'deviceId',
          type: 'bytes32',
          description: 'Unique identifier for the GPS device'
        },
        {
          name: 'timestamp',
          type: 'uint64',
          description: 'Unix timestamp when the GPS reading was taken'
        },
        {
          name: 'latitude',
          type: 'int256',
          description: 'Latitude coordinate (multiplied by 1,000,000 for precision)'
        },
        {
          name: 'longitude',
          type: 'int256',
          description: 'Longitude coordinate (multiplied by 1,000,000 for precision)'
        },
        {
          name: 'altitude',
          type: 'int256',
          description: 'Altitude in meters above sea level'
        },
        {
          name: 'speed',
          type: 'uint256',
          description: 'Speed in kilometers per hour'
        }
      ],
      // ABI encoding format for the schema
      encoding: 'bytes32 deviceId, uint64 timestamp, int256 latitude, int256 longitude, int256 altitude, uint256 speed'
    }
  }

  // Define GPS event schemas for additional functionality
  getGPSEventSchemas() {
    return [
      {
        id: 'location_update',
        name: 'Location Update Event',
        description: 'Event triggered when a device location is updated',
        version: '1.0.0',
        fields: [
          {
            name: 'deviceId',
            type: 'bytes32',
            description: 'Device identifier'
          },
          {
            name: 'previousLat',
            type: 'int256',
            description: 'Previous latitude'
          },
          {
            name: 'previousLon',
            type: 'int256',
            description: 'Previous longitude'
          },
          {
            name: 'newLat',
            type: 'int256',
            description: 'New latitude'
          },
          {
            name: 'newLon',
            type: 'int256',
            description: 'New longitude'
          },
          {
            name: 'distance',
            type: 'uint256',
            description: 'Distance moved in meters'
          }
        ],
        encoding: 'bytes32 deviceId, int256 previousLat, int256 previousLon, int256 newLat, int256 newLon, uint256 distance'
      },
      {
        id: 'device_status',
        name: 'Device Status Change',
        description: 'Event for device status changes (online/offline, battery, etc.)',
        version: '1.0.0',
        fields: [
          {
            name: 'deviceId',
            type: 'bytes32',
            description: 'Device identifier'
          },
          {
            name: 'status',
            type: 'uint8',
            description: 'Status code (0=offline, 1=online, 2=low_battery, 3=error)'
          },
          {
            name: 'batteryLevel',
            type: 'uint8',
            description: 'Battery level percentage (0-100)'
          },
          {
            name: 'timestamp',
            type: 'uint64',
            description: 'Timestamp of status change'
          }
        ],
        encoding: 'bytes32 deviceId, uint8 status, uint8 batteryLevel, uint64 timestamp'
      }
    ]
  }

  // Register GPS schemas using Streams API
  async registerGPSSchemas() {
    try {
      console.log('📋 Registering GPS schemas using Streams API...')
      
      // Get all schemas to register
      const gpsLocationSchema = this.getGPSLocationSchema()
      const eventSchemas = this.getGPSEventSchemas()
      const allSchemas = [gpsLocationSchema, ...eventSchemas]

      console.log(`📝 Registering ${allSchemas.length} schemas:`)
      allSchemas.forEach(schema => {
        console.log(`  • ${schema.id}: ${schema.name}`)
      })

      // Register schemas using the Streams API
      const tx = await this.sdk.streams.registerDataSchemas(allSchemas)
      
      console.log(`✅ GPS schemas registered successfully via Streams API`)
      console.log(`📋 Transaction hash: ${tx}`)
      console.log(`🔍 Registered schemas:`)
      
      allSchemas.forEach(schema => {
        console.log(`  ✓ ${schema.id} - ${schema.name} (v${schema.version})`)
        console.log(`    📝 Encoding: ${schema.encoding}`)
        console.log(`    📊 Fields: ${schema.fields.length}`)
      })

      return {
        success: true,
        transactionHash: tx,
        schemas: allSchemas
      }
      
    } catch (error) {
      console.error('❌ Failed to register GPS schemas:', error)
      
      // Provide helpful error messages
      if (error.message.includes('already registered')) {
        console.log('💡 Schemas may already be registered. This is normal if you\'ve run this before.')
        return {
          success: true,
          message: 'Schemas already registered',
          schemas: [this.getGPSLocationSchema(), ...this.getGPSEventSchemas()]
        }
      }
      
      if (error.message.includes('insufficient funds')) {
        console.log('💡 Hint: Make sure your account has sufficient STT tokens for gas fees')
      }
      
      throw error
    }
  }

  // Verify schema registration
  async verifySchemaRegistration() {
    try {
      console.log('🔍 Verifying GPS schema registration...')
      
      const gpsSchema = this.getGPSLocationSchema()
      
      // Check if the schema is registered using Streams API
      const isRegistered = await this.sdk.streams.isSchemaRegistered(gpsSchema.id)
      
      if (isRegistered) {
        console.log(`✅ GPS schema '${gpsSchema.id}' is properly registered`)
        
        // Get schema details if available
        try {
          const schemaDetails = await this.sdk.streams.getSchema(gpsSchema.id)
          console.log(`📋 Schema details:`, schemaDetails)
        } catch (detailError) {
          console.log('📋 Schema is registered but details not available via API')
        }
        
        return true
      } else {
        console.log(`❌ GPS schema '${gpsSchema.id}' is not registered`)
        return false
      }
      
    } catch (error) {
      console.error('❌ Failed to verify schema registration:', error)
      return false
    }
  }

  // Get schema information
  getSchemaInfo() {
    const gpsSchema = this.getGPSLocationSchema()
    const eventSchemas = this.getGPSEventSchemas()
    
    return {
      mainSchema: gpsSchema,
      eventSchemas: eventSchemas,
      totalSchemas: 1 + eventSchemas.length,
      description: 'GPS tracking schemas for IoT devices and logistics applications'
    }
  }
}

// Main execution for schema registration
async function main() {
  const schemaManager = new GPSSchemaManager()
  
  try {
    console.log('🚀 Starting GPS Schema Registration...')
    
    // Initialize Streams SDK
    await schemaManager.initializeSDK()
    
    // Display schema information
    const schemaInfo = schemaManager.getSchemaInfo()
    console.log(`📊 Schema Information:`)
    console.log(`  📋 Main Schema: ${schemaInfo.mainSchema.id} - ${schemaInfo.mainSchema.name}`)
    console.log(`  🎯 Event Schemas: ${schemaInfo.eventSchemas.length}`)
    console.log(`  📝 Total Schemas: ${schemaInfo.totalSchemas}`)
    console.log(`  📖 Description: ${schemaInfo.description}`)
    
    // Register GPS schemas
    const result = await schemaManager.registerGPSSchemas()
    
    if (result.success) {
      console.log('🎉 GPS schema registration completed successfully!')
      
      // Verify registration
      const isVerified = await schemaManager.verifySchemaRegistration()
      if (isVerified) {
        console.log('✅ Schema registration verified!')
        console.log('🚀 You can now start the GPS publisher and visualizer:')
        console.log('  📡 Publisher: npm start')
        console.log('  📊 Visualizer: npm run visualizer')
        console.log('  🔄 Both: npm run dev')
      } else {
        console.log('⚠️ Schema registration could not be verified')
      }
    }
    
  } catch (error) {
    console.error('❌ GPS Schema Registration failed:', error)
    process.exit(1)
  }
}

// Export for use in other modules
export { GPSSchemaManager }

// Run if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main()
}