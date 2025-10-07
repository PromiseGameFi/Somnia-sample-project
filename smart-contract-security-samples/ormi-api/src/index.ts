#!/usr/bin/env node

/**
 * ORMI API Demonstration Service
 * 
 * This service demonstrates how to integrate with Somnia Network's ORMI APIs
 * for blockchain data retrieval, health monitoring, and comprehensive logging.
 * 
 * Features:
 * - ERC20 token balance queries
 * - Comprehensive health monitoring
 * - Request/response logging
 * - Rate limiting and security
 * - Performance tracking
 * 
 * Documentation: https://docs.somnia.network/developer/how-to-guides/api/ormi-apis
 */

import app from './app';
import { logger as appLogger } from './utils/logger';

// Handle uncaught exceptions
process.on('uncaughtException', (error: Error) => {
  appLogger.error('Uncaught Exception', {
    error: error.message,
    stack: error.stack,
    timestamp: new Date().toISOString()
  });
  
  // Give the logger time to write before exiting
  setTimeout(() => {
    process.exit(1);
  }, 1000);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason: any, promise: Promise<any>) => {
  appLogger.error('Unhandled Rejection', {
    reason: reason?.message || reason,
    stack: reason?.stack,
    promise: promise.toString(),
    timestamp: new Date().toISOString()
  });
  
  // Give the logger time to write before exiting
  setTimeout(() => {
    process.exit(1);
  }, 1000);
});

// Log startup information
appLogger.info('Starting ORMI API Demonstration Service', {
  nodeVersion: process.version,
  platform: process.platform,
  architecture: process.arch,
  environment: process.env.NODE_ENV || 'development',
  timestamp: new Date().toISOString()
});

// Validate required environment variables
const requiredEnvVars = ['ORMI_API_KEY', 'ORMI_BASE_URL'];
const missingEnvVars = requiredEnvVars.filter(varName => !process.env[varName]);

if (missingEnvVars.length > 0) {
  appLogger.error('Missing required environment variables', {
    missing: missingEnvVars,
    required: requiredEnvVars,
    hint: 'Please check your .env file or environment configuration'
  });
  
  console.error('\n❌ Missing required environment variables:');
  missingEnvVars.forEach(varName => {
    console.error(`   - ${varName}`);
  });
  console.error('\n💡 Please create a .env file based on .env.example\n');
  
  process.exit(1);
}

// Log configuration (without sensitive data)
appLogger.info('Service configuration loaded', {
  port: process.env.PORT || 3000,
  ormiBaseUrl: process.env.ORMI_BASE_URL,
  hasApiKey: !!process.env.ORMI_API_KEY,
  logLevel: process.env.LOG_LEVEL || 'info',
  corsOrigin: process.env.CORS_ORIGIN || 'http://localhost:3000',
  healthCheckInterval: process.env.HEALTH_CHECK_INTERVAL || '*/30 * * * * *',
  apiTimeout: process.env.API_TIMEOUT || '10000',
  rateLimitMax: process.env.RATE_LIMIT_MAX_REQUESTS || '100'
});

appLogger.info('ORMI API service initialization complete');

// The app is started in app.ts, this file just handles the initialization
export default app;