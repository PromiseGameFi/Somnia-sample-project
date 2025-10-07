/**
 * ORMI API Logging & Health Monitoring Application
 * Main entry point for the Express server with comprehensive monitoring
 * Production-ready with security, CORS, and proper error handling
 */

import express, { Application, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import { logger, ormiLogger } from './utils/logger';
import { healthMonitor } from './services/healthMonitor';
import { ormiClient } from './services/ormiApiClient';
import healthRoutes from './routes/health';

// Load environment variables
dotenv.config();

// Application configuration
const PORT = parseInt(process.env.PORT || '3000', 10);
const NODE_ENV = process.env.NODE_ENV || 'development';
const CORS_ORIGIN = process.env.CORS_ORIGIN || 'http://localhost:3000';

/**
 * ORMI API Application Class
 * Encapsulates the Express application with all middleware and routes
 */
class OrmiApiApp {
  private app: Application;
  private server: any;

  constructor() {
    this.app = express();
    this.setupMiddleware();
    this.setupRoutes();
    this.setupErrorHandling();
  }

  /**
   * Setup Express middleware
   */
  private setupMiddleware(): void {
    // Security middleware
    this.app.use(helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          scriptSrc: ["'self'"],
          imgSrc: ["'self'", "data:", "https:"],
        },
      },
      hsts: {
        maxAge: 31536000,
        includeSubDomains: true,
        preload: true
      }
    }));

    // CORS configuration
    this.app.use(cors({
      origin: NODE_ENV === 'production' ? CORS_ORIGIN : true,
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
    }));

    // Body parsing middleware
    this.app.use(express.json({ limit: '10mb' }));
    this.app.use(express.urlencoded({ extended: true, limit: '10mb' }));

    // Request logging middleware
    this.app.use((req: Request, res: Response, next: NextFunction) => {
      const startTime = Date.now();
      const requestId = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      // Add request ID to request object
      (req as any).requestId = requestId;
      
      // Log incoming request
      ormiLogger.apiRequest(
        req.originalUrl,
        req.method,
        {
          userAgent: req.get('User-Agent'),
          contentType: req.get('Content-Type'),
          authorization: !!req.get('Authorization')
        },
        req.body
      );
      
      // Log response when finished
      res.on('finish', () => {
        const responseTime = Date.now() - startTime;
        ormiLogger.apiResponse(
          req.originalUrl,
          res.statusCode,
          responseTime,
          res.get('Content-Length') ? parseInt(res.get('Content-Length')!) : 0
        );
      });
      
      next();
    });

    // Rate limiting middleware (simple implementation)
    if (NODE_ENV === 'production') {
      const rateLimitMap = new Map<string, { count: number; resetTime: number }>();
      const RATE_LIMIT_WINDOW = parseInt(process.env.RATE_LIMIT_WINDOW || '60000', 10);
      const RATE_LIMIT_MAX = parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100', 10);
      
      this.app.use((req: Request, res: Response, next: NextFunction): void => {
        const clientIp = req.ip || req.connection.remoteAddress || 'unknown';
        const now = Date.now();
        const windowStart = now - RATE_LIMIT_WINDOW;
        
        // Clean up old entries
        for (const [ip, data] of rateLimitMap.entries()) {
          if (data.resetTime < now) {
            rateLimitMap.delete(ip);
          }
        }
        
        // Check current client
        const clientData = rateLimitMap.get(clientIp);
        if (!clientData || clientData.resetTime < now) {
          rateLimitMap.set(clientIp, { count: 1, resetTime: now + RATE_LIMIT_WINDOW });
        } else {
          clientData.count++;
          if (clientData.count > RATE_LIMIT_MAX) {
            ormiLogger.rateLimit(0, new Date(clientData.resetTime), true);
            res.status(429).json({
              error: 'Rate limit exceeded',
              retryAfter: Math.ceil((clientData.resetTime - now) / 1000),
              timestamp: new Date().toISOString()
            });
            return;
          }
        }
        
        // Add rate limit headers
        const remaining = Math.max(0, RATE_LIMIT_MAX - (clientData?.count || 0));
        res.set({
          'X-RateLimit-Limit': RATE_LIMIT_MAX.toString(),
          'X-RateLimit-Remaining': remaining.toString(),
          'X-RateLimit-Reset': new Date(clientData?.resetTime || now + RATE_LIMIT_WINDOW).toISOString()
        });
        
        next();
      });
    }
  }

  /**
   * Setup application routes
   */
  private setupRoutes(): void {
    // Health monitoring routes
    this.app.use('/', healthRoutes);

    // API routes
    this.app.use('/api', this.createApiRoutes());

    // Root endpoint
    this.app.get('/', (req: Request, res: Response) => {
      res.json({
        name: 'ORMI API Logging & Health Monitoring',
        version: '1.0.0',
        description: 'Production-ready ORMI API client with comprehensive logging and health monitoring',
        network: 'somnia-testnet',
        consensus: 'multistream-bft',
        endpoints: {
          health: '/health',
          detailedHealth: '/health/detailed',
          metrics: '/metrics',
          history: '/health/history',
          alerts: '/alerts',
          erc20Balance: '/api/balance/:walletAddress'
        },
        documentation: 'https://docs.somnia.network',
        timestamp: new Date().toISOString()
      });
    });

    // 404 handler
    this.app.use('*', (req: Request, res: Response) => {
      logger.warn('404 - Route not found', {
        method: req.method,
        url: req.originalUrl,
        userAgent: req.get('User-Agent'),
        ip: req.ip
      });
      
      res.status(404).json({
        error: 'Route not found',
        method: req.method,
        url: req.originalUrl,
        timestamp: new Date().toISOString()
      });
    });
  }

  /**
   * Create API routes
   */
  private createApiRoutes(): express.Router {
    const router = express.Router();

    // ERC20 balance endpoint
    router.get('/balance/:walletAddress', async (req: Request, res: Response): Promise<void> => {
      try {
        const { walletAddress } = req.params;
        
        if (!walletAddress) {
          res.status(400).json({
            error: 'Wallet address is required',
            timestamp: new Date().toISOString()
          });
          return;
        }
        
        // Validate wallet address format
        if (!/^0x[a-fA-F0-9]{40}$/.test(walletAddress)) {
          res.status(400).json({
            error: 'Invalid wallet address format',
            expected: '0x followed by 40 hexadecimal characters',
            provided: walletAddress,
            timestamp: new Date().toISOString()
          });
          return;
        }
        
        // Get ERC20 balances
        const balanceData = await ormiClient.getERC20Balances(walletAddress);
        
        res.json({
          success: true,
          data: balanceData,
          metadata: {
            network: 'somnia-testnet',
            consensus: 'multistream-bft',
            requestId: (req as any).requestId,
            timestamp: new Date().toISOString()
          }
        });
        
      } catch (error) {
        logger.error('ERC20 balance API error', {
          walletAddress: req.params.walletAddress?.substring(0, 10) + '...',
          error: error instanceof Error ? error.message : 'Unknown error',
          requestId: (req as any).requestId
        });
        
        res.status(500).json({
          success: false,
          error: 'Failed to retrieve ERC20 balances',
          message: error instanceof Error ? error.message : 'Unknown error',
          timestamp: new Date().toISOString()
        });
      }
    });

    // API metrics endpoint
    router.get('/metrics', (req: Request, res: Response) => {
      try {
        const metrics = ormiClient.getMetrics();
        const rateLimitInfo = ormiClient.getRateLimitInfo();
        
        res.json({
          success: true,
          data: {
            ...metrics,
            rateLimit: rateLimitInfo,
            isRateLimited: ormiClient.isRateLimited()
          },
          timestamp: new Date().toISOString()
        });
      } catch (error) {
        res.status(500).json({
          success: false,
          error: 'Failed to retrieve API metrics',
          timestamp: new Date().toISOString()
        });
      }
    });

    return router;
  }

  /**
   * Setup error handling middleware
   */
  private setupErrorHandling(): void {
    // Global error handler
    this.app.use((error: Error, req: Request, res: Response, next: NextFunction) => {
      logger.error('Unhandled application error', {
        error: error.message,
        stack: error.stack,
        method: req.method,
        url: req.originalUrl,
        userAgent: req.get('User-Agent'),
        requestId: (req as any).requestId
      });
      
      res.status(500).json({
        error: 'Internal server error',
        requestId: (req as any).requestId,
        timestamp: new Date().toISOString()
      });
    });

    // Handle uncaught exceptions
    process.on('uncaughtException', (error: Error) => {
      logger.error('Uncaught Exception', {
        error: error.message,
        stack: error.stack
      });
      
      // Graceful shutdown
      this.shutdown('uncaughtException');
    });

    // Handle unhandled promise rejections
    process.on('unhandledRejection', (reason: any, promise: Promise<any>) => {
      logger.error('Unhandled Promise Rejection', {
        reason: reason instanceof Error ? reason.message : String(reason),
        stack: reason instanceof Error ? reason.stack : undefined
      });
      
      // Graceful shutdown
      this.shutdown('unhandledRejection');
    });

    // Handle process termination signals
    process.on('SIGTERM', () => this.shutdown('SIGTERM'));
    process.on('SIGINT', () => this.shutdown('SIGINT'));
  }

  /**
   * Start the application server
   */
  public async start(): Promise<void> {
    try {
      // Validate required environment variables
      this.validateEnvironment();
      
      // Start health monitoring
      healthMonitor.startMonitoring();
      
      // Start the server
      this.server = this.app.listen(PORT, () => {
        ormiLogger.system('startup', {
          port: PORT,
          environment: NODE_ENV,
          nodeVersion: process.version,
          platform: process.platform,
          pid: process.pid,
          memoryUsage: process.memoryUsage()
        });
        
        console.log(`\n🚀 ORMI API Server started successfully!`);
        console.log(`📍 Server running on port ${PORT}`);
        console.log(`🌍 Environment: ${NODE_ENV}`);
        console.log(`🔗 Network: Somnia Testnet (MultiStream BFT)`);
        console.log(`💚 Health check: http://localhost:${PORT}/health`);
        console.log(`📊 Metrics: http://localhost:${PORT}/metrics`);
        console.log(`📚 Documentation: https://docs.somnia.network\n`);
      });
      
      // Handle server errors
      this.server.on('error', (error: Error) => {
        logger.error('Server error', {
          error: error.message,
          stack: error.stack
        });
      });
      
    } catch (error) {
      logger.error('Failed to start application', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      process.exit(1);
    }
  }

  /**
   * Validate required environment variables
   */
  private validateEnvironment(): void {
    const required = ['ORMI_API_KEY', 'ORMI_BASE_URL'];
    const missing = required.filter(key => !process.env[key]);
    
    if (missing.length > 0) {
      logger.error('Missing required environment variables', {
        missing,
        hint: 'Copy .env.example to .env and fill in the required values'
      });
      throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
    }
    
    // Validate API key format (basic check)
    const apiKey = process.env.ORMI_API_KEY!;
    if (apiKey.length < 10 || apiKey === '<YOUR_ORMI_API_KEY>') {
      logger.error('Invalid ORMI API key', {
        hint: 'Please set a valid ORMI API key in the .env file'
      });
      throw new Error('Invalid ORMI API key configuration');
    }
  }

  /**
   * Graceful shutdown
   */
  private shutdown(signal: string): void {
    ormiLogger.system('shutdown', {
      signal,
      uptime: process.uptime(),
      memoryUsage: process.memoryUsage()
    });
    
    console.log(`\n🛑 Received ${signal}. Starting graceful shutdown...`);
    
    // Stop health monitoring
    healthMonitor.stopMonitoring();
    
    // Close server
    if (this.server) {
      this.server.close((error?: Error) => {
        if (error) {
          logger.error('Error during server shutdown', { error: error.message });
        } else {
          console.log('✅ Server closed successfully');
        }
        
        // Exit process
        process.exit(error ? 1 : 0);
      });
      
      // Force exit after 10 seconds
      setTimeout(() => {
        console.log('⚠️  Forced shutdown after timeout');
        process.exit(1);
      }, 10000);
    } else {
      process.exit(0);
    }
  }

  /**
   * Get Express application instance
   */
  public getApp(): Application {
    return this.app;
  }
}

// Create and start the application
const app = new OrmiApiApp();

// Start the server if this file is run directly
if (require.main === module) {
  app.start().catch((error) => {
    console.error('❌ Failed to start application:', error.message);
    process.exit(1);
  });
}

export default app;
export { OrmiApiApp };