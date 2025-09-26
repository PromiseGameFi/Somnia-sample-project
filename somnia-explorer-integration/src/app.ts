import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import { SomniaExplorerService } from './services/somniaExplorerService';
import { SomniaHealthService } from './services/healthService';
import { logger, apiLogger } from './utils/logger';
import { getCurrentNetwork } from './config/network';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Initialize services
const explorerService = new SomniaExplorerService();
const healthService = new SomniaHealthService();
const network = getCurrentNetwork();

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());

// Request logging middleware
app.use((req, res, next) => {
  apiLogger.info('Incoming request', {
    method: req.method,
    url: req.url,
    userAgent: req.get('User-Agent'),
    ip: req.ip,
    timestamp: new Date().toISOString()
  });
  next();
});

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    message: 'Somnia Explorer Integration Test App',
    network: network.name,
    chainId: network.chainId,
    explorerUrl: network.explorerUrl,
    endpoints: {
      health: '/api/health',
      transaction: '/api/transaction/:hash',
      block: '/api/block/:number',
      address: '/api/address/:address/transactions',
      blocks: '/api/blocks'
    }
  });
});

// Health check endpoint
app.get('/api/health', async (req, res) => {
  try {
    const health = await healthService.performHealthCheck();
    const statusCode = health.status === 'healthy' ? 200 : 
                      health.status === 'degraded' ? 206 : 503;
    
    res.status(statusCode).json(health);
  } catch (error: any) {
    logger.error('Health check endpoint failed:', error);
    res.status(500).json({
      status: 'unhealthy',
      timestamp: Date.now(),
      error: 'Health check service unavailable'
    });
  }
});

// Get transaction by hash
app.get('/api/transaction/:hash', async (req, res) => {
  try {
    const { hash } = req.params;
    
    if (!hash || hash.length !== 66 || !hash.startsWith('0x')) {
      return res.status(400).json({
        error: 'Invalid transaction hash format'
      });
    }

    const transaction = await explorerService.getTransaction(hash);
    
    if (!transaction) {
      return res.status(404).json({
        error: 'Transaction not found'
      });
    }

    return res.json({
      success: true,
      data: transaction,
      network: network.name
    });
  } catch (error: any) {
    logger.error('Transaction endpoint failed:', error);
    return res.status(500).json({
      error: 'Failed to fetch transaction data'
    });
  }
});

// Get block by number
app.get('/api/block/:number', async (req, res) => {
  try {
    const blockNumber = parseInt(req.params.number);
    
    if (isNaN(blockNumber) || blockNumber < 0) {
      return res.status(400).json({
        error: 'Invalid block number'
      });
    }

    const block = await explorerService.getBlock(blockNumber);
    
    if (!block) {
      return res.status(404).json({
        error: 'Block not found'
      });
    }

    return res.json({
      success: true,
      data: block,
      network: network.name
    });
  } catch (error: any) {
    logger.error('Block endpoint failed:', error);
    return res.status(500).json({
      error: 'Failed to fetch block data'
    });
  }
});

// Get transactions for an address
app.get('/api/address/:address/transactions', async (req, res) => {
  try {
    const { address } = req.params;
    const page = parseInt(req.query.page as string) || 1;
    const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);
    
    if (!address || address.length !== 42 || !address.startsWith('0x')) {
      return res.status(400).json({
        error: 'Invalid address format'
      });
    }

    const transactions = await explorerService.getAddressTransactions(address, page, limit);

    return res.json({
      success: true,
      data: transactions,
      pagination: {
        page,
        limit,
        count: transactions.length
      },
      network: network.name
    });
  } catch (error: any) {
    logger.error('Address transactions endpoint failed:', error);
    return res.status(500).json({
      error: 'Failed to fetch address transactions'
    });
  }
});

// Get latest blocks
app.get('/api/blocks', async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit as string) || 10, 50);
    const blocks = await explorerService.getLatestBlocks(limit);

    return res.json({
      success: true,
      data: blocks,
      count: blocks.length,
      network: network.name
    });
  } catch (error: any) {
    logger.error('Latest blocks endpoint failed:', error);
    return res.status(500).json({
      error: 'Failed to fetch latest blocks'
    });
  }
});

// Error handling middleware
app.use((error: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  logger.error('Unhandled error:', {
    error: error.message,
    stack: error.stack,
    url: req.url,
    method: req.method
  });
  
  return res.status(500).json({
    error: 'Internal server error'
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'Endpoint not found',
    availableEndpoints: {
      health: '/api/health',
      transaction: '/api/transaction/:hash',
      block: '/api/block/:number',
      address: '/api/address/:address/transactions',
      blocks: '/api/blocks'
    }
  });
});

// Start server
app.listen(PORT, () => {
  logger.info(`Somnia Explorer Test App started`, {
    port: PORT,
    network: network.name,
    chainId: network.chainId,
    explorerUrl: network.explorerUrl,
    environment: process.env.NODE_ENV || 'development'
  });
  
  // Start periodic health checks
  healthService.startPeriodicHealthChecks(30000); // Every 30 seconds
  
  console.log(`\n🚀 Somnia Explorer Test App is running!`);
  console.log(`📍 Server: http://localhost:${PORT}`);
  console.log(`🌐 Network: ${network.name} (Chain ID: ${network.chainId})`);
  console.log(`🔍 Explorer: ${network.explorerUrl}`);
  console.log(`\n📋 Available endpoints:`);
  console.log(`   GET  /                                    - App info`);
  console.log(`   GET  /api/health                         - Health check`);
  console.log(`   GET  /api/transaction/:hash              - Get transaction`);
  console.log(`   GET  /api/block/:number                  - Get block`);
  console.log(`   GET  /api/address/:address/transactions  - Get address transactions`);
  console.log(`   GET  /api/blocks                         - Get latest blocks`);
  console.log(`\n📊 Logs are being written to the 'logs' directory`);
});

export default app;