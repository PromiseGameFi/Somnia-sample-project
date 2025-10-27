# Somnia Data Streams - Schema Extension Sample

A practical demonstration of schema extension and reusability in Somnia Data Streams. This sample project shows how to build composable data structures by extending base schemas for different domains.

## What You'll Learn

- **Schema Extension**: How to create schemas that inherit from base schemas
- **Code Reusability**: Using the same base structure across multiple domains
- **Practical Implementation**: Real-world examples with driver tracking and delivery systems
- **Best Practices**: Proper schema registration order and data management

## Prerequisites

- Node.js 18+ installed
- Access to Somnia Network (Testnet or Mainnet)
- A wallet private key for publishing data
- Basic understanding of blockchain concepts

## Quick Start

### 1. Installation

```bash
# Clone or download this sample project
cd schema-extension-sample

# Install dependencies
npm install
```

### 2. Environment Setup

```bash
# Copy the environment template
cp .env.example .env

# Edit .env with your configuration
# RPC_URL=https://dream-rpc.somnia.network
# PRIVATE_KEY= your private key
```

**Security Note**: Never commit your private key to version control. Keep it secure and use environment variables.


### 3. Register Schemas

```bash
# Register the base and extended schemas
npm run register-schemas
```

### 4. Run Demos

```bash
# Demo 1: Driver location tracking
npm run demo-driver

# Demo 2: Delivery package tracking  
npm run demo-delivery

# Interactive overview
npm start
```

## Project Structure

```
schema-extension-sample/
├── src/
│   ├── config.js           # SDK configuration and setup
│   ├── schemas.js          # Schema definitions and registration
│   ├── register-schemas.js # Schema registration script
│   ├── demo-driver.js      # Driver tracking demonstration
│   ├── demo-delivery.js    # Delivery tracking demonstration
│   └── index.js           # Interactive main menu
├── .env.example           # Environment configuration template
├── package.json          # Project dependencies and scripts
└── README.md             # This file
```

## Schema Architecture

### Base Schema: Coordinates
```javascript
{
  id: "coordinates",
  schema: 'uint64 timestamp, int256 latitude, int256 longitude',
  parentSchemaId: '0x0000...' // root schema
}
```

### Extended Schema: Driver
```javascript
{
  id: "driver", 
  schema: 'address driverId, string vehicleType, uint8 status, string licensePlate',
  parentSchemaId: coordinatesSchemaId // extends coordinates
}
```

### Extended Schema: Delivery
```javascript
{
  id: "delivery",
  schema: 'bytes32 orderId, address customerId, string packageType, uint8 priority', 
  parentSchemaId: coordinatesSchemaId // extends coordinates
}
```

## Key Concepts Demonstrated

### 1. Schema Inheritance
- Extended schemas automatically inherit all fields from their parent
- Driver data includes: `timestamp`, `latitude`, `longitude` (inherited) + `driverId`, `vehicleType`, `status`, `licensePlate` (added)
- Delivery data includes: `timestamp`, `latitude`, `longitude` (inherited) + `orderId`, `customerId`, `packageType`, `priority` (added)

### 2. Code Reusability
- The same `Coordinates` base schema serves multiple domains
- Location logic is written once, reused everywhere
- New location-based features can extend the same base

### 3. Type Safety
- Schema validation ensures data consistency
- Blockchain-level enforcement of data structure
- Compile-time and runtime type checking

## Demo Scenarios

### Driver Demo (`npm run demo-driver`)
Simulates a ride-sharing driver's journey:
1. **Available** - Waiting for passengers
2. **En route to pickup** - Driving to passenger location  
3. **Passenger pickup** - Collecting passenger
4. **En route to destination** - Driving to drop-off
5. **Available** - Ready for next ride

### Delivery Demo (`npm run demo-delivery`)
Tracks a package through delivery stages:
1. **Warehouse pickup** - Package collected
2. **First checkpoint** - In transit
3. **Priority upgrade** - Express delivery
4. **Out for delivery** - Final mile
5. **Delivered** - Successfully completed

## Available Scripts

| Script | Description |
|--------|-------------|
| `npm start` | Interactive demo menu |
| `npm run register-schemas` | Register all schemas on-chain |
| `npm run demo-driver` | Run driver location demo |
| `npm run demo-delivery` | Run delivery tracking demo |
| `npm run dev` | Development mode with auto-reload |

## Demo Mode

The demo applications include a **demo mode** that simulates blockchain operations without requiring actual network calls. This is useful for:

- **Testing**: Verify functionality without network dependencies
- **Development**: Rapid iteration without gas costs
- **Demonstrations**: Show functionality in offline environments

### How Demo Mode Works

When demo mode is enabled (which it is by default in the demo scripts):

1. **Simulated Publishing**: Instead of actual blockchain transactions, the system generates mock transaction hashes
2. **Network Delay Simulation**: Adds realistic delays (1-2 seconds) to mimic real network behavior  
3. **Consistent Data IDs**: Generates proper `bytes32` compliant Data IDs using hashing
4. **Full Functionality**: All other features work normally - schema validation, data reading, etc.

### Demo Mode Output Example
```
Publishing driver location update...
Published! Transaction: 0xabcd1234... (simulated)
Data ID: 0x1a2b3c4d5e6f7890abcdef1234567890abcdef1234567890abcdef1234567890
```

The `(simulated)` indicator shows when demo mode is active. To use real blockchain operations, modify the demo scripts to remove the demo mode configuration.

## Real-World Applications

This pattern enables building scalable, interoperable systems:

- **Transportation**: Ride-sharing, public transit, logistics
- **IoT Networks**: Sensor data, environmental monitoring
- **Social Platforms**: Check-ins, location sharing
- **Asset Tracking**: Inventory, equipment, vehicles
- **Gaming**: Player locations, virtual worlds

## Understanding the Code

### Schema Registration Order
```javascript
// 1. Register base schema first
const coordinatesId = await registerSchema(coordinatesSchema)

// 2. Set parent reference
driverSchema.parentSchemaId = coordinatesId

// 3. Register extended schema
const driverId = await registerSchema(driverSchema)
```

### Publishing Extended Data
```javascript
const combinedData = {
  // Base schema fields (inherited)
  timestamp: BigInt(Date.now()),
  latitude: BigInt(40748817),
  longitude: BigInt(-73985428),
  
  // Extended schema fields (domain-specific)
  driverId: '0x742d35Cc...',
  vehicleType: 'sedan',
  status: 1
}

await sdk.streams.set([{
  id: 'driver_location_001',
  schemaId: driverSchemaId,
  data: combinedData
}])
```

## Troubleshooting

### Common Issues

**Schema Registration Fails**
- Ensure your private key has sufficient funds for gas
- Verify RPC URL is correct and accessible
- Check that parent schemas are registered first

**Data Publishing Fails**
- Confirm schemas are registered before publishing
- Validate data types match schema definition
- Ensure all required fields are provided

**Connection Issues**
- Verify network connectivity to Somnia RPC
- Check firewall settings
- Confirm RPC endpoint is operational

### Getting Help

1. Check the [Somnia Data Streams Documentation](https://msquared.gitbook.io/somnia-data-streams/)
2. Review error messages for specific guidance
3. Ensure environment variables are correctly set
4. Verify Node.js version compatibility (18+)

## Next Steps

After running this sample:

1. **Extend Further**: Create your own schema extensions
2. **Add Events**: Implement event emission for real-time updates
3. **Build UI**: Create a frontend to visualize the data
4. **Scale Up**: Deploy to production with proper error handling
5. **Integrate**: Connect with existing applications and APIs

## Contributing

This is a sample project for educational purposes. Feel free to:
- Fork and modify for your use case
- Submit improvements or bug fixes
- Share your own schema extension examples
- Provide feedback on documentation

## License

MIT License - feel free to use this code in your own projects.

---

**Happy Building with Somnia Data Streams!**