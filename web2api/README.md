# Web2 API Logging & Health Checks Demo

A concise demonstration of implementing logging and health checks for traditional Web2 APIs using Node.js, Express, and TypeScript.

## Features

- **API Integration**: Structured service classes for third-party API calls
- **Advanced Logging**: Winston-based logging with multiple transports
- **Health Monitoring**: Comprehensive health checks for APIs and system resources
- **Express Server**: RESTful endpoints with proper error handling
- **TypeScript**: Full type safety and modern development experience

## Quick Start

1. **Install Dependencies**
   ```bash
   npm install
   ```

2. **Setup Environment**
   ```bash
   cp .env.example .env
   ```

3. **Run Development Server**
   ```bash
   npm run dev
   ```

4. **Build for Production**
   ```bash
   npm run build
   npm start
   ```

## API Endpoints

- `GET /` - Service information
- `GET /api/health` - Health check status
- `GET /api/status` - Server status
- `GET /api/posts` - Demo posts from JSONPlaceholder
- `GET /api/posts/:id` - Specific post by ID

## Testing Health Checks

```bash
# Check overall health
curl http://localhost:3000/api/health

# Test demo endpoints
curl http://localhost:3000/api/posts
curl http://localhost:3000/api/posts/1
```

## Project Structure

```
src/
├── services/
│   ├── apiService.ts      # Generic API service class
│   └── healthService.ts   # Health monitoring service
├── utils/
│   └── logger.ts          # Winston logging configuration
└── app.ts                 # Express server setup
```

## Logging

Logs are written to the `logs/` directory:
- `app.log` - All application logs
- `api.log` - API-specific logs
- `error.log` - Error logs only
- `exceptions.log` - Unhandled exceptions
- `rejections.log` - Unhandled promise rejections

## Health Check Response

```json
{
  "status": "healthy",
  "timestamp": "2024-01-20T10:30:00.000Z",
  "responseTime": 150,
  "checks": {
    "jsonplaceholder": {
      "status": true,
      "responseTime": 120,
      "details": { "status": 200 }
    },
    "httpbin": {
      "status": true,
      "responseTime": 80,
      "details": { "status": 200 }
    },
    "memory": {
      "status": true,
      "details": {
        "used": "45MB",
        "total": "128MB",
        "percentage": 35
      }
    },
    "uptime": {
      "status": true,
      "details": {
        "uptime": "3600s",
        "uptimeHuman": "1h 0m 0s"
      }
    }
  }
}
```

## Environment Variables

- `PORT` - Server port (default: 3000)
- `NODE_ENV` - Environment (development/production)
- `LOG_LEVEL` - Logging level (debug/info/warn/error)
- `HEALTH_CHECK_INTERVAL` - Health check frequency in ms

## Production Considerations

- Enable HTTPS in production
- Configure proper CORS origins
- Set up log rotation
- Monitor health check endpoints
- Implement rate limiting
- Add authentication for sensitive endpoints

