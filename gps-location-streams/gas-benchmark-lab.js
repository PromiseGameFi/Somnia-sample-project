import { SDK } from '@somnia-chain/streams';
import { createPublicClient, createWalletClient, http, stringToHex, encodeAbiParameters, parseAbiParameters } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { somniaTestnet } from 'viem/chains';
import 'dotenv/config';

// Part 1: Client and SDK Initialization
const rpcUrl = process.env.SOMNIA_RPC_URL;
const privateKey = process.env.SOMNIA_PRIVATE_KEY;

if (!rpcUrl || !privateKey) {
  throw new Error("SOMNIA_RPC_URL and SOMNIA_PRIVATE_KEY must be set in your .env file");
}

const account = privateKeyToAccount(privateKey);
const publicClient = createPublicClient({ chain: somniaTestnet, transport: http(rpcUrl) });
const walletClient = createWalletClient({ chain: somniaTestnet, account, transport: http(rpcUrl) });

const sdk = new SDK({
  public: publicClient,
  wallet: walletClient,
});

// Part 2: Defining the Schemas for Our Tests
const SCHEMAS = {
    // Test 1: A baseline using a dynamic 'string'
    string: { id: 'bm_string_v4', schema: 'string data' },
    // Test 2: An optimized version using a fixed-size 'bytes32'
    bytes32: { id: 'bm_bytes32_v4', schema: 'bytes32 data' },
    // Test 3: Using a number to represent an enum
    enum: { id: 'bm_enum_v4', schema: 'uint8 status' },
    // Test 4: Storing multiple fields directly on-chain
    perField: { id: 'bm_per_field_v4', schema: 'string name, string description, uint256 value' },
    // Test 5: Storing a pointer to off-chain data (e.g., IPFS)
    baseURI: { id: 'bm_base_uri_v4', schema: 'bytes32 cid' },
};

// --- Helper Functions ---

async function setupSchemas() {
    console.log("--- Setting up schemas ---");
    const schemasToRegister = Object.values(SCHEMAS).map(s => ({ ...s, parentSchemaId: '0x' + '0'.repeat(64) }));

    try {
        const txHash = await sdk.streams.registerDataSchemas(schemasToRegister, true);

        if (txHash && typeof txHash === 'string' && txHash.startsWith('0x')) {
            console.log(`Registering schemas in transaction: ${txHash}`);
            const receipt = await publicClient.waitForTransactionReceipt({ hash: txHash });
            console.log(`Schemas registered. Gas used for registration: ${receipt.gasUsed}`);
        } else {
            console.log("No new schemas to register. Continuing with benchmark.");
        }
    } catch (error) {
        if (error.message.includes("Nothing to register")) {
            console.log("Schemas are already registered. Continuing with benchmark.");
        } else {
            console.error("Schema setup failed with an unexpected error:", error);
            throw error;
        }
    }
}

async function benchmark(taskName, publishFunction) {
  console.log(`--- Running Benchmark: ${taskName} ---`);
  try {
    const txHash = await publishFunction();
    if (!txHash) {
        console.log("Publish function did not return a transaction hash. Skipping gas measurement.");
        return -1n;
    }
    const receipt = await publicClient.waitForTransactionReceipt({ hash: txHash });
    console.log(`Gas Used: ${receipt.gasUsed}`);
    return receipt.gasUsed;
  } catch (error) {
    console.error(`Benchmark failed for ${taskName}: ${error.message}`);
    return -1n; // Using -1 to indicate failure
  }
}

// --- Benchmark Tasks ---

async function task_benchmarkString() {
  const { id, schema } = SCHEMAS.string;
  const dataToPublish = [{
    id: stringToHex('data-1', { size: 32 }),
    schemaId: stringToHex(id, { size: 32 }),
    data: encodeAbiParameters(parseAbiParameters(schema), ['this is a long string of data to store on-chain'])
  }];
  return await sdk.streams.set(dataToPublish);
}

async function task_benchmarkBytes32() {
  const { id, schema } = SCHEMAS.bytes32;
  const dataToPublish = [{
    id: stringToHex('data-1', { size: 32 }),
    schemaId: stringToHex(id, { size: 32 }),
    data: encodeAbiParameters(parseAbiParameters(schema), [stringToHex('a fixed-size string', { size: 32 })])
  }];
  return await sdk.streams.set(dataToPublish);
}

async function task_benchmarkEnum() {
    const { id, schema } = SCHEMAS.enum;
    const dataToPublish = [{
        id: stringToHex('data-1', { size: 32 }),
        schemaId: stringToHex(id, { size: 32 }),
        data: encodeAbiParameters(parseAbiParameters(schema), [1]) // Represent 'Active' as 1
    }];
    return await sdk.streams.set(dataToPublish);
}

async function task_benchmarkPerField() {
    const { id, schema } = SCHEMAS.perField;
    const dataToPublish = [{
        id: stringToHex('user-profile-1', { size: 32 }),
        schemaId: stringToHex(id, { size: 32 }),
        data: encodeAbiParameters(parseAbiParameters(schema), ['John Doe', 'A very detailed user bio that takes up a lot of space', 100n])
    }];
    return await sdk.streams.set(dataToPublish);
}

async function task_benchmarkBaseURI() {
    const { id, schema } = SCHEMAS.baseURI;
    const dataToPublish = [{
        id: stringToHex('user-profile-1', { size: 32 }),
        schemaId: stringToHex(id, { size: 32 }),
        data: encodeAbiParameters(parseAbiParameters(schema), [stringToHex('Qm...user_profile.json', { size: 32 })])
    }];
    return await sdk.streams.set(dataToPublish);
}

// --- Main Execution Logic ---
async function main() {
  await setupSchemas();

  const results = {};

  console.log("\n--- Running All Benchmarks ---");
  results.string = await benchmark('String Data', task_benchmarkString);
  results.bytes32 = await benchmark('Bytes32 Data', task_benchmarkBytes32);
  results.enum = await benchmark('Enum (uint8) Data', task_benchmarkEnum);
  results.perField = await benchmark('Per-Field Storage', task_benchmarkPerField);
  results.baseURI = await benchmark('BaseURI Storage', task_benchmarkBaseURI);

  console.log('\n--- Final Benchmark Results ---');
  const tableData = Object.entries(results).map(([key, value]) => ({
      'Test Case': key,
      'Gas Used': value.toString()
  }));
  console.table(tableData);
}

main().catch(err => {
    console.error("\nAn error occurred during the benchmark script execution:", err);
    process.exit(1);
});