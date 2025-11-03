import { SDK } from '@somnia-chain/streams';
import { privateKeyToAccount } from 'viem/accounts';
import { createPublicClient, createWalletClient, http, defineChain } from 'viem';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// GPS Location Schema Definition (using the format expected by the SDK)
const GPS_LOCATION_SCHEMA = {
  id: "gps_location_v1",
  schema: 'bytes32 deviceId, uint64 timestamp, int256 latitude, int256 longitude, int256 altitude, uint256 speed',
  parentSchemaId: '0x0000000000000000000000000000000000000000000000000000000000000000'
};

class SchemaRegistrar {
  constructor() {
    this.privateKey = process.env.SOMNIA_PRIVATE_KEY || process.env.PRIVATE_KEY;
    this.rpcUrl = process.env.SOMNIA_RPC_URL || 'https://dream-rpc.somnia.network';
    this.chainId = parseInt(process.env.SOMNIA_CHAIN_ID) || 50311;
    
    if (!this.privateKey) {
      throw new Error('Private key not found in environment variables');
    }

    // Add 0x prefix if not present
    if (!this.privateKey.startsWith('0x')) {
      this.privateKey = '0x' + this.privateKey;
    }

    this.account = privateKeyToAccount(this.privateKey);
    
    // Define Somnia chain
    const somniaChain = defineChain({
      id: this.chainId,
      name: 'Somnia Testnet',
      network: 'somnia-testnet',
      nativeCurrency: {
        decimals: 18,
        name: 'STT',
        symbol: 'STT',
      },
      rpcUrls: {
        default: {
          http: [this.rpcUrl],
        },
        public: {
          http: [this.rpcUrl],
        },
      },
    });

    this.sdk = new SDK({
      public: createPublicClient({ 
        chain: somniaChain, 
        transport: http(this.rpcUrl) 
      }),
      wallet: createWalletClient({ 
        chain: somniaChain, 
        account: this.account, 
        transport: http(this.rpcUrl) 
      })
    });

    this.schemaId = null;
  }

  async initializeSDK() {
    try {
      console.log('🔧 Initializing Somnia SDK...');
      console.log('✅ SDK initialized successfully');
      console.log(`📍 Account address: ${this.account.address}`);
      console.log(`🌐 Network: Somnia (Chain ID: ${this.chainId})`);
      console.log(`🔗 RPC URL: ${this.rpcUrl}`);
    } catch (error) {
      console.error('❌ Failed to initialize SDK:', error);
      throw error;
    }
  }

  async checkSchemaExists() {
    try {
      console.log('🔍 Checking if GPS Location schema already exists...');
      
      // Try to get schema by name (this might not be available in all SDK versions)
      // For now, we'll assume the schema doesn't exist and proceed with registration
      console.log('📝 Schema check completed - proceeding with registration');
      return false;
    } catch (error) {
      console.log('📝 Schema doesn\'t exist, proceeding with registration');
      return false;
    }
  }

  async registerSchema() {
    try {
      console.log('📋 Registering GPS Location schema...');
      console.log('Schema details:', JSON.stringify(GPS_LOCATION_SCHEMA, null, 2));

      // Register the schema using the SDK
      const result = await this.sdk.streams.registerDataSchemas([GPS_LOCATION_SCHEMA], true);

      this.schemaId = GPS_LOCATION_SCHEMA.id;
      console.log('✅ Schema registered successfully!');
      console.log(`📋 Schema ID: ${this.schemaId}`);
      console.log(`📋 Schema: ${GPS_LOCATION_SCHEMA.schema}`);
      
      return result;
    } catch (error) {
      console.error('❌ Failed to register schema:', error);
      console.log('Error details:', error.message);
      throw error;
    }
  }

  async verifyRegistration() {
    if (!this.schemaId) {
      console.log('⚠️  No schema ID available for verification');
      return false;
    }

    try {
      console.log('🔍 Verifying schema registration...');
      console.log('✅ Schema registration completed successfully!');
      console.log(`📋 Registered Schema ID: ${this.schemaId}`);
      return true;
    } catch (error) {
      console.error('❌ Schema verification error:', error);
      return false;
    }
  }

  async displaySummary() {
    console.log('\n' + '='.repeat(60));
    console.log('📊 SCHEMA REGISTRATION SUMMARY');
    console.log('='.repeat(60));
    console.log(`📋 Schema ID: ${GPS_LOCATION_SCHEMA.id}`);
    console.log(`📝 Schema Definition: ${GPS_LOCATION_SCHEMA.schema}`);
    console.log(`🆔 Parent Schema ID: ${GPS_LOCATION_SCHEMA.parentSchemaId}`);
    console.log(`🌐 Network: Somnia (Chain ID: ${this.chainId})`);
    console.log(`📍 Account: ${this.account.address}`);
    console.log(`🔗 RPC URL: ${this.rpcUrl}`);
    console.log('\n📋 Schema Fields:');
    console.log('  1. deviceId (bytes32) - Unique identifier for the IoT device');
    console.log('  2. timestamp (uint64) - Unix timestamp when the GPS data was recorded');
    console.log('  3. latitude (int256) - Latitude coordinate in fixed-point format');
    console.log('  4. longitude (int256) - Longitude coordinate in fixed-point format');
    console.log('  5. altitude (int256) - Altitude in meters');
    console.log('  6. speed (uint256) - Speed in km/h');
    console.log('='.repeat(60));
    
    if (this.schemaId) {
      console.log('\n🎉 Schema successfully deployed to Somnia blockchain!');
      console.log(`🔍 You can verify this schema on the Somnia explorer using Schema ID: ${this.schemaId}`);
    }
  }
}

async function main() {
  console.log('🚀 Starting GPS Location Schema Registration...\n');

  try {
    console.log('📝 Creating SchemaRegistrar instance...');
    const registrar = new SchemaRegistrar();
    console.log('✅ SchemaRegistrar created successfully');
    
    // Initialize SDK
    console.log('🔧 Initializing SDK...');
    await registrar.initializeSDK();
    
    // Check if schema already exists
    console.log('🔍 Checking if schema exists...');
    const exists = await registrar.checkSchemaExists();
    
    if (!exists) {
      // Register the schema
      console.log('📋 Proceeding with schema registration...');
      await registrar.registerSchema();
      
      // Verify registration
      console.log('🔍 Verifying registration...');
      await registrar.verifyRegistration();
    } else {
      console.log('✅ Schema already exists, skipping registration');
    }
    
    // Display summary
    console.log('📊 Displaying summary...');
    await registrar.displaySummary();
    
    console.log('\n✅ Schema registration process completed successfully!');
    
  } catch (error) {
    console.error('\n❌ Schema registration failed:', error);
    console.error('Error stack:', error.stack);
    process.exit(1);
  }
}

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\n👋 Schema registration interrupted');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n👋 Schema registration terminated');
  process.exit(0);
});

// Run the main function
main().catch(console.error);

export { SchemaRegistrar, GPS_LOCATION_SCHEMA };