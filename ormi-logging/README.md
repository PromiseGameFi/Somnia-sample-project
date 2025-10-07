# ORMI API Logging & Health Monitoring Tutorial

A comprehensive TypeScript implementation demonstrating enterprise-grade logging and health monitoring for ORMI API integrations on the Somnia Testnet.

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ installed
- ORMI API key from Somnia developer portal
- Basic understanding of TypeScript and REST APIs

### Installation

```bash
# Clone or download the project
cd ormi-logging-tutorial

# Install dependencies
npm install

# Copy environment configuration
cp .env.example .env

# Edit .env file with your ORMI API key
# ORMI_API_KEY=your_actual_api_key_here
```

### Development

```bash
# Start development server with hot reload
npm run dev

# Build the project
npm run build

# Run production build
npm start

# Run integration tests
npm test

# Check health status
npm run health-check
```

## 📁 Project Structure

```
src/
├── config/           # Configuration files
├── services/         # Core service implementations
│   ├── ormiApiClient.ts     # ORMI API client with interceptors
│   └── healthMonitor.ts     # Health monitoring system
├── utils/            # Utility functions
│   └── logger.ts            # Winston logging configuration
├── routes/           # Express route handlers
│   └── health.ts            # Health check endpoints
├── types/            # TypeScript type definitions
├── test/             # Integration tests
└── index.ts          # Application entry point
```

## 🔧 Features

### ✅ Winston Logging System
- ORMI-specific log formatters
- Structured JSON output
- Multiple transport options (console, file)
- Log rotation and archiving
- Performance metrics logging

### ✅ Health Monitoring
- ORMI API connectivity checks
- Performance metrics tracking
- Automated health status reporting
- Historical health data
- Express endpoints for monitoring

### ✅ API Client Features
- Bearer token authentication
- Request/response interceptors
- Automatic retry mechanisms
- Rate limiting protection
- Error handling and recovery

### ✅ ERC20 Integration
- Token balance retrieval
- Multi-token support
- STT value conversion
- Privacy-protected logging

## 🧪 Testing

### Run Integration Tests

```bash
npm test
```

### Manual Testing

```bash
# Test health endpoints
curl http://localhost:3000/health
curl http://localhost:3000/health/detailed
curl http://localhost:3000/metrics

# Test ERC20 balance (replace with actual wallet address)
curl -X GET "http://localhost:3000/api/balance/0x742d35Cc6634C0532925a3b8D4C9db96c4b4d8b6"
```

## 📊 Monitoring

### Health Check Endpoints

- `GET /health` - Basic health status
- `GET /health/detailed` - Comprehensive health information
- `GET /metrics` - API performance metrics

### Log Files

- `logs/ormi-api.log` - All application logs
- `logs/ormi-errors.log` - Error-specific logs

### Example Log Output

```json
{
  "timestamp": "2024-01-15 10:30:45.123",
  "level": "info",
  "message": "ORMI API Response",
  "service": "ormi-api-client",
  "environment": "development",
  "network": "somnia-testnet",
  "ormiData": {
    "endpoint": "/somnia/v1/address/0x123.../balance/erc20",
    "statusCode": 200,
    "responseTime": "245ms",
    "success": true
  }
}
```

## 🔒 Security

- API keys stored in environment variables
- Bearer token authentication
- CORS protection
- Helmet security headers
- Input validation and sanitization

## 🚀 Production Deployment

### Environment Variables

Ensure all required environment variables are set:

```bash
ORMI_API_KEY=your_production_api_key
NODE_ENV=production
LOG_LEVEL=warn
HEALTH_CHECK_INTERVAL=60000
```

### Docker Deployment

```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY dist ./dist
EXPOSE 3000
CMD ["npm", "start"]
```

## 📚 Documentation

For detailed implementation guide, see:
- [ORMI API Logging & Health Monitoring Tutorial](../../../ormi-api/ormi-api-logging-health-monitoring.md)
- [Somnia Developer Documentation](https://docs.somnia.network)

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new functionality
5. Submit a pull request

## 📄 License

MIT License - see LICENSE file for details

## 🆘 Support

For issues and questions:
- Check the troubleshooting section in the main tutorial
- Review logs in the `logs/` directory
- Verify environment configuration
- Test API connectivity manually

---

**Built for Somnia Testnet with MultiStream BFT consensus** 🚀