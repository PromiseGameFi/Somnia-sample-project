#!/usr/bin/env node

/**
 * Schema Registration Script
 * 
 * This script demonstrates how to register base schemas and their extensions
 * in the correct order for Somnia Data Streams.
 */

import { registerAllSchemas, checkSchemaRegistration } from './schemas.js'
import { schemaIds } from './config.js'

async function main() {
  console.log('🚀 Somnia Data Streams - Schema Extension Demo')
  console.log('=' .repeat(50))
  
  try {
    // Check if schemas are already registered
    const alreadyRegistered = await checkSchemaRegistration()
    
    if (alreadyRegistered) {
      console.log('ℹ️  Schemas already registered, skipping registration...')
    } else {
      // Register all schemas
      await registerAllSchemas()
    }
    
    // Display final schema IDs
    console.log('\n📋 Schema Registration Summary:')
    console.log('=' .repeat(30))
    console.log(`📍 Coordinates (Base): ${schemaIds.coordinates}`)
    console.log(`🚗 Driver (Extended):  ${schemaIds.driver}`)
    console.log(`📦 Delivery (Extended): ${schemaIds.delivery}`)
    
    console.log('\n✨ Schema registration complete!')
    console.log('💡 You can now run the demo scripts:')
    console.log('   npm run demo-driver')
    console.log('   npm run demo-delivery')
    
  } catch (error) {
    console.error('\n❌ Registration failed:', error.message)
    process.exit(1)
  }
}

// Run the script
main().catch(console.error)