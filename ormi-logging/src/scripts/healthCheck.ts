/**
 * ORMI Health Check Script
 * Standalone script for quick health monitoring and system verification
 * Can be run independently or as part of CI/CD pipelines
 */

import { healthMonitor } from '../services/healthMonitor';
import { ormiClient } from '../services/ormiApiClient';
import { logger, ormiLogger } from '../utils/logger';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Health check configuration
interface HealthCheckConfig {
  timeout: number;
  verbose: boolean;
  exitOnFailure: boolean;
  outputFormat: 'console' | 'json' | 'minimal';
}

/**
 * Standalone Health Check Runner
 */
class HealthCheckRunner {
  private config: HealthCheckConfig;

  constructor(config: Partial<HealthCheckConfig> = {}) {
    this.config = {
      timeout: 30000,
      verbose: false,
      exitOnFailure: true,
      outputFormat: 'console',
      ...config
    };
  }

  /**
   * Run comprehensive health check
   */
  async runHealthCheck(): Promise<void> {
    const startTime = Date.now();
    
    try {
      if (this.config.outputFormat === 'console') {
        console.log('\n🏥 ORMI Health Check');
        console.log('====================\n');
      }

      // Validate environment
      await this.validateEnvironment();
      
      // Perform health checks
      const health = await Promise.race([
        healthMonitor.performHealthCheck(),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Health check timeout')), this.config.timeout)
        )
      ]) as any;

      // Get additional metrics
      const metrics = ormiClient.getMetrics();
      const rateLimitInfo = ormiClient.getRateLimitInfo();
      const uptime = healthMonitor.getUptimePercentage();
      const trend = healthMonitor.getHealthTrend();
      const alerts = healthMonitor.getAllAlerts().filter(a => !a.resolved);

      // Calculate check duration
      const checkDuration = Date.now() - startTime;

      // Create comprehensive health report
      const healthReport = {
        timestamp: new Date().toISOString(),
        checkDuration: `${checkDuration}ms`,
        overall: {
          status: health.overall,
          healthScore: health.healthScore,
          trend
        },
        services: health.services.map((service: any) => ({
          name: service.service,
          status: service.status,
          responseTime: `${service.responseTime}ms`,
          error: service.error || null,
          consecutiveFailures: service.consecutiveFailures || 0
        })),
        metrics: {
          api: {
            requestCount: metrics.requestCount,
            errorCount: metrics.errorCount,
            successCount: metrics.successCount,
            errorRate: `${metrics.errorRate.toFixed(2)}%`,
            averageResponseTime: `${metrics.averageResponseTime.toFixed(2)}ms`,
            uptimePercentage: `${metrics.uptimePercentage.toFixed(2)}%`
          },
          system: {
            uptime: `${uptime.toFixed(2)}%`,
            memoryUsage: this.formatMemoryUsage(process.memoryUsage()),
            nodeVersion: process.version,
            platform: process.platform
          },
          rateLimit: rateLimitInfo ? {
            remaining: rateLimitInfo.remaining,
            reset: rateLimitInfo.reset.toISOString(),
            isLimited: ormiClient.isRateLimited()
          } : null
        },
        alerts: {
          active: alerts.length,
          critical: alerts.filter(a => a.severity === 'critical').length,
          high: alerts.filter(a => a.severity === 'high').length,
          medium: alerts.filter(a => a.severity === 'medium').length,
          low: alerts.filter(a => a.severity === 'low').length
        },
        network: {
          name: 'somnia-testnet',
          consensus: 'multistream-bft',
          chainId: process.env.SOMNIA_CHAIN_ID || '2648'
        },
        environment: {
          nodeEnv: process.env.NODE_ENV || 'development',
          logLevel: process.env.LOG_LEVEL || 'info',
          apiTimeout: process.env.API_TIMEOUT || '10000'
        }
      };

      // Output results based on format
      this.outputResults(healthReport);

      // Log health check completion
      ormiLogger.healthCheck(health.overall, {
        checkDuration,
        serviceCount: health.services.length,
        alertCount: alerts.length,
        scriptRun: true
      });

      // Exit with appropriate code
      if (this.config.exitOnFailure && health.overall === 'unhealthy') {
        process.exit(1);
      }

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      logger.error('Health check script failed', {
        error: errorMessage,
        duration: `${Date.now() - startTime}ms`
      });

      if (this.config.outputFormat === 'json') {
        console.log(JSON.stringify({
          success: false,
          error: errorMessage,
          timestamp: new Date().toISOString()
        }, null, 2));
      } else {
        console.error(`\n❌ Health check failed: ${errorMessage}`);
      }

      if (this.config.exitOnFailure) {
        process.exit(1);
      }
    }
  }

  /**
   * Validate environment configuration
   */
  private async validateEnvironment(): Promise<void> {
    const required = ['ORMI_API_KEY', 'ORMI_BASE_URL'];
    const missing = required.filter(key => !process.env[key]);
    
    if (missing.length > 0) {
      throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
    }
    
    const apiKey = process.env.ORMI_API_KEY!;
    if (apiKey.length < 10 || apiKey === '<YOUR_ORMI_API_KEY>') {
      throw new Error('Invalid ORMI API key configuration');
    }

    if (this.config.verbose && this.config.outputFormat === 'console') {
      console.log('✅ Environment validation passed');
    }
  }

  /**
   * Output results in the specified format
   */
  private outputResults(healthReport: any): void {
    switch (this.config.outputFormat) {
      case 'json':
        console.log(JSON.stringify(healthReport, null, 2));
        break;
        
      case 'minimal':
        console.log(`${healthReport.overall.status}|${healthReport.overall.healthScore}|${healthReport.checkDuration}`);
        break;
        
      case 'console':
      default:
        this.outputConsoleResults(healthReport);
        break;
    }
  }

  /**
   * Output results in console format
   */
  private outputConsoleResults(healthReport: any): void {
    const { overall, services, metrics, alerts } = healthReport;
    
    // Overall status
    const statusEmoji = overall.status === 'healthy' ? '💚' : 
                       overall.status === 'degraded' ? '💛' : '❤️';
    
    console.log(`${statusEmoji} Overall Status: ${overall.status.toUpperCase()}`);
    console.log(`📊 Health Score: ${overall.healthScore}/100`);
    console.log(`📈 Trend: ${overall.trend}`);
    console.log(`⏱️  Check Duration: ${healthReport.checkDuration}\n`);

    // Service status
    console.log('🔍 Service Status:');
    services.forEach((service: any) => {
      const emoji = service.status === 'healthy' ? '✅' : 
                   service.status === 'degraded' ? '⚠️' : '❌';
      const failures = service.consecutiveFailures > 0 ? ` (${service.consecutiveFailures} failures)` : '';
      console.log(`   ${emoji} ${service.name}: ${service.status} (${service.responseTime})${failures}`);
      
      if (service.error && this.config.verbose) {
        console.log(`      Error: ${service.error}`);
      }
    });

    // API Metrics
    console.log('\n📊 API Metrics:');
    console.log(`   Requests: ${metrics.api.requestCount} (${metrics.api.successCount} success, ${metrics.api.errorCount} errors)`);
    console.log(`   Error Rate: ${metrics.api.errorRate}`);
    console.log(`   Avg Response Time: ${metrics.api.averageResponseTime}`);
    console.log(`   Uptime: ${metrics.api.uptimePercentage}`);

    // Rate Limiting
    if (metrics.rateLimit) {
      console.log('\n🚦 Rate Limiting:');
      console.log(`   Remaining: ${metrics.rateLimit.remaining}`);
      console.log(`   Reset: ${new Date(metrics.rateLimit.reset).toLocaleTimeString()}`);
      console.log(`   Limited: ${metrics.rateLimit.isLimited ? 'Yes' : 'No'}`);
    }

    // System Resources
    console.log('\n💻 System:');
    console.log(`   Memory: ${metrics.system.memoryUsage}`);
    console.log(`   Node: ${metrics.system.nodeVersion}`);
    console.log(`   Platform: ${metrics.system.platform}`);
    console.log(`   Uptime: ${metrics.system.uptime}`);

    // Alerts
    if (alerts.active > 0) {
      console.log('\n🚨 Active Alerts:');
      console.log(`   Total: ${alerts.active}`);
      if (alerts.critical > 0) console.log(`   🔴 Critical: ${alerts.critical}`);
      if (alerts.high > 0) console.log(`   🟠 High: ${alerts.high}`);
      if (alerts.medium > 0) console.log(`   🟡 Medium: ${alerts.medium}`);
      if (alerts.low > 0) console.log(`   🟢 Low: ${alerts.low}`);
    } else {
      console.log('\n✅ No active alerts');
    }

    // Network Info
    console.log('\n🌐 Network:');
    console.log(`   Name: ${healthReport.network.name}`);
    console.log(`   Consensus: ${healthReport.network.consensus}`);
    console.log(`   Chain ID: ${healthReport.network.chainId}`);

    // Environment
    if (this.config.verbose) {
      console.log('\n⚙️  Environment:');
      console.log(`   NODE_ENV: ${healthReport.environment.nodeEnv}`);
      console.log(`   LOG_LEVEL: ${healthReport.environment.logLevel}`);
      console.log(`   API_TIMEOUT: ${healthReport.environment.apiTimeout}ms`);
    }

    console.log(`\n🕐 Timestamp: ${healthReport.timestamp}`);
    
    // Summary
    if (overall.status === 'healthy') {
      console.log('\n🎉 All systems operational!');
    } else if (overall.status === 'degraded') {
      console.log('\n⚠️  Some issues detected, but system is functional.');
    } else {
      console.log('\n🚨 Critical issues detected! Immediate attention required.');
    }
  }

  /**
   * Format memory usage for display
   */
  private formatMemoryUsage(memUsage: NodeJS.MemoryUsage): string {
    const used = (memUsage.heapUsed / 1024 / 1024).toFixed(2);
    const total = (memUsage.heapTotal / 1024 / 1024).toFixed(2);
    const percent = ((memUsage.heapUsed / memUsage.heapTotal) * 100).toFixed(1);
    return `${used}MB / ${total}MB (${percent}%)`;
  }
}

/**
 * Parse command line arguments
 */
function parseArgs(): Partial<HealthCheckConfig> {
  const args = process.argv.slice(2);
  const config: Partial<HealthCheckConfig> = {};
  
  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case '--verbose':
      case '-v':
        config.verbose = true;
        break;
      case '--json':
        config.outputFormat = 'json';
        break;
      case '--minimal':
        config.outputFormat = 'minimal';
        break;
      case '--no-exit':
        config.exitOnFailure = false;
        break;
      case '--timeout':
        const timeoutArg = args[++i];
        config.timeout = timeoutArg ? parseInt(timeoutArg, 10) || 30000 : 30000;
        break;
      case '--help':
      case '-h':
        console.log(`
ORMI Health Check Script

Usage: npm run health-check [options]

Options:
  --verbose, -v     Show detailed output
  --json           Output results in JSON format
  --minimal        Output minimal status (status|score|duration)
  --no-exit        Don't exit with error code on failure
  --timeout <ms>   Set timeout in milliseconds (default: 30000)
  --help, -h       Show this help message

Examples:
  npm run health-check
  npm run health-check -- --verbose
  npm run health-check -- --json
  npm run health-check -- --minimal --no-exit
`);
        process.exit(0);
    }
  }
  
  return config;
}

/**
 * Main execution function
 */
async function main(): Promise<void> {
  const config = parseArgs();
  const healthChecker = new HealthCheckRunner(config);
  await healthChecker.runHealthCheck();
}

// Run health check if this file is executed directly
if (require.main === module) {
  main().catch((error) => {
    console.error('Health check script execution failed:', error.message);
    process.exit(1);
  });
}

export { HealthCheckRunner, main as runHealthCheck };
export default HealthCheckRunner;