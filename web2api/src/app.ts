import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import dotenv from 'dotenv';
import { logger, apiLogger } from './utils/logger';
import { HealthService } from './services/healthService';
import { ApiService } from './services/apiService';

// Load environment variables
dotenv.config();


const app = express();
const port = process.env.PORT || 3000;

// Initialize services
const healthService = new HealthService();
const jsonPlaceholderApi = new ApiService('https://jsonplaceholder.typicode.com', 'JSONPlaceholder');

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());


// Request logging middleware
app.use((req, res, next) => {
  const startTime = Date.now();
  
  apiLogger.info('Incoming request', {
    method: req.method,
    url: req.url,
    userAgent: req.get('User-Agent'),
    ip: req.ip
  });

  res.on('finish', () => {
    const responseTime = Date.now() - startTime;
    apiLogger.info('Request completed', {
      method: req.method,
      url: req.url,
      status: res.statusCode,
      responseTime: `${responseTime}ms`
    });
  });

  next();
});

// Health check endpoint
app.get('/api/health', async (req, res) => {
  try {
    const healthStatus = await healthService.performHealthCheck();
    
    const statusCode = healthStatus.status === 'healthy' ? 200 : 
                      healthStatus.status === 'degraded' ? 206 : 503;
    
    res.status(statusCode).json(healthStatus);
  } catch (error: any) {
    logger.error('Health check endpoint error', { error: error.message });
    res.status(500).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: 'Health check failed'
    });
  }
});

// Demo API endpoints
app.get('/api/posts', async (req, res) => {
  try {
    const result = await jsonPlaceholderApi.get('/posts');
    
    if (result) {
      res.json({
        success: true,
        data: Array.isArray(result.data) ? result.data.slice(0, 5) : result.data, // Return first 5 posts
        responseTime: result.responseTime
      });
    } else {
      res.status(503).json({
        success: false,
        error: 'Failed to fetch posts from external API'
      });
    }
  } catch (error: any) {
    logger.error('Posts endpoint error', { error: error.message });
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

app.get('/api/posts/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await jsonPlaceholderApi.get(`/posts/${id}`);
    
    if (result) {
      res.json({
        success: true,
        data: result.data,
        responseTime: result.responseTime
      });
    } else {
      res.status(404).json({
        success: false,
        error: 'Post not found'
      });
    }
  } catch (error: any) {
    logger.error('Post by ID endpoint error', { error: error.message });
    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

// Status endpoint
app.get('/api/status', (req, res) => {
  res.json({
    service: 'Web2 API Demo',
    version: '1.0.0',
    environment: process.env.NODE_ENV || 'development',
    uptime: process.uptime(),
    timestamp: new Date().toISOString()
  });
});

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    message: 'Web2 API Logging & Health Checks Demo',
    version: '1.0.0',
    endpoints: {
      health: '/api/health',
      status: '/api/status',
      posts: '/api/posts',
      postById: '/api/posts/:id'
    }
  });
});

// Error handling middleware
app.use((error: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  logger.error('Unhandled error', {
    error: error.message,
    stack: error.stack,
    url: req.url,
    method: req.method
  });
  
  res.status(500).json({
    success: false,
    error: 'Internal server error'
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    error: 'Endpoint not found'
  });
});

// Start server
app.listen(port, () => {
  logger.info('Server started', {
    port,
    environment: process.env.NODE_ENV || 'development',
    version: '1.0.0'
  });
  
  // Start periodic health checks
  healthService.startPeriodicHealthChecks(60000); // Every minute
});

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM received, shutting down gracefully');
  healthService.stopPeriodicHealthChecks();
  process.exit(0);
});

process.on('SIGINT', () => {
  logger.info('SIGINT received, shutting down gracefully');
  healthService.stopPeriodicHealthChecks();
  process.exit(0);
});

export default app;