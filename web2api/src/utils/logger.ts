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
      service: service || 'web2-api-demo',
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
  
  // API-specific logs
  logger.add(new winston.transports.File({
    filename: path.join('logs', 'api.log'),
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
  
  // Exception and rejection handlers
  logger.add(new winston.transports.File({ filename: path.join('logs', 'exceptions.log') }));
  logger.add(new winston.transports.File({ filename: path.join('logs', 'rejections.log') }));
} catch (error) {
  console.warn('Could not initialize file logging:', error);
}

// Specialized loggers
export const apiLogger = logger.child({ component: 'api' });
export const healthLogger = logger.child({ component: 'health' });
export const securityLogger = logger.child({ component: 'security' });