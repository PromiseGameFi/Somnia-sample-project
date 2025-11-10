import { SDK, SchemaEncoder } from '@somnia-chain/streams'
import { createPublicClient, createWalletClient, http, defineChain, keccak256, toBytes, toHex } from 'viem'
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

const streamTopic = 'gps-tracking-demo';

export class GPSPublisher {
  constructor() {
    this.sdk = null
    this.account = null
    this.devices = []
    this.publishInterval = null
    this.isPublishing = false
    this.deviceIndex = 0
    
    // Initialize SchemaEncoder with GPS schema
    const gpsSchema = 'bytes32 deviceId, uint64 timestamp, int256 latitude, int256 longitude, int256 altitude, uint256 speed'
    this.schemaEncoder = new SchemaEncoder(gpsSchema)
  }

  // Initialize SDK with proper Streams configuration
  async initializeSDK() {
    try {
      console.log('🔧 Initializing Somnia Streams SDK...')
      
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

      console.log('✅ Somnia Streams SDK initialized successfully')
      
    } catch (error) {
      console.error('❌ Failed to initialize Streams SDK:', error)
      throw error
    }
  }

  // Initialize GPS devices with starting locations
  initializeDevices() {
    this.devices = [
      {
        id: 'truck_alpha',
        name: 'Delivery Truck Alpha',
        lat: 40.7128,
        lon: -74.0060,
        altitude: 100,
        speed: 45, // km/h base
        heading: 90, // degrees (east)
        lastUpdate: Date.now()
      },
      {
        id: 'vehicle_beta',
        name: 'Fleet Vehicle Beta',
        lat: 34.0522,
        lon: -118.2437,
        altitude: 105,
        speed: 55,
        heading: 45, // northeast
        lastUpdate: Date.now()
      },
      {
        id: 'van_gamma',
        name: 'Service Van Gamma',
        lat: 41.8781,
        lon: -87.6298,
        altitude: 50,
        speed: 35,
        heading: 180, // south
        lastUpdate: Date.now()
      }
    ]

    console.log(`📍 Initialized ${this.devices.length} GPS devices`)
    this.devices.forEach(device => {
      console.log(`  • ${device.name}: ${device.lat}, ${device.lon}`)
    })
  }

  // Simulate realistic GPS movement (heading + speed)
  simulateMovement(device) {
    const now = Date.now()
    const timeDeltaSec = (now - device.lastUpdate) / 1000
    if (timeDeltaSec <= 0) return device

    // Vary speed around a reasonable base, clamp 5–120 km/h (slightly larger variance)
    const speedVariation = (Math.random() - 0.5) * 20 // ±10 km/h
    const targetSpeed = Math.max(5, Math.min(120, device.speed + speedVariation))

    // Drift heading more noticeably
    const headingDrift = (Math.random() - 0.5) * 12 // ±6 degrees
    device.heading = (device.heading + headingDrift + 360) % 360

    // Convert speed to distance over the interval
    const distanceKm = targetSpeed * (timeDeltaSec / 3600)

    // Convert to lat/lon deltas
    const latRadians = device.lat * Math.PI / 180
    const kmPerDegLat = 111.32
    const kmPerDegLon = 111.32 * Math.cos(latRadians)
    const headingRad = device.heading * Math.PI / 180

    const dLatDeg = (distanceKm * Math.cos(headingRad)) / kmPerDegLat
    const dLonDeg = kmPerDegLon === 0 ? 0 : (distanceKm * Math.sin(headingRad)) / kmPerDegLon

    device.lat += dLatDeg
    device.lon += dLonDeg
    device.speed = Math.round(targetSpeed)
    device.altitude += Math.round((Math.random() - 0.5) * 4) // small ±2m variation
    device.lastUpdate = now

    return device
  }

  // Create GPS data for publishing
  createGPSData(device) {
    const timestamp = Math.floor(Date.now() / 1000) // Unix timestamp
    
    // Convert device ID to bytes32 format as required by schema
    const deviceId = toHex(device.id, { size: 32 })
    
    // Convert coordinates to fixed-point integers (multiply by 1,000,000 for precision)
    const latitude = Math.round(device.lat * 1000000)
    const longitude = Math.round(device.lon * 1000000)
    
    return {
      deviceId: deviceId,           // bytes32 format
      timestamp: BigInt(timestamp), // uint64 as BigInt
      latitude: BigInt(latitude),   // int256 as BigInt
      longitude: BigInt(longitude), // int256 as BigInt
      altitude: BigInt(device.altitude), // int256 as BigInt
      speed: BigInt(device.speed)   // uint256 as BigInt
    }
  }

  // Publish GPS data using Streams API
  async publishAllDevices() {
    console.log(`[${this.name}] Publishing updates for all devices...`)
    for (const device of this.devices) {
      try {
        // Now we wait for each publish to complete before starting the next
        await this.publishGPSData(device)
      } catch (error) {
        console.error(`[${this.name}] Error publishing data for ${device.name}:`, error)
      }
    }
  }

  async publishGPSData(device) {
    try {
      // Simulate movement before creating data
      this.simulateMovement(device)

      const gpsData = this.createGPSData(device)
      
      // Generate bytes32 data ID using keccak256 hash (SDK requires bytes32)
      const dataId = keccak256(toBytes(`${device.id}_${gpsData.timestamp}`))

      console.log(`🔍 Publishing GPS data for ${device.name}:`)
    console.log(`  📍 Location: ${device.lat.toFixed(6)}, ${device.lon.toFixed(6)}`)
    console.log(`  🚗 Speed: ${device.speed} km/h, Altitude: ${device.altitude}m`)
    console.log(`  🆔 Data ID: ${dataId}`)

    // Generate the bytes32 schema ID using keccak256 hash (SDK requires bytes32)
    // Align with registered schema id defined in schemas.js: 'gps_location'
    const schemaId = keccak256(toBytes('gps_location'))
    
    console.log(`  🔍 Schema ID (bytes32): ${schemaId}`)
    console.log(`  📊 GPS Data structure:`, JSON.stringify(gpsData, (key, value) => 
      typeof value === 'bigint' ? value.toString() : value, 2))

    // Encode the GPS data using SchemaEncoder
    const encodedData = this.schemaEncoder.encodeData([
      { name: "deviceId", value: gpsData.deviceId, type: "bytes32" },
      { name: "timestamp", value: gpsData.timestamp.toString(), type: "uint64" },
      { name: "latitude", value: gpsData.latitude.toString(), type: "int256" },
      { name: "longitude", value: gpsData.longitude.toString(), type: "int256" },
      { name: "altitude", value: gpsData.altitude.toString(), type: "int256" },
      { name: "speed", value: gpsData.speed.toString(), type: "uint256" }
    ])

    console.log(`  🔐 Encoded data (hex): ${encodedData}`)

    // Publish using set method with properly encoded data
    let result
    try {
      result = await this.sdk.streams.set([
        { id: dataId, schemaId: schemaId, data: encodedData, topic: streamTopic }
      ])
    } catch (err) {
      // Handle nonce-related transient errors by retrying once after a short delay
      if ((err?.message || '').toLowerCase().includes('nonce')) {
        console.warn('⚠️ Nonce issue detected. Retrying publish after short delay...')
        await new Promise(r => setTimeout(r, 1500))
        result = await this.sdk.streams.set([
          { id: dataId, schemaId: schemaId, data: encodedData, topic: streamTopic }
        ])
      } else {
        throw err
      }
    }

    console.log(`✅ GPS data published successfully for ${device.name}`)
    console.log(`📋 Transaction result:`, result)
    
    return result
    
  } catch (error) {
    console.error(`❌ Failed to publish GPS data for ${device.name}:`, error.message)
    
    // Log additional debug information
    if (error.message.includes('schema')) {
      console.log('💡 Hint: Make sure the GPS schema is registered first with: npm run register-schema')
    }
    
    throw new Error(`Failed to publish data for ${device.name}: ${error.message}`)
  }
}

  // Start publishing GPS data
  async startPublishing() {
    if (this.isPublishing) {
      console.log('⚠️ GPS Publisher is already running')
      return
    }

    const publishIntervalMs = parseInt(process.env.PUBLISH_INTERVAL_MS || '5000')
    this.publishIntervalMs = publishIntervalMs;
    console.log(`📡 Publishing GPS data via Streams API every ${publishIntervalMs}ms`)
    console.log(`📋 Publishing GPS data using Streams API with schema: gps_location`)

    this.isPublishing = true

    // Start the publishing loop
    this.scheduleNextPublication()

    console.log('✅ GPS Publisher started successfully')
    console.log('📊 Monitor the visualizer at http://localhost:3001 to see live GPS data')
  }

  // Schedule the next publication using a timeout
  scheduleNextPublication() {
    if (!this.isPublishing) return

    // Clear any existing timeout to avoid duplicates
    if (this.publishTimeout) {
      clearTimeout(this.publishTimeout)
    }

    this.publishTimeout = setTimeout(async () => {
      await this.publishAllDevices()
      this.scheduleNextPublication() // Schedule the next one
    }, this.publishIntervalMs)
  }

  // Stop publishing GPS data
  stopPublishing() {
    if (this.publishTimeout) {
      clearTimeout(this.publishTimeout)
      this.publishTimeout = null
    }
    this.isPublishing = false
    console.log('🛑 GPS Publisher stopped')
  }

  // Get current device status
  getDeviceStatus() {
    return this.devices.map(device => ({
      id: device.id,
      name: device.name,
      location: {
        lat: device.lat,
        lon: device.lon,
        altitude: device.altitude
      },
      speed: device.speed,
      lastUpdate: device.lastUpdate,
      isActive: this.isPublishing
    }))
  }
}

// Main execution
async function main() {
  const publisher = new GPSPublisher()
  
  try {
    console.log('🚀 Starting GPS Publisher with Streams API...')
    
    // Initialize Streams SDK
    await publisher.initializeSDK()
    
    // Initialize GPS devices
    publisher.initializeDevices()
    
    // Start publishing GPS data
    await publisher.startPublishing()
    
    // Handle graceful shutdown
    process.on('SIGINT', () => {
      console.log('\n🛑 Shutting down GPS Publisher...')
      publisher.stopPublishing()
      process.exit(0)
    })
    
    process.on('SIGTERM', () => {
      console.log('\n🛑 Shutting down GPS Publisher...')
      publisher.stopPublishing()
      process.exit(0)
    })
    
  } catch (error) {
    console.error('❌ GPS Publisher failed to start:', error)
    process.exit(1)
  }
}

// Run if this file is executed directly
if (import.meta.url.toLowerCase() === `file:///${process.argv[1].replace(/\\/g, '/')}`.toLowerCase()) {
  main()
}