# GPS Tracker dApp API Reference

## Overview

This document provides comprehensive API reference for the GPS Tracker dApp components, including schema definitions, data structures, and method signatures.

---

## Schema Definitions

### GPS Location Schema

**Schema ID:** `gps_location`

**ABI Definition:**
```solidity
bytes32 deviceId, uint64 timestamp, int256 latitude, int256 longitude, int256 altitude, uint256 speed
```

**Field Specifications:**

| Field | Type | Size | Description | Range/Format |
|-------|------|------|-------------|--------------|
| `deviceId` | `bytes32` | 32 bytes | Unique device identifier | UTF-8 encoded string, null-padded |
| `timestamp` | `uint64` | 8 bytes | Unix timestamp in seconds | 0 to 2^64-1 |
| `latitude` | `int256` | 32 bytes | Latitude × 1,000,000 | -90,000,000 to 90,000,000 |
| `longitude` | `int256` | 32 bytes | Longitude × 1,000,000 | -180,000,000 to 180,000,000 |
| `altitude` | `int256` | 32 bytes | Altitude in meters | -500 to 9,000 (typical range) |
| `speed` | `uint256` | 32 bytes | Speed in km/h | 0 to 300 (typical range) |

**Total Encoded Size:** 384 bytes (48 bytes × 8 fields)

### Event Schemas

#### LocationUpdate Event

**Schema ID:** `LocationUpdate`

**ABI Definition:**
```solidity
bytes32 deviceId, uint64 timestamp, int256 latitude, int256 longitude
```

#### DeviceStatusChange Event

**Schema ID:** `DeviceStatusChange`

**ABI Definition:**
```solidity
bytes32 deviceId, uint64 timestamp, uint8 status, string message
```

**Status Codes:**
- `0`: Offline
- `1`: Online
- `2`: Moving
- `3`: Idle
- `4`: Maintenance
- `5`: Emergency

---

## GPSSchemaManager Class

### Constructor

```javascript
constructor()
```

Initializes the GPS Schema Manager with default Somnia network configuration.

### Methods

#### `initializeSDK()`

```javascript
async initializeSDK(): Promise<void>
```

Initializes the Somnia SDK with environment configuration.

**Throws:**
- `Error`: If SDK initialization fails
- `Error`: If private key is not configured

**Example:**
```javascript
const schemaManager = new GPSSchemaManager()
await schemaManager.initializeSDK()
```

#### `registerGPSSchema()`

```javascript
async registerGPSSchema(): Promise<string>
```

Registers the GPS location schema on the Somnia network.

**Returns:**
- `Promise<string>`: The registered schema ID

**Throws:**
- `Error`: If schema registration fails
- `Error`: If SDK is not initialized

**Example:**
```javascript
const schemaId = await schemaManager.registerGPSSchema()
console.log(`Schema registered: ${schemaId}`)
```

#### `registerGPSEvents()`

```javascript
async registerGPSEvents(): Promise<void>
```

Registers GPS-related event schemas.

**Throws:**
- `Error`: If event registration fails

---

## GPSPublisher Class

### Constructor

```javascript
constructor()
```

Initializes the GPS Publisher with default configuration.

### Properties

| Property | Type | Description |
|----------|------|-------------|
| `sdk` | `SomniaSDK` | Somnia SDK instance |
| `schemaId` | `string` | GPS schema identifier |
| `devices` | `Array<GPSDevice>` | Array of simulated GPS devices |
| `publishInterval` | `number` | Publishing interval in milliseconds |

### Methods

#### `initializeSDK()`

```javascript
async initializeSDK(): Promise<void>
```

Initializes the Somnia SDK for publishing operations.

**Environment Variables Required:**
- `SOMNIA_PRIVATE_KEY`: Publisher's private key
- `SOMNIA_RPC_URL`: Somnia RPC endpoint
- `SOMNIA_CHAIN_ID`: Somnia chain ID

#### `initializeDevices()`

```javascript
initializeDevices(): void
```

Sets up simulated GPS devices with initial locations.

**Device Configuration:**
```javascript
{
  id: string,           // Device identifier
  name: string,         // Display name
  location: {           // Current location
    lat: number,        // Latitude (decimal degrees)
    lon: number         // Longitude (decimal degrees)
  },
  speed: number,        // Current speed (km/h)
  altitude: number,     // Current altitude (meters)
  heading: number       // Direction (degrees, 0-359)
}
```

#### `publishGPSData(device)`

```javascript
async publishGPSData(device: GPSDevice): Promise<string>
```

Publishes GPS data for a specific device to the blockchain.

**Parameters:**
- `device`: GPS device object

**Returns:**
- `Promise<string>`: Transaction hash

**Example:**
```javascript
const txHash = await publisher.publishGPSData(device)
console.log(`Published: ${txHash}`)
```

#### `simulateMovement(device)`

```javascript
simulateMovement(device: GPSDevice): void
```

Updates device location to simulate movement.

**Movement Parameters:**
- Maximum speed change: ±10 km/h per update
- Maximum location change: 0.001 degrees per update
- Altitude variation: ±5 meters per update

#### `startPublishing()`

```javascript
async startPublishing(): Promise<void>
```

Starts the continuous GPS data publishing process.

**Behavior:**
- Publishes data for all devices at configured intervals
- Simulates realistic movement patterns
- Handles publishing errors with retry logic

#### `stopPublishing()`

```javascript
stopPublishing(): void
```

Stops the GPS data publishing process.

---

## GPSVisualizer Class

### Constructor

```javascript
constructor()
```

Initializes the GPS Visualizer with default configuration.

### Properties

| Property | Type | Description |
|----------|------|-------------|
| `sdk` | `SomniaSDK` | Somnia SDK instance |
| `schemaId` | `string` | GPS schema identifier |
| `publisherAddress` | `string` | Publisher's blockchain address |
| `wss` | `WebSocketServer` | WebSocket server instance |
| `app` | `Express` | Express application instance |

### Methods

#### `initializeSDK()`

```javascript
async initializeSDK(): Promise<void>
```

Initializes the Somnia SDK for data consumption.

#### `calculatePublisherAddress()`

```javascript
calculatePublisherAddress(): string
```

Calculates the publisher's address from the private key.

**Returns:**
- `string`: Publisher's Ethereum address

#### `setupWebSocketServer()`

```javascript
setupWebSocketServer(): void
```

Sets up WebSocket server for real-time data streaming.

**WebSocket Events:**
- `connection`: New client connected
- `message`: Message from client
- `close`: Client disconnected
- `error`: Connection error

#### `setupWebServer()`

```javascript
setupWebServer(): void
```

Sets up Express web server for dashboard hosting.

**Routes:**
- `GET /`: Serves the main dashboard
- `GET /api/devices`: Returns active device list
- `GET /api/status`: Returns system status

#### `processGPSTransaction(transaction, transactionData)`

```javascript
processGPSTransaction(transaction: Transaction, transactionData: string): void
```

Processes GPS transactions and extracts location data.

**Parameters:**
- `transaction`: Blockchain transaction object
- `transactionData`: Raw transaction data (hex string)

**Processing Steps:**
1. Validate transaction format
2. Decode ABI-encoded GPS data
3. Convert coordinates to decimal format
4. Broadcast to connected WebSocket clients

#### `startMonitoring()`

```javascript
async startMonitoring(): Promise<void>
```

Starts monitoring the blockchain for GPS transactions.

**Monitoring Features:**
- Real-time transaction filtering
- Automatic data decoding
- WebSocket broadcasting
- Error handling and recovery

---

## Data Structures

### GPSDevice Interface

```typescript
interface GPSDevice {
  id: string              // Unique device identifier
  name: string            // Human-readable device name
  location: {
    lat: number           // Latitude in decimal degrees
    lon: number           // Longitude in decimal degrees
  }
  speed: number           // Speed in km/h
  altitude: number        // Altitude in meters
  heading?: number        // Optional heading in degrees
  lastUpdate?: number     // Optional last update timestamp
  status?: DeviceStatus   // Optional device status
}
```

### GPSUpdate Interface

```typescript
interface GPSUpdate {
  deviceId: string        // Device identifier
  timestamp: number       // Unix timestamp
  location: {
    lat: number           // Latitude
    lon: number           // Longitude
  }
  altitude: number        // Altitude in meters
  speed: number           // Speed in km/h
  heading?: number        // Optional heading
}
```

### Transaction Interface

```typescript
interface Transaction {
  hash: string            // Transaction hash
  from: string            // Sender address
  to: string              // Recipient address
  value: string           // Transaction value (hex)
  input: string           // Transaction data (hex)
  blockNumber: number     // Block number
  timestamp: number       // Block timestamp
}
```

---

## WebSocket API

### Connection

**Endpoint:** `ws://localhost:3000`

**Connection Example:**
```javascript
const ws = new WebSocket('ws://localhost:3000')

ws.onopen = () => {
  console.log('Connected to GPS stream')
}

ws.onmessage = (event) => {
  const gpsUpdate = JSON.parse(event.data)
  console.log('GPS Update:', gpsUpdate)
}
```

### Message Format

**GPS Update Message:**
```json
{
  "type": "gps_update",
  "deviceId": "Delivery Truck Alpha",
  "timestamp": 1703123456,
  "location": {
    "lat": 40.712371,
    "lon": -74.004534
  },
  "altitude": 98,
  "speed": 64,
  "heading": 45
}
```

**Status Message:**
```json
{
  "type": "status",
  "message": "Connected to GPS stream",
  "deviceCount": 3,
  "lastUpdate": 1703123456
}
```

**Error Message:**
```json
{
  "type": "error",
  "message": "Connection lost",
  "code": "CONNECTION_ERROR",
  "timestamp": 1703123456
}
```

---

## REST API

### GET /api/devices

Returns list of active GPS devices.

**Response:**
```json
{
  "devices": [
    {
      "id": "Delivery Truck Alpha",
      "name": "Delivery Truck Alpha",
      "status": "active",
      "lastSeen": 1703123456,
      "location": {
        "lat": 40.712371,
        "lon": -74.004534
      }
    }
  ],
  "count": 3
}
```

### GET /api/status

Returns system status information.

**Response:**
```json
{
  "status": "running",
  "uptime": 3600,
  "connectedClients": 2,
  "transactionsProcessed": 1250,
  "lastTransaction": 1703123456,
  "publisherAddress": "0xc8F59daEa91f30F4F6D85E5c510d78bd1ac4b19e"
}
```

---

## Error Codes

### Publisher Errors

| Code | Description | Resolution |
|------|-------------|------------|
| `SDK_INIT_FAILED` | SDK initialization failed | Check network configuration |
| `SCHEMA_NOT_FOUND` | GPS schema not registered | Run schema registration |
| `PUBLISH_FAILED` | Data publishing failed | Check account balance and network |
| `ENCODING_ERROR` | Data encoding failed | Validate GPS data format |

### Visualizer Errors

| Code | Description | Resolution |
|------|-------------|------------|
| `WEBSOCKET_ERROR` | WebSocket connection failed | Check port availability |
| `DECODE_ERROR` | Transaction decoding failed | Verify transaction format |
| `FILTER_ERROR` | Transaction filtering failed | Check publisher address |
| `NETWORK_ERROR` | Blockchain connection lost | Check RPC endpoint |

---

## Configuration Reference

### Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `SOMNIA_PRIVATE_KEY` | Yes | - | Publisher's private key |
| `SOMNIA_RPC_URL` | Yes | - | Somnia RPC endpoint |
| `SOMNIA_CHAIN_ID` | Yes | - | Somnia chain ID |
| `PUBLISH_INTERVAL` | No | 5000 | Publishing interval (ms) |
| `DEVICE_COUNT` | No | 3 | Number of simulated devices |
| `PORT` | No | 3000 | Web server port |
| `MOCK_DATA` | No | false | Use mock data instead of blockchain |

### Network Configuration

**Somnia Testnet:**
```bash
SOMNIA_RPC_URL=https://dream-rpc.somnia.network
SOMNIA_CHAIN_ID=50312
```

**Local Development:**
```bash
SOMNIA_RPC_URL=http://localhost:8545
SOMNIA_CHAIN_ID=1337
```

---

## Performance Specifications

### Throughput

- **Publishing Rate**: Up to 1 transaction per second per device
- **Processing Rate**: Up to 100 transactions per second
- **WebSocket Clients**: Up to 1000 concurrent connections
- **Data Latency**: < 2 seconds from publish to display

### Resource Requirements

**Minimum System Requirements:**
- CPU: 2 cores, 2.0 GHz
- RAM: 4 GB
- Storage: 1 GB available space
- Network: Stable internet connection

**Recommended System Requirements:**
- CPU: 4 cores, 3.0 GHz
- RAM: 8 GB
- Storage: 10 GB available space
- Network: High-speed internet connection

### Scaling Considerations

- Use load balancers for multiple visualizer instances
- Implement Redis for session management
- Consider database caching for historical data
- Monitor memory usage for long-running processes