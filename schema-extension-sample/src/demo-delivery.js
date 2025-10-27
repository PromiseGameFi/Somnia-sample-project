#!/usr/bin/env node

/**
 * Delivery Demo Script
 * 
 * Demonstrates how the same base Coordinates schema can be extended
 * for a different domain (delivery tracking) showing schema reusability.
 */

import { sdk, schemaIds, demoConfig } from './config.js'
import { registerAllSchemas, createSampleData } from './schemas.js'
import { keccak256, toBytes } from 'viem'

/**
 * Generate a proper bytes32 ID for data storage
 */
function generateDataId(prefix, identifier, updateNumber) {
  const dataString = `${prefix}_${identifier}_${updateNumber}_${Date.now()}`
  return keccak256(toBytes(dataString))
}

/**
 * Simulate a delivery package journey
 */
async function simulateDeliveryJourney() {
  console.log('📦 Starting delivery tracking simulation...')
  
  const sampleData = createSampleData()
  const baseData = sampleData.coordinates
  const deliveryData = sampleData.delivery
  
  // Simulate delivery journey stages
  const deliveryStages = [
    { lat: 40748817, lng: -73985428, priority: 2, stage: 'Package picked up from warehouse' },
    { lat: 40751234, lng: -73982156, priority: 2, stage: 'In transit - First checkpoint' },
    { lat: 40753456, lng: -73978234, priority: 3, stage: 'Priority upgraded - Express delivery' },
    { lat: 40756789, lng: -73975123, priority: 3, stage: 'Out for delivery' },
    { lat: 40759012, lng: -73972456, priority: 4, stage: 'Delivered successfully' }
  ]
  
  for (let i = 0; i < deliveryStages.length; i++) {
    const stage = deliveryStages[i]
    
    console.log(`\n📍 Stage ${i + 1}/5: ${stage.stage}`)
    
    // Combine base schema data (coordinates) with extended schema data (delivery info)
    const combinedData = {
      // Base schema fields (inherited from Coordinates)
      timestamp: BigInt(Date.now() + (i * 600000)), // 10 minutes apart
      latitude: BigInt(stage.lat),
      longitude: BigInt(stage.lng),
      
      // Extended schema fields (Delivery-specific)
      orderId: deliveryData.orderId,
      customerId: deliveryData.customerId,
      packageType: deliveryData.packageType,
      priority: stage.priority
    }
    
    try {
      // Generate a proper bytes32 ID for the data
      const dataId = generateDataId('delivery', deliveryData.orderId, i + 1)
      
      // Simulate publishing delivery tracking update using extended schema
      console.log(`   🔄 Publishing tracking data to Somnia Data Streams...`)
      
      // Simulate network delay
      await new Promise(resolve => setTimeout(resolve, 500))
      
      // Simulate successful transaction
      const mockTxHash = `0x${Math.random().toString(16).slice(2, 18).padStart(64, '0')}`
      
      console.log(`   ✅ Tracking update published: ${mockTxHash}`)
      console.log(`   📊 Location: ${stage.lat}, ${stage.lng} | Priority: ${stage.priority}`)
      console.log(`   🔑 Data ID: ${dataId}`)
      console.log(`   📋 Schema: ${schemaIds.delivery}`)
      console.log(`   💾 Combined data includes:`)
      console.log(`      📍 Base: timestamp=${combinedData.timestamp}, lat=${combinedData.latitude}, lng=${combinedData.longitude}`)
      console.log(`      📦 Extended: order=${combinedData.orderId}, customer=${combinedData.customerId}, type=${combinedData.packageType}`)
      
      // Wait 1 second between updates for demo purposes
      await new Promise(resolve => setTimeout(resolve, 1000))
      
    } catch (error) {
      console.error(`   ❌ Failed to publish stage ${i + 1}:`, error.message)
    }
  }
}

/**
 * Demonstrate how different extended schemas can coexist
 */
async function demonstrateSchemaReusability() {
  console.log('\n🔄 Demonstrating schema reusability...')
  
  console.log('💡 Schema Inheritance Comparison:')
  console.log('   📍 Base Coordinates Schema:')
  console.log('      - timestamp, latitude, longitude')
  console.log('')
  console.log('   🚗 Driver Extension (from yesterday\'s demo):')
  console.log('      - Inherits: timestamp, latitude, longitude')
  console.log('      - Adds: driverId, vehicleType, status, licensePlate')
  console.log('')
  console.log('   📦 Delivery Extension (today\'s demo):')
  console.log('      - Inherits: timestamp, latitude, longitude')
  console.log('      - Adds: orderId, customerId, packageType, priority')
  console.log('')
  console.log('🎯 Both extensions share the same base location functionality!')
  console.log('   This demonstrates true schema reusability and composability.')
}

/**
 * Show potential for cross-domain queries
 */
async function demonstrateCrossDomainPotential() {
  console.log('\n🌐 Cross-Domain Query Potential...')
  
  console.log('💭 Imagine querying all location-based data:')
  console.log('   📍 "Show all activity in Manhattan between 2-3 PM"')
  console.log('      - Could return both driver locations AND delivery tracking')
  console.log('      - Both share the same base coordinate structure')
  console.log('      - Applications can filter by schema type for specific domains')
  console.log('')
  console.log('🔮 Future possibilities:')
  console.log('   - IoT sensor networks (weather, traffic, air quality)')
  console.log('   - Social media check-ins')
  console.log('   - Asset tracking (vehicles, equipment, inventory)')
  console.log('   - All extending the same base Coordinates schema!')
}

async function main() {
  console.log('🚀 Somnia Data Streams - Delivery Schema Extension Demo')
  console.log('=' .repeat(57))
  
  try {
    // Ensure schemas are registered
    if (!schemaIds.delivery) {
      console.log('📋 Registering schemas first...')
      await registerAllSchemas()
    }
    
    console.log(`\n🎯 Demo Configuration:`)
    console.log(`   Order ID: ${demoConfig.deliveryId}`)
    console.log(`   Schema ID: ${schemaIds.delivery}`)
    console.log(`   Base Schema: ${schemaIds.coordinates}`)
    
    // Run the delivery journey simulation
    await simulateDeliveryJourney()
    
    // Demonstrate schema reusability concepts
    await demonstrateSchemaReusability()
    
    // Show cross-domain potential
    await demonstrateCrossDomainPotential()
    
    console.log('\n🎉 Delivery demo completed successfully!')
    console.log('💡 This demo illustrated how the same base schema can be')
    console.log('   extended for completely different use cases, promoting')
    console.log('   code reusability and system interoperability.')
    
  } catch (error) {
    console.error('\n❌ Demo failed:', error.message)
    process.exit(1)
  }
}

// Run the demo
main().catch(console.error)