/**
 * ORMI Health Check API Routes
 * Express endpoints for health monitoring, metrics, and system status
 * Production-ready with proper error handling and security
 */

import express, { Request, Response, NextFunction } from 'express';
import { healthMonitor, SystemHealth, HealthCheckResult } from '../services/healthMonitor';
import { ormiClient } from '../services/ormiApiClient';
import { logger, ormiLogger } from '../utils/logger';

const router = express.Router();

// Middleware for request logging
router.use((req: Request, res: Response, next: NextFunction) => {
  const startTime = Date.now();
  
  res.on('finish', () => {
    const responseTime = Date.now() - startTime;
    ormiLogger.apiResponse(
      req.originalUrl,
      res.statusCode,
      responseTime,
      JSON.stringify(res.locals.responseData || {}).length
    );
  });
  
  next();
});

/**
 * Basic health check endpoint
 * Returns simple health status for load balancers and monitoring tools
 * GET /health
 */
router.get('/health', async (req: Request, res: Response) => {
  try {
    const health = await healthMonitor.performHealthCheck();
    
    // Determine HTTP status code based on health
    const statusCode = health.overall === 'healthy' ? 200 : 
                      health.overall === 'degraded' ? 206 : 503;
    
    const responseData = {
      status: health.overall,
      timestamp: health.lastCheck.toISOString(),
      uptime: formatUptime(health.uptime),
      healthScore: health.healthScore,
      services: health.services.map(service => ({
        name: service.service,
        status: service.status,
        responseTime: `${service.responseTime}ms`,
        lastCheck: service.timestamp.toISOString()
      })),
      version: '1.0.0',
      environment: process.env.NODE_ENV || 'development'
    };
    
    res.locals.responseData = responseData;
    res.status(statusCode).json(responseData);
    
  } catch (error) {
    logger.error('Health check endpoint error', {
      error: error instanceof Error ? error.message : 'Unknown error',
      endpoint: '/health',
      userAgent: req.get('User-Agent')
    });
    
    res.status(500).json({
      status: 'unhealthy',
      error: 'Health check failed',
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * Detailed health information endpoint
 * Returns comprehensive health data including metrics and alerts
 * GET /health/detailed
 */
router.get('/health/detailed', async (req: Request, res: Response) => {
  try {
    const health = await healthMonitor.performHealthCheck();
    const metrics = ormiClient.getMetrics();
    const uptime = healthMonitor.getUptimePercentage();
    const trend = healthMonitor.getHealthTrend();
    const alerts = healthMonitor.getAllAlerts();
    
    const responseData = {
      ...health,
      metrics: {
        api: metrics,
        uptime: {
          percentage: `${uptime.toFixed(2)}%`,
          trend,
          startTime: new Date(Date.now() - health.uptime).toISOString()
        }
      },
      alerts: {
        active: alerts.filter(a => !a.resolved),
        total: alerts.length,
        byService: groupAlertsByService(alerts)
      },
      system: {
        nodeVersion: process.version,
        platform: process.platform,
        architecture: process.arch,
        pid: process.pid,
        memory: process.memoryUsage(),
        environment: process.env.NODE_ENV || 'development'
      },
      network: {
        name: 'somnia-testnet',
        consensus: 'multistream-bft',
        chainId: process.env.SOMNIA_CHAIN_ID || '2648'
      },
      version: '1.0.0',
      documentation: 'https://docs.somnia.network'
    };
    
    res.locals.responseData = responseData;
    res.json(responseData);
    
  } catch (error) {
    logger.error('Detailed health check error', {
      error: error instanceof Error ? error.message : 'Unknown error',
      endpoint: '/health/detailed',
      userAgent: req.get('User-Agent')
    });
    
    res.status(500).json({
      error: 'Detailed health check failed',
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * API metrics endpoint
 * Returns performance metrics and statistics
 * GET /metrics
 */
router.get('/metrics', (req: Request, res: Response) => {
  try {
    const metrics = ormiClient.getMetrics();
    const rateLimitInfo = ormiClient.getRateLimitInfo();
    const uptimePercentage = healthMonitor.getUptimePercentage();
    
    const responseData = {
      api: {
        ...metrics,
        rateLimit: rateLimitInfo ? {
          remaining: rateLimitInfo.remaining,
          reset: rateLimitInfo.reset.toISOString(),
          isLimited: ormiClient.isRateLimited()
        } : null
      },
      health: {
        uptimePercentage: `${uptimePercentage.toFixed(2)}%`,
        trend: healthMonitor.getHealthTrend()
      },
      system: {
        uptime: process.uptime(),
        memory: {
          used: `${(process.memoryUsage().heapUsed / 1024 / 1024).toFixed(2)} MB`,
          total: `${(process.memoryUsage().heapTotal / 1024 / 1024).toFixed(2)} MB`
        }
      },
      timestamp: new Date().toISOString(),
      version: '1.0.0'
    };
    
    res.locals.responseData = responseData;
    res.json(responseData);
    
  } catch (error) {
    logger.error('Metrics endpoint error', {
      error: error instanceof Error ? error.message : 'Unknown error',
      endpoint: '/metrics',
      userAgent: req.get('User-Agent')
    });
    
    res.status(500).json({
      error: 'Failed to retrieve metrics',
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * Health history endpoint
 * Returns historical health data for analysis
 * GET /health/history
 */
router.get('/health/history', (req: Request, res: Response) => {
  try {
    const history = healthMonitor.getHealthHistory();
    const limit = parseInt(req.query.limit as string) || 100;
    const service = req.query.service as string;
    
    let filteredHistory = history;
    
    // Filter by service if specified
    if (service) {
      filteredHistory = history.filter(h => h.service === service);
    }
    
    // Limit results
    const limitedHistory = filteredHistory.slice(-limit);
    
    // Calculate statistics
    const stats = calculateHistoryStats(limitedHistory);
    
    const responseData = {
      history: limitedHistory.map(h => ({
        service: h.service,
        status: h.status,
        responseTime: h.responseTime,
        timestamp: h.timestamp.toISOString(),
        error: h.error || null
      })),
      statistics: stats,
      filters: {
        service: service || 'all',
        limit
      },
      timestamp: new Date().toISOString()
    };
    
    res.locals.responseData = responseData;
    res.json(responseData);
    
  } catch (error) {
    logger.error('Health history endpoint error', {
      error: error instanceof Error ? error.message : 'Unknown error',
      endpoint: '/health/history',
      userAgent: req.get('User-Agent')
    });
    
    res.status(500).json({
      error: 'Failed to retrieve health history',
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * Alerts endpoint
 * Returns current alerts and alert management
 * GET /alerts
 */
router.get('/alerts', (req: Request, res: Response) => {
  try {
    const alerts = healthMonitor.getAllAlerts();
    const activeAlerts = alerts.filter(a => !a.resolved);
    const resolvedAlerts = alerts.filter(a => a.resolved);
    
    const responseData = {
      active: activeAlerts.map(formatAlert),
      resolved: resolvedAlerts.slice(-20).map(formatAlert), // Last 20 resolved
      summary: {
        total: alerts.length,
        active: activeAlerts.length,
        resolved: resolvedAlerts.length,
        bySeverity: {
          critical: activeAlerts.filter(a => a.severity === 'critical').length,
          high: activeAlerts.filter(a => a.severity === 'high').length,
          medium: activeAlerts.filter(a => a.severity === 'medium').length,
          low: activeAlerts.filter(a => a.severity === 'low').length
        }
      },
      timestamp: new Date().toISOString()
    };
    
    res.locals.responseData = responseData;
    res.json(responseData);
    
  } catch (error) {
    logger.error('Alerts endpoint error', {
      error: error instanceof Error ? error.message : 'Unknown error',
      endpoint: '/alerts',
      userAgent: req.get('User-Agent')
    });
    
    res.status(500).json({
      error: 'Failed to retrieve alerts',
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * Resolve alert endpoint
 * POST /alerts/:alertId/resolve
 */
router.post('/alerts/:alertId/resolve', (req: Request, res: Response) => {
  try {
    const { alertId } = req.params;
    
    if (!alertId) {
      res.status(400).json({
        success: false,
        message: 'Alert ID is required',
        timestamp: new Date().toISOString()
      });
      return;
    }
    
    const resolved = healthMonitor.resolveAlert(alertId);
    
    if (resolved) {
      logger.info('Alert resolved', {
        alertId,
        resolvedBy: req.ip,
        userAgent: req.get('User-Agent')
      });
      
      res.json({
        success: true,
        message: 'Alert resolved successfully',
        alertId,
        timestamp: new Date().toISOString()
      });
    } else {
      res.status(404).json({
        success: false,
        message: 'Alert not found',
        alertId,
        timestamp: new Date().toISOString()
      });
    }
    
  } catch (error) {
    logger.error('Alert resolution error', {
      error: error instanceof Error ? error.message : 'Unknown error',
      alertId: req.params.alertId,
      userAgent: req.get('User-Agent')
    });
    
    res.status(500).json({
      success: false,
      error: 'Failed to resolve alert',
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * Reset metrics endpoint
 * POST /metrics/reset
 */
router.post('/metrics/reset', (req: Request, res: Response) => {
  try {
    const oldMetrics = ormiClient.getMetrics();
    ormiClient.resetMetrics();
    
    logger.info('Metrics reset', {
      previousMetrics: oldMetrics,
      resetBy: req.ip,
      userAgent: req.get('User-Agent')
    });
    
    res.json({
      success: true,
      message: 'Metrics reset successfully',
      previousMetrics: oldMetrics,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    logger.error('Metrics reset error', {
      error: error instanceof Error ? error.message : 'Unknown error',
      userAgent: req.get('User-Agent')
    });
    
    res.status(500).json({
      success: false,
      error: 'Failed to reset metrics',
      timestamp: new Date().toISOString()
    });
  }
});

// Helper functions

/**
 * Format uptime duration
 */
function formatUptime(uptimeMs: number): string {
  const seconds = Math.floor(uptimeMs / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  
  if (days > 0) {
    return `${days}d ${hours % 24}h ${minutes % 60}m`;
  } else if (hours > 0) {
    return `${hours}h ${minutes % 60}m ${seconds % 60}s`;
  } else if (minutes > 0) {
    return `${minutes}m ${seconds % 60}s`;
  } else {
    return `${seconds}s`;
  }
}

/**
 * Group alerts by service
 */
function groupAlertsByService(alerts: any[]): Record<string, number> {
  return alerts.reduce((acc, alert) => {
    acc[alert.service] = (acc[alert.service] || 0) + 1;
    return acc;
  }, {});
}

/**
 * Format alert for API response
 */
function formatAlert(alert: any) {
  return {
    id: alert.id,
    severity: alert.severity,
    message: alert.message,
    service: alert.service,
    timestamp: alert.timestamp.toISOString(),
    resolved: alert.resolved,
    age: Date.now() - alert.timestamp.getTime()
  };
}

/**
 * Calculate statistics from health history
 */
function calculateHistoryStats(history: HealthCheckResult[]) {
  if (history.length === 0) {
    return {
      totalChecks: 0,
      averageResponseTime: 0,
      healthyPercentage: 100,
      degradedPercentage: 0,
      unhealthyPercentage: 0
    };
  }
  
  const totalChecks = history.length;
  const averageResponseTime = history.reduce((sum, h) => sum + h.responseTime, 0) / totalChecks;
  const healthyCount = history.filter(h => h.status === 'healthy').length;
  const degradedCount = history.filter(h => h.status === 'degraded').length;
  const unhealthyCount = history.filter(h => h.status === 'unhealthy').length;
  
  return {
    totalChecks,
    averageResponseTime: Math.round(averageResponseTime),
    healthyPercentage: Math.round((healthyCount / totalChecks) * 100),
    degradedPercentage: Math.round((degradedCount / totalChecks) * 100),
    unhealthyPercentage: Math.round((unhealthyCount / totalChecks) * 100)
  };
}

// Error handling middleware
router.use((error: Error, req: Request, res: Response, next: NextFunction) => {
  logger.error('Health route error', {
    error: error.message,
    stack: error.stack,
    endpoint: req.originalUrl,
    method: req.method,
    userAgent: req.get('User-Agent')
  });
  
  res.status(500).json({
    error: 'Internal server error',
    timestamp: new Date().toISOString()
  });
});

export default router;