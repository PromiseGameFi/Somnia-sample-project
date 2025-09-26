import winston from 'winston';
import path from 'path';

// Custom log format for Somnia applications
const somniaLogFormat = winston.format.combine(
  winston.format.timestamp({
    format: 'YYYY-MM-DD HH:mm:ss'
  }),
  winston.format.errors({ stack: true }),
  winston.format.json(),
  winston.format.printf(({ timestamp, level, message, ...meta }) => {
    return JSON.stringify({
      timestamp,
      level,
      message,
      service: 'somnia-explorer-client',
      network: process.env.NODE_ENV === 'production' ? 'mainnet' : 'testnet',
      ...meta
    });
  })
);

// Create logger instance with Somnia-specific configuration
export const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: somniaLogFormat,
  defaultMeta: {
    service: 'somnia-explorer-integration',
    version: '1.0.0',
    chain: 'somnia'
  },
  transports: [
    // Console transport for development
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      )
    }),
    
    // File transport for all logs
    new winston.transports.File({
      filename: path.join('logs', 'somnia-explorer.log'),
      maxsize: 5242880, // 5MB
      maxFiles: 5
    }),
    
    // Separate file for API-specific logs
    new winston.transports.File({
      filename: path.join('logs', 'api-requests.log'),
      level: 'info',
      maxsize: 5242880,
      maxFiles: 3,
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json()
      )
    }),
    
    // Separate file for errors
    new winston.transports.File({
      filename: path.join('logs', 'error.log'),
      level: 'error',
      maxsize: 5242880,
      maxFiles: 3
    })
  ],
  
  // Handle uncaught exceptions
  exceptionHandlers: [
    new winston.transports.File({
      filename: path.join('logs', 'exceptions.log')
    })
  ],
  
  // Handle unhandled promise rejections
  rejectionHandlers: [
    new winston.transports.File({
      filename: path.join('logs', 'rejections.log')
    })
  ]
});

// Create specialized loggers for different components
export const apiLogger = logger.child({ component: 'api' });
export const explorerLogger = logger.child({ component: 'explorer' });
export const healthLogger = logger.child({ component: 'health' });