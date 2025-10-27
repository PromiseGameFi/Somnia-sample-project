#!/usr/bin/env node

/**
 * Somnia Data Streams - Schema Extension Sample
 * 
 * Interactive demo showcasing schema extension and reusability concepts.
 * This is the main entry point that provides a menu-driven experience.
 */

import { sdk, schemaIds } from './config.js'
import { registerAllSchemas } from './schemas.js'

/**
 * Display the main menu
 */
function displayMenu() {
  console.log('\n🎯 Choose a demo option:')
  console.log('=' .repeat(30))
  console.log('1. 📋 Register all schemas')
  console.log('2. 🚗 Run driver location demo')
  console.log('3. 📦 Run delivery tracking demo')
  console.log('4. 📊 Show schema information')
  console.log('5. 🔍 Check schema registration status')
  console.log('6. ❌ Exit')
  console.log('')
}

/**
 * Show detailed schema information
 */
async function showSchemaInfo() {
  console.log('\n📊 Schema Information')
  console.log('=' .repeat(25))
  
  console.log('\n📍 Base Schema - Coordinates:')
  console.log('   Purpose: Location tracking foundation')
  console.log('   Fields: timestamp, latitude, longitude')
  console.log(`   Schema ID: ${schemaIds.coordinates || 'Not registered'}`)
  
  console.log('\n🚗 Extended Schema - Driver:')
  console.log('   Purpose: Vehicle/driver location tracking')
  console.log('   Inherits: timestamp, latitude, longitude')
  console.log('   Adds: driverId, vehicleType, status, licensePlate')
  console.log(`   Schema ID: ${schemaIds.driver || 'Not registered'}`)
  
  console.log('\n📦 Extended Schema - Delivery:')
  console.log('   Purpose: Package/delivery tracking')
  console.log('   Inherits: timestamp, latitude, longitude')
  console.log('   Adds: orderId, customerId, packageType, priority')
  console.log(`   Schema ID: ${schemaIds.delivery || 'Not registered'}`)
  
  console.log('\n💡 Key Benefits:')
  console.log('   ✅ Code reusability across domains')
  console.log('   ✅ Consistent base structure')
  console.log('   ✅ Extensible for new use cases')
  console.log('   ✅ Type safety and validation')
}

/**
 * Check schema registration status
 */
async function checkRegistrationStatus() {
  console.log('\n🔍 Checking Schema Registration Status')
  console.log('=' .repeat(40))
  
  try {
    const statuses = [
      { name: 'Coordinates', id: schemaIds.coordinates },
      { name: 'Driver', id: schemaIds.driver },
      { name: 'Delivery', id: schemaIds.delivery }
    ]
    
    for (const schema of statuses) {
      if (schema.id) {
        // In a real app, you'd verify the schema exists on-chain
        console.log(`✅ ${schema.name}: Registered (${schema.id})`)
      } else {
        console.log(`❌ ${schema.name}: Not registered`)
      }
    }
    
    const allRegistered = statuses.every(s => s.id)
    
    if (allRegistered) {
      console.log('\n🎉 All schemas are registered and ready to use!')
    } else {
      console.log('\n⚠️  Some schemas need registration. Run option 1 first.')
    }
    
  } catch (error) {
    console.error('❌ Status check failed:', error.message)
  }
}

/**
 * Run a specific demo script
 */
async function runDemo(demoType) {
  console.log(`\n🚀 Starting ${demoType} demo...`)
  console.log('=' .repeat(30))
  
  try {
    // Ensure schemas are registered first
    if (!schemaIds.coordinates) {
      console.log('📋 Schemas not registered. Registering now...')
      await registerAllSchemas()
    }
    
    // Import and run the appropriate demo
    if (demoType === 'driver') {
      const { default: driverDemo } = await import('./demo-driver.js')
      // The demo scripts are self-contained, so we just notify the user
      console.log('💡 Run: npm run demo-driver')
    } else if (demoType === 'delivery') {
      const { default: deliveryDemo } = await import('./demo-delivery.js')
      console.log('💡 Run: npm run demo-delivery')
    }
    
  } catch (error) {
    console.error(`❌ ${demoType} demo failed:`, error.message)
  }
}

/**
 * Main interactive loop
 */
async function main() {
  console.log('🚀 Somnia Data Streams - Schema Extension Sample')
  console.log('=' .repeat(50))
  console.log('💡 This sample demonstrates how to build reusable,')
  console.log('   composable schemas using Somnia Data Streams.')
  
  // Simple menu simulation (in a real CLI app, you'd use readline)
  console.log('\n🎯 Available Commands:')
  console.log('   npm run register-schemas  - Register all schemas')
  console.log('   npm run demo-driver      - Driver location demo')
  console.log('   npm run demo-delivery    - Delivery tracking demo')
  console.log('   npm start                - This interactive menu')
  
  // Show current status
  await checkRegistrationStatus()
  
  // Show schema information
  await showSchemaInfo()
  
  console.log('\n🎉 Sample project ready!')
  console.log('💡 Start with: npm run register-schemas')
  console.log('   Then try: npm run demo-driver')
  console.log('   And: npm run demo-delivery')
}

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\n👋 Thanks for exploring Somnia Data Streams!')
  process.exit(0)
})

// Run the main function
main().catch(console.error)