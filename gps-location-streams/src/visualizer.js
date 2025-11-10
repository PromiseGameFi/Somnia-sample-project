import { SDK } from '@somnia-chain/streams'
import { createPublicClient, createWalletClient, http, webSocket, defineChain, toBytes, pad, toHex, keccak256 } from 'viem'
import { privateKeyToAccount } from 'viem/accounts'
import express from 'express'
import { WebSocketServer } from 'ws'
import { createServer } from 'http'
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
const publisherAddress = '0xc8F59daEa91f30F4F6D85E5c510d78bd1ac4b19e';

export class GPSVisualizer {
  constructor() {
    this.sdk = null
    this.account = null
    this.devices = new Map()
    this.wsClients = new Set()
    this.app = express()
    this.server = null
    this.wss = null
    this.pollingInterval = null
    this.hasReceivedData = false;
  }

  // Initialize SDK with proper Streams configuration
  async initializeSDK() {
    try {
      console.log('🔧 Initializing Somnia Streams SDK for Visualization...')
      
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
        transport: webSocket(process.env.SOMNIA_RPC_URL.replace('http', 'ws'))
      })

      const walletClient = createWalletClient({
        account: this.account,
        chain: somniaChain,
        transport: webSocket(process.env.SOMNIA_RPC_URL.replace('http', 'ws'))
      })

      // Initialize Streams SDK with proper configuration
      this.sdk = new SDK({
        public: publicClient,
        wallet: walletClient
      })

      console.log('✅ Somnia Streams SDK initialized successfully for Visualization')
      
    } catch (error) {
      console.error('❌ Failed to initialize Streams SDK:', error)
      throw error
    }
  }

  // Process GPS data from Streams
  processGPSData(data, deviceId) {
    try {
      console.log(`🔍 Raw data received:`, data);
      
      // Handle packed hex data from blockchain
      // Accept common shapes: string hex, { data: '0x...' }, [ '0x...' ]
      if (typeof data === 'string' && data.startsWith('0x')) {
        return this.decodePackedGPSData(data, deviceId);
      }
      if (data && typeof data === 'object' && typeof data.data === 'string' && data.data.startsWith('0x')) {
        return this.decodePackedGPSData(data.data, deviceId);
      }
      if (Array.isArray(data) && data.length > 0 && typeof data[0] === 'string' && data[0].startsWith('0x')) {
        return this.decodePackedGPSData(data[0], deviceId);
      }
      
      // Handle already decoded data objects (e.g., mock or pre-decoded payloads)
      if (data && typeof data === 'object' && !Array.isArray(data)) {
        const gpsData = {
          deviceId: data.deviceId || deviceId,
          timestamp: data.timestamp || Date.now(),
          latitude: data.latitude ? parseFloat(data.latitude) / 1e6 : 0,
          longitude: data.longitude ? parseFloat(data.longitude) / 1e6 : 0,
          altitude: data.altitude ? parseFloat(data.altitude) : 0,
          speed: data.speed ? parseFloat(data.speed) : 0
        };

        console.log(`📍 Received GPS data for ${gpsData.deviceId}:`);
        console.log(`  📍 Location: ${gpsData.latitude.toFixed(6)}, ${gpsData.longitude.toFixed(6)}`);
        console.log(`  🚗 Speed: ${gpsData.speed} km/h, Altitude: ${gpsData.altitude}m`);
        console.log(`  ⏰ Timestamp: ${new Date(gpsData.timestamp).toISOString()}`);

        // Update device data with structure expected by dashboard
        const deviceName = gpsData.deviceId;
        const deviceData = {
          deviceId: deviceName,
          id: deviceName,
          name: deviceName,
          latitude: gpsData.latitude,
          longitude: gpsData.longitude,
          altitude: gpsData.altitude,
          speed: gpsData.speed,
          timestamp: gpsData.timestamp,
          lastUpdate: Date.now(),
          lastSeen: Date.now()
        };

        this.devices.set(deviceName, deviceData);
        this.broadcastDeviceUpdate(deviceData);
        return deviceData;
      }

      // Fallback to mock data
      console.log('⚠️ Unexpected data format, falling back to mock data');
      return this.generateMockData(deviceId);
    } catch (error) {
      console.error(`❌ Error processing GPS data for ${deviceId}:`, error);
      return this.generateMockData(deviceId);
    }
  }

  decodePackedGPSData(hexData, deviceId) {
    try {
      console.log(`🔧 Decoding packed GPS data: ${hexData.substring(0, 100)}...`);
      
      // Remove 0x prefix
      const hex = hexData.slice(2);
      
      // Parse the packed data structure
      // Based on the schema: deviceId (32 bytes), timestamp (32 bytes), latitude (32 bytes), longitude (32 bytes), altitude (32 bytes), speed (32 bytes)
      
      // Extract deviceId (first 64 hex chars = 32 bytes)
      const deviceIdHex = hex.substring(0, 64);
      let decodedDeviceId = '';
      for (let i = 0; i < deviceIdHex.length; i += 2) {
        const hexPair = deviceIdHex.substr(i, 2);
        if (hexPair === '00') break;
        const charCode = parseInt(hexPair, 16);
        if (charCode > 0) decodedDeviceId += String.fromCharCode(charCode);
      }
      
      // Extract timestamp (next 64 hex chars = 32 bytes)
      const timestampHex = hex.substring(64, 128);
      const timestamp = parseInt(timestampHex, 16);
      
      // Extract latitude (next 64 hex chars = 32 bytes) - signed integer
      const latitudeHex = hex.substring(128, 192);
      const latitude = this.hexToSignedInt(latitudeHex) / 1e6;
      
      // Extract longitude (next 64 hex chars = 32 bytes) - signed integer  
      const longitudeHex = hex.substring(192, 256);
      const longitude = this.hexToSignedInt(longitudeHex) / 1e6;
      
      // Extract altitude (next 64 hex chars = 32 bytes) - signed integer
      const altitudeHex = hex.substring(256, 320);
      const altitude = this.hexToSignedInt(altitudeHex);
      
      // Extract speed (next 64 hex chars = 32 bytes)
      const speedHex = hex.substring(320, 384);
      const speed = parseInt(speedHex, 16);

      const gpsData = {
        deviceId: decodedDeviceId || deviceId,
        timestamp: timestamp > 0 ? timestamp : Date.now(),
        latitude: latitude,
        longitude: longitude,
        altitude: altitude,
        speed: speed
      };

      console.log(`📍 Decoded GPS data for ${gpsData.deviceId}:`);
      console.log(`  📍 Location: ${gpsData.latitude.toFixed(6)}, ${gpsData.longitude.toFixed(6)}`);
      console.log(`  🚗 Speed: ${gpsData.speed} km/h, Altitude: ${gpsData.altitude}m`);
      console.log(`  ⏰ Timestamp: ${new Date(gpsData.timestamp).toISOString()}`);

      // Update device data with structure expected by dashboard
      const deviceName = gpsData.deviceId;
      const deviceData = {
        deviceId: deviceName,
        id: deviceName,
        name: deviceName,
        latitude: gpsData.latitude,
        longitude: gpsData.longitude,
        altitude: gpsData.altitude,
        speed: gpsData.speed,
        timestamp: gpsData.timestamp,
        lastUpdate: Date.now(),
        lastSeen: Date.now()
      };

      this.devices.set(deviceName, deviceData);
      this.hasReceivedData = true;
      this.broadcastDeviceUpdate(deviceData);
      return deviceData;
    } catch (error) {
      console.error(`❌ Error decoding packed GPS data:`, error);
      return this.generateMockData(deviceId);
    }
  }

  hexToSignedInt(hex) {
    // Convert hex to signed 32-byte integer
    const num = BigInt('0x' + hex);
    const maxVal = BigInt('0x' + 'f'.repeat(64));
    const signBit = BigInt('0x8' + '0'.repeat(63));
    
    if (num >= signBit) {
      return Number(num - maxVal - BigInt(1));
    }
    return Number(num);
  }

  generateMockData(deviceId) {
    const mockDevices = {
      'truck_alpha': { name: 'Delivery Truck Alpha', lat: 40.7128, lon: -74.0060 },
      'vehicle_beta': { name: 'Fleet Vehicle Beta', lat: 34.0522, lon: -118.2437 },
      'van_gamma': { name: 'Service Van Gamma', lat: 41.8781, lon: -87.6298 }
    };
    
    const device = mockDevices[deviceId] || { name: 'Unknown Device', lat: 0, lon: 0 };
    
    // Add some random movement
    const lat = device.lat + (Math.random() - 0.5) * 0.01;
    const lon = device.lon + (Math.random() - 0.5) * 0.01;
    
    const deviceData = {
      deviceId: deviceId,
      id: deviceId,
      name: device.name,
      latitude: lat,
      longitude: lon,
      altitude: Math.floor(Math.random() * 200) + 50,
      speed: Math.floor(Math.random() * 80),
      timestamp: Date.now(),
      lastUpdate: Date.now(),
      lastSeen: Date.now()
    };
    
    this.devices.set(deviceId, deviceData);
    this.broadcastDeviceUpdate(deviceData);
    return deviceData;
  }

  // Broadcast device update to WebSocket clients
  broadcastDeviceUpdate(deviceData) {
    if (this.wsClients.size === 0) return

    const message = JSON.stringify({
      type: 'gps_update',
      device: deviceData,
      timestamp: Date.now()
    })

    this.wsClients.forEach(client => {
      if (client.readyState === 1) { // WebSocket.OPEN
        try {
          client.send(message)
        } catch (error) {
          console.error('❌ Failed to send WebSocket message:', error)
          this.wsClients.delete(client)
        }
      }
    })

    console.log(`📡 Broadcasted update for ${deviceData.name} to ${this.wsClients.size} clients`)
  }

  // Poll for GPS data using Streams API
  async subscribeToGPSData() {
    try {
      console.log('📡 Setting up GPS data subscription via Streams API...');
      
      const schemaId = keccak256(toBytes('gps_location'));
      console.log(`📋 Subscribing to schema: gps_location`);
      console.log(`🔍 Schema ID (bytes32): ${schemaId}`);

      console.log(`📍 Publisher Address: ${publisherAddress}`);

      this.subscription = await this.sdk.streams.subscribe(
        schemaId,
        publisherAddress,
        (data, key) => {
          console.log(`[onData] Callback triggered for key: ${key}`);
          console.log(`[onData] Raw data received:`, data);
          try {
            const deviceId = key.replace(/^0x|0+$/g, '');
            console.log(`[onData] Processing data for deviceId: ${deviceId}`);
            this.processGPSData(data, deviceId);
            console.log(`[onData] Successfully processed data for deviceId: ${deviceId}`);
          } catch (e) {
            console.error(`[onData] Error processing data:`, e);
          }
        },
        {
          topic: streamTopic
        }
      );

      console.log('✅ Successfully subscribed to real-time GPS data stream');
      
    } catch (error) {
      console.error('❌ Failed to subscribe to GPS data stream:', error);
      if (error.message.includes('schema')) {
        console.log('💡 Hint: Make sure the GPS schema is registered first with: npm run register-schema');
      }
      console.log('🔄 Falling back to mock data generation...');
      this.startMockDataPolling();
    }
  }

  // Fallback method for mock data generation
  startMockDataPolling(schemaId = null) {
    console.log('🎭 Starting mock data generation as fallback...')
    
    this.pollingInterval = setInterval(() => {
      this.generateMockDataPoint()
    }, 3000)
  }

  // Generate a single mock data point
  generateMockDataPoint() {
    const mockDevices = [
      { id: 'truck_alpha', name: 'Delivery Truck Alpha', lat: 40.7128, lon: -74.0060 },
      { id: 'vehicle_beta', name: 'Fleet Vehicle Beta', lat: 34.0522, lon: -118.2437 },
      { id: 'van_gamma', name: 'Service Van Gamma', lat: 41.8781, lon: -87.6298 }
    ]
    
    for (const device of mockDevices) {
      // Add some random movement
      const lat = device.lat + (Math.random() - 0.5) * 0.01
      const lon = device.lon + (Math.random() - 0.5) * 0.01
      
      const mockData = {
        deviceId: pad(toHex(device.id), { size: 32 }),
        timestamp: Math.floor(Date.now() / 1000),
        latitude: Math.floor(lat * 1000000),
        longitude: Math.floor(lon * 1000000),
        altitude: Math.floor(Math.random() * 200) + 50,
        speed: Math.floor(Math.random() * 80)
      }
      
      console.log(`📥 Processing mock GPS data for ${device.name}`)
      this.processGPSData(mockData)
    }
  }

  // Setup Express server and WebSocket
  setupServer() {
    const port = parseInt(process.env.VISUALIZER_PORT || '3001')

    // Serve static files
    this.app.use(express.static('public'))
    this.app.use(express.json())

    // API endpoint to get all devices
    this.app.get('/api/devices', (req, res) => {
      const devicesArray = Array.from(this.devices.values())
      res.json({
        devices: devicesArray,
        count: devicesArray.length,
        lastUpdate: Date.now()
      })
    })

    // API endpoint to get specific device
    this.app.get('/api/devices/:id', (req, res) => {
      const device = this.devices.get(req.params.id)
      if (device) {
        res.json(device)
      } else {
        res.status(404).json({ error: 'Device not found' })
      }
    })

    // Health check endpoint
    this.app.get('/api/health', (req, res) => {
      res.json({
        status: 'healthy',
        devices: this.devices.size,
        clients: this.wsClients.size,
        subscription: this.subscription ? 'active' : 'inactive',
        timestamp: Date.now()
      })
    })

    // Create HTTP server
    this.server = createServer(this.app)

    // Setup WebSocket server
    this.wss = new WebSocketServer({ server: this.server })

    this.wss.on('connection', (ws) => {
      console.log('🔌 New WebSocket client connected')
      this.wsClients.add(ws)

      // Send current device data to new client only if we have data
      if (this.hasReceivedData) {
        const devicesArray = Array.from(this.devices.values());
        ws.send(JSON.stringify({
          type: 'initial_data',
          devices: devicesArray,
          timestamp: Date.now()
        }));
      }

      ws.on('close', () => {
        console.log('🔌 WebSocket client disconnected')
        this.wsClients.delete(ws)
      })

      ws.on('error', (error) => {
        console.error('❌ WebSocket error:', error)
        this.wsClients.delete(ws)
      })
    })

    // Start server
    this.server.listen(port, () => {
      console.log(`🌐 GPS Visualizer server running on http://localhost:${port}`)
      console.log(`📊 WebSocket server ready for real-time GPS data`)
      console.log(`🔍 API endpoints:`)
      console.log(`  • GET /api/devices - List all devices`)
      console.log(`  • GET /api/devices/:id - Get specific device`)
      console.log(`  • GET /api/health - Health check`)
    })
  }

  // Start the visualizer
  async start() {
    try {
      console.log('🚀 Starting GPS Visualizer with Streams API...')
      
      // Initialize Streams SDK
      await this.initializeSDK()
      
      // Setup web server and WebSocket
      this.setupServer()
      
      // Start polling for GPS data streams
      await this.subscribeToGPSData()
      
      console.log('✅ GPS Visualizer started successfully')
      console.log('📡 Listening for GPS data from Streams API...')
      console.log('🌐 Open http://localhost:3001 to view the dashboard')
      
    } catch (error) {
      console.error('❌ Failed to start GPS Visualizer:', error)
      throw error
    }
  }

  // Stop the visualizer
  async stop() {
    try {
      console.log('🛑 Stopping GPS Visualizer...')
      
      // Unsubscribe from streams
      if (this.subscription) {
        await this.subscription.unsubscribe()
        this.subscription = null
        console.log('📡 Unsubscribed from GPS data streams')
      }
      
      // Close WebSocket connections
      this.wsClients.forEach(client => {
        client.close()
      })
      this.wsClients.clear()
      
      // Close server
      if (this.server) {
        this.server.close()
        console.log('🌐 Web server stopped')
      }
      
      console.log('✅ GPS Visualizer stopped successfully')
      
    } catch (error) {
      console.error('❌ Error stopping GPS Visualizer:', error)
    }
  }

  // Get current status
  getStatus() {
    return {
      devices: Array.from(this.devices.values()),
      deviceCount: this.devices.size,
      clientCount: this.wsClients.size,
      subscriptionActive: !!this.subscription,
      lastUpdate: Date.now()
    }
  }
}

// Main execution
async function main() {
  const visualizer = new GPSVisualizer()
  
  try {
    await visualizer.start()
    
    // Handle graceful shutdown
    process.on('SIGINT', async () => {
      console.log('\n🛑 Shutting down GPS Visualizer...')
      await visualizer.stop()
      process.exit(0)
    })
    
    process.on('SIGTERM', async () => {
      console.log('\n🛑 Shutting down GPS Visualizer...')
      await visualizer.stop()
      process.exit(0)
    })
    
  } catch (error) {
    console.error('❌ GPS Visualizer failed to start:', error)
    process.exit(1)
  }
}

// Run if this file is executed directly
if (import.meta.url.toLowerCase() === `file:///${process.argv[1].replace(/\\/g, '/')}`.toLowerCase()) {
  main()
}