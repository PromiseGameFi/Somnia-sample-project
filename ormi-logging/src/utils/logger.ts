/**
 * ORMI API Logging System
 * Enterprise-grade Winston logging with ORMI-specific formatters
 * Supports structured JSON output, multiple transports, and performance metrics
 */

import winston from 'winston';
import path from 'path';
import fs from 'fs';

// Ensure logs directory exists
const logsDir = path.join(process.cwd(), 'logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

// ORMI-specific data interface
export interface OrmiLogData {
  endpoint?: string;
  method?: string;
  statusCode?: number;
  responseTime?: string;
  dataSize?: string;
  success?: boolean;
  hasAuth?: boolean;
  timestamp?: string;
  walletAddress?: string;
  tokenCount?: number;
  totalValue?: string;
  network?: string;
  healthStatus?: 'healthy' | 'unhealthy' | 'degraded';
  checkTime?: string;
  details?: any;
  errorRate?: string;
  totalRequests?: number;
  averageResponseTime?: string;
  rateLimitRemaining?: number;
}

// Custom log levels for ORMI operations
const customLevels = {
  levels: {
    error: 0,
    warn: 1,
    info: 2,
    http: 3,
    verbose: 4,
    debug: 5,
    silly: 6
  },
  colors: {
    error: 'red',
    warn: 'yellow',
    info: 'green',
    http: 'magenta',
    verbose: 'cyan',
    debug: 'blue',
    silly: 'grey'
  }
};

// Add colors to winston
winston.addColors(customLevels.colors);

// ORMI-specific log formatter with enhanced structure
const ormiLogFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss.SSS' }),
  winston.format.errors({ stack: true }),
  winston.format.json(),
  winston.format.printf(({ timestamp, level, message, service, ormiData, ...meta }) => {
    const logEntry = {
      timestamp,
      level: level.toUpperCase(),
      message,
      service: service || 'ormi-api-client',
      environment: process.env.NODE_ENV || 'development',
      network: 'somnia-testnet',
      consensus: 'multistream-bft',
      version: '1.0.0',
      ormiData: ormiData || null,
      ...meta
    };

    // Remove undefined/null values for cleaner logs
    Object.keys(logEntry).forEach(key => {
      const typedKey = key as keyof typeof logEntry;
      if (logEntry[typedKey] === null || logEntry[typedKey] === undefined) {
        delete (logEntry as any)[key];
      }
    });

    return JSON.stringify(logEntry, null, process.env.NODE_ENV === 'development' ? 2 : 0);
  })
);

// Development console formatter with colors and emojis
const consoleFormat = winston.format.combine(
  winston.format.colorize({ all: true }),
  winston.format.timestamp({ format: 'HH:mm:ss' }),
  winston.format.printf(({ timestamp, level, message, service, ormiData }) => {
    const emoji = getLogEmoji(level);
    const serviceTag = service ? `[${service}]` : '[ormi]';
    const ormiInfo = ormiData ? ` ${formatOrmiDataForConsole(ormiData)}` : '';
    return `${timestamp} ${emoji} ${serviceTag} ${level}: ${message}${ormiInfo}`;
  })
);

// Helper function to get emoji for log level
function getLogEmoji(level: string): string {
  const emojiMap: { [key: string]: string } = {
    error: '❌',
    warn: '⚠️',
    info: '💚',
    http: '🌐',
    verbose: '📝',
    debug: '🔍',
    silly: '🤪'
  };
  return emojiMap[level.toLowerCase()] || '📋';
}

// Helper function to format ORMI data for console output
function formatOrmiDataForConsole(ormiData: OrmiLogData): string {
  const parts: string[] = [];
  
  if (ormiData.endpoint) parts.push(`endpoint:${ormiData.endpoint}`);
  if (ormiData.statusCode) parts.push(`status:${ormiData.statusCode}`);
  if (ormiData.responseTime) parts.push(`time:${ormiData.responseTime}`);
  if (ormiData.healthStatus) parts.push(`health:${ormiData.healthStatus}`);
  if (ormiData.tokenCount !== undefined) parts.push(`tokens:${ormiData.tokenCount}`);
  
  return parts.length > 0 ? `(${parts.join(', ')})` : '';
}

// Create the main logger instance
export const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  levels: customLevels.levels,
  format: ormiLogFormat,
  defaultMeta: {
    service: 'ormi-api-client',
    network: 'somnia-testnet',
    pid: process.pid
  },
  transports: [
    // Console transport for development with colors and formatting
    new winston.transports.Console({
      format: process.env.NODE_ENV === 'production' ? ormiLogFormat : consoleFormat,
      level: process.env.NODE_ENV === 'production' ? 'warn' : 'debug'
    }),
    
    // Main application log file with rotation
    new winston.transports.File({
      filename: path.join(logsDir, 'ormi-api.log'),
      maxsize: 10485760, // 10MB
      maxFiles: 10,
      tailable: true,
      format: ormiLogFormat
    }),
    
    // Error-specific log file
    new winston.transports.File({
      filename: path.join(logsDir, 'ormi-errors.log'),
      level: 'error',
      maxsize: 5242880, // 5MB
      maxFiles: 5,
      format: ormiLogFormat
    }),
    
    // HTTP requests log file
    new winston.transports.File({
      filename: path.join(logsDir, 'ormi-http.log'),
      level: 'http',
      maxsize: 5242880, // 5MB
      maxFiles: 3,
      format: ormiLogFormat
    })
  ],
  
  // Handle uncaught exceptions and rejections
  exceptionHandlers: [
    new winston.transports.File({
      filename: path.join(logsDir, 'ormi-exceptions.log'),
      maxsize: 5242880,
      maxFiles: 2
    })
  ],
  
  rejectionHandlers: [
    new winston.transports.File({
      filename: path.join(logsDir, 'ormi-rejections.log'),
      maxsize: 5242880,
      maxFiles: 2
    })
  ]
});

// ORMI-specific logging helpers with enhanced functionality
export const ormiLogger = {
  /**
   * Log ORMI API request initiation
   */
  apiRequest: (endpoint: string, method: string, headers?: any, payload?: any) => {
    logger.http('ORMI API Request Initiated', {
      ormiData: {
        endpoint,
        method: method.toUpperCase(),
        hasAuth: !!headers?.Authorization,
        timestamp: new Date().toISOString(),
        payloadSize: payload ? JSON.stringify(payload).length : 0
      }
    });
  },
  
  /**
   * Log ORMI API response with performance metrics
   */
  apiResponse: (endpoint: string, statusCode: number, responseTime: number, dataSize?: number, error?: string) => {
    const isSuccess = statusCode >= 200 && statusCode < 300;
    const logLevel = isSuccess ? 'http' : 'warn';
    
    logger[logLevel]('ORMI API Response Received', {
      ormiData: {
        endpoint,
        statusCode,
        responseTime: `${responseTime}ms`,
        dataSize: dataSize ? `${dataSize} bytes` : 'unknown',
        success: isSuccess,
        error: error || null,
        performance: responseTime < 1000 ? 'fast' : responseTime < 3000 ? 'normal' : 'slow'
      }
    });
  },
  
  /**
   * Log health check results with detailed status
   */
  healthCheck: (status: 'healthy' | 'unhealthy' | 'degraded', details: any, serviceName?: string) => {
    const logLevel = status === 'healthy' ? 'info' : status === 'degraded' ? 'warn' : 'error';
    const emoji = status === 'healthy' ? '💚' : status === 'degraded' ? '💛' : '❤️';
    
    logger[logLevel](`${emoji} ORMI Health Check: ${status.toUpperCase()}`, {
      ormiData: {
        healthStatus: status,
        serviceName: serviceName || 'ormi-api',
        checkTime: new Date().toISOString(),
        details,
        network: 'somnia-testnet'
      }
    });
  },
  
  /**
   * Log ERC20 balance retrieval with privacy protection
   */
  erc20Balance: (walletAddress: string, tokenCount: number, totalValue?: string, tokens?: any[]) => {
    // Privacy protection: only log first 6 and last 4 characters of address
    const maskedAddress = `${walletAddress.substring(0, 6)}...${walletAddress.substring(walletAddress.length - 4)}`;
    
    logger.info('ERC20 Balance Retrieved Successfully', {
      ormiData: {
        walletAddress: maskedAddress,
        tokenCount,
        totalValue: totalValue || 'not calculated',
        network: 'somnia-testnet',
        hasTokens: tokenCount > 0,
        topTokens: tokens ? tokens.slice(0, 3).map(t => t.tokenSymbol) : []
      }
    });
  },
  
  /**
   * Log authentication events
   */
  auth: (event: 'success' | 'failure' | 'refresh', details?: any) => {
    const logLevel = event === 'success' ? 'info' : 'warn';
    const emoji = event === 'success' ? '🔐' : '🚫';
    
    logger[logLevel](`${emoji} ORMI Authentication ${event.toUpperCase()}`, {
      ormiData: {
        authEvent: event,
        timestamp: new Date().toISOString(),
        details: details || {}
      }
    });
  },
  
  /**
   * Log performance metrics
   */
  performance: (metric: string, value: number, unit: string, context?: any) => {
    logger.verbose('ORMI Performance Metric', {
      ormiData: {
        metric,
        value,
        unit,
        timestamp: new Date().toISOString(),
        context: context || {}
      }
    });
  },
  
  /**
   * Log rate limiting events
   */
  rateLimit: (remaining: number, resetTime: Date, isThrottled: boolean) => {
    const logLevel = isThrottled ? 'warn' : 'verbose';
    const emoji = isThrottled ? '🚦' : '✅';
    
    logger[logLevel](`${emoji} ORMI Rate Limit Status`, {
      ormiData: {
        rateLimitRemaining: remaining,
        resetTime: resetTime.toISOString(),
        isThrottled,
        timestamp: new Date().toISOString()
      }
    });
  },
  
  /**
   * Log retry attempts
   */
  retry: (attempt: number, maxAttempts: number, endpoint: string, reason: string) => {
    logger.warn(`🔄 ORMI API Retry Attempt ${attempt}/${maxAttempts}`, {
      ormiData: {
        retryAttempt: attempt,
        maxAttempts,
        endpoint,
        reason,
        timestamp: new Date().toISOString()
      }
    });
  },
  
  /**
   * Log system startup and shutdown events
   */
  system: (event: 'startup' | 'shutdown' | 'error', details?: any) => {
    const logLevel = event === 'error' ? 'error' : 'info';
    const emoji = event === 'startup' ? '🚀' : event === 'shutdown' ? '🛑' : '💥';
    
    logger[logLevel](`${emoji} ORMI System ${event.toUpperCase()}`, {
      ormiData: {
        systemEvent: event,
        timestamp: new Date().toISOString(),
        nodeVersion: process.version,
        platform: process.platform,
        details: details || {}
      }
    });
  }
};

// Export logger configuration for external use
export const loggerConfig = {
  levels: customLevels.levels,
  colors: customLevels.colors,
  logsDirectory: logsDir
};

// Initialize logger on module load
ormiLogger.system('startup', {
  logLevel: process.env.LOG_LEVEL || 'info',
  environment: process.env.NODE_ENV || 'development',
  logsDirectory: logsDir
});

// Graceful shutdown handler
process.on('SIGINT', () => {
  ormiLogger.system('shutdown', { signal: 'SIGINT' });
  process.exit(0);
});

process.on('SIGTERM', () => {
  ormiLogger.system('shutdown', { signal: 'SIGTERM' });
  process.exit(0);
});

export default logger;