import { ethers } from 'ethers';
import { getCurrentNetwork } from '../config/network';
import { SomniaExplorerService } from './somniaExplorerService';
import { healthLogger } from '../utils/logger';

export interface HealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: number;
  checks: {
    rpcConnection: boolean;
    explorerApi: boolean;
    latestBlock: boolean;
    explorerHealth: boolean;
    responseTime: number;
  };
  details: {
    chainId?: number;
    blockNumber?: number;
    networkName?: string;
    explorerVersion?: string;
    errors?: string[];
  };
}

export class SomniaHealthService {
  private provider: ethers.JsonRpcProvider;
  private explorerService: SomniaExplorerService;
  private network = getCurrentNetwork();

  constructor() {
    this.provider = new ethers.JsonRpcProvider(this.network.rpcUrl);
    this.explorerService = new SomniaExplorerService();
  }

  async performHealthCheck(): Promise<HealthStatus> {
    const startTime = Date.now();
    const errors: string[] = [];
    const checks = {
      rpcConnection: false,
      explorerApi: false,
      latestBlock: false,
      explorerHealth: false,
      responseTime: 0
    };
    
    let chainId: number | undefined;
    let blockNumber: number | undefined;
    let explorerVersion: string | undefined;

    try {
      // Test RPC connection to Somnia Network
      healthLogger.info('Testing Somnia RPC connection...');
      const network = await this.provider.getNetwork();
      chainId = Number(network.chainId);
      checks.rpcConnection = chainId === this.network.chainId;
      
      if (!checks.rpcConnection) {
        errors.push(`Chain ID mismatch: expected ${this.network.chainId}, got ${chainId}`);
      }
    } catch (error: any) {
      errors.push(`Somnia RPC connection failed: ${error.message}`);
      healthLogger.error('Somnia RPC connection test failed:', error);
    }

    try {
      // Test latest block retrieval from Somnia Network
      healthLogger.info('Testing latest block retrieval from Somnia...');
      blockNumber = await this.provider.getBlockNumber();
      checks.latestBlock = blockNumber > 0;
      
      if (!checks.latestBlock) {
        errors.push('Unable to retrieve latest block number from Somnia');
      }
    } catch (error: any) {
      errors.push(`Somnia block retrieval failed: ${error.message}`);
      healthLogger.error('Somnia block retrieval test failed:', error);
    }

    try {
      // Test Blockscout explorer health endpoint
      healthLogger.info('Testing Blockscout explorer health endpoint...');
      const healthResponse = await fetch(`${this.network.explorerApiUrl}/health`);
      checks.explorerHealth = healthResponse.ok;
      
      if (checks.explorerHealth) {
        const healthData = await healthResponse.json() as any;
        explorerVersion = healthData.version || 'unknown';
      } else {
        errors.push(`Explorer health check failed with status: ${healthResponse.status}`);
      }
    } catch (error: any) {
      errors.push(`Explorer health endpoint failed: ${error.message}`);
      healthLogger.error('Explorer health endpoint test failed:', error);
    }

    try {
      // Test explorer API with actual data
      healthLogger.info('Testing Blockscout explorer API...');
      if (blockNumber) {
        const blockData = await this.explorerService.getBlock(blockNumber - 1);
        checks.explorerApi = blockData !== null;
        
        if (!checks.explorerApi) {
          errors.push('Blockscout explorer API returned null response');
        }
      } else {
        errors.push('Cannot test explorer API without valid block number');
      }
    } catch (error: any) {
      errors.push(`Blockscout explorer API test failed: ${error.message}`);
      healthLogger.error('Blockscout explorer API test failed:', error);
    }

    checks.responseTime = Date.now() - startTime;

    // Determine overall health status
    let status: 'healthy' | 'degraded' | 'unhealthy';
    const healthyChecks = Object.values(checks).filter(check => 
      typeof check === 'boolean' ? check : true
    ).length;
    
    if (healthyChecks === 4 && checks.responseTime < 5000) {
      status = 'healthy';
    } else if (healthyChecks >= 2) {
      status = 'degraded';
    } else {
      status = 'unhealthy';
    }

    const healthStatus: HealthStatus = {
      status,
      timestamp: Date.now(),
      checks,
      details: {
        chainId,
        blockNumber,
        networkName: this.network.name,
        explorerVersion,
        ...(errors.length > 0 && { errors })
      }
    };

    healthLogger.info('Somnia health check completed', { 
      status, 
      responseTime: checks.responseTime,
      errors: errors.length,
      network: this.network.name
    });

    return healthStatus;
  }

  async startPeriodicHealthChecks(intervalMs = 60000): Promise<void> {
    healthLogger.info(`Starting periodic Somnia health checks every ${intervalMs}ms`);
    
    setInterval(async () => {
      try {
        const health = await this.performHealthCheck();
        
        if (health.status === 'unhealthy') {
          healthLogger.error('Somnia system is unhealthy:', health.details.errors);
        } else if (health.status === 'degraded') {
          healthLogger.warn('Somnia system is degraded:', health.details.errors);
        } else {
          healthLogger.info('Somnia system is healthy');
        }
      } catch (error: any) {
        healthLogger.error('Somnia health check failed:', error);
      }
    }, intervalMs);
  }
}