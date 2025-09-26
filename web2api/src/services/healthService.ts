import { ApiService } from './apiService';
import { healthLogger } from '../utils/logger';

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
}

export class HealthService {
  private apiServices: Map<string, ApiService> = new Map();
  private healthCheckInterval?: NodeJS.Timeout;

  constructor() {
    // Initialize with some demo APIs
    this.addApiService('jsonplaceholder', new ApiService('https://jsonplaceholder.typicode.com', 'JSONPlaceholder'));
    this.addApiService('httpbin', new ApiService('https://httpbin.org', 'HTTPBin'));
  }

  addApiService(name: string, service: ApiService) {
    this.apiServices.set(name, service);
    healthLogger.info('API service added to health monitoring', { serviceName: name });
  }

  async performHealthCheck(): Promise<HealthStatus> {
    const startTime = Date.now();
    const checks: HealthStatus['checks'] = {};
    
    healthLogger.info('Starting health check');

    // Check each API service
    for (const [name, service] of this.apiServices) {
      try {
        const checkStart = Date.now();
        let result;
        
        // Different health check endpoints for different services
        if (name === 'jsonplaceholder') {
          result = await service.get('/posts/1');
        } else if (name === 'httpbin') {
          result = await service.get('/status/200');
        } else {
          result = await service.get('/health');
        }
        
        const responseTime = Date.now() - checkStart;
        
        checks[name] = {
          status: result !== null && result.status >= 200 && result.status < 300,
          responseTime,
          details: result ? { status: result.status } : undefined
        };
        
        if (checks[name].status) {
          healthLogger.info(`Health check passed for ${name}`, { responseTime });
        } else {
          healthLogger.warn(`Health check failed for ${name}`, { responseTime });
        }
        
      } catch (error: any) {
        checks[name] = {
          status: false,
          error: error.message
        };
        healthLogger.error(`Health check error for ${name}`, { error: error.message });
      }
    }

    // System checks
    checks.memory = this.checkMemoryUsage();
    checks.uptime = this.checkUptime();

    const responseTime = Date.now() - startTime;
    const healthyChecks = Object.values(checks).filter(check => check.status).length;
    const totalChecks = Object.keys(checks).length;
    
    let status: HealthStatus['status'];
    if (healthyChecks === totalChecks) {
      status = 'healthy';
    } else if (healthyChecks > totalChecks / 2) {
      status = 'degraded';
    } else {
      status = 'unhealthy';
    }

    const healthStatus: HealthStatus = {
      status,
      timestamp: new Date().toISOString(),
      responseTime,
      checks
    };

    healthLogger.info('Health check completed', {
      status,
      responseTime,
      healthyChecks,
      totalChecks
    });

    return healthStatus;
  }

  private checkMemoryUsage() {
    const memUsage = process.memoryUsage();
    const usedMB = Math.round(memUsage.heapUsed / 1024 / 1024);
    const totalMB = Math.round(memUsage.heapTotal / 1024 / 1024);
    
    return {
      status: usedMB < 500, // Consider unhealthy if using more than 500MB
      details: {
        used: `${usedMB}MB`,
        total: `${totalMB}MB`,
        percentage: Math.round((usedMB / totalMB) * 100)
      }
    };
  }

  private checkUptime() {
    const uptimeSeconds = process.uptime();
    return {
      status: true,
      details: {
        uptime: `${Math.floor(uptimeSeconds)}s`,
        uptimeHuman: this.formatUptime(uptimeSeconds)
      }
    };
  }

  private formatUptime(seconds: number): string {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    return `${hours}h ${minutes}m ${secs}s`;
  }

  startPeriodicHealthChecks(intervalMs: number = 30000) {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
    }

    healthLogger.info('Starting periodic health checks', { intervalMs });
    
    this.healthCheckInterval = setInterval(async () => {
      try {
        await this.performHealthCheck();
      } catch (error: any) {
        healthLogger.error('Periodic health check failed', { error: error.message });
      }
    }, intervalMs);
  }

  stopPeriodicHealthChecks() {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
      this.healthCheckInterval = undefined;
      healthLogger.info('Stopped periodic health checks');
    }
  }
}