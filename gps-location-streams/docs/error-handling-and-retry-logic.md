# Error Handling and Retry Logic in Publisher Scripts

**Key Takeaways:** This guide provides essential strategies for building robust, production-grade publisher scripts for Somnia Data Streams. You will learn how to implement safe retry mechanisms, detect transaction reverts, verify transaction receipts, and apply backoff and queuing strategies to ensure operational reliability.

## Introduction

When publishing data to a decentralized network like Somnia, operational reliability is paramount. Network congestion, RPC endpoint failures, and transaction reverts are not edge cases—they are predictable scenarios that your publisher scripts must handle gracefully. A script that fails on the first error is unsuitable for production.

This guide details a robust error-handling framework for Somnia Data Streams publishers. We will cover:
- **Safe Retries:** How to retry failed transactions without causing duplicate data entries.
- **Revert Detection:** Identifying why a transaction failed on-chain.
- **Transaction Receipt Checks:** Confirming that a transaction was successfully mined.
- **Backoff and Queuing:** Strategies for managing rate limits and network congestion.

By the end of this guide, you will be able to write publisher scripts that are resilient, reliable, and ready for production.

## The Challenge: Unreliable Network Conditions

Publishing data with `sdk.streams.set()` or `sdk.streams.setAndEmitEvents()` involves sending a transaction to the Somnia network. This process can fail for several reasons:

1.  **RPC Endpoint Errors:** The RPC node you are connected to might be temporarily unavailable, overloaded, or return a rate-limit error.
2.  **Network Congestion:** During periods of high network traffic, transactions may be dropped or take a long time to be mined.
3.  **Transaction Reverts:** The transaction may be rejected by the smart contract due to invalid data, incorrect schema, or other on-chain conditions.
4.  **Gas Price Spikes:** A sudden increase in gas prices can cause your transaction to be priced out and remain pending indefinitely.

A naive implementation might look like this:

```javascript
// DO NOT USE THIS IN PRODUCTION
async function publishData(sdk, data) {
  try {
    const tx = await sdk.streams.set(data);
    console.log('Data published with tx hash:', tx);
  } catch (error) {
    console.error('Failed to publish data:', error);
  }
}
```

This script has a critical flaw: if `sdk.streams.set(data)` fails for a transient reason (like a temporary RPC outage), the data is lost. If it's retried naively, you might end up with duplicate data. We need a more robust approach.

## Implementing a Safe Retry Mechanism with Exponential Backoff

A retry mechanism is essential, but a simple loop can make a bad situation worse by overwhelming an already struggling RPC endpoint. The solution is to use an **exponential backoff** strategy, where the delay between retries increases with each failure.

Here is a blueprint for a robust publisher function with retries:

```javascript
import { setTimeout } from 'timers/promises';

const MAX_RETRIES = 5;
const INITIAL_BACKOFF_MS = 1000;

async function robustPublish(sdk, data) {
  let lastError;

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      console.log(`Attempt ${attempt}: Publishing data...`);
      const txHash = await sdk.streams.set(data);
      console.log('Transaction sent with hash:', txHash);

      // Crucial step: wait for the transaction receipt
      const receipt = await sdk.public.waitForTransactionReceipt({ hash: txHash });

      if (receipt.status === 'success') {
        console.log('Transaction confirmed successfully!');
        return receipt;
      } else {
        // The transaction was mined but reverted
        console.error('Transaction reverted. Status:', receipt.status);
        // This is a permanent failure for this transaction, do not retry
        throw new Error(`Transaction reverted: ${txHash}`);
      }
    } catch (error) {
      lastError = error;
      console.warn(`Attempt ${attempt} failed:`, error.message);

      // Check for specific errors that should not be retried
      if (isPermanentError(error)) {
        console.error('Permanent error detected. Aborting retries.');
        break; // Exit the loop
      }

      if (attempt < MAX_RETRIES) {
        const backoffTime = INITIAL_BACKOFF_MS * Math.pow(2, attempt - 1);
        console.log(`Waiting ${backoffTime}ms before next retry...`);
        await setTimeout(backoffTime);
      }
    }
  }

  throw new Error(`Failed to publish data after ${MAX_RETRIES} attempts. Last error: ${lastError.message}`);
}

function isPermanentError(error) {
  // Example: Detect contract revert errors from viem
  // This is highly dependent on the RPC provider and viem version.
  // You must inspect the error objects to find the right properties.
  const errorMessage = error.message.toLowerCase();
  if (errorMessage.includes('transaction reverted')) {
    return true;
  }
  // Add other permanent error conditions here
  // e.g., invalid schema, insufficient funds, etc.
  return false;
}
```

### Key Components of the Robust Publisher:

1.  **Retry Loop:** The `for` loop controls the maximum number of attempts.
2.  **Exponential Backoff:** `setTimeout` with an exponentially increasing delay prevents the script from spamming the network or RPC.
3.  **Transaction Receipt Verification:** This is the most critical part. We don't consider the operation successful until `waitForTransactionReceipt` returns a receipt with a `status` of `'success'`. A status of `'reverted'` means the transaction was included in a block but failed, and we should **not** retry.
4.  **Permanent Error Detection:** The `isPermanentError` function is a placeholder for logic that identifies errors that shouldn't be retried. A transaction revert is a classic example. Retrying a reverted transaction will almost always result in another revert.

## Advanced Strategy: Queuing

For high-throughput applications, you may want to publish data faster than the network can confirm it. In this scenario, a simple "fire-and-forget" approach is risky. If your script crashes, you might lose track of pending transactions.

A more resilient pattern is to use a persistent queue.

1.  **Enqueue:** When you need to publish data, add it to a persistent queue (e.g., a database table, Redis list, or even a file).
2.  **Dequeue and Process:** A separate worker process reads from the queue, one item at a time, and attempts to publish it using the `robustPublish` function.
3.  **On Success:** If `robustPublish` succeeds, remove the item from the queue.
4.  **On Failure:** If `robustPublish` throws a permanent error, move the item to a "dead-letter" queue for manual inspection. If it's a transient error, leave it in the queue to be retried later.

This architecture decouples data generation from data publishing, ensuring that no data is lost even if the publisher script is restarted.

## Full Example: Robust Publisher Script

Let's put it all together in a script. This example assumes you have a `viem` client setup as shown in the [SDK Methods Guide](https://msquared.gitbook.io/somnia-data-streams/RhsbSIQiIPTLimeaeFSC/getting-started/sdk-methods-guide).

```javascript
import { SDK } from '@somnia-chain/streams';
import { createPublicClient, createWalletClient, http, stringToHex } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { somniaTestnet } from 'viem/chains';
import { setTimeout } from 'timers/promises';
import 'dotenv/config';

// --- SDK and Client Setup ---
const rpcUrl = process.env.RPC_URL;
const privateKey = process.env.PRIVATE_KEY;

if (!rpcUrl || !privateKey) {
  throw new Error("RPC_URL and PRIVATE_KEY must be set in your .env file");
}

const account = privateKeyToAccount(privateKey);
const publicClient = createPublicClient({ chain: somniaTestnet, transport: http(rpcUrl) });
const walletClient = createWalletClient({ chain: somniaTestnet, account, transport: http(rpcUrl) });

const sdk = new SDK({
  public: publicClient,
  wallet: walletClient,
});

// --- Error Handling Configuration ---
const MAX_RETRIES = 5;
const INITIAL_BACKOFF_MS = 1000;

// --- Main Publishing Logic ---
async function robustPublish(sdk, data) {
  let lastError;

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      console.log(`Attempt ${attempt}: Publishing data...`);
      const txHash = await sdk.streams.set(data);
      console.log(`Transaction sent with hash: ${txHash}`);

      const receipt = await publicClient.waitForTransactionReceipt({ hash: txHash });

      if (receipt.status === 'success') {
        console.log(`Transaction confirmed in block ${receipt.blockNumber}`);
        return receipt;
      } else {
        console.error(`Transaction ${txHash} reverted in block ${receipt.blockNumber}`);
        throw new Error(`Transaction reverted: ${txHash}`);
      }
    } catch (error) {
      lastError = error;
      console.warn(`Attempt ${attempt} failed:`, error.message);

      if (isPermanentError(error)) {
        console.error('Permanent error detected. Aborting retries.');
        break;
      }

      if (attempt < MAX_RETRIES) {
        const backoffTime = INITIAL_BACKOFF_MS * Math.pow(2, attempt - 1);
        console.log(`Waiting ${backoffTime}ms before next retry...`);
        await setTimeout(backoffTime);
      }
    }
  }

  throw new Error(`Failed to publish data after ${MAX_RETRIES} attempts. Last error: ${lastError.message}`);
}

function isPermanentError(error) {
  const errorMessage = error.message.toLowerCase();
  // This is a simplified check. In production, you would want to inspect
  // the error object more deeply to get specific revert reasons if available.
  return errorMessage.includes('transaction reverted') ||
         errorMessage.includes('insufficient funds') ||
         errorMessage.includes('invalid schema');
}

// --- Example Usage ---
async function main() {
  try {
    // 1. Register a schema (do this once)
    const schemaId = 'my_robust_schema';
    const schema = 'uint256 value, string message';
    console.log('Registering schema...');
    await sdk.streams.registerDataSchemas([{ id: schemaId, schema, parentSchemaId: '0x' + '0'.repeat(64) }], true);
    console.log('Schema registered.');

    // 2. Prepare data
    const dataToPublish = [{
      id: stringToHex('data-point-1', { size: 32 }),
      schemaId: stringToHex(schemaId, { size: 32 }),
      data: '0x' + '1234'.padStart(64, '0') + '...some string data...', // Replace with actual encoded data
    }];

    // 3. Publish with robust logic
    await robustPublish(sdk, dataToPublish);
    console.log('Successfully published data!');

  } catch (error) {
    console.error('Main script failed:', error.message);
    process.exit(1);
  }
}

main();
```

## Conclusion

Building reliable publisher scripts is not an afterthought; it is a core requirement for any production application using Somnia Data Streams. By implementing safe retries with exponential backoff, diligently checking transaction receipts, and designing for permanent vs. transient errors, you can create a system that is resilient to common network and blockchain failures. For high-throughput use cases, a persistent queue architecture provides the ultimate guarantee of data integrity.