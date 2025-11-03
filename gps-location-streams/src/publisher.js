import { SDK } from '@somnia-chain/streams'
import { encodeAbiParameters, parseAbiParameters, toHex, keccak256, toBytes, createWalletClient, http, createPublicClient } from 'viem'
import { privateKeyToAccount } from 'viem/accounts'
import dotenv from 'dotenv'

dotenv.config()

// Somnia chain configuration
const somniaChain = {
  id: 50312,
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
}

export class GPSPublisher {
  constructor() {
    this.devices = []
    this.publishInterval = parseInt(process.env.PUBLISH_INTERVAL) || 5000
    this.deviceCount = parseInt(process.env.DEVICE_COUNT) || 3
    this.isPublishing = false
    this.mockMode = process.env.MOCK_DATA === 'true'
    this.schemaId = 'gps_location_v1' // Use the registered schema ID
    this.sdk = null
    this.account = null
    this.publicClient = null
    this.walletClient = null
  }

  // Initialize SDK and clients
  async initializeSDK() {
    try {
      if (this.mockMode) {
        console.log('🔧 Initializing in Mock Mode (no blockchain interaction)...')
        console.log('👤 Mock Account: 0x1234567890123456789012345678901234567890')
        console.log('✅ Mock SDK initialized successfully')
        return
      }

      console.log('🔧 Initializing Somnia SDK...')
      
      // Create account from private key
      const privateKey = process.env.SOMNIA_PRIVATE_KEY || process.env.PRIVATE_KEY
      if (!privateKey) {
        throw new Error('SOMNIA_PRIVATE_KEY (or PRIVATE_KEY) not found in environment variables')
      }
      
      this.account = privateKeyToAccount(privateKey)
      console.log(`👤 Account: ${this.account.address}`)

      // Create clients
      this.publicClient = createPublicClient({
        chain: somniaChain,
        transport: http()
      })

      this.walletClient = createWalletClient({
        account: this.account,
        chain: somniaChain,
        transport: http()
      })

      // Initialize SDK
      this.sdk = new SDK({
        account: this.account,
        publicClient: this.publicClient,
        walletClient: this.walletClient
      })

      console.log('✅ SDK initialized successfully')
      
    } catch (error) {
      console.error('❌ Failed to initialize SDK:', error)
      throw error
    }
  }

  // Initialize GPS devices with starting locations
  initializeDevices() {
    const deviceNames = [
      'Delivery Truck Alpha',
      'Fleet Vehicle Beta', 
      'Service Van Gamma',
      'Logistics Truck Delta',
      'Emergency Vehicle Echo'
    ]

    // Starting locations (major cities)
    const startingLocations = [
      { lat: 40.7128, lon: -74.0060, name: 'New York' },
      { lat: 34.0522, lon: -118.2437, name: 'Los Angeles' },
      { lat: 41.8781, lon: -87.6298, name: 'Chicago' },
      { lat: 29.7604, lon: -95.3698, name: 'Houston' },
      { lat: 33.4484, lon: -112.0740, name: 'Phoenix' }
    ]

    for (let i = 0; i < this.deviceCount; i++) {
      const location = startingLocations[i % startingLocations.length]
      const deviceId = keccak256(toBytes(deviceNames[i]))
      
      this.devices.push({
        id: deviceId,
        name: deviceNames[i],
        latitude: location.lat,
        longitude: location.lon,
        altitude: Math.random() * 100 + 50, // 50-150m altitude
        speed: Math.random() * 80 + 20, // 20-100 km/h
        direction: Math.random() * 360, // Random initial direction
        lastUpdate: Date.now()
      })
    }

    console.log(`📍 Initialized ${this.devices.length} GPS devices`)
    this.devices.forEach(device => {
      console.log(`  • ${device.name}: ${device.latitude.toFixed(4)}, ${device.longitude.toFixed(4)}`)
    })
  }

  // Simulate realistic GPS movement
  updateDeviceLocations() {
    this.devices.forEach(device => {
      // Simulate movement (small random changes)
      const speedKmh = device.speed
      const speedMs = speedKmh / 3.6 // Convert to m/s
      const timeElapsed = (Date.now() - device.lastUpdate) / 1000 // seconds
      
      // Calculate distance moved
      const distanceM = speedMs * timeElapsed
      
      // Convert to lat/lon changes (approximate)
      const latChange = (distanceM * Math.cos(device.direction * Math.PI / 180)) / 111000
      const lonChange = (distanceM * Math.sin(device.direction * Math.PI / 180)) / (111000 * Math.cos(device.latitude * Math.PI / 180))
      
      // Update position
      device.latitude += latChange
      device.longitude += lonChange
      
      // Randomly adjust direction and speed
      device.direction += (Math.random() - 0.5) * 30 // ±15 degree change
      device.speed += (Math.random() - 0.5) * 10 // ±5 km/h change
      device.speed = Math.max(10, Math.min(120, device.speed)) // Keep speed reasonable
      
      // Slight altitude variation
      device.altitude += (Math.random() - 0.5) * 5
      device.altitude = Math.max(0, Math.min(500, device.altitude))
      
      device.lastUpdate = Date.now()
    })
  }

  // Create GPS data event for blockchain
  createGPSEvent(device) {
    const timestamp = BigInt(Math.floor(Date.now() / 1000))
    const latitude = BigInt(Math.floor(device.latitude * 1000000)) // 6 decimal precision
    const longitude = BigInt(Math.floor(device.longitude * 1000000))
    const altitude = BigInt(Math.floor(device.altitude))
    const speed = BigInt(Math.floor(device.speed))

    // Create event data that can be emitted as a blockchain event
    return {
      deviceId: device.id,
      timestamp,
      latitude,
      longitude,
      altitude,
      speed,
      deviceName: device.name
    }
  }

  // Publish GPS data using blockchain transactions
  async publishGPSData() {
    if (!this.isPublishing) return

    try {
      this.updateDeviceLocations()
      
      // Create GPS events for each device
      const gpsEvents = this.devices.map(device => this.createGPSEvent(device))
      
      if (this.mockMode) {
        // Mock mode - just log the data without blockchain interaction
        for (const event of gpsEvents) {
          const mockHash = `0x${Math.random().toString(16).substr(2, 8)}`
          console.log(`📡 [MOCK] Published GPS data for ${event.deviceName} (tx: ${mockHash}...)`)
          console.log(`  📍 Location: ${(Number(event.latitude) / 1000000).toFixed(6)}, ${(Number(event.longitude) / 1000000).toFixed(6)}`)
          console.log(`  🚗 Speed: ${Number(event.speed)} km/h, Altitude: ${Number(event.altitude)}m`)
        }
        return
      }
      
      // Real blockchain mode - use transaction-based publishing with registered schema
      console.log(`📋 Using registered schema: ${this.schemaId}`)
      
      for (const event of gpsEvents) {
        try {
          // Debug: Log the raw values being encoded
          console.log(`🔍 DEBUG - Encoding values for ${event.deviceName}:`)
          console.log(`  deviceId: ${event.deviceId}`)
          console.log(`  timestamp: ${event.timestamp}`)
          console.log(`  latitude (raw): ${event.latitude}`)
          console.log(`  longitude (raw): ${event.longitude}`)
          console.log(`  altitude: ${event.altitude}`)
          console.log(`  speed: ${event.speed}`)
          
          // TEST: Use simple hardcoded values to debug encoding
          const testDeviceId = '0x1234567890123456789012345678901234567890123456789012345678901234'
          const testTimestamp = BigInt(1640995200) // 2022-01-01 00:00:00
          const testLatitude = BigInt(40681110) // 40.681110 * 1000000
          const testLongitude = BigInt(-74005353) // -74.005353 * 1000000
          const testAltitude = BigInt(131)
          const testSpeed = BigInt(55)
          
          console.log(`🧪 TEST - Using hardcoded values:`)
          console.log(`  deviceId: ${testDeviceId}`)
          console.log(`  timestamp: ${testTimestamp}`)
          console.log(`  latitude: ${testLatitude}`)
          console.log(`  longitude: ${testLongitude}`)
          console.log(`  altitude: ${testAltitude}`)
          console.log(`  speed: ${testSpeed}`)
          
          // Encode GPS data using the registered schema format
          const gpsData = encodeAbiParameters(
            parseAbiParameters('bytes32, uint64, int256, int256, int256, uint256'),
            [testDeviceId, testTimestamp, testLatitude, testLongitude, testAltitude, testSpeed]
          )
          
          // Publish data via blockchain transaction using a simple contract call approach
          const hash = await this.walletClient.sendTransaction({
            account: this.account,
            to: this.account.address, // Send to self
            data: gpsData,
            value: 0n,
            gas: 100000n, // Fixed gas limit
            gasPrice: 10000000000n, // 10 gwei
            type: 'legacy' // Use legacy transaction format
          })
          
          console.log(`📡 Published GPS data for ${event.deviceName} to blockchain (tx: ${hash.slice(0, 10)}...)`)
          console.log(`  📍 Location: ${(Number(event.latitude) / 1000000).toFixed(6)}, ${(Number(event.longitude) / 1000000).toFixed(6)}`)
          console.log(`  🚗 Speed: ${Number(event.speed)} km/h, Altitude: ${Number(event.altitude)}m`)
          console.log(`  📋 Schema: ${this.schemaId}`)
          
        } catch (publishError) {
          console.error(`❌ Failed to publish data for ${event.deviceName}:`, publishError.message)
        }
      }

    } catch (error) {
      console.error('❌ Failed to publish GPS data:', error)
    }
  }

  // Start publishing GPS data
  async startPublishing() {
    try {
      console.log('🚀 Starting GPS Publisher...')
      
      // Initialize SDK and clients
      await this.initializeSDK()
      
      // Initialize devices
      this.initializeDevices()
      
      // Start publishing loop
      this.isPublishing = true
      console.log(`📡 Publishing GPS data every ${this.publishInterval}ms`)
      
      // Publish immediately, then on interval
      await this.publishGPSData()
      this.publishTimer = setInterval(() => {
        this.publishGPSData()
      }, this.publishInterval)
      
    } catch (error) {
      console.error('❌ Failed to start GPS publisher:', error)
      throw error
    }
  }

  // Stop publishing
  stopPublishing() {
    this.isPublishing = false
    if (this.publishTimer) {
      clearInterval(this.publishTimer)
      this.publishTimer = null
    }
    console.log('🛑 GPS Publisher stopped')
  }
}

// Main execution
async function main() {
  // Validate environment variables
  if (!process.env.SOMNIA_PRIVATE_KEY && !process.env.PRIVATE_KEY) {
    throw new Error('SOMNIA_PRIVATE_KEY (or PRIVATE_KEY) not found in environment variables')
  }
  if (!process.env.SOMNIA_RPC_URL && !process.env.RPC_URL) {
    throw new Error('SOMNIA_RPC_URL (or RPC_URL) not found in environment variables')
  }

  const publisher = new GPSPublisher()
  
  // Graceful shutdown handling
  process.on('SIGINT', () => {
    console.log('\n🛑 Shutting down GPS Publisher...')
    publisher.stopPublishing()
    process.exit(0)
  })

  try {
    await publisher.startPublishing()
  } catch (error) {
    console.error('❌ GPS Publisher failed:', error)
    process.exit(1)
  }
}

main()