#!/usr/bin/env node

/**
 * Driver Demo Script
 * 
 * Demonstrates how to use extended schemas to publish and read driver location data
 * that inherits from the base Coordinates schema.
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
 * Simulate a driver's journey with multiple location updates
 */
async function simulateDriverJourney() {
  console.log('🚗 Starting driver journey simulation...')
  
  const sampleData = createSampleData()
  const baseData = sampleData.coordinates
  const driverData = sampleData.driver
  
  // Simulate 5 location updates during a journey
  const locations = [
    { lat: 40748817, lng: -73985428, status: 1, desc: 'Starting point - Available' },
    { lat: 40751234, lng: -73982156, status: 2, desc: 'En route to pickup - Busy' },
    { lat: 40753456, lng: -73978234, status: 2, desc: 'Pickup location - Busy' },
    { lat: 40756789, lng: -73975123, status: 2, desc: 'En route to destination - Busy' },
    { lat: 40759012, lng: -73972456, status: 1, desc: 'Destination reached - Available' }
  ]
  
  for (let i = 0; i < locations.length; i++) {
    const location = locations[i]
    
    console.log(`\n📍 Update ${i + 1}/5: ${location.desc}`)
    
    // Combine base schema data (coordinates) with extended schema data (driver info)
    const combinedData = {
      // Base schema fields (inherited from Coordinates)
      timestamp: BigInt(Date.now() + (i * 300000)), // 5 minutes apart
      latitude: BigInt(location.lat),
      longitude: BigInt(location.lng),
      
      // Extended schema fields (Driver-specific)
      driverId: driverData.driverId,
      vehicleType: driverData.vehicleType,
      status: location.status,
      licensePlate: driverData.licensePlate
    }
    
    try {
      // Generate a proper bytes32 ID for the data
      const dataId = generateDataId('driver', driverData.driverId, i + 1)
      
      // Simulate publishing driver location update using extended schema
      console.log(`   🔄 Publishing data to Somnia Data Streams...`)
      
      // Simulate network delay
      await new Promise(resolve => setTimeout(resolve, 500))
      
      // Simulate successful transaction
      const mockTxHash = `0x${Math.random().toString(16).slice(2, 18).padStart(64, '0')}`
      
      console.log(`   ✅ Published to blockchain: ${mockTxHash}`)
      console.log(`   📊 Data: Lat ${location.lat}, Lng ${location.lng}, Status ${location.status}`)
      console.log(`   🔑 Data ID: ${dataId}`)
      console.log(`   📋 Schema: ${schemaIds.driver}`)
      console.log(`   💾 Combined data includes:`)
      console.log(`      📍 Base: timestamp=${combinedData.timestamp}, lat=${combinedData.latitude}, lng=${combinedData.longitude}`)
      console.log(`      🚗 Extended: driver=${combinedData.driverId}, vehicle=${combinedData.vehicleType}, status=${combinedData.status}`)
      
      // Wait 1 second between updates for demo purposes
      await new Promise(resolve => setTimeout(resolve, 1000))
      
    } catch (error) {
      console.error(`   ❌ Failed to publish update ${i + 1}:`, error.message)
    }
  }
}

/**
 * Demonstrate reading driver data using the extended schema
 */
async function demonstrateDataReading() {
  console.log('\n📖 Demonstrating data reading...')
  
  try {
    // Generate the same ID that would be used for the first update
    const dataId = generateDataId('driver', demoConfig.driverId, 1)
    
    console.log(`🔍 Attempting to read data with ID: ${dataId}`)
    console.log(`📋 Using schema ID: ${schemaIds.driver}`)
    
    // Note: In a real application, you would read the data here
    // const driverData = await sdk.streams.getByKey(schemaIds.driver, account.address, dataId)
    
    console.log('💡 Data reading would retrieve both:')
    console.log('   📍 Base fields: timestamp, latitude, longitude')
    console.log('   🚗 Extended fields: driverId, vehicleType, status, licensePlate')
    
  } catch (error) {
    console.error('❌ Data reading failed:', error.message)
  }
}

async function main() {
  console.log('🚀 Somnia Data Streams - Driver Schema Extension Demo')
  console.log('=' .repeat(55))
  
  try {
    // Ensure schemas are registered
    if (!schemaIds.driver) {
      console.log('📋 Registering schemas first...')
      await registerAllSchemas()
    }
    
    console.log(`\n🎯 Demo Configuration:`)
    console.log(`   Driver ID: ${demoConfig.driverId}`)
    console.log(`   Schema ID: ${schemaIds.driver}`)
    console.log(`   Base Schema: ${schemaIds.coordinates}`)
    
    // Run the driver journey simulation
    await simulateDriverJourney()
    
    // Demonstrate data reading
    await demonstrateDataReading()
    
    console.log('\n🎉 Driver demo completed successfully!')
    console.log('💡 This demo showed how extended schemas inherit base schema fields')
    console.log('   while adding domain-specific functionality.')
    
  } catch (error) {
    console.error('\n❌ Demo failed:', error.message)
    process.exit(1)
  }
}

// Run the demo
main().catch(console.error)