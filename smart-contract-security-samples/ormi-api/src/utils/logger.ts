import winston from 'winston';
import path from 'path';

const logFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.json(),
  winston.format.printf(({ timestamp, level, message, service, ...meta }) => {
    return JSON.stringify({
      timestamp,
      level,
      message,
      service: service || 'ormi-api-demo',
      environment: process.env.NODE_ENV || 'development',
      ...meta
    });
  })
);

export const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: logFormat,
  transports: [
    // Console for development
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      )
    })
  ],
  
  handleExceptions: true,
  handleRejections: true
});

// Add file transports only if logs directory exists
try {
  // All logs
  logger.add(new winston.transports.File({
    filename: path.join('logs', 'app.log'),
    maxsize: 5242880, // 5MB
    maxFiles: 5
  }));
  
  // ORMI API-specific logs
  logger.add(new winston.transports.File({
    filename: path.join('logs', 'ormi-api.log'),
    level: 'info',
    maxsize: 5242880,
    maxFiles: 3
  }));
  
  // Error logs
  logger.add(new winston.transports.File({
    filename: path.join('logs', 'error.log'),
    level: 'error',
    maxsize: 5242880,
    maxFiles: 3
  }));
  
  // Health check logs
  logger.add(new winston.transports.File({
    filename: path.join('logs', 'health.log'),
    level: 'info',
    maxsize: 5242880,
    maxFiles: 2
  }));
  
  // Exception and rejection handlers
  logger.add(new winston.transports.File({ filename: path.join('logs', 'exceptions.log') }));
  logger.add(new winston.transports.File({ filename: path.join('logs', 'rejections.log') }));
} catch (error) {
  console.warn('Could not initialize file logging:', error);
}

// Specialized loggers for different components
export const ormiApiLogger = logger.child({ component: 'ormi-api' });
export const healthLogger = logger.child({ component: 'health' });
export const securityLogger = logger.child({ component: 'security' });
export const blockchainLogger = logger.child({ component: 'blockchain' });
export const performanceLogger = logger.child({ component: 'performance' });

// Helper function to log API performance metrics
export const logApiPerformance = (operation: string, duration: number, success: boolean, metadata?: any) => {
  performanceLogger.info('API Performance Metric', {
    operation,
    duration,
    success,
    ...metadata
  });
};

// Helper function to log blockchain-specific events
export const logBlockchainEvent = (event: string, data: any) => {
  blockchainLogger.info('Blockchain Event', {
    event,
    data
  });
};