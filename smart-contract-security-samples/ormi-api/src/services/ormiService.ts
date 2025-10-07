import axios, { AxiosInstance, InternalAxiosRequestConfig } from 'axios';
import { ormiApiLogger, logApiPerformance, logBlockchainEvent } from '../utils/logger';

// Extend the Axios config to include metadata
declare module 'axios' {
  interface InternalAxiosRequestConfig {
    metadata?: {
      startTime: number;
      operation: string;
    };
  }
}

// Type definitions for ORMI API responses
export interface TokenBalance {
  balance: string;
  contract: {
    address: string;
    decimals: number;
    erc_type: string;
    logoUri: string | null;
    name: string;
    symbol: string;
  };
  raw_balance: string;
}

export interface BalanceResponse {
  erc20TokenBalances: TokenBalance[];
  resultCount: number;
}

export interface OrmiApiResponse<T = any> {
  data: T;
  status: number;
  responseTime: number;
  success: boolean;
}

export interface OrmiApiError {
  message: string;
  status: number;
  code?: string;
  details?: any;
}

export class OrmiService {
  private client: AxiosInstance;
  private apiKey: string;
  private baseURL: string;
  private serviceName = 'ORMI-API';

  constructor(apiKey: string, baseURL?: string) {
    this.apiKey = apiKey;
    this.baseURL = baseURL || 'https://api.subgraph.somnia.network/public_api/data_api';
    
    this.client = axios.create({
      baseURL: this.baseURL,
      timeout: parseInt(process.env.API_TIMEOUT || '10000'),
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`,
        'User-Agent': 'ORMI-API-Demo/1.0'
      }
    });

    this.setupInterceptors();
    ormiApiLogger.info('ORMI Service initialized', { baseURL: this.baseURL });
  }

  private setupInterceptors() {
    // Request logging and timing
    this.client.interceptors.request.use(
      (config: InternalAxiosRequestConfig) => {
        const startTime = Date.now();
        const operation = this.extractOperationFromUrl(config.url || '');
        config.metadata = { startTime, operation };
        
        ormiApiLogger.info('ORMI API Request', {
          service: this.serviceName,
          method: config.method?.toUpperCase(),
          url: config.url,
          operation,
          headers: {
            'Content-Type': config.headers['Content-Type'],
            'Authorization': config.headers['Authorization'] ? '[REDACTED]' : undefined
          }
        });

        return config;
      },
      (error) => {
        ormiApiLogger.error('ORMI API Request Error', { error: error.message });
        return Promise.reject(error);
      }
    );

    // Response logging and performance tracking
    this.client.interceptors.response.use(
      (response) => {
        const config = response.config as InternalAxiosRequestConfig;
        const responseTime = Date.now() - (config.metadata?.startTime || 0);
        const operation = config.metadata?.operation || 'unknown';

        ormiApiLogger.info('ORMI API Response', {
          service: this.serviceName,
          method: config.method?.toUpperCase(),
          url: config.url,
          status: response.status,
          responseTime: `${responseTime}ms`,
          operation,
          dataSize: JSON.stringify(response.data).length
        });

        // Log performance metrics
        logApiPerformance(operation, responseTime, true, {
          status: response.status,
          dataSize: JSON.stringify(response.data).length
        });

        return response;
      },
      (error) => {
        const config = error.config as InternalAxiosRequestConfig;
        const responseTime = Date.now() - (config?.metadata?.startTime || 0);
        const operation = config?.metadata?.operation || 'unknown';

        ormiApiLogger.error('ORMI API Response Error', {
          service: this.serviceName,
          method: config?.method?.toUpperCase(),
          url: config?.url,
          status: error.response?.status,
          responseTime: `${responseTime}ms`,
          operation,
          error: error.message,
          errorCode: error.code
        });

        // Log performance metrics for failed requests
        logApiPerformance(operation, responseTime, false, {
          status: error.response?.status,
          error: error.message
        });

        return Promise.reject(error);
      }
    );
  }

  private extractOperationFromUrl(url: string): string {
    if (url.includes('/balance/erc20')) return 'get-erc20-balances';
    if (url.includes('/balance/')) return 'get-balance';
    if (url.includes('/transaction/')) return 'get-transaction';
    if (url.includes('/block/')) return 'get-block';
    return 'unknown-operation';
  }

  /**
   * Get ERC20 token balances for a wallet address
   * @param walletAddress - The wallet address to query
   * @returns Promise with token balances or null if error
   */
  async getERC20Balances(walletAddress: string): Promise<OrmiApiResponse<BalanceResponse> | null> {
    try {
      if (!this.isValidAddress(walletAddress)) {
        throw new Error('Invalid wallet address format');
      }

      const startTime = Date.now();
      const endpoint = `/somnia/v1/address/${walletAddress}/balance/erc20`;
      
      ormiApiLogger.info('Fetching ERC20 balances', { walletAddress, endpoint });
      
      const response = await this.client.get<BalanceResponse>(endpoint);
      const responseTime = Date.now() - startTime;

      logBlockchainEvent('erc20-balances-fetched', {
        walletAddress,
        tokenCount: response.data.resultCount,
        responseTime
      });

      return {
        data: response.data,
        status: response.status,
        responseTime,
        success: true
      };
    } catch (error: any) {
      return this.handleError(error, 'getERC20Balances');
    }
  }

  /**
   * Health check for ORMI API connectivity
   * @returns Promise with health status
   */
  async healthCheck(): Promise<OrmiApiResponse<any> | null> {
    try {
      const startTime = Date.now();
      // Use a simple endpoint for health checking
      const testAddress = '0x0000000000000000000000000000000000000000';
      const endpoint = `/somnia/v1/address/${testAddress}/balance/erc20`;
      
      const response = await this.client.get(endpoint);
      const responseTime = Date.now() - startTime;

      return {
        data: { healthy: true, service: 'ORMI API' },
        status: response.status,
        responseTime,
        success: true
      };
    } catch (error: any) {
      return this.handleError(error, 'healthCheck');
    }
  }

  /**
   * Validate Ethereum address format
   * @param address - Address to validate
   * @returns boolean indicating if address is valid
   */
  private isValidAddress(address: string): boolean {
    return /^0x[a-fA-F0-9]{40}$/.test(address);
  }

  /**
   * Handle API errors consistently
   * @param error - The error object
   * @param operation - The operation that failed
   * @returns null (indicating failure)
   */
  private handleError(error: any, operation: string): null {
    const errorInfo: OrmiApiError = {
      message: error.message || 'Unknown error',
      status: error.response?.status || 500,
      code: error.code,
      details: error.response?.data
    };

    ormiApiLogger.error(`ORMI API ${operation} failed`, {
      operation,
      error: errorInfo,
      stack: error.stack
    });

    return null;
  }

  /**
   * Get service configuration info
   * @returns Service configuration
   */
  getServiceInfo() {
    return {
      serviceName: this.serviceName,
      baseURL: this.baseURL,
      hasApiKey: !!this.apiKey,
      timeout: this.client.defaults.timeout
    };
  }
}