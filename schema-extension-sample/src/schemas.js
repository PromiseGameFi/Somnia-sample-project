import { sdk, schemaIds, saveSchemaIds } from './config.js'

// Schema definitions with unique IDs to avoid conflicts
const timestamp = Date.now()
export const schemaDefinitions = {
  // Base schema for location coordinates
  coordinates: {
    id: `coordinates_${timestamp}`,
    schema: 'uint64 timestamp, int256 latitude, int256 longitude',
    parentSchemaId: '0x0000000000000000000000000000000000000000000000000000000000000000' // root schema
  },
  
  // Extended schema for driver data
  driver: {
    id: `driver_${timestamp}`,
    schema: 'address driverId, string vehicleType, uint8 status, string licensePlate',
    parentSchemaId: '0x0000000000000000000000000000000000000000000000000000000000000000' // Will be updated after coordinates registration
  },
  
  // Extended schema for delivery data
  delivery: {
    id: `delivery_${timestamp}`,
    schema: 'bytes32 orderId, address customerId, string packageType, uint8 priority',
    parentSchemaId: '0x0000000000000000000000000000000000000000000000000000000000000000' // Will be updated after coordinates registration
  }
}

/**
 * Register all schemas in the correct order (base first, then extensions)
 * For demo purposes, we'll simulate the registration process
 */
export async function registerAllSchemas() {
  try {
    console.log('🔄 Starting schema registration (Demo Mode)...')
    console.log('ℹ️  Note: Running in demo mode with simulated schema IDs')
    
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 1000))
    
    // Step 1: Simulate registering base Coordinates schema
    console.log('📍 Registering Coordinates schema...')
    schemaIds.coordinates = '0x1111111111111111111111111111111111111111111111111111111111111111'
    console.log(`✅ Coordinates schema registered: ${schemaIds.coordinates}`)
    console.log(`   Schema ID: ${schemaDefinitions.coordinates.id}`)
    console.log(`   Fields: ${schemaDefinitions.coordinates.schema}`)
    
    // Step 2: Update parent schema IDs for extended schemas
    schemaDefinitions.driver.parentSchemaId = schemaIds.coordinates
    schemaDefinitions.delivery.parentSchemaId = schemaIds.coordinates
    
    await new Promise(resolve => setTimeout(resolve, 500))
    
    // Step 3: Simulate registering Driver schema (extends Coordinates)
    console.log('\n🚗 Registering Driver schema...')
    schemaIds.driver = '0x2222222222222222222222222222222222222222222222222222222222222222'
    console.log(`✅ Driver schema registered: ${schemaIds.driver}`)
    console.log(`   Schema ID: ${schemaDefinitions.driver.id}`)
    console.log(`   Fields: ${schemaDefinitions.driver.schema}`)
    console.log(`   Extends: ${schemaIds.coordinates}`)
    
    await new Promise(resolve => setTimeout(resolve, 500))
    
    // Step 4: Simulate registering Delivery schema (extends Coordinates)
    console.log('\n📦 Registering Delivery schema...')
    schemaIds.delivery = '0x3333333333333333333333333333333333333333333333333333333333333333'
    console.log(`✅ Delivery schema registered: ${schemaIds.delivery}`)
    console.log(`   Schema ID: ${schemaDefinitions.delivery.id}`)
    console.log(`   Fields: ${schemaDefinitions.delivery.schema}`)
    console.log(`   Extends: ${schemaIds.coordinates}`)
    
    console.log('\n🎉 All schemas registered successfully!')
    console.log('\n📋 Schema Hierarchy:')
    console.log('├── 📍 Coordinates (Base)')
    console.log('│   ├── 🚗 Driver (Extended)')
    console.log('│   └── 📦 Delivery (Extended)')
    
    // Save schema IDs for persistence
    saveSchemaIds(schemaIds)
    console.log('💾 Schema IDs saved for future use')
    
    return schemaIds
    
  } catch (error) {
    console.error('❌ Schema registration failed:', error.message)
    throw error
  }
}

/**
 * Check if schemas are already registered
 */
export async function checkSchemaRegistration() {
  try {
    // This is a simplified check - in a real app you'd store schema IDs
    console.log('🔍 Checking schema registration status...')
    
    // For demo purposes, we'll always register schemas
    // In production, you'd check if schemas exist and store their IDs
    return false
    
  } catch (error) {
    console.error('❌ Schema check failed:', error)
    return false
  }
}

/**
 * Utility function to create sample data for each schema type
 */
export function createSampleData() {
  const now = BigInt(Date.now())
  
  return {
    // NYC coordinates (scaled for int256)
    coordinates: {
      timestamp: now,
      latitude: BigInt(40748817),  // 40.748817 * 1e6
      longitude: BigInt(-73985428) // -73.985428 * 1e6
    },
    
    // Driver-specific data
    driver: {
      driverId: '0x742d35Cc6634C0532925a3b8D0Ac6bc4ab60e001',
      vehicleType: 'sedan',
      status: 1, // 1 = available, 2 = busy, 3 = offline
      licensePlate: 'NYC-123'
    },
    
    // Delivery-specific data
    delivery: {
      orderId: '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
      customerId: '0x742d35Cc6634C0532925a3b8D0Ac6bc4ab60e002',
      packageType: 'electronics',
      priority: 2 // 1 = low, 2 = normal, 3 = high, 4 = urgent
    }
  }
}