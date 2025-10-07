/**
 * ORMI Health Monitoring System
 * Comprehensive health monitoring for ORMI API connectivity and system performance
 * Designed for Somnia Testnet with MultiStream BFT consensus monitoring
 */

import { ormiClient } from './ormiApiClient';
import { logger, ormiLogger } from '../utils/logger';
import axios, { AxiosError } from 'axios';

// Health check result interface
export interface HealthCheckResult {
  service: string;
  status: 'healthy' | 'unhealthy' | 'degraded';
  responseTime: number;
  timestamp: Date;
  details: any;
  error?: string;
  endpoint?: string;
  consecutiveFailures?: number;
}

// System health overview
export interface SystemHealth {
  overall: 'healthy' | 'unhealthy' | 'degraded';
  services: HealthCheckResult[];
  uptime: number;
  lastCheck: Date;
  healthScore: number; // 0-100
  alerts: HealthAlert[];
}

// Health alert interface
export interface HealthAlert {
  id: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  service: string;
  timestamp: Date;
  resolved: boolean;
}

// Health monitoring configuration
export interface HealthConfig {
  checkInterval: number;
  timeout: number;
  retryAttempts: number;
  alertThresholds: {
    responseTime: number;
    errorRate: number;
    consecutiveFailures: number;
  };
}

/**
 * Enterprise Health Monitoring System
 * Features: Multi-service monitoring, alerting, historical tracking, performance analysis
 */
class HealthMonitor {
  private healthHistory: HealthCheckResult[] = [];
  private alerts: HealthAlert[] = [];
  private startTime: Date = new Date();
  private intervalId?: NodeJS.Timeout | undefined;
  private config: HealthConfig;
  private consecutiveFailures: Map<string, number> = new Map();
  private lastHealthScores: number[] = [];

  constructor(config: Partial<HealthConfig> = {}) {
    this.config = {
      checkInterval: parseInt(process.env.HEALTH_CHECK_INTERVAL || '30000', 10),
      timeout: parseInt(process.env.HEALTH_CHECK_TIMEOUT || '5000', 10),
      retryAttempts: 2,
      alertThresholds: {
        responseTime: parseInt(process.env.ALERT_THRESHOLD_RESPONSE_TIME || '3000', 10),
        errorRate: parseInt(process.env.ALERT_THRESHOLD_ERROR_RATE || '10', 10),
        consecutiveFailures: 3
      },
      ...config
    };
  }

  /**
   * Start continuous health monitoring
   */
  startMonitoring(): void {
    logger.info('🚀 Starting ORMI Health Monitoring System', {
      interval: `${this.config.checkInterval}ms`,
      timeout: `${this.config.timeout}ms`,
      services: ['ormi-data-api', 'ormi-connectivity', 'api-metrics', 'system-resources'],
      alertThresholds: this.config.alertThresholds
    });

    // Perform initial health check
    this.performHealthCheck();

    // Start periodic monitoring
    this.intervalId = setInterval(() => {
      this.performHealthCheck();
    }, this.config.checkInterval);

    // Start alert cleanup (remove resolved alerts older than 1 hour)
    setInterval(() => {
      this.cleanupAlerts();
    }, 300000); // Every 5 minutes
  }

  /**
   * Stop health monitoring
   */
  stopMonitoring(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = undefined as NodeJS.Timeout | undefined;
      
      ormiLogger.system('shutdown', {
        component: 'health-monitor',
        uptime: Date.now() - this.startTime.getTime(),
        totalChecks: this.healthHistory.length
      });
    }
  }

  /**
   * Perform comprehensive health check across all services
   */
  async performHealthCheck(): Promise<SystemHealth> {
    const checkStartTime = Date.now();
    
    try {
      // Execute all health checks in parallel
      const checks = await Promise.allSettled([
        this.checkOrmiDataApi(),
        this.checkOrmiApiConnectivity(),
        this.checkApiMetrics(),
        this.checkSystemResources()
      ]);

      // Process results and handle failures
      const serviceNames = ['ormi-data-api', 'ormi-connectivity', 'api-metrics', 'system-resources'];
      const services: HealthCheckResult[] = checks.map((result, index) => {
        const serviceName = serviceNames[index] || 'unknown-service';
        
        if (result.status === 'fulfilled') {
          // Reset consecutive failures on success
          if (result.value.status === 'healthy') {
            this.consecutiveFailures.set(serviceName, 0);
          } else {
            this.incrementConsecutiveFailures(serviceName);
          }
          
          return {
            ...result.value,
            consecutiveFailures: this.consecutiveFailures.get(serviceName) || 0
          };
        } else {
          // Handle rejected promises
          this.incrementConsecutiveFailures(serviceName);
          
          return {
            service: serviceName,
            status: 'unhealthy' as const,
            responseTime: Date.now() - checkStartTime,
            timestamp: new Date(),
            details: {},
            error: result.reason?.message || 'Health check failed',
            consecutiveFailures: this.consecutiveFailures.get(serviceName) || 0
          };
        }
      });

      // Calculate overall health status and score
      const { overall, healthScore } = this.calculateOverallHealth(services);
      
      // Generate alerts based on health status
      this.generateAlerts(services);
      
      // Create system health object
      const systemHealth: SystemHealth = {
        overall,
        services,
        uptime: Date.now() - this.startTime.getTime(),
        lastCheck: new Date(),
        healthScore,
        alerts: this.getActiveAlerts()
      };

      // Log health status with appropriate level
      const logLevel = overall === 'healthy' ? 'info' : overall === 'degraded' ? 'warn' : 'error';
      ormiLogger.healthCheck(overall, {
        healthScore,
        serviceCount: services.length,
        healthyServices: services.filter(s => s.status === 'healthy').length,
        degradedServices: services.filter(s => s.status === 'degraded').length,
        unhealthyServices: services.filter(s => s.status === 'unhealthy').length,
        activeAlerts: this.getActiveAlerts().length,
        checkDuration: `${Date.now() - checkStartTime}ms`
      });

      // Store in history (keep last 200 checks)
      this.healthHistory.push(...services);
      if (this.healthHistory.length > 800) { // 200 checks * 4 services
        this.healthHistory = this.healthHistory.slice(-800);
      }
      
      // Track health score trend
      this.lastHealthScores.push(healthScore);
      if (this.lastHealthScores.length > 20) {
        this.lastHealthScores = this.lastHealthScores.slice(-20);
      }

      return systemHealth;
    } catch (error) {
      logger.error('Health check system failure', {
        error: error instanceof Error ? error.message : 'Unknown error',
        checkDuration: `${Date.now() - checkStartTime}ms`
      });
      
      throw error;
    }
  }

  /**
   * Check ORMI Data API endpoint health
   */
  private async checkOrmiDataApi(): Promise<HealthCheckResult> {
    const startTime = Date.now();
    const endpoint = 'https://api.subgraph.somnia.network/public_api/data_api';
    
    try {
      const response = await axios.get(endpoint, {
        timeout: this.config.timeout,
        headers: {
          'User-Agent': 'ORMI-Health-Monitor/1.0.0 (Somnia-Testnet)',
          'Accept': 'application/json'
        },
        validateStatus: () => true // Accept all status codes for analysis
      });
      
      const responseTime = Date.now() - startTime;
      
      // Analyze response to determine health
      const isHealthy = response.status === 200 || 
                       (response.status === 401 && response.data?.msg === 'Id token not available.');
      
      const isDegraded = response.status >= 400 && response.status < 500 && !isHealthy;
      
      let status: 'healthy' | 'degraded' | 'unhealthy';
      if (isHealthy) {
        status = responseTime > this.config.alertThresholds.responseTime ? 'degraded' : 'healthy';
      } else if (isDegraded) {
        status = 'degraded';
      } else {
        status = 'unhealthy';
      }
      
      return {
        service: 'ormi-data-api',
        status,
        responseTime,
        timestamp: new Date(),
        endpoint,
        details: {
          statusCode: response.status,
          message: response.data?.msg || 'OK',
          dataSize: JSON.stringify(response.data || {}).length,
          headers: {
            contentType: response.headers['content-type'],
            server: response.headers['server']
          }
        }
      };
    } catch (error) {
      const responseTime = Date.now() - startTime;
      const axiosError = error as AxiosError;
      
      return {
        service: 'ormi-data-api',
        status: 'unhealthy',
        responseTime,
        timestamp: new Date(),
        endpoint,
        details: {
          errorCode: axiosError.code,
          timeout: responseTime >= this.config.timeout
        },
        error: axiosError.message
      };
    }
  }

  /**
   * Check ORMI API client connectivity and performance
   */
  private async checkOrmiApiConnectivity(): Promise<HealthCheckResult> {
    const startTime = Date.now();
    
    try {
      const metrics = ormiClient.getMetrics();
      const rateLimitInfo = ormiClient.getRateLimitInfo();
      const responseTime = Date.now() - startTime;
      
      // Determine health based on metrics
      const errorRate = metrics.errorRate;
      const avgResponseTime = metrics.averageResponseTime;
      
      let status: 'healthy' | 'degraded' | 'unhealthy';
      if (errorRate === 0 && avgResponseTime < 1000) {
        status = 'healthy';
      } else if (errorRate < this.config.alertThresholds.errorRate && avgResponseTime < this.config.alertThresholds.responseTime) {
        status = 'degraded';
      } else {
        status = 'unhealthy';
      }
      
      return {
        service: 'ormi-connectivity',
        status,
        responseTime,
        timestamp: new Date(),
        details: {
          errorRate: `${errorRate.toFixed(2)}%`,
          totalRequests: metrics.requestCount,
          successCount: metrics.successCount,
          errorCount: metrics.errorCount,
          averageResponseTime: `${avgResponseTime.toFixed(2)}ms`,
          uptimePercentage: `${metrics.uptimePercentage.toFixed(2)}%`,
          rateLimitRemaining: rateLimitInfo?.remaining,
          rateLimitReset: rateLimitInfo?.reset?.toISOString(),
          isRateLimited: ormiClient.isRateLimited()
        }
      };
    } catch (error) {
      return {
        service: 'ormi-connectivity',
        status: 'unhealthy',
        responseTime: Date.now() - startTime,
        timestamp: new Date(),
        details: {},
        error: error instanceof Error ? error.message : 'Unknown connectivity error'
      };
    }
  }

  /**
   * Check API performance metrics
   */
  private async checkApiMetrics(): Promise<HealthCheckResult> {
    const startTime = Date.now();
    
    try {
      const metrics = ormiClient.getMetrics();
      const responseTime = Date.now() - startTime;
      
      // Determine health based on performance thresholds
      let status: 'healthy' | 'degraded' | 'unhealthy';
      if (metrics.averageResponseTime < 1000 && metrics.errorRate < 5) {
        status = 'healthy';
      } else if (metrics.averageResponseTime < this.config.alertThresholds.responseTime && metrics.errorRate < this.config.alertThresholds.errorRate) {
        status = 'degraded';
      } else {
        status = 'unhealthy';
      }
      
      return {
        service: 'api-metrics',
        status,
        responseTime,
        timestamp: new Date(),
        details: {
          averageResponseTime: `${metrics.averageResponseTime.toFixed(2)}ms`,
          requestCount: metrics.requestCount,
          errorCount: metrics.errorCount,
          successCount: metrics.successCount,
          errorRate: `${metrics.errorRate.toFixed(2)}%`,
          uptimePercentage: `${metrics.uptimePercentage.toFixed(2)}%`,
          lastRequestTime: metrics.lastRequestTime.toISOString(),
          performanceGrade: this.getPerformanceGrade(metrics.averageResponseTime, metrics.errorRate)
        }
      };
    } catch (error) {
      return {
        service: 'api-metrics',
        status: 'unhealthy',
        responseTime: Date.now() - startTime,
        timestamp: new Date(),
        details: {},
        error: error instanceof Error ? error.message : 'Metrics collection failed'
      };
    }
  }

  /**
   * Check system resources (memory, CPU, etc.)
   */
  private async checkSystemResources(): Promise<HealthCheckResult> {
    const startTime = Date.now();
    
    try {
      const memoryUsage = process.memoryUsage();
      const uptime = process.uptime();
      const responseTime = Date.now() - startTime;
      
      // Convert bytes to MB
      const heapUsedMB = memoryUsage.heapUsed / 1024 / 1024;
      const heapTotalMB = memoryUsage.heapTotal / 1024 / 1024;
      const memoryUsagePercent = (heapUsedMB / heapTotalMB) * 100;
      
      // Determine health based on resource usage
      let status: 'healthy' | 'degraded' | 'unhealthy';
      if (memoryUsagePercent < 70) {
        status = 'healthy';
      } else if (memoryUsagePercent < 85) {
        status = 'degraded';
      } else {
        status = 'unhealthy';
      }
      
      return {
        service: 'system-resources',
        status,
        responseTime,
        timestamp: new Date(),
        details: {
          memoryUsage: {
            heapUsed: `${heapUsedMB.toFixed(2)} MB`,
            heapTotal: `${heapTotalMB.toFixed(2)} MB`,
            usagePercent: `${memoryUsagePercent.toFixed(2)}%`,
            external: `${(memoryUsage.external / 1024 / 1024).toFixed(2)} MB`
          },
          process: {
            uptime: `${uptime.toFixed(2)} seconds`,
            pid: process.pid,
            nodeVersion: process.version,
            platform: process.platform
          },
          environment: {
            nodeEnv: process.env.NODE_ENV || 'development',
            timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
          }
        }
      };
    } catch (error) {
      return {
        service: 'system-resources',
        status: 'unhealthy',
        responseTime: Date.now() - startTime,
        timestamp: new Date(),
        details: {},
        error: error instanceof Error ? error.message : 'System resource check failed'
      };
    }
  }

  /**
   * Calculate overall health status and score
   */
  private calculateOverallHealth(services: HealthCheckResult[]): { overall: 'healthy' | 'degraded' | 'unhealthy', healthScore: number } {
    const healthyCount = services.filter(s => s.status === 'healthy').length;
    const degradedCount = services.filter(s => s.status === 'degraded').length;
    const unhealthyCount = services.filter(s => s.status === 'unhealthy').length;
    
    // Calculate health score (0-100)
    const healthScore = Math.round(
      ((healthyCount * 100) + (degradedCount * 50) + (unhealthyCount * 0)) / services.length
    );
    
    // Determine overall status
    let overall: 'healthy' | 'degraded' | 'unhealthy';
    if (unhealthyCount === 0 && degradedCount === 0) {
      overall = 'healthy';
    } else if (unhealthyCount === 0) {
      overall = 'degraded';
    } else {
      overall = 'unhealthy';
    }
    
    return { overall, healthScore };
  }

  /**
   * Generate alerts based on health check results
   */
  private generateAlerts(services: HealthCheckResult[]): void {
    services.forEach(service => {
      const consecutiveFailures = this.consecutiveFailures.get(service.service) || 0;
      
      // High response time alert
      if (service.responseTime > this.config.alertThresholds.responseTime) {
        this.createAlert(
          'high-response-time',
          'medium',
          `High response time detected for ${service.service}: ${service.responseTime}ms`,
          service.service
        );
      }
      
      // Consecutive failures alert
      if (consecutiveFailures >= this.config.alertThresholds.consecutiveFailures) {
        this.createAlert(
          'consecutive-failures',
          'high',
          `${consecutiveFailures} consecutive failures for ${service.service}`,
          service.service
        );
      }
      
      // Service unhealthy alert
      if (service.status === 'unhealthy') {
        this.createAlert(
          'service-unhealthy',
          'critical',
          `Service ${service.service} is unhealthy: ${service.error || 'Unknown error'}`,
          service.service
        );
      }
    });
  }

  /**
   * Create a new alert
   */
  private createAlert(type: string, severity: 'low' | 'medium' | 'high' | 'critical', message: string, service: string): void {
    const alertId = `${type}-${service}-${Date.now()}`;
    
    // Check if similar alert already exists
    const existingAlert = this.alerts.find(alert => 
      alert.service === service && 
      alert.message.includes(type) && 
      !alert.resolved
    );
    
    if (!existingAlert) {
      const alert: HealthAlert = {
        id: alertId,
        severity,
        message,
        service,
        timestamp: new Date(),
        resolved: false
      };
      
      this.alerts.push(alert);
      
      logger.warn(`🚨 Health Alert: ${message}`, {
        alertId,
        severity,
        service,
        type
      });
    }
  }

  /**
   * Get active (unresolved) alerts
   */
  private getActiveAlerts(): HealthAlert[] {
    return this.alerts.filter(alert => !alert.resolved);
  }

  /**
   * Clean up old resolved alerts
   */
  private cleanupAlerts(): void {
    const oneHourAgo = new Date(Date.now() - 3600000);
    const initialCount = this.alerts.length;
    
    this.alerts = this.alerts.filter(alert => 
      !alert.resolved || alert.timestamp > oneHourAgo
    );
    
    const removedCount = initialCount - this.alerts.length;
    if (removedCount > 0) {
      logger.debug(`Cleaned up ${removedCount} old alerts`);
    }
  }

  /**
   * Increment consecutive failures counter
   */
  private incrementConsecutiveFailures(serviceName: string): void {
    const current = this.consecutiveFailures.get(serviceName) || 0;
    this.consecutiveFailures.set(serviceName, current + 1);
  }

  /**
   * Get performance grade based on response time and error rate
   */
  private getPerformanceGrade(avgResponseTime: number, errorRate: number): string {
    if (avgResponseTime < 500 && errorRate < 1) return 'A+';
    if (avgResponseTime < 1000 && errorRate < 2) return 'A';
    if (avgResponseTime < 2000 && errorRate < 5) return 'B';
    if (avgResponseTime < 3000 && errorRate < 10) return 'C';
    return 'D';
  }

  // Public getter methods

  /**
   * Get health history for analysis
   */
  getHealthHistory(): HealthCheckResult[] {
    return [...this.healthHistory];
  }

  /**
   * Get uptime percentage
   */
  getUptimePercentage(): number {
    if (this.healthHistory.length === 0) return 100;
    
    const healthyChecks = this.healthHistory.filter(check => 
      check.status === 'healthy' || check.status === 'degraded'
    ).length;
    
    return (healthyChecks / this.healthHistory.length) * 100;
  }

  /**
   * Get health trend (improving, stable, declining)
   */
  getHealthTrend(): 'improving' | 'stable' | 'declining' {
    if (this.lastHealthScores.length < 5) return 'stable';
    
    const recent = this.lastHealthScores.slice(-5);
    const older = this.lastHealthScores.slice(-10, -5);
    
    const recentAvg = recent.reduce((a, b) => a + b, 0) / recent.length;
    const olderAvg = older.reduce((a, b) => a + b, 0) / older.length;
    
    const difference = recentAvg - olderAvg;
    
    if (difference > 5) return 'improving';
    if (difference < -5) return 'declining';
    return 'stable';
  }

  /**
   * Get all alerts (active and resolved)
   */
  getAllAlerts(): HealthAlert[] {
    return [...this.alerts];
  }

  /**
   * Resolve an alert by ID
   */
  resolveAlert(alertId: string): boolean {
    const alert = this.alerts.find(a => a.id === alertId);
    if (alert) {
      alert.resolved = true;
      logger.info(`Alert resolved: ${alert.message}`, { alertId });
      return true;
    }
    return false;
  }
}

// Export singleton instance
export const healthMonitor = new HealthMonitor();

// Log health monitor initialization
ormiLogger.system('startup', {
  component: 'health-monitor',
  checkInterval: healthMonitor['config'].checkInterval,
  alertThresholds: healthMonitor['config'].alertThresholds
});

export default HealthMonitor;