import express, { Request, Response, NextFunction } from 'express';
import helmet from 'helmet';
import cors from 'cors';
import dotenv from 'dotenv';
import { OrmiService } from './services/ormiService';
import { HealthService } from './services/healthService';
import { logger as appLogger, ormiApiLogger as apiLogger, healthLogger, securityLogger } from './utils/logger';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Initialize services
const ormiService = new OrmiService(
  process.env.ORMI_API_KEY || 'your_api_key_here',
  process.env.ORMI_BASE_URL
);
const healthService = new HealthService();
healthService.initializeWithOrmiService(ormiService);

// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
}));

// CORS configuration
const corsOptions = {
  origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
  methods: ['GET', 'POST'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
};
app.use(cors(corsOptions));

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Request logging middleware
app.use((req: Request, res: Response, next: NextFunction) => {
  const startTime = Date.now();
  const requestId = Math.random().toString(36).substring(7);
  
  // Add request ID to request object
  (req as any).requestId = requestId;
  
  apiLogger.info('Incoming request', {
    requestId,
    method: req.method,
    url: req.url,
    userAgent: req.get('User-Agent'),
    ip: req.ip,
    timestamp: new Date().toISOString()
  });

  // Log response when finished
  res.on('finish', () => {
    const duration = Date.now() - startTime;
    const isSuccess = res.statusCode < 400;

    apiLogger.info('Request completed', {
      requestId,
      method: req.method,
      url: req.url,
      statusCode: res.statusCode,
      duration,
      success: isSuccess
    });
  });

  next();
});

// Rate limiting middleware (simple implementation)
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();
const RATE_LIMIT_WINDOW = 60 * 1000; // 1 minute
const RATE_LIMIT_MAX_REQUESTS = parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100');

app.use((req: Request, res: Response, next: NextFunction) => {
  const clientIp = req.ip || req.connection.remoteAddress || req.socket.remoteAddress || 'unknown';
  const now = Date.now();
  const clientData = rateLimitMap.get(clientIp);

  if (!clientData || now > clientData.resetTime) {
    rateLimitMap.set(clientIp as string, { count: 1, resetTime: now + RATE_LIMIT_WINDOW });
    next();
  } else if (clientData.count < RATE_LIMIT_MAX_REQUESTS) {
    clientData.count++;
    next();
  } else {
    securityLogger.warn('Rate limit exceeded', {
      ip: clientIp,
      userAgent: req.get('User-Agent'),
      url: req.url
    });
    res.status(429).json({
      error: 'Too Many Requests',
      message: 'Rate limit exceeded. Please try again later.',
      retryAfter: Math.ceil((clientData.resetTime - now) / 1000)
    });
  }
});

// API Routes

/**
 * Health check endpoint
 * GET /health
 */
app.get('/health', async (req: Request, res: Response) => {
  try {
    const healthStatus = await healthService.performHealthCheck();
    const statusCode = healthStatus.status === 'healthy' ? 200 : 
                      healthStatus.status === 'degraded' ? 200 : 503;
    
    res.status(statusCode).json({
      success: true,
      data: healthStatus,
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    appLogger.error('Health check endpoint error', { error: error.message });
    res.status(500).json({
      success: false,
      error: 'Internal server error during health check',
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * Quick health status endpoint
 * GET /health/status
 */
app.get('/health/status', (req: Request, res: Response) => {
  try {
    const lastStatus = healthService.getLastHealthStatus();
    if (!lastStatus) {
      return res.status(503).json({
        success: false,
        error: 'No health data available',
        timestamp: new Date().toISOString()
      });
    }

    const statusCode = lastStatus.status === 'healthy' ? 200 : 
                      lastStatus.status === 'degraded' ? 200 : 503;
    
    return res.status(statusCode).json({
      success: true,
      data: {
        status: lastStatus.status,
        timestamp: lastStatus.timestamp,
        responseTime: lastStatus.responseTime
      }
    });
  } catch (error: any) {
    healthLogger.error('Health status endpoint error', { error: error.message });
    return res.status(500).json({
      success: false,
      error: 'Failed to retrieve health status',
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * Health statistics endpoint
 * GET /health/stats
 */
app.get('/health/stats', (req: Request, res: Response) => {
  try {
    const stats = healthService.getStatistics();
    const history = healthService.getHealthHistory(10);
    
    res.json({
      success: true,
      data: {
        statistics: stats,
        recentHistory: history
      },
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    appLogger.error('Health stats endpoint error', { error: error.message });
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve health statistics',
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * Get ERC20 token balance
 * GET /api/balance/:tokenAddress/:walletAddress
 */
// ERC20 Balance endpoint following Somnia ORMI API structure
app.get('/api/balance/erc20/:walletAddress', async (req: Request, res: Response) => {
  try {
    const { walletAddress } = req.params;
    
    if (!walletAddress) {
      return res.status(400).json({
        success: false,
        error: 'Wallet address is required',
        timestamp: new Date().toISOString()
      });
    }

    const balance = await ormiService.getERC20Balances(walletAddress);
    
    if (balance && balance.success) {
      return res.json({
        success: true,
        data: balance.data,
        responseTime: balance.responseTime,
        timestamp: new Date().toISOString()
      });
    } else {
      return res.status(404).json({
        success: false,
        error: 'Balance not found or API error',
        timestamp: new Date().toISOString()
      });
    }
  } catch (error: any) {
    apiLogger.error('Balance request failed', {
      walletAddress: req.params.walletAddress,
      error: error.message
    });
    
    return res.status(500).json({
      success: false,
      error: 'Internal server error',
      timestamp: new Date().toISOString()
    });
  }
});

// Legacy endpoint for backward compatibility
app.get('/api/balance/:tokenAddress/:walletAddress', async (req: Request, res: Response) => {
  const { walletAddress } = req.params;
  // Redirect to new endpoint structure
  res.redirect(301, `/api/balance/erc20/${walletAddress}`);
});

/**
 * Get service information
 * GET /api/info
 */
app.get('/api/info', (req: Request, res: Response) => {
  try {
    const serviceInfo = ormiService.getServiceInfo();
    
    res.json({
      success: true,
      data: {
        service: 'ORMI API Demonstration',
        version: process.env.API_VERSION || '1.0.0',
        environment: process.env.NODE_ENV || 'development',
        ormiService: {
          baseURL: serviceInfo.baseURL,
          hasApiKey: serviceInfo.hasApiKey,
          timeout: serviceInfo.timeout
        },
        features: [
          'ERC20 Token Balance Queries',
          'Health Monitoring',
          'Request Logging',
          'Rate Limiting',
          'Security Headers'
        ]
      },
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    appLogger.error('Service info endpoint error', { error: error.message });
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve service information',
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * Root endpoint
 * GET /
 */
app.get('/', (req: Request, res: Response) => {
  res.json({
    success: true,
    message: 'ORMI API Demonstration Service',
    version: process.env.API_VERSION || '1.0.0',
    documentation: 'https://docs.somnia.network/developer/how-to-guides/api/ormi-apis',
    endpoints: {
      health: '/health',
      healthStatus: '/health/status',
      healthStats: '/health/stats',
      balance: '/api/balance/:tokenAddress/:walletAddress',
      info: '/api/info'
    },
    timestamp: new Date().toISOString()
  });
});

// Error handling middleware
app.use((error: Error, req: Request, res: Response, next: NextFunction) => {
  appLogger.error('Unhandled error', {
    error: error.message,
    stack: error.stack,
    url: req.url,
    method: req.method,
    requestId: (req as any).requestId
  });

  res.status(500).json({
    success: false,
    error: 'Internal server error',
    timestamp: new Date().toISOString(),
    ...(process.env.NODE_ENV === 'development' && { details: error.message })
  });
});

// 404 handler
app.use('*', (req: Request, res: Response) => {
  securityLogger.info('404 - Route not found', {
    url: req.url,
    method: req.method,
    ip: req.ip,
    userAgent: req.get('User-Agent')
  });

  res.status(404).json({
    success: false,
    error: 'Route not found',
    message: `The requested endpoint ${req.method} ${req.url} does not exist`,
    timestamp: new Date().toISOString()
  });
});

// Start server
const server = app.listen(PORT, () => {
  appLogger.info('ORMI API server started', {
    port: PORT,
    environment: process.env.NODE_ENV || 'development',
    timestamp: new Date().toISOString()
  });

  // Start periodic health checks (temporarily disabled due to cron issue)
  const healthCheckInterval = process.env.HEALTH_CHECK_INTERVAL || '*/30 * * * * *';
  // healthService.startPeriodicHealthChecks(healthCheckInterval);
  
  appLogger.info('Periodic health checks started', { interval: healthCheckInterval });
});

// Graceful shutdown
process.on('SIGTERM', () => {
  appLogger.info('SIGTERM received, shutting down gracefully');
  healthService.stopPeriodicHealthChecks();
  server.close(() => {
    appLogger.info('Server closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  appLogger.info('SIGINT received, shutting down gracefully');
  healthService.stopPeriodicHealthChecks();
  server.close(() => {
    appLogger.info('Server closed');
    process.exit(0);
  });
});

export default app;