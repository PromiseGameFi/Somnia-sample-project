# Deployment Guide: Somnia Space Raiders

Complete guide for deploying the Somnia Space Raiders game to various environments, from development to production.

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Environment Configuration](#environment-configuration)
3. [Development Deployment](#development-deployment)
4. [Staging Deployment](#staging-deployment)
5. [Production Deployment](#production-deployment)
6. [Smart Contract Deployment](#smart-contract-deployment)
7. [Monitoring and Maintenance](#monitoring-and-maintenance)
8. [Troubleshooting](#troubleshooting)

## Prerequisites

### System Requirements

- **Node.js**: v16.0.0 or higher
- **npm**: v7.0.0 or higher
- **Git**: Latest version
- **Web3 Wallet**: MetaMask or compatible
- **Modern Browser**: Chrome, Firefox, Safari, or Edge

### Development Tools

```bash
# Install global dependencies
npm install -g vite
npm install -g serve
npm install -g pm2  # For production process management
```

### Blockchain Requirements

- Access to Somnia network (testnet/mainnet)
- Deployed smart contract
- Sufficient tokens for gas fees
- RPC endpoint URL

## Environment Configuration

### Environment Variables

Create environment files for different deployment stages:

#### `.env.development`
```env
# Development environment
VITE_ENVIRONMENT=development
VITE_SOMNIA_RPC_URL=https://testnet-rpc.somnia.network
VITE_CONTRACT_ADDRESS=0x1234567890123456789012345678901234567890
VITE_CHAIN_ID=966
VITE_ENABLE_DEBUG=true
VITE_API_BASE_URL=http://localhost:3001
VITE_WEBSOCKET_URL=ws://localhost:3001
```

#### `.env.staging`
```env
# Staging environment
VITE_ENVIRONMENT=staging
VITE_SOMNIA_RPC_URL=https://testnet-rpc.somnia.network
VITE_CONTRACT_ADDRESS=0x2345678901234567890123456789012345678901
VITE_CHAIN_ID=966
VITE_ENABLE_DEBUG=false
VITE_API_BASE_URL=https://staging-api.yourdomain.com
VITE_WEBSOCKET_URL=wss://staging-api.yourdomain.com
```

#### `.env.production`
```env
# Production environment
VITE_ENVIRONMENT=production
VITE_SOMNIA_RPC_URL=https://mainnet-rpc.somnia.network
VITE_CONTRACT_ADDRESS=0x3456789012345678901234567890123456789012
VITE_CHAIN_ID=966
VITE_ENABLE_DEBUG=false
VITE_API_BASE_URL=https://api.yourdomain.com
VITE_WEBSOCKET_URL=wss://api.yourdomain.com
```

### Configuration Management

Create a configuration manager for environment-specific settings:

```javascript
// src/config/environment.js
class EnvironmentConfig {
    constructor() {
        this.env = import.meta.env.VITE_ENVIRONMENT || 'development';
        this.config = this.loadConfig();
    }
    
    loadConfig() {
        const baseConfig = {
            rpcUrl: import.meta.env.VITE_SOMNIA_RPC_URL,
            contractAddress: import.meta.env.VITE_CONTRACT_ADDRESS,
            chainId: parseInt(import.meta.env.VITE_CHAIN_ID),
            debug: import.meta.env.VITE_ENABLE_DEBUG === 'true',
            apiBaseUrl: import.meta.env.VITE_API_BASE_URL,
            websocketUrl: import.meta.env.VITE_WEBSOCKET_URL
        };
        
        // Environment-specific overrides
        const envConfigs = {
            development: {
                logLevel: 'debug',
                enableHotReload: true,
                enableDevTools: true
            },
            staging: {
                logLevel: 'info',
                enableHotReload: false,
                enableDevTools: true
            },
            production: {
                logLevel: 'error',
                enableHotReload: false,
                enableDevTools: false,
                enableAnalytics: true
            }
        };
        
        return { ...baseConfig, ...envConfigs[this.env] };
    }
    
    get(key) {
        return this.config[key];
    }
    
    isDevelopment() {
        return this.env === 'development';
    }
    
    isProduction() {
        return this.env === 'production';
    }
}

export default new EnvironmentConfig();
```

## Development Deployment

### Local Development Setup

1. **Clone and Install**
   ```bash
   git clone <repository-url>
   cd SomniaDataStream
   npm install
   ```

2. **Environment Setup**
   ```bash
   cp .env.example .env.development
   # Edit .env.development with your configuration
   ```

3. **Start Development Server**
   ```bash
   npm run dev
   ```

4. **Access Application**
   - Open browser to `http://localhost:3000`
   - Connect MetaMask to Somnia testnet
   - Start playing!

### Development Scripts

```json
{
  "scripts": {
    "dev": "vite --mode development",
    "dev:debug": "vite --mode development --debug",
    "dev:network": "vite --mode development --host 0.0.0.0",
    "test": "vitest",
    "test:watch": "vitest --watch",
    "lint": "eslint src --ext .js,.jsx,.ts,.tsx",
    "lint:fix": "eslint src --ext .js,.jsx,.ts,.tsx --fix"
  }
}
```

## Staging Deployment

### Staging Environment Setup

Staging environment mimics production but uses testnet for safe testing.

#### 1. Server Setup (Ubuntu/Debian)

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Node.js
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install PM2 for process management
sudo npm install -g pm2

# Install Nginx for reverse proxy
sudo apt install nginx -y

# Install SSL certificate tool
sudo apt install certbot python3-certbot-nginx -y
```

#### 2. Application Deployment

```bash
# Clone repository
git clone <repository-url> /var/www/somnia-space-raiders
cd /var/www/somnia-space-raiders

# Install dependencies
npm ci --only=production

# Build for staging
npm run build:staging

# Setup PM2 ecosystem
pm2 start ecosystem.config.js --env staging
pm2 save
pm2 startup
```

#### 3. Nginx Configuration

```nginx
# /etc/nginx/sites-available/somnia-staging
server {
    listen 80;
    server_name staging.yourdomain.com;
    
    # Redirect HTTP to HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name staging.yourdomain.com;
    
    # SSL Configuration
    ssl_certificate /etc/letsencrypt/live/staging.yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/staging.yourdomain.com/privkey.pem;
    
    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Referrer-Policy "no-referrer-when-downgrade" always;
    add_header Content-Security-Policy "default-src 'self' http: https: data: blob: 'unsafe-inline'" always;
    
    # Serve static files
    location / {
        root /var/www/somnia-space-raiders/dist;
        try_files $uri $uri/ /index.html;
        
        # Cache static assets
        location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg)$ {
            expires 1y;
            add_header Cache-Control "public, immutable";
        }
    }
    
    # API proxy (if needed)
    location /api {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

#### 4. SSL Certificate Setup

```bash
# Obtain SSL certificate
sudo certbot --nginx -d staging.yourdomain.com

# Enable Nginx site
sudo ln -s /etc/nginx/sites-available/somnia-staging /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

### PM2 Ecosystem Configuration

```javascript
// ecosystem.config.js
module.exports = {
  apps: [{
    name: 'somnia-space-raiders-staging',
    script: 'serve',
    args: '-s dist -l 3000',
    cwd: '/var/www/somnia-space-raiders',
    env: {
      NODE_ENV: 'staging'
    },
    env_staging: {
      NODE_ENV: 'staging',
      PORT: 3000
    },
    instances: 2,
    exec_mode: 'cluster',
    watch: false,
    max_memory_restart: '1G',
    error_file: './logs/err.log',
    out_file: './logs/out.log',
    log_file: './logs/combined.log',
    time: true
  }]
};
```

## Production Deployment

### Production Infrastructure

#### 1. CDN Setup (Cloudflare)

```javascript
// cloudflare-config.js
const cloudflareConfig = {
  // Cache rules
  cacheRules: [
    {
      pattern: "*.js",
      ttl: 31536000, // 1 year
      browserTtl: 31536000
    },
    {
      pattern: "*.css",
      ttl: 31536000,
      browserTtl: 31536000
    },
    {
      pattern: "*.png|*.jpg|*.jpeg|*.gif|*.ico|*.svg",
      ttl: 31536000,
      browserTtl: 31536000
    },
    {
      pattern: "/",
      ttl: 3600, // 1 hour
      browserTtl: 3600
    }
  ],
  
  // Security settings
  security: {
    securityLevel: "medium",
    challengePassage: 86400,
    browserIntegrityCheck: true
  },
  
  // Performance settings
  performance: {
    minify: {
      css: true,
      js: true,
      html: true
    },
    brotli: true,
    http2: true
  }
};
```

#### 2. Production Build Optimization

```javascript
// vite.config.production.js
import { defineConfig } from 'vite';

export default defineConfig({
  mode: 'production',
  build: {
    target: 'es2015',
    outDir: 'dist',
    assetsDir: 'assets',
    sourcemap: false,
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true,
        drop_debugger: true
      }
    },
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['three', 'cannon-es'],
          blockchain: ['ethers'],
          ui: ['dat.gui']
        },
        chunkFileNames: 'assets/[name]-[hash].js',
        entryFileNames: 'assets/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash].[ext]'
      }
    },
    chunkSizeWarningLimit: 1000
  },
  define: {
    'process.env.NODE_ENV': JSON.stringify('production'),
    __DEV__: false
  }
});
```

#### 3. Docker Deployment

```dockerfile
# Dockerfile
FROM node:18-alpine AS builder

WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production

COPY . .
RUN npm run build:production

FROM nginx:alpine AS production

# Copy built assets
COPY --from=builder /app/dist /usr/share/nginx/html

# Copy nginx configuration
COPY nginx.conf /etc/nginx/nginx.conf

# Add health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost/ || exit 1

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
```

```yaml
# docker-compose.yml
version: '3.8'

services:
  somnia-space-raiders:
    build:
      context: .
      dockerfile: Dockerfile
    ports:
      - "80:80"
      - "443:443"
    environment:
      - NODE_ENV=production
    volumes:
      - ./ssl:/etc/nginx/ssl:ro
    restart: unless-stopped
    
  # Optional: Redis for caching
  redis:
    image: redis:alpine
    restart: unless-stopped
    
  # Optional: Monitoring
  prometheus:
    image: prom/prometheus
    ports:
      - "9090:9090"
    volumes:
      - ./prometheus.yml:/etc/prometheus/prometheus.yml
```

### Kubernetes Deployment

```yaml
# k8s-deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: somnia-space-raiders
  labels:
    app: somnia-space-raiders
spec:
  replicas: 3
  selector:
    matchLabels:
      app: somnia-space-raiders
  template:
    metadata:
      labels:
        app: somnia-space-raiders
    spec:
      containers:
      - name: somnia-space-raiders
        image: your-registry/somnia-space-raiders:latest
        ports:
        - containerPort: 80
        env:
        - name: NODE_ENV
          value: "production"
        resources:
          requests:
            memory: "256Mi"
            cpu: "250m"
          limits:
            memory: "512Mi"
            cpu: "500m"
        livenessProbe:
          httpGet:
            path: /
            port: 80
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /
            port: 80
          initialDelaySeconds: 5
          periodSeconds: 5

---
apiVersion: v1
kind: Service
metadata:
  name: somnia-space-raiders-service
spec:
  selector:
    app: somnia-space-raiders
  ports:
    - protocol: TCP
      port: 80
      targetPort: 80
  type: LoadBalancer
```

## Smart Contract Deployment

### Contract Deployment Script

```javascript
// scripts/deploy-contract.js
const { ethers } = require('hardhat');

async function main() {
  // Get deployer account
  const [deployer] = await ethers.getSigners();
  console.log('Deploying contracts with account:', deployer.address);
  
  // Check balance
  const balance = await deployer.getBalance();
  console.log('Account balance:', ethers.utils.formatEther(balance));
  
  // Deploy contract
  const SomniaSpaceRaiders = await ethers.getContractFactory('SomniaSpaceRaiders');
  const contract = await SomniaSpaceRaiders.deploy();
  
  await contract.deployed();
  
  console.log('Contract deployed to:', contract.address);
  console.log('Transaction hash:', contract.deployTransaction.hash);
  
  // Verify contract (optional)
  if (process.env.ETHERSCAN_API_KEY) {
    console.log('Waiting for block confirmations...');
    await contract.deployTransaction.wait(6);
    
    await hre.run('verify:verify', {
      address: contract.address,
      constructorArguments: []
    });
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
```

### Hardhat Configuration

```javascript
// hardhat.config.js
require('@nomiclabs/hardhat-ethers');
require('@nomiclabs/hardhat-etherscan');

module.exports = {
  solidity: {
    version: '0.8.19',
    settings: {
      optimizer: {
        enabled: true,
        runs: 200
      }
    }
  },
  networks: {
    somniaTestnet: {
      url: process.env.SOMNIA_TESTNET_RPC_URL,
      accounts: [process.env.PRIVATE_KEY],
      chainId: 966
    },
    somniaMainnet: {
      url: process.env.SOMNIA_MAINNET_RPC_URL,
      accounts: [process.env.PRIVATE_KEY],
      chainId: 966
    }
  },
  etherscan: {
    apiKey: process.env.ETHERSCAN_API_KEY
  }
};
```

## Monitoring and Maintenance

### Application Monitoring

```javascript
// src/utils/monitoring.js
class ApplicationMonitor {
  constructor() {
    this.metrics = {
      pageViews: 0,
      gameStarts: 0,
      errors: 0,
      performance: []
    };
    
    this.setupErrorTracking();
    this.setupPerformanceTracking();
  }
  
  setupErrorTracking() {
    window.addEventListener('error', (event) => {
      this.trackError({
        message: event.message,
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
        stack: event.error?.stack
      });
    });
    
    window.addEventListener('unhandledrejection', (event) => {
      this.trackError({
        message: 'Unhandled Promise Rejection',
        reason: event.reason
      });
    });
  }
  
  setupPerformanceTracking() {
    // Track page load performance
    window.addEventListener('load', () => {
      const perfData = performance.getEntriesByType('navigation')[0];
      this.trackPerformance({
        loadTime: perfData.loadEventEnd - perfData.loadEventStart,
        domContentLoaded: perfData.domContentLoadedEventEnd - perfData.domContentLoadedEventStart,
        firstPaint: performance.getEntriesByType('paint')[0]?.startTime
      });
    });
  }
  
  trackError(error) {
    this.metrics.errors++;
    
    // Send to monitoring service
    if (window.gtag) {
      window.gtag('event', 'exception', {
        description: error.message,
        fatal: false
      });
    }
    
    console.error('Application Error:', error);
  }
  
  trackPerformance(data) {
    this.metrics.performance.push(data);
    
    // Send to analytics
    if (window.gtag) {
      window.gtag('event', 'timing_complete', {
        name: 'page_load',
        value: data.loadTime
      });
    }
  }
}

export default new ApplicationMonitor();
```

### Health Check Endpoint

```javascript
// src/utils/healthCheck.js
export class HealthChecker {
  constructor(somniaConnector) {
    this.connector = somniaConnector;
    this.checks = new Map();
    this.setupChecks();
  }
  
  setupChecks() {
    this.checks.set('blockchain', () => this.checkBlockchainConnection());
    this.checks.set('contract', () => this.checkContractAccess());
    this.checks.set('performance', () => this.checkPerformance());
  }
  
  async checkBlockchainConnection() {
    try {
      await this.connector.provider.getNetwork();
      return { status: 'healthy', latency: Date.now() };
    } catch (error) {
      return { status: 'unhealthy', error: error.message };
    }
  }
  
  async checkContractAccess() {
    try {
      await this.connector.contract.getGameState();
      return { status: 'healthy' };
    } catch (error) {
      return { status: 'unhealthy', error: error.message };
    }
  }
  
  checkPerformance() {
    const memory = performance.memory;
    const fps = this.getCurrentFPS();
    
    return {
      status: fps > 30 ? 'healthy' : 'degraded',
      fps,
      memory: {
        used: memory.usedJSHeapSize,
        total: memory.totalJSHeapSize,
        limit: memory.jsHeapSizeLimit
      }
    };
  }
  
  async runAllChecks() {
    const results = {};
    
    for (const [name, check] of this.checks) {
      try {
        results[name] = await check();
      } catch (error) {
        results[name] = { status: 'error', error: error.message };
      }
    }
    
    return {
      timestamp: new Date().toISOString(),
      overall: this.determineOverallHealth(results),
      checks: results
    };
  }
}
```

## Troubleshooting

### Common Deployment Issues

#### 1. Build Failures

```bash
# Clear cache and reinstall
rm -rf node_modules package-lock.json
npm cache clean --force
npm install

# Check for dependency conflicts
npm ls
npm audit fix
```

#### 2. Environment Variable Issues

```javascript
// Debug environment variables
console.log('Environment:', import.meta.env.MODE);
console.log('RPC URL:', import.meta.env.VITE_SOMNIA_RPC_URL);
console.log('Contract:', import.meta.env.VITE_CONTRACT_ADDRESS);
```

#### 3. Network Connectivity

```bash
# Test RPC endpoint
curl -X POST \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1}' \
  https://testnet-rpc.somnia.network
```

#### 4. SSL Certificate Issues

```bash
# Renew SSL certificate
sudo certbot renew --dry-run
sudo certbot renew

# Check certificate status
sudo certbot certificates
```

### Deployment Checklist

- [ ] Environment variables configured
- [ ] Smart contract deployed and verified
- [ ] SSL certificates installed
- [ ] CDN configured
- [ ] Monitoring setup
- [ ] Health checks working
- [ ] Error tracking enabled
- [ ] Performance monitoring active
- [ ] Backup strategy in place
- [ ] Rollback plan prepared

### Rollback Procedure

```bash
# Quick rollback using PM2
pm2 stop somnia-space-raiders
git checkout previous-stable-tag
npm run build:production
pm2 restart somnia-space-raiders

# Docker rollback
docker pull your-registry/somnia-space-raiders:previous-tag
docker-compose up -d

# Kubernetes rollback
kubectl rollout undo deployment/somnia-space-raiders
```

This deployment guide provides comprehensive instructions for deploying the Somnia Space Raiders game across different environments. Follow the appropriate section based on your deployment target and requirements.