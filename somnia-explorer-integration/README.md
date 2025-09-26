# Somnia Explorer Integration Test App

A comprehensive test application demonstrating integration with Somnia Explorer APIs, advanced logging, and health monitoring capabilities.

## Features

- 🔗 **Somnia Explorer API Integration** - Complete integration with Blockscout-based explorer
- 📊 **Advanced Logging** - Winston-based logging with file rotation and structured logs
- 🏥 **Health Monitoring** - Comprehensive health checks for RPC and Explorer APIs
- 🚀 **Express REST API** - Clean RESTful endpoints for blockchain data
- 🔒 **Security** - Helmet.js security headers and CORS protection
- 📝 **TypeScript** - Full TypeScript support with strict type checking

## Prerequisites

- Node.js 16+ and npm
- Access to Somnia Network (testnet or mainnet)
- Basic understanding of blockchain concepts

## Quick Start

### 1. Installation

```bash
# Install dependencies
npm install

# Copy environment configuration
cp .env.example .env
```

### 2. Configuration

Edit `.env` file to configure your environment:

```env
# Basic configuration
PORT=3000
NODE_ENV=development
SOMNIA_NETWORK=development

# Optional: Custom endpoints
# SOMNIA_TESTNET_RPC=
# SOMNIA_TESTNET_EXPLORER=
```

### 3. Development

```bash
# Start development server with hot reload
npm run dev

# Build for production
npm run build

# Start production server
npm start

# Clean build artifacts
npm run clean
```

## API Endpoints

### Base Information
```http
GET /
```
Returns application info and available endpoints.

### Health Check
```http
GET /api/health
```
Comprehensive health check including:
- RPC connection status
- Latest block retrieval
- Explorer API availability
- Response times and error rates

### Transaction Data
```http
GET /api/transaction/:hash
```
Retrieve detailed transaction information by hash.

**Example:**
```bash
curl http://localhost:3000/api/transaction/0x1234567890abcdef...
```

### Block Data
```http
GET /api/block/:number
```
Get block information by block number.

**Example:**
```bash
curl http://localhost:3000/api/block/12345
```

### Address Transactions
```http
GET /api/address/:address/transactions?page=1&limit=20
```
Retrieve transactions for a specific address with pagination.

**Parameters:**
- `page` (optional): Page number (default: 1)
- `limit` (optional): Results per page (default: 20, max: 100)

**Example:**
```bash
curl "http://localhost:3000/api/address/0xabcdef.../transactions?page=1&limit=10"
```

### Latest Blocks
```http
GET /api/blocks?limit=10
```
Get the latest blocks from the network.

**Parameters:**
- `limit` (optional): Number of blocks (default: 10, max: 50)

## Project Structure

```
Tesapp/
├── src/
│   ├── config/
│   │   └── network.ts          # Network configuration
│   ├── services/
│   │   ├── somniaExplorerService.ts  # Explorer API integration
│   │   └── healthService.ts          # Health monitoring
│   ├── utils/
│   │   └── logger.ts           # Winston logging setup
│   └── app.ts                  # Main Express application
├── logs/                       # Log files directory
├── .env.example               # Environment template
├── package.json
├── tsconfig.json
└── README.md
```

## Logging

The application uses Winston for comprehensive logging:

### Log Levels
- `error`: Error conditions
- `warn`: Warning conditions
- `info`: Informational messages
- `debug`: Debug-level messages

### Log Files
- `logs/combined.log`: All log levels
- `logs/api.log`: API-specific logs
- `logs/error.log`: Error logs only

### Log Format
Structured JSON logs with timestamps, levels, and contextual information:

```json
{
  "timestamp": "2024-01-15T10:30:00.000Z",
  "level": "info",
  "message": "API request completed",
  "method": "GET",
  "url": "/api/health",
  "statusCode": 200,
  "responseTime": "45ms"
}
```

## Health Monitoring

The health service performs comprehensive checks:

### RPC Health
- Connection status
- Latest block retrieval
- Response time monitoring

### Explorer Health
- Blockscout health endpoint
- API response validation
- Error rate tracking

### Health Status Levels
- `healthy`: All systems operational
- `degraded`: Some issues detected
- `unhealthy`: Critical issues present





