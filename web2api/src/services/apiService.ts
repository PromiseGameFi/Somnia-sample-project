import axios, { AxiosInstance, AxiosRequestConfig, InternalAxiosRequestConfig } from 'axios';
import { logger } from '../utils/logger';

// Extend the Axios config to include metadata
declare module 'axios' {
  interface InternalAxiosRequestConfig {
    metadata?: {
      startTime: number;
    };
  }
}

export interface ApiResponse<T = any> {
  data: T;
  status: number;
  responseTime: number;
}

export class ApiService {
  private client: AxiosInstance;
  private serviceName: string;

  constructor(baseURL: string, serviceName: string, apiKey?: string) {
    this.serviceName = serviceName;
    this.client = axios.create({
      baseURL,
      timeout: 10000,
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Web2-API-Demo/1.0',
        ...(apiKey && { 'Authorization': `Bearer ${apiKey}` })
      }
    });

    this.setupInterceptors();
  }

  private setupInterceptors() {
    // Request logging
    this.client.interceptors.request.use(
      (config: InternalAxiosRequestConfig) => {
        const startTime = Date.now();
        config.metadata = { startTime };
        
        logger.info('API Request', {
          service: this.serviceName,
          method: config.method?.toUpperCase(),
          url: config.url,
          baseURL: config.baseURL
        });
        return config;
      },
      (error) => {
        logger.error('API Request Error', {
          service: this.serviceName,
          error: error.message
        });
        return Promise.reject(error);
      }
    );

    // Response logging
    this.client.interceptors.response.use(
      (response) => {
        const responseTime = Date.now() - (response.config.metadata?.startTime || Date.now());
        
        logger.info('API Response', {
          service: this.serviceName,
          status: response.status,
          url: response.config.url,
          responseTime: `${responseTime}ms`
        });
        
        return response;
      },
      (error) => {
        const responseTime = error.config?.metadata?.startTime 
          ? Date.now() - error.config.metadata.startTime 
          : 0;

        logger.error('API Response Error', {
          service: this.serviceName,
          status: error.response?.status,
          url: error.config?.url,
          responseTime: `${responseTime}ms`,
          message: error.message
        });
        
        return Promise.reject(error);
      }
    );
  }

  async get<T>(endpoint: string): Promise<ApiResponse<T> | null> {
    try {
      const startTime = Date.now();
      const response = await this.client.get(endpoint);
      const responseTime = Date.now() - startTime;
      
      return {
        data: response.data,
        status: response.status,
        responseTime
      };
    } catch (error: any) {
      logger.error(`${this.serviceName} GET request failed`, {
        endpoint,
        error: error.message
      });
      return null;
    }
  }

  async post<T>(endpoint: string, data: any): Promise<ApiResponse<T> | null> {
    try {
      const startTime = Date.now();
      const response = await this.client.post(endpoint, data);
      const responseTime = Date.now() - startTime;
      
      return {
        data: response.data,
        status: response.status,
        responseTime
      };
    } catch (error: any) {
      logger.error(`${this.serviceName} POST request failed`, {
        endpoint,
        error: error.message
      });
      return null;
    }
  }
}