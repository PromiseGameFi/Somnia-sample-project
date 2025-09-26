import axios, { AxiosInstance } from 'axios';
import { getCurrentNetwork } from '../config/network';
import { logger } from '../utils/logger';

export interface TransactionData {
  hash: string;
  blockNumber: number;
  from: string;
  to: string;
  value: string;
  gasUsed: string;
  status: string;
  timestamp: string;
}

export interface BlockData {
  number: number;
  hash: string;
  timestamp: number;
  transactions: string[];
  gasUsed: string;
  gasLimit: string;
  miner: string;
}

export class SomniaExplorerService {
  private api: AxiosInstance;
  private network = getCurrentNetwork();

  constructor() {
    this.api = axios.create({
      baseURL: this.network.explorerApiUrl,
      timeout: 10000,
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Somnia-Explorer-Client/1.0',
        'Cache-Control': 'no-cache' // Ensure fresh data for health checks
      }
    });

    // Add request interceptor for comprehensive logging
    this.api.interceptors.request.use(
      (config) => {
        logger.info('Somnia Explorer API Request', {
          method: config.method?.toUpperCase(),
          url: config.url,
          baseURL: config.baseURL,
          timestamp: new Date().toISOString(),
          network: this.network.name
        });
        return config;
      },
      (error) => {
        logger.error('Somnia Explorer API Request Error', {
          error: error.message,
          timestamp: new Date().toISOString(),
          network: this.network.name
        });
        return Promise.reject(error);
      }
    );

    // Add response interceptor for logging
    this.api.interceptors.response.use(
      (response) => {
        logger.info('Somnia Explorer API Response', {
          status: response.status,
          url: response.config.url,
          responseTime: response.headers['x-response-time'] || 'unknown',
          timestamp: new Date().toISOString(),
          network: this.network.name
        });
        return response;
      },
      (error) => {
        logger.error('Somnia Explorer API Response Error', {
          status: error.response?.status,
          statusText: error.response?.statusText,
          url: error.config?.url,
          message: error.message,
          timestamp: new Date().toISOString(),
          network: this.network.name
        });
        return Promise.reject(error);
      }
    );
  }

  async getTransaction(txHash: string): Promise<TransactionData | null> {
    try {
      const response = await this.api.get(`/v2/transactions/${txHash}`);
      logger.info('Successfully retrieved transaction', {
        txHash,
        blockNumber: response.data.block,
        network: this.network.name
      });
      return response.data;
    } catch (error: any) {
      logger.error('Failed to fetch transaction', {
        txHash,
        error: error.message,
        network: this.network.name
      });
      return null;
    }
  }

  async getBlock(blockNumber: number): Promise<BlockData | null> {
    try {
      const response = await this.api.get(`/v2/blocks/${blockNumber}`);
      logger.info('Successfully retrieved block', {
        blockNumber,
        hash: response.data.hash,
        txCount: response.data.tx_count,
        network: this.network.name
      });
      return response.data;
    } catch (error: any) {
      logger.error('Failed to fetch block', {
        blockNumber,
        error: error.message,
        network: this.network.name
      });
      return null;
    }
  }

  async getAddressTransactions(address: string, page = 1, limit = 20): Promise<TransactionData[]> {
    try {
      const response = await this.api.get(`/v2/addresses/${address}/transactions`, {
        params: { page, limit }
      });
      logger.info('Retrieved address transactions', {
        address,
        count: response.data.items?.length || 0,
        page,
        limit,
        network: this.network.name
      });
      return response.data.items || [];
    } catch (error: any) {
      logger.error('Failed to fetch address transactions', {
        address,
        error: error.message,
        network: this.network.name
      });
      return [];
    }
  }

  async getLatestBlocks(limit = 10): Promise<BlockData[]> {
    try {
      const response = await this.api.get('/v2/blocks', {
        params: { limit }
      });
      logger.info('Retrieved latest blocks', {
        count: response.data.items?.length || 0,
        limit,
        network: this.network.name
      });
      return response.data.items || [];
    } catch (error: any) {
      logger.error('Failed to fetch latest blocks', {
        error: error.message,
        network: this.network.name
      });
      return [];
    }
  }
}