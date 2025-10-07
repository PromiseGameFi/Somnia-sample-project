/**
 * ORMI API Client
 * Production-ready API client with interceptors, authentication, retry logic, and performance monitoring
 * Designed for Somnia Testnet with MultiStream BFT consensus
 */

import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse, AxiosError } from 'axios';
import { logger, ormiLogger } from '../utils/logger';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Type definitions for ORMI API responses
export interface OrmiApiConfig {
  baseURL: string;
  apiKey: string;
  timeout: number;
  maxRetries: number;
  retryDelay: number;
}

export interface ERC20Balance {
  tokenAddress: string;
  tokenName: string;
  tokenSymbol: string;
  balance: string;
  decimals: number;
  valueInSTT?: string; // Somnia Token equivalent
  valueInUSD?: string;
  lastUpdated?: string;
}

export interface ERC20BalanceResponse {
  success: boolean;
  balances: ERC20Balance[];
  totalValueSTT?: string;
  totalValueUSD?: string;
  walletAddress: string;
  timestamp: string;
}

export interface ApiMetrics {
  requestCount: number;
  errorCount: number;
  successCount: number;
  averageResponseTime: number;
  lastRequestTime: Date;
  rateLimitRemaining?: number;
  rateLimitReset?: Date;
  errorRate: number;
  uptimePercentage: number;
}

export interface RetryConfig {
  maxRetries: number;
  retryDelay: number;
  exponentialBackoff: boolean;
  retryCondition: (error: AxiosError) => boolean;
}

// Extend AxiosRequestConfig to include metadata
declare module 'axios' {
  interface AxiosRequestConfig {
    metadata?: {
      startTime: number;
      retryCount?: number;
      requestId?: string;
    };
  }
}

/**
 * Enterprise-grade ORMI API Client
 * Features: Authentication, Retry Logic, Performance Monitoring, Rate Limiting
 */
class OrmiApiClient {
  private client: AxiosInstance;
  private config: OrmiApiConfig;
  private metrics: ApiMetrics;
  private retryCount: Map<string, number> = new Map();
  private rateLimitInfo: { remaining: number; reset: Date } | null = null;
  private requestQueue: Array<() => Promise<any>> = [];
  private isProcessingQueue = false;

  constructor(config: OrmiApiConfig) {
    this.config = config;
    this.metrics = {
      requestCount: 0,
      errorCount: 0,
      successCount: 0,
      averageResponseTime: 0,
      lastRequestTime: new Date(),
      errorRate: 0,
      uptimePercentage: 100
    };

    // Create axios instance with base configuration
    this.client = axios.create({
      baseURL: config.baseURL,
      timeout: config.timeout,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'User-Agent': 'ORMI-Client/1.0.0 (Somnia-Testnet; MultiStream-BFT)',
        'X-Client-Version': '1.0.0',
        'X-Network': 'somnia-testnet'
      }
    });

    this.setupInterceptors();
    this.startMetricsCollection();
  }

  /**
   * Setup request and response interceptors
   */
  private setupInterceptors(): void {
    // Request interceptor for authentication, logging, and rate limiting
    this.client.interceptors.request.use(
      async (config) => {
        const startTime = Date.now();
        const requestId = this.generateRequestId();
        
        // Add metadata for tracking
        config.metadata = { startTime, requestId };
        
        // Add Bearer token authentication
        if (this.config.apiKey) {
          config.headers.Authorization = `Bearer ${this.config.apiKey}`;
        }
        
        // Check rate limiting
        if (this.isRateLimited()) {
          ormiLogger.rateLimit(
            this.rateLimitInfo?.remaining || 0,
            this.rateLimitInfo?.reset || new Date(),
            true
          );
          
          // Queue the request if rate limited
          return new Promise((resolve) => {
            this.requestQueue.push(() => {
              resolve(config);
              return Promise.resolve(config);
            });
            this.processQueue();
          });
        }
        
        // Log request initiation
        ormiLogger.apiRequest(
          config.url || 'unknown',
          config.method?.toUpperCase() || 'GET',
          config.headers,
          config.data
        );
        
        // Update metrics
        this.metrics.requestCount++;
        this.metrics.lastRequestTime = new Date();
        
        return config;
      },
      (error) => {
        logger.error('ORMI API Request Configuration Error', {
          error: error.message,
          stack: error.stack
        });
        return Promise.reject(error);
      }
    );

    // Response interceptor for logging, metrics, and error handling
    this.client.interceptors.response.use(
      (response: AxiosResponse) => {
        const endTime = Date.now();
        const startTime = response.config.metadata?.startTime || endTime;
        const responseTime = endTime - startTime;
        const requestId = response.config.metadata?.requestId;
        
        // Update metrics
        this.updateSuccessMetrics(responseTime);
        
        // Extract and store rate limit information
        this.extractRateLimitInfo(response.headers);
        
        // Log successful response
        ormiLogger.apiResponse(
          response.config.url || 'unknown',
          response.status,
          responseTime,
          JSON.stringify(response.data).length
        );
        
        // Log performance metrics
        ormiLogger.performance('response_time', responseTime, 'ms', {
          endpoint: response.config.url,
          requestId,
          statusCode: response.status
        });
        
        return response;
      },
      async (error: AxiosError) => {
        const endTime = Date.now();
        const config = error.config;
        const startTime = config?.metadata?.startTime || endTime;
        const responseTime = endTime - startTime;
        const requestId = config?.metadata?.requestId;
        
        // Update error metrics
        this.updateErrorMetrics();
        
        // Extract rate limit info even from error responses
        if (error.response?.headers) {
          this.extractRateLimitInfo(error.response.headers);
        }
        
        const endpoint = config?.url || 'unknown';
        const statusCode = error.response?.status;
        
        // Implement retry logic for recoverable errors
        if (this.shouldRetry(error) && config) {
          const retryKey = `${config.method}-${endpoint}`;
          const currentRetries = this.retryCount.get(retryKey) || 0;
          
          if (currentRetries < this.config.maxRetries) {
            this.retryCount.set(retryKey, currentRetries + 1);
            
            // Log retry attempt
            ormiLogger.retry(
              currentRetries + 1,
              this.config.maxRetries,
              endpoint,
              error.message
            );
            
            // Calculate delay with exponential backoff
            const delay = this.calculateRetryDelay(currentRetries);
            await this.delay(delay);
            
            // Update metadata for retry
            config.metadata = {
              ...config.metadata,
              retryCount: currentRetries + 1,
              startTime: Date.now()
            };
            
            return this.client.request(config);
          } else {
            // Max retries reached
            this.retryCount.delete(retryKey);
            logger.error('ORMI API Max Retries Exceeded', {
              endpoint,
              maxRetries: this.config.maxRetries,
              finalError: error.message
            });
          }
        }
        
        // Log error response
        ormiLogger.apiResponse(
          endpoint,
          statusCode || 0,
          responseTime,
          error.response?.data ? JSON.stringify(error.response.data).length : 0,
          error.message
        );
        
        // Enhanced error logging
        logger.error('ORMI API Request Failed', {
          endpoint,
          method: config?.method?.toUpperCase(),
          statusCode,
          message: error.message,
          responseData: error.response?.data,
          requestId,
          responseTime: `${responseTime}ms`,
          retryCount: config?.metadata?.retryCount || 0
        });
        
        return Promise.reject(this.enhanceError(error));
      }
    );
  }

  /**
   * Get ERC20 token balances for a wallet address
   */
  async getERC20Balances(walletAddress: string): Promise<ERC20BalanceResponse> {
    try {
      // Validate wallet address format
      if (!this.isValidEthereumAddress(walletAddress)) {
        throw new Error('Invalid Ethereum wallet address format');
      }

      const response = await this.client.get(
        `/somnia/v1/address/${walletAddress}/balance/erc20`
      );
      
      const balances: ERC20Balance[] = response.data.balances || [];
      
      // Calculate total values
      const totalValueSTT = balances.reduce((total, token) => {
        const value = parseFloat(token.valueInSTT || '0');
        return (parseFloat(total) + value).toString();
      }, '0');
      
      const result: ERC20BalanceResponse = {
        success: true,
        balances,
        totalValueSTT,
        walletAddress,
        timestamp: new Date().toISOString()
      };
      
      // Log successful balance retrieval
      ormiLogger.erc20Balance(
        walletAddress,
        balances.length,
        totalValueSTT,
        balances
      );
      
      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      logger.error('Failed to fetch ERC20 balances', {
        walletAddress: this.maskAddress(walletAddress),
        error: errorMessage,
        timestamp: new Date().toISOString()
      });
      
      throw new Error(`ERC20 balance retrieval failed: ${errorMessage}`);
    }
  }

  /**
   * Get current API metrics
   */
  getMetrics(): ApiMetrics {
    // Calculate current error rate
    this.metrics.errorRate = this.metrics.requestCount > 0 
      ? (this.metrics.errorCount / this.metrics.requestCount) * 100 
      : 0;
    
    // Calculate uptime percentage
    this.metrics.uptimePercentage = this.metrics.requestCount > 0
      ? (this.metrics.successCount / this.metrics.requestCount) * 100
      : 100;
    
    return { ...this.metrics };
  }

  /**
   * Reset metrics (useful for monitoring intervals)
   */
  resetMetrics(): void {
    const previousMetrics = { ...this.metrics };
    
    this.metrics = {
      requestCount: 0,
      errorCount: 0,
      successCount: 0,
      averageResponseTime: 0,
      lastRequestTime: new Date(),
      errorRate: 0,
      uptimePercentage: 100
    };
    
    this.retryCount.clear();
    
    logger.info('ORMI API Metrics Reset', {
      previousMetrics,
      resetTime: new Date().toISOString()
    });
  }

  /**
   * Get rate limit information
   */
  getRateLimitInfo(): { remaining: number; reset: Date } | null {
    return this.rateLimitInfo;
  }

  /**
   * Check if client is currently rate limited
   */
  isRateLimited(): boolean {
    if (!this.rateLimitInfo) return false;
    
    const now = new Date();
    const isLimited = this.rateLimitInfo.remaining <= 0 && now < this.rateLimitInfo.reset;
    
    return isLimited;
  }

  // Private helper methods

  private generateRequestId(): string {
    return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private shouldRetry(error: AxiosError): boolean {
    // Retry on network errors, timeouts, and specific HTTP status codes
    return (
      !error.response || // Network error
      error.code === 'ECONNABORTED' || // Timeout
      error.code === 'ENOTFOUND' || // DNS error
      error.code === 'ECONNRESET' || // Connection reset
      (error.response.status >= 500 && error.response.status <= 599) || // Server errors
      error.response.status === 429 || // Rate limit
      error.response.status === 408 // Request timeout
    );
  }

  private calculateRetryDelay(retryCount: number): number {
    // Exponential backoff with jitter
    const baseDelay = this.config.retryDelay;
    const exponentialDelay = baseDelay * Math.pow(2, retryCount);
    const jitter = Math.random() * 1000; // Add up to 1 second of jitter
    
    return Math.min(exponentialDelay + jitter, 30000); // Cap at 30 seconds
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private updateSuccessMetrics(responseTime: number): void {
    this.metrics.successCount++;
    this.updateResponseMetrics(responseTime);
  }

  private updateErrorMetrics(): void {
    this.metrics.errorCount++;
  }

  private updateResponseMetrics(responseTime: number): void {
    const totalRequests = this.metrics.requestCount;
    const currentAverage = this.metrics.averageResponseTime;
    
    // Calculate new average response time
    this.metrics.averageResponseTime = 
      ((currentAverage * (totalRequests - 1)) + responseTime) / totalRequests;
  }

  private extractRateLimitInfo(headers: any): void {
    const remaining = headers['x-ratelimit-remaining'];
    const reset = headers['x-ratelimit-reset'];
    
    if (remaining !== undefined) {
      this.rateLimitInfo = {
        remaining: parseInt(remaining, 10),
        reset: reset ? new Date(parseInt(reset, 10) * 1000) : new Date(Date.now() + 60000)
      };
      
      // Update metrics
      this.metrics.rateLimitRemaining = this.rateLimitInfo.remaining;
      this.metrics.rateLimitReset = this.rateLimitInfo.reset;
      
      // Log rate limit status
      ormiLogger.rateLimit(
        this.rateLimitInfo.remaining,
        this.rateLimitInfo.reset,
        this.rateLimitInfo.remaining <= 10
      );
    }
  }

  private async processQueue(): Promise<void> {
    if (this.isProcessingQueue || this.requestQueue.length === 0) {
      return;
    }
    
    this.isProcessingQueue = true;
    
    while (this.requestQueue.length > 0 && !this.isRateLimited()) {
      const request = this.requestQueue.shift();
      if (request) {
        try {
          await request();
        } catch (error) {
          logger.error('Queued request failed', { error });
        }
      }
    }
    
    this.isProcessingQueue = false;
    
    // Schedule next queue processing if there are still items
    if (this.requestQueue.length > 0) {
      setTimeout(() => this.processQueue(), 1000);
    }
  }

  private isValidEthereumAddress(address: string): boolean {
    return /^0x[a-fA-F0-9]{40}$/.test(address);
  }

  private maskAddress(address: string): string {
    if (address.length < 10) return address;
    return `${address.substring(0, 6)}...${address.substring(address.length - 4)}`;
  }

  private enhanceError(error: AxiosError): Error {
    const enhanced = new Error(
      `ORMI API Error: ${error.message} (${error.response?.status || 'Network Error'})`
    );
    
    // Preserve original error properties
    (enhanced as any).originalError = error;
    (enhanced as any).statusCode = error.response?.status;
    (enhanced as any).responseData = error.response?.data;
    
    return enhanced;
  }

  private startMetricsCollection(): void {
    // Collect metrics every minute
    setInterval(() => {
      const metrics = this.getMetrics();
      
      ormiLogger.performance('error_rate', metrics.errorRate, '%', {
        totalRequests: metrics.requestCount,
        errorCount: metrics.errorCount
      });
      
      ormiLogger.performance('average_response_time', metrics.averageResponseTime, 'ms', {
        totalRequests: metrics.requestCount
      });
      
      ormiLogger.performance('uptime_percentage', metrics.uptimePercentage, '%', {
        successCount: metrics.successCount,
        totalRequests: metrics.requestCount
      });
    }, 60000); // Every minute
  }
}

// Export configured client instance
export const ormiClient = new OrmiApiClient({
  baseURL: process.env.ORMI_BASE_URL || 'https://api.subgraph.somnia.network',
  apiKey: process.env.ORMI_API_KEY || '',
  timeout: parseInt(process.env.API_TIMEOUT || '10000', 10),
  maxRetries: parseInt(process.env.MAX_RETRIES || '3', 10),
  retryDelay: parseInt(process.env.RETRY_DELAY || '1000', 10)
});

// Log client initialization
ormiLogger.system('startup', {
  component: 'ormi-api-client',
  baseURL: process.env.ORMI_BASE_URL,
  timeout: process.env.API_TIMEOUT,
  maxRetries: process.env.MAX_RETRIES
});

export default OrmiApiClient;