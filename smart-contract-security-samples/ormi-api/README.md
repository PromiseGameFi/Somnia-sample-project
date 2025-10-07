# ORMI API Demonstration Service

A comprehensive demonstration service showcasing integration with Somnia Network's ORMI APIs, featuring health monitoring, logging, and blockchain data retrieval capabilities.

## Features

- **ERC20 Token Balance Queries**: Retrieve token balances for any ERC20 token on Somnia Network
- **Health Monitoring**: Comprehensive health checks for API services and system resources
- **Request Logging**: Detailed logging of all API requests and responses
- **Performance Tracking**: Monitor API response times and system performance
- **Rate Limiting**: Built-in protection against API abuse
- **Security Headers**: Enhanced security with Helmet.js
- **Error Handling**: Robust error handling and logging

## Prerequisites

- Node.js 18+ 
- npm or yarn
- Somnia Network ORMI API key

## Installation

1. **Clone and navigate to the project**:
   ```bash
   cd ormi-api
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Environment Configuration**:
   ```bash
   cp .env.example .env
   ```
   
   Edit `.env` file with your configuration:
   ```env
   ORMI_API_KEY=your_ormi_api_key_here
   ORMI_BASE_URL=https://api.subgraph.somnia.network/public_api/data_api
   PORT=3001
   NODE_ENV=development
   LOG_LEVEL=info
   HEALTH_CHECK_INTERVAL=30000
   API_TIMEOUT=10000
   RATE_LIMIT_WINDOW_MS=900000
   RATE_LIMIT_MAX_REQUESTS=100
   CORS_ORIGIN=http://localhost:3000
   API_VERSION=v1
   ```

## Usage

### Development Mode
```bash
npm run dev
```

### Production Mode
```bash
npm run build
npm start
```

### Testing
```bash
npm test
```

## API Endpoints

### Health Monitoring

#### GET `/health`
Performs comprehensive health check including ORMI API connectivity, system resources, and environment configuration.

**Response Example**:
```json
{
  "success": true,
  "data": {
    "status": "healthy",
    "timestamp": "2024-01-15T10:30:00.000Z",
    "responseTime": 150,
    "checks": {
      "ormi-api": {
        "status": true,
        "responseTime": 120,
        "details": {
          "baseURL": "https://api.somnia.network",
          "hasApiKey": true
        }
      },
      "memory": {
        "status": true,
        "details": {
          "used": 45,
          "total": 512,
          "percentage": 8
        }
      }
    },
    "system": {
      "uptime": "0d 2h 15m 30s",
      "memory": {
        "used": 45,
        "total": 512,
        "percentage": 8
      },
      "environment": "development"
    }
  }
}
```

#### GET `/health/status`
Quick health status check returning the last known health state.

#### GET `/health/stats`
Detailed health statistics including historical data and performance metrics.

### Blockchain Data

#### GET `/api/balance/erc20/:walletAddress`
Retrieve ERC20 token balances for a specific wallet address using Somnia ORMI API.

**Parameters**:
- `walletAddress`: The wallet address to check ERC20 token balances for

**Response Example**:
```json
{
  "success": true,
  "data": {
    "walletAddress": "0x0987654321098765432109876543210987654321",
    "tokens": [
      {
        "tokenAddress": "0x1234567890123456789012345678901234567890",
        "balance": "1000.50",
        "decimals": 18,
        "symbol": "TOKEN",
        "name": "Example Token"
      }
    ]
  },
  "responseTime": 150,
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

#### GET `/api/balance/:tokenAddress/:walletAddress` (Legacy)
Legacy endpoint that redirects to the new ERC20 balance endpoint for backward compatibility.
```

### Service Information

#### GET `/api/info`
Retrieve service information, configuration, and available features.

#### GET `/`
Root endpoint with service overview and available endpoints.

## Architecture

### Project Structure
```
ormi-api/
├── src/
│   ├── services/
│   │   ├── ormiService.ts      # ORMI API integration
│   │   └── healthService.ts    # Health monitoring
│   ├── utils/
│   │   └── logger.ts          # Logging configuration
│   ├── app.ts                 # Express application
│   └── index.ts              # Application entry point
├── logs/                     # Log files
├── package.json
├── tsconfig.json
├── .env.example
└── README.md
```

### Key Components

#### OrmiService
Handles all interactions with Somnia Network's ORMI APIs:
- API authentication and request management
- ERC20 token balance queries
- Request/response logging and performance tracking
- Error handling and retry logic

#### HealthService
Comprehensive health monitoring system:
- ORMI API connectivity checks
- System resource monitoring (memory, uptime)
- Environment configuration validation
- Historical health data tracking
- Periodic health checks with cron scheduling

#### Logger
Structured logging with Winston:
- Multiple log levels (error, warn, info, debug)
- Separate log files for different components
- Performance and API call logging
- Security event logging

## Configuration

### Environment Variables

| Variable | Description | Default | Required |
|----------|-------------|---------|----------|
| `ORMI_API_KEY` | Your Somnia Network API key | - | ✅ |
| `ORMI_BASE_URL` | ORMI API base URL | - | ✅ |
| `PORT` | Server port | 3000 | ❌ |
| `LOG_LEVEL` | Logging level | info | ❌ |
| `HEALTH_CHECK_INTERVAL` | Cron expression for health checks | */30 * * * * * | ❌ |
| `API_TIMEOUT` | API request timeout (ms) | 10000 | ❌ |
| `RATE_LIMIT_MAX_REQUESTS` | Max requests per minute | 100 | ❌ |
| `CORS_ORIGIN` | CORS allowed origin | http://localhost:3000 | ❌ |
| `API_VERSION` | API version | 1.0.0 | ❌ |

### Health Check Configuration

The service performs the following health checks:

1. **ORMI API Connectivity**: Verifies connection to Somnia Network APIs
2. **Memory Usage**: Monitors system memory consumption
3. **System Uptime**: Tracks application uptime
4. **Environment Configuration**: Validates required environment variables

Health status levels:
- `healthy`: All checks passing
- `degraded`: Some non-critical checks failing
- `unhealthy`: Critical checks failing (ORMI API or environment)

## Logging

The service generates structured logs in multiple categories:

### Log Files
- `logs/app.log`: General application logs
- `logs/ormi-api.log`: ORMI API specific logs
- `logs/health.log`: Health check logs
- `logs/error.log`: Error logs
- `logs/exceptions.log`: Uncaught exceptions
- `logs/rejections.log`: Unhandled promise rejections

### Log Levels
- `error`: Error conditions
- `warn`: Warning conditions
- `info`: Informational messages
- `debug`: Debug information

## Security Features

- **Helmet.js**: Security headers and protection
- **CORS**: Cross-origin resource sharing configuration
- **Rate Limiting**: Request rate limiting per IP
- **Input Validation**: Request parameter validation
- **Security Logging**: Security event logging
- **Environment Variable Protection**: Sensitive data protection

## Performance Monitoring

The service tracks:
- API response times
- Request/response sizes
- Error rates
- System resource usage
- Health check performance

## Error Handling

- Comprehensive error logging
- Graceful error responses
- Retry logic for API calls
- Circuit breaker pattern for external services
- Graceful shutdown handling

## Development

### Scripts
- `npm run dev`: Start development server with hot reload
- `npm run build`: Build TypeScript to JavaScript
- `npm start`: Start production server
- `npm test`: Run tests
- `npm run lint`: Run ESLint
- `npm run format`: Format code with Prettier

### Adding New Features

1. **New API Endpoints**: Add routes in `src/app.ts`
2. **New Services**: Create service files in `src/services/`
3. **New Utilities**: Add utility functions in `src/utils/`
4. **Environment Variables**: Update `.env.example` and documentation

## Troubleshooting

### Common Issues

1. **API Key Issues**:
   - Verify `ORMI_API_KEY` is set correctly
   - Check API key permissions and validity
   - Review ORMI API documentation

2. **Connection Issues**:
   - Verify `ORMI_BASE_URL` is correct
   - Check network connectivity
   - Review firewall settings

3. **Performance Issues**:
   - Monitor health check logs
   - Review API response times
   - Check system resource usage

### Debug Mode

Set `LOG_LEVEL=debug` for detailed logging:
```bash
LOG_LEVEL=debug npm run dev
```

## Documentation

- [Somnia Network ORMI APIs](https://docs.somnia.network/developer/how-to-guides/api/ormi-apis)
- [Somnia Network Documentation](https://docs.somnia.network/)

## License

MIT License - see LICENSE file for details.