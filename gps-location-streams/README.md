# 🛰️ GPS Tracker dApp: Real-Time Location Streams

A comprehensive demonstration of **Somnia Data Streams** for IoT and logistics applications. This project showcases how to create, encode, and stream GPS location data in real-time using blockchain technology.

## 🎯 Overview

This GPS Tracker dApp demonstrates:
- **Schema Creation**: Define and encode location schemas (timestamp, lat, lon, altitude)
- **IoT Simulation**: Publish GPS data from simulated IoT devices
- **Real-time Streaming**: Live data visualization with WebSocket connections
- **Blockchain Integration**: Leverage Somnia Data Streams for decentralized data management

## 🏗️ Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   GPS Devices   │───▶│  Data Publisher │───▶│ Somnia Streams  │
│  (Simulated)    │    │                 │    │   (Blockchain)  │
└─────────────────┘    └─────────────────┘    └─────────────────┘
                                                        │
                                                        ▼
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Web Browser   │◀───│   Visualizer    │◀───│  Stream Reader  │
│  (Dashboard)    │    │  (WebSocket)    │    │                 │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ installed
- Somnia testnet access
- Basic understanding of blockchain concepts

### Installation & Setup

1. **Clone and install dependencies:**
```bash
npm install
```

2. **Configure environment:**
```bash
cp .env.example .env
# Edit .env with your Somnia configuration:
# - RPC_URL: Your Somnia RPC endpoint
# - PRIVATE_KEY: Your wallet private key (without 0x prefix)
# - PORT: Web dashboard port (default: 3000)
```
