import { SDK as SomniaSDK } from '@somnia-chain/streams'
import { decodeAbiParameters, parseAbiParameters, createPublicClient, http } from 'viem'
import { privateKeyToAccount } from 'viem/accounts'
import express from 'express'
import { WebSocketServer } from 'ws'
import dotenv from 'dotenv'

// Load environment variables from .env file
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

class GPSVisualizer {
  constructor() {
    this.devices = new Map()
    this.sdk = null
    this.account = null
    this.publicClient = null
    this.subscription = null
    this.isSubscribed = false
    this.port = process.env.PORT || 3001
    this.wss = null
  }

  // Initialize Somnia SDK
  async initializeSDK() {
    try {
      console.log('🔧 Initializing Somnia SDK...')
      
      // Get private key from environment
      const privateKey = process.env.SOMNIA_PRIVATE_KEY || process.env.PRIVATE_KEY
      if (!privateKey) {
        throw new Error('Private key not found in environment variables')
      }

      // Create account from private key
      this.account = privateKeyToAccount(privateKey)
      this.publisherAddress = this.account.address // Store publisher address for filtering
      console.log(`📱 Account: ${this.account.address}`)
      console.log(`🎯 Filtering GPS transactions from publisher: ${this.publisherAddress}`)

      // Create public client for reading data
      this.publicClient = createPublicClient({
        chain: somniaChain,
        transport: http(process.env.SOMNIA_RPC_URL || process.env.RPC_URL)
      })

      // Initialize SDK for reading data
      this.sdk = new SomniaSDK({
        privateKey,
        rpcUrl: process.env.SOMNIA_RPC_URL || process.env.RPC_URL || 'https://dream-rpc.somnia.network',
        chainId: parseInt(process.env.SOMNIA_CHAIN_ID || process.env.CHAIN_ID || '50312')
      })

      console.log('✅ Somnia SDK initialized successfully')
    } catch (error) {
      console.error('❌ Failed to initialize SDK:', error)
      throw error
    }
  }

  // Decode GPS data from transaction input
  decodeGPSData(transactionData) {
    try {
      // Debug: Log the raw transaction data
      console.log(`🔍 RAW TRANSACTION DATA: ${transactionData}`)
      console.log(`🔍 DATA LENGTH: ${transactionData.length}`)
      
      // Remove '0x' prefix if present
      const cleanData = transactionData.startsWith('0x') ? transactionData.slice(2) : transactionData
      console.log(`🔍 CLEAN DATA LENGTH: ${cleanData.length}`)
      console.log(`🔍 CLEAN DATA (first 100 chars): ${cleanData.substring(0, 100)}...`)
      
      // Validate data length (should be at least 384 hex chars = 192 bytes for our schema)
      // 6 parameters × 32 bytes each = 192 bytes = 384 hex characters
      if (cleanData.length < 384) {
        console.log(`⚠️ Data too short: ${cleanData.length} < 384`)
        return null // Not enough data for GPS schema
      }
      
      // Extract the full 384 hex characters (our GPS data)
      const gpsData = cleanData.substring(0, 384)
      console.log(`🔍 EXTRACTED GPS DATA (384 chars): ${gpsData}`)
      
      // Decode the GPS data using the schema format
      const [deviceId, timestamp, latitude, longitude, altitude, speed] = decodeAbiParameters(
        parseAbiParameters('bytes32, uint64, int256, int256, int256, uint256'),
        `0x${gpsData}`
      )
      
      // Debug: Log the raw decoded values
      console.log('🔍 DEBUG - Decoded raw values:')
      console.log(`  deviceId: ${deviceId}`)
      console.log(`  timestamp: ${timestamp}`)
      console.log(`  latitude (raw): ${latitude}`)
      console.log(`  longitude (raw): ${longitude}`)
      console.log(`  altitude: ${altitude}`)
      console.log(`  speed: ${speed}`)

      // Convert and validate coordinates
      const lat = Number(latitude) / 1000000 // Convert from fixed-point
      const lon = Number(longitude) / 1000000 // Convert from fixed-point
      const alt = Number(altitude)
      const spd = Number(speed)

      // Validate realistic GPS coordinates
      if (lat < -90 || lat > 90 || lon < -180 || lon > 180) {
        console.warn(`⚠️ Invalid coordinates: ${lat}, ${lon}`)
        return null
      }

      // Validate reasonable speed (0-500 km/h)
      if (spd < 0 || spd > 500) {
        console.warn(`⚠️ Invalid speed: ${spd} km/h`)
        return null
      }

      return {
        deviceId: deviceId,
        timestamp: Number(timestamp),
        latitude: lat,
        longitude: lon,
        altitude: alt,
        speed: spd
      }
    } catch (error) {
      // Only log actual decoding errors, not validation failures
      if (error.name === 'PositionOutOfBoundsError') {
        return null // Silently ignore invalid data
      }
      console.error('❌ Failed to decode GPS data:', error)
      return null
    }
  }

  // Update device information
  updateDevice(gpsData) {
    const deviceKey = gpsData.deviceId
    const existingDevice = this.devices.get(deviceKey)
    
    const device = {
      id: deviceKey,
      name: existingDevice?.name || `Device ${deviceKey.slice(0, 8)}...`,
      latitude: gpsData.latitude,
      longitude: gpsData.longitude,
      altitude: gpsData.altitude,
      speed: gpsData.speed,
      timestamp: gpsData.timestamp,
      lastUpdate: new Date().toISOString(),
      history: existingDevice?.history || []
    }

    // Keep location history (last 50 points)
    device.history.push({
      lat: gpsData.latitude,
      lon: gpsData.longitude,
      timestamp: gpsData.timestamp
    })
    if (device.history.length > 50) {
      device.history.shift()
    }

    this.devices.set(deviceKey, device)
    
    // Broadcast to connected WebSocket clients
    this.broadcastDeviceUpdate(device)
    
    // Convert BigInt values to numbers for display
    const lat = typeof gpsData.latitude === 'bigint' ? Number(gpsData.latitude) / 1000000 : gpsData.latitude
    const lng = typeof gpsData.longitude === 'bigint' ? Number(gpsData.longitude) / 1000000 : gpsData.longitude
    const speed = typeof gpsData.speed === 'bigint' ? Number(gpsData.speed) : gpsData.speed
    
    console.log(`📍 Updated ${device.name}: ${lat.toFixed(6)}, ${lng.toFixed(6)} | ${speed} km/h`)
  }

  // Broadcast device updates to WebSocket clients
  broadcastDeviceUpdate(device) {
    if (this.wss) {
      // Custom JSON replacer to handle BigInt values
      const message = JSON.stringify({
        type: 'deviceUpdate',
        device: device
      }, (key, value) => {
        return typeof value === 'bigint' ? value.toString() : value
      })
      
      this.wss.clients.forEach(client => {
        if (client.readyState === 1) { // WebSocket.OPEN
          client.send(message)
        }
      })
    }
  }

  // Subscribe to GPS data streams using blockchain monitoring
  async subscribeToGPSStreams() {
    try {
      console.log('🔄 Subscribing to GPS data streams...')
      
      // Monitor new blocks for GPS transactions
      const unwatch = this.publicClient.watchBlocks({
        onBlock: async (block) => {
          try {
            // Get full block with transactions
            const fullBlock = await this.publicClient.getBlock({
              blockHash: block.hash,
              includeTransactions: true
            })
            
            // Process transactions that might contain GPS data
            for (const tx of fullBlock.transactions) {
              // Filter transactions: only process transactions TO the publisher address (GPS data transactions)
              if (tx.to && tx.to.toLowerCase() === this.publisherAddress.toLowerCase() && 
                  tx.input && tx.input !== '0x' && tx.input.length > 10) {
                console.log(`🔍 Processing GPS transaction: ${tx.hash.slice(0, 10)}... from ${tx.from} to ${tx.to}`)
                
                // Try to decode as GPS data
                const gpsData = this.decodeGPSData(tx.input)
                if (gpsData) {
                  console.log(`✅ Successfully decoded GPS data from transaction ${tx.hash.slice(0, 10)}...`)
                  this.updateDevice(gpsData)
                } else {
                  console.log(`❌ Failed to decode GPS data from transaction ${tx.hash.slice(0, 10)}...`)
                }
              }
            }
          } catch (error) {
            console.error('❌ Error processing block:', error)
          }
        }
      })
      
      this.subscription = unwatch
      this.isSubscribed = true
      console.log('✅ Successfully subscribed to GPS streams')
      
    } catch (error) {
      console.error('❌ Failed to subscribe to GPS streams:', error)
      throw error
    }
  }

  // Setup web server and WebSocket
  setupWebServer() {
    const app = express()
    
    // Serve static files
    app.use(express.static('public'))
    
    // API endpoint to get all devices
    app.get('/api/devices', (req, res) => {
      const devicesArray = Array.from(this.devices.values())
      res.json(devicesArray)
    })

    // API endpoint to get specific device
    app.get('/api/devices/:id', (req, res) => {
      const device = this.devices.get(req.params.id)
      if (device) {
        res.json(device)
      } else {
        res.status(404).json({ error: 'Device not found' })
      }
    })

    // Serve the main dashboard
    app.get('/', (req, res) => {
      res.send(this.getDashboardHTML())
    })

    // Start HTTP server
    const server = app.listen(this.port, () => {
      console.log(`🌐 GPS Dashboard running at http://localhost:${this.port}`)
    })

    // Setup WebSocket server
    this.wss = new WebSocketServer({ server })
    
    this.wss.on('connection', (ws) => {
      console.log('🔌 New WebSocket connection')
      
      // Send current device data to new client with BigInt handling
      const devicesArray = Array.from(this.devices.values())
      const message = JSON.stringify({
        type: 'initialData',
        devices: devicesArray
      }, (key, value) => {
        return typeof value === 'bigint' ? value.toString() : value
      })
      
      ws.send(message)

      ws.on('close', () => {
        console.log('🔌 WebSocket connection closed')
      })
      
      ws.on('error', (error) => {
        console.log('🔌 WebSocket error:', error.message)
      })
    })
  }

  // Generate dashboard HTML
  getDashboardHTML() {
    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>GPS Tracker Dashboard - Somnia Data Streams</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { 
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            color: #333;
        }
        .header {
            background: rgba(255, 255, 255, 0.95);
            backdrop-filter: blur(10px);
            padding: 1rem 2rem;
            box-shadow: 0 2px 20px rgba(0,0,0,0.1);
            border-bottom: 1px solid rgba(255,255,255,0.2);
        }
        .header h1 {
            color: #4a5568;
            font-size: 1.8rem;
            font-weight: 600;
        }
        .header p {
            color: #718096;
            margin-top: 0.25rem;
        }
        .container {
            max-width: 1400px;
            margin: 0 auto;
            padding: 2rem;
        }
        .stats-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
            gap: 1.5rem;
            margin-bottom: 2rem;
        }
        .stat-card {
            background: rgba(255, 255, 255, 0.95);
            backdrop-filter: blur(10px);
            border-radius: 12px;
            padding: 1.5rem;
            box-shadow: 0 4px 20px rgba(0,0,0,0.1);
            border: 1px solid rgba(255,255,255,0.2);
        }
        .stat-card h3 {
            color: #4a5568;
            font-size: 0.9rem;
            font-weight: 600;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            margin-bottom: 0.5rem;
        }
        .stat-card .value {
            color: #2d3748;
            font-size: 2rem;
            font-weight: 700;
        }
        .devices-grid {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
            gap: 1.5rem;
        }
        .device-card {
            background: rgba(255, 255, 255, 0.95);
            backdrop-filter: blur(10px);
            border-radius: 12px;
            padding: 1.5rem;
            box-shadow: 0 4px 20px rgba(0,0,0,0.1);
            border: 1px solid rgba(255,255,255,0.2);
            transition: transform 0.2s ease, box-shadow 0.2s ease;
        }
        .device-card:hover {
            transform: translateY(-2px);
            box-shadow: 0 8px 30px rgba(0,0,0,0.15);
        }
        .device-header {
            display: flex;
            align-items: center;
            margin-bottom: 1rem;
        }
        .device-status {
            width: 12px;
            height: 12px;
            border-radius: 50%;
            background: #48bb78;
            margin-right: 0.75rem;
            animation: pulse 2s infinite;
        }
        @keyframes pulse {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.5; }
        }
        .device-name {
            color: #2d3748;
            font-size: 1.1rem;
            font-weight: 600;
        }
        .device-info {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 0.75rem;
            margin-bottom: 1rem;
        }
        .info-item {
            display: flex;
            flex-direction: column;
        }
        .info-label {
            color: #718096;
            font-size: 0.8rem;
            font-weight: 500;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            margin-bottom: 0.25rem;
        }
        .info-value {
            color: #2d3748;
            font-size: 0.95rem;
            font-weight: 600;
        }
        .coordinates {
            background: #f7fafc;
            border-radius: 8px;
            padding: 0.75rem;
            margin-top: 1rem;
        }
        .coordinates-label {
            color: #4a5568;
            font-size: 0.8rem;
            font-weight: 600;
            margin-bottom: 0.5rem;
        }
        .coordinates-value {
            color: #2d3748;
            font-family: 'Courier New', monospace;
            font-size: 0.9rem;
        }
        .no-devices {
            text-align: center;
            padding: 3rem;
            color: rgba(255, 255, 255, 0.8);
        }
        .no-devices h3 {
            font-size: 1.5rem;
            margin-bottom: 1rem;
        }
        .connection-status {
            position: fixed;
            top: 1rem;
            right: 1rem;
            background: rgba(255, 255, 255, 0.95);
            backdrop-filter: blur(10px);
            border-radius: 8px;
            padding: 0.5rem 1rem;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
            border: 1px solid rgba(255,255,255,0.2);
            font-size: 0.8rem;
            font-weight: 600;
        }
        .connected { color: #48bb78; }
        .disconnected { color: #f56565; }
    </style>
</head>
<body>
    <div class="connection-status" id="connectionStatus">
        <span class="disconnected">● Connecting...</span>
    </div>
    
    <div class="header">
        <h1>🛰️ GPS Tracker Dashboard</h1>
        <p>Real-time GPS tracking powered by Somnia Data Streams</p>
    </div>
    
    <div class="container">
        <div class="stats-grid">
            <div class="stat-card">
                <h3>Active Devices</h3>
                <div class="value" id="deviceCount">0</div>
            </div>
            <div class="stat-card">
                <h3>Total Updates</h3>
                <div class="value" id="updateCount">0</div>
            </div>
            <div class="stat-card">
                <h3>Avg Speed</h3>
                <div class="value" id="avgSpeed">0 km/h</div>
            </div>
            <div class="stat-card">
                <h3>Last Update</h3>
                <div class="value" id="lastUpdate">Never</div>
            </div>
        </div>
        
        <div id="devicesContainer">
            <div class="no-devices">
                <h3>🔍 Waiting for GPS data...</h3>
                <p>Start the GPS publisher to see real-time location updates</p>
            </div>
        </div>
    </div>

    <script>
        let devices = new Map();
        let updateCount = 0;
        let ws = null;

        function connectWebSocket() {
            const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
            ws = new WebSocket(\`\${protocol}//\${window.location.host}\`);
            
            ws.onopen = function() {
                console.log('WebSocket connected');
                document.getElementById('connectionStatus').innerHTML = '<span class="connected">● Connected</span>';
            };
            
            ws.onmessage = function(event) {
                const data = JSON.parse(event.data);
                
                if (data.type === 'initialData') {
                    data.devices.forEach(device => {
                        devices.set(device.id, device);
                    });
                    updateCount = devices.size * 10; // Estimate
                } else if (data.type === 'deviceUpdate') {
                    devices.set(data.device.id, data.device);
                    updateCount++;
                }
                
                updateDashboard();
            };
            
            ws.onclose = function() {
                console.log('WebSocket disconnected');
                document.getElementById('connectionStatus').innerHTML = '<span class="disconnected">● Disconnected</span>';
                // Reconnect after 3 seconds
                setTimeout(connectWebSocket, 3000);
            };
            
            ws.onerror = function(error) {
                console.error('WebSocket error:', error);
            };
        }

        function updateDashboard() {
            const devicesArray = Array.from(devices.values());
            
            // Update stats
            document.getElementById('deviceCount').textContent = devicesArray.length;
            document.getElementById('updateCount').textContent = updateCount;
            
            if (devicesArray.length > 0) {
                const avgSpeed = devicesArray.reduce((sum, device) => sum + device.speed, 0) / devicesArray.length;
                document.getElementById('avgSpeed').textContent = \`\${avgSpeed.toFixed(1)} km/h\`;
                
                const lastUpdate = Math.max(...devicesArray.map(device => new Date(device.lastUpdate).getTime()));
                document.getElementById('lastUpdate').textContent = new Date(lastUpdate).toLocaleTimeString();
            }
            
            // Update devices grid
            const container = document.getElementById('devicesContainer');
            
            if (devicesArray.length === 0) {
                container.innerHTML = \`
                    <div class="no-devices">
                        <h3>🔍 Waiting for GPS data...</h3>
                        <p>Start the GPS publisher to see real-time location updates</p>
                    </div>
                \`;
            } else {
                container.innerHTML = \`
                    <div class="devices-grid">
                        \${devicesArray.map(device => \`
                            <div class="device-card">
                                <div class="device-header">
                                    <div class="device-status"></div>
                                    <div class="device-name">\${device.name}</div>
                                </div>
                                <div class="device-info">
                                    <div class="info-item">
                                        <div class="info-label">Speed</div>
                                        <div class="info-value">\${parseFloat(device.speed)} km/h</div>
                                    </div>
                                    <div class="info-item">
                                        <div class="info-label">Altitude</div>
                                        <div class="info-value">\${parseFloat(device.altitude)}m</div>
                                    </div>
                                    <div class="info-item">
                                        <div class="info-label">Last Update</div>
                                        <div class="info-value">\${new Date(device.lastUpdate).toLocaleTimeString()}</div>
                                    </div>
                                    <div class="info-item">
                                        <div class="info-label">History Points</div>
                                        <div class="info-value">\${device.history.length}</div>
                                    </div>
                                </div>
                                <div class="coordinates">
                                    <div class="coordinates-label">📍 Current Location</div>
                                    <div class="coordinates-value">
                                        \${(parseFloat(device.latitude) / 1000000).toFixed(6)}, \${(parseFloat(device.longitude) / 1000000).toFixed(6)}
                                    </div>
                                </div>
                            </div>
                        \`).join('')}
                    </div>
                \`;
            }
        }

        // Initialize
        connectWebSocket();
        updateDashboard();
    </script>
</body>
</html>
    `
  }

  // Start the visualizer
  async startVisualizer() {
    try {
      console.log('🚀 Starting GPS Visualizer...')
      
      // Initialize SDK
      await this.initializeSDK()
      
      // Setup web server first
      this.setupWebServer()
      
      // Subscribe to GPS streams
      await this.subscribeToGPSStreams()
      
      console.log('✅ GPS Visualizer started successfully')
      console.log(`📊 Dashboard: http://localhost:${this.port}`)
      
    } catch (error) {
      console.error('❌ Failed to start GPS visualizer:', error)
      throw error
    }
  }

  // Stop the visualizer
  stopVisualizer() {
    this.isSubscribed = false
    
    // Unsubscribe from data streams
    if (this.subscription) {
      this.subscription() // Call the unwatch function
    }
    
    if (this.wss) {
      this.wss.close()
    }
    console.log('🛑 GPS Visualizer stopped')
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

  const visualizer = new GPSVisualizer()
  
  // Graceful shutdown handling
  process.on('SIGINT', () => {
    console.log('\n🛑 Shutting down GPS Visualizer...')
    visualizer.stopVisualizer()
    process.exit(0)
  })

  try {
    await visualizer.startVisualizer()
  } catch (error) {
    console.error('❌ GPS Visualizer failed:', error)
    process.exit(1)
  }
}

main()