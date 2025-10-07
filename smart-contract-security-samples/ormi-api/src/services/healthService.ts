import { OrmiService } from './ormiService';
import { healthLogger, logApiPerformance } from '../utils/logger';
import * as cron from 'node-cron';

export interface HealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  responseTime: number;
  checks: {
    [key: string]: {
      status: boolean;
      responseTime?: number;
      error?: string;
      details?: any;
    };
  };
  system: {
    uptime: string;
    memory: {
      used: number;
      total: number;
      percentage: number;
    };
    environment: string;
  };
}

export interface ServiceHealth {
  name: string;
  healthy: boolean;
  responseTime?: number;
  error?: string;
  lastCheck: string;
}

export class HealthService {
  private ormiService?: OrmiService;
  private healthCheckInterval?: NodeJS.Timeout;
  private cronJob?: cron.ScheduledTask;
  private lastHealthStatus?: HealthStatus;
  private healthHistory: HealthStatus[] = [];
  private maxHistorySize = 100;

  constructor() {
    healthLogger.info('Health Service initialized');
  }

  /**
   * Initialize health service with ORMI API service
   * @param ormiService - The ORMI service instance to monitor
   */
  initializeWithOrmiService(ormiService: OrmiService) {
    this.ormiService = ormiService;
    healthLogger.info('ORMI service added to health monitoring');
  }

  /**
   * Perform comprehensive health check
   * @returns Promise with complete health status
   */
  async performHealthCheck(): Promise<HealthStatus> {
    const startTime = Date.now();
    const checks: HealthStatus['checks'] = {};
    
    healthLogger.info('Starting comprehensive health check');

    // Check ORMI API service
    if (this.ormiService) {
      try {
        const checkStart = Date.now();
        const result = await this.ormiService.healthCheck();
        const checkTime = Date.now() - checkStart;
        
        if (result && result.success) {
          checks['ormi-api'] = {
            status: true,
            responseTime: checkTime,
            details: {
              baseURL: this.ormiService.getServiceInfo().baseURL,
              hasApiKey: this.ormiService.getServiceInfo().hasApiKey
            }
          };
          healthLogger.info('ORMI API health check passed', { responseTime: checkTime });
        } else {
          checks['ormi-api'] = {
            status: false,
            responseTime: checkTime,
            error: 'API health check failed'
          };
          healthLogger.warn('ORMI API health check failed');
        }
      } catch (error: any) {
        checks['ormi-api'] = {
          status: false,
          error: error.message,
          details: { stack: error.stack }
        };
        healthLogger.error('ORMI API health check error', { error: error.message });
      }
    } else {
      checks['ormi-api'] = {
        status: false,
        error: 'ORMI service not initialized'
      };
    }

    // Check system memory
    checks['memory'] = this.checkMemoryUsage();
    
    // Check system uptime
    checks['uptime'] = this.checkUptime();
    
    // Check environment configuration
    checks['environment'] = this.checkEnvironmentConfig();

    // Determine overall health status
    const totalResponseTime = Date.now() - startTime;
    const overallStatus = this.determineOverallStatus(checks);
    
    const healthStatus: HealthStatus = {
      status: overallStatus,
      timestamp: new Date().toISOString(),
      responseTime: totalResponseTime,
      checks,
      system: {
        uptime: this.formatUptime(process.uptime()),
        memory: this.getMemoryInfo(),
        environment: process.env.NODE_ENV || 'development'
      }
    };

    // Store in history
    this.addToHistory(healthStatus);
    this.lastHealthStatus = healthStatus;

    // Log performance metrics
    logApiPerformance('health-check', totalResponseTime, overallStatus === 'healthy', {
      checksCount: Object.keys(checks).length,
      failedChecks: Object.values(checks).filter(check => !check.status).length
    });

    healthLogger.info('Health check completed', {
      status: overallStatus,
      responseTime: totalResponseTime,
      checksCount: Object.keys(checks).length
    });

    return healthStatus;
  }

  /**
   * Get the last health check result
   * @returns Last health status or null if no checks performed
   */
  getLastHealthStatus(): HealthStatus | null {
    return this.lastHealthStatus || null;
  }

  /**
   * Get health check history
   * @param limit - Maximum number of records to return
   * @returns Array of health status records
   */
  getHealthHistory(limit: number = 10): HealthStatus[] {
    return this.healthHistory.slice(-limit);
  }

  /**
   * Check memory usage
   * @returns Memory check result
   */
  private checkMemoryUsage() {
    const memInfo = this.getMemoryInfo();
    const isHealthy = memInfo.percentage < 90; // Consider unhealthy if > 90% memory usage
    
    return {
      status: isHealthy,
      details: memInfo,
      ...(isHealthy ? {} : { error: 'High memory usage detected' })
    };
  }

  /**
   * Get memory information
   * @returns Memory usage details
   */
  private getMemoryInfo() {
    const memUsage = process.memoryUsage();
    const totalMem = memUsage.heapTotal;
    const usedMem = memUsage.heapUsed;
    
    return {
      used: Math.round(usedMem / 1024 / 1024), // MB
      total: Math.round(totalMem / 1024 / 1024), // MB
      percentage: Math.round((usedMem / totalMem) * 100)
    };
  }

  /**
   * Check system uptime
   * @returns Uptime check result
   */
  private checkUptime() {
    const uptimeSeconds = process.uptime();
    const isHealthy = uptimeSeconds > 0;
    
    return {
      status: isHealthy,
      details: {
        uptimeSeconds,
        uptimeFormatted: this.formatUptime(uptimeSeconds)
      }
    };
  }

  /**
   * Check environment configuration
   * @returns Environment configuration check result
   */
  private checkEnvironmentConfig() {
    const requiredEnvVars = ['ORMI_API_KEY', 'ORMI_BASE_URL'];
    const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);
    const isHealthy = missingVars.length === 0;
    
    return {
      status: isHealthy,
      details: {
        environment: process.env.NODE_ENV || 'development',
        requiredVars: requiredEnvVars,
        missingVars
      },
      ...(isHealthy ? {} : { error: `Missing environment variables: ${missingVars.join(', ')}` })
    };
  }

  /**
   * Determine overall health status based on individual checks
   * @param checks - Individual health check results
   * @returns Overall health status
   */
  private determineOverallStatus(checks: HealthStatus['checks']): 'healthy' | 'degraded' | 'unhealthy' {
    const checkResults = Object.values(checks);
    const failedChecks = checkResults.filter(check => !check.status);
    const criticalChecks = ['ormi-api', 'environment'];
    const criticalFailures = Object.entries(checks)
      .filter(([key, check]) => criticalChecks.includes(key) && !check.status);

    if (criticalFailures.length > 0) {
      return 'unhealthy';
    } else if (failedChecks.length > 0) {
      return 'degraded';
    } else {
      return 'healthy';
    }
  }

  /**
   * Format uptime in human-readable format
   * @param seconds - Uptime in seconds
   * @returns Formatted uptime string
   */
  private formatUptime(seconds: number): string {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    
    return `${days}d ${hours}h ${minutes}m ${secs}s`;
  }

  /**
   * Add health status to history
   * @param status - Health status to add
   */
  private addToHistory(status: HealthStatus) {
    this.healthHistory.push(status);
    if (this.healthHistory.length > this.maxHistorySize) {
      this.healthHistory = this.healthHistory.slice(-this.maxHistorySize);
    }
  }

  /**
   * Start periodic health checks using cron
   * @param cronExpression - Cron expression for scheduling (default: every 30 seconds)
   */
  startPeriodicHealthChecks(cronExpression: string = '* * * * *') {
    if (this.cronJob) {
      this.cronJob.stop();
    }

    this.cronJob = cron.schedule(cronExpression, async () => {
      try {
        await this.performHealthCheck();
      } catch (error: any) {
        healthLogger.error('Periodic health check failed', { error: error.message });
      }
    }, {
      scheduled: false
    });

    this.cronJob.start();
    healthLogger.info('Periodic health checks started', { cronExpression });
  }

  /**
   * Stop periodic health checks
   */
  stopPeriodicHealthChecks() {
    if (this.cronJob) {
      this.cronJob.stop();
      this.cronJob = undefined;
      healthLogger.info('Periodic health checks stopped');
    }
  }

  /**
   * Get health service statistics
   * @returns Service statistics
   */
  getStatistics() {
    const recentChecks = this.healthHistory.slice(-10);
    const healthyChecks = recentChecks.filter(check => check.status === 'healthy').length;
    const avgResponseTime = recentChecks.length > 0 
      ? recentChecks.reduce((sum, check) => sum + check.responseTime, 0) / recentChecks.length 
      : 0;

    return {
      totalChecks: this.healthHistory.length,
      recentHealthyPercentage: recentChecks.length > 0 ? (healthyChecks / recentChecks.length) * 100 : 0,
      averageResponseTime: Math.round(avgResponseTime),
      lastCheckTime: this.lastHealthStatus?.timestamp || null,
      isMonitoring: !!this.cronJob
    };
  }
}