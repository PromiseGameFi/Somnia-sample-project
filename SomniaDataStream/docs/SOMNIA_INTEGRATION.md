# Somnia Data Streams Integration Guide

This guide focuses specifically on integrating Somnia Data Streams into your applications, using the Somnia Space Raiders game as a practical example. Learn how to leverage the power of reactive blockchain programming for real-time applications.

## Table of Contents

1. [Introduction to Somnia Data Streams](#introduction-to-somnia-data-streams)
2. [Setting Up Somnia Integration](#setting-up-somnia-integration)
3. [Core Integration Patterns](#core-integration-patterns)
4. [Real-time Event Streaming](#real-time-event-streaming)
5. [State Management](#state-management)
6. [Performance Optimization](#performance-optimization)
7. [Error Handling](#error-handling)
8. [Best Practices](#best-practices)

## Introduction to Somnia Data Streams

Somnia Data Streams represent a paradigm shift in blockchain application development, enabling:

- **Real-time Reactivity**: Applications respond instantly to on-chain events
- **Seamless State Sync**: Automatic synchronization between blockchain and application state
- **Scalable Architecture**: High-performance infrastructure for demanding applications
- **Developer-Friendly APIs**: Intuitive interfaces for complex blockchain interactions

### Key Concepts

#### 1. Reactive Programming Model
```javascript
// Traditional approach - polling
setInterval(async () => {
    const newData = await contract.getData();
    updateUI(newData);
}, 1000);

// Somnia Data Streams - reactive
somniaStream.on('dataUpdate', (newData) => {
    updateUI(newData);
});
```

#### 2. Event-Driven Architecture
```javascript
// Events flow from blockchain to application
blockchain → SomniaDataStream → Application → UI Update
```

#### 3. Bidirectional Communication
```javascript
// Application can both emit and listen to events
app.emit('playerAction', data);     // To blockchain
app.on('gameStateUpdate', handler); // From blockchain
```

## Setting Up Somnia Integration

### 1. Installation and Dependencies

```bash
npm install ethers @somnia/data-streams
```

### 2. Basic Configuration

```javascript
// src/blockchain/SomniaConnector.js
import { ethers } from 'ethers';

class SomniaConnector {
    constructor() {
        this.provider = null;
        this.signer = null;
        this.contract = null;
        this.isConnected = false;
        
        // Somnia network configuration
        this.networkConfig = {
            chainId: '0x3C6', // Somnia testnet
            chainName: 'Somnia Testnet',
            rpcUrls: [
                import.meta.env.VITE_SOMNIA_RPC_URL || 
                'https://testnet-rpc.somnia.network'
            ],
            nativeCurrency: {
                name: 'STT',
                symbol: 'STT',
                decimals: 18
            },
            blockExplorerUrls: ['https://testnet-explorer.somnia.network']
        };
    }
    
    async connect() {
        try {
            // Check for Web3 provider
            if (!window.ethereum) {
                throw new Error('Web3 provider not found');
            }
            
            // Request account access
            await window.ethereum.request({
                method: 'eth_requestAccounts'
            });
            
            // Setup provider and signer
            this.provider = new ethers.BrowserProvider(window.ethereum);
            this.signer = await this.provider.getSigner();
            
            // Switch to Somnia network if needed
            await this.ensureSomniaNetwork();
            
            // Initialize contract
            await this.initializeContract();
            
            this.isConnected = true;
            console.log('Connected to Somnia network');
            
        } catch (error) {
            console.error('Connection failed:', error);
            throw error;
        }
    }
}
```

### 3. Network Management

```javascript
async ensureSomniaNetwork() {
    const currentChainId = await window.ethereum.request({
        method: 'eth_chainId'
    });
    
    if (currentChainId !== this.networkConfig.chainId) {
        try {
            // Try to switch to Somnia network
            await window.ethereum.request({
                method: 'wallet_switchEthereumChain',
                params: [{ chainId: this.networkConfig.chainId }]
            });
        } catch (switchError) {
            // Network not added, try to add it
            if (switchError.code === 4902) {
                await window.ethereum.request({
                    method: 'wallet_addEthereumChain',
                    params: [this.networkConfig]
                });
            } else {
                throw switchError;
            }
        }
    }
}
```

## Core Integration Patterns

### 1. Event Emission Pattern

```javascript
class GameEventEmitter {
    constructor(somniaConnector) {
        this.connector = somniaConnector;
        this.eventQueue = [];
        this.isProcessing = false;
    }
    
    // Emit player movement to blockchain
    async emitPlayerMovement(playerData) {
        const event = {
            type: 'PLAYER_MOVEMENT',
            data: {
                playerId: playerData.id,
                position: playerData.position,
                rotation: playerData.rotation,
                velocity: playerData.velocity,
                timestamp: Date.now()
            }
        };
        
        return this.emitEvent(event);
    }
    
    // Emit score update
    async emitScoreUpdate(playerId, score, reason) {
        const event = {
            type: 'SCORE_UPDATE',
            data: {
                playerId,
                score,
                reason, // 'enemy_kill', 'power_up', etc.
                timestamp: Date.now()
            }
        };
        
        return this.emitEvent(event);
    }
    
    // Generic event emission with error handling
    async emitEvent(event) {
        try {
            // Add to queue for batch processing
            this.eventQueue.push(event);
            
            // Process queue if not already processing
            if (!this.isProcessing) {
                await this.processEventQueue();
            }
            
            return { success: true, event };
        } catch (error) {
            console.error('Event emission failed:', error);
            
            // Store failed events for retry
            this.storeFailedEvent(event);
            
            return { success: false, error, event };
        }
    }
    
    async processEventQueue() {
        this.isProcessing = true;
        
        while (this.eventQueue.length > 0) {
            const event = this.eventQueue.shift();
            
            try {
                await this.sendToBlockchain(event);
            } catch (error) {
                // Re-queue failed events
                this.eventQueue.unshift(event);
                break;
            }
        }
        
        this.isProcessing = false;
    }
}
```

### 2. Event Listening Pattern

```javascript
class GameEventListener {
    constructor(somniaConnector, game) {
        this.connector = somniaConnector;
        this.game = game;
        this.eventHandlers = new Map();
        this.setupEventHandlers();
    }
    
    setupEventHandlers() {
        // Player movement events
        this.onEvent('PlayerMovement', (event) => {
            const { playerId, position, rotation, timestamp } = event.data;
            
            // Update remote player if not current player
            if (playerId !== this.game.currentPlayerId) {
                this.game.updateRemotePlayer(playerId, {
                    position,
                    rotation,
                    timestamp
                });
            }
        });
        
        // Score update events
        this.onEvent('ScoreUpdate', (event) => {
            const { playerId, score, reason } = event.data;
            
            // Update game state
            this.game.gameState.updatePlayerScore(playerId, score);
            
            // Update leaderboard
            this.game.uiManager.updateLeaderboard();
            
            // Show notification if it's current player
            if (playerId === this.game.currentPlayerId) {
                this.game.uiManager.showNotification(
                    `+${score} points for ${reason}!`
                );
            }
        });
        
        // Power-up collection events
        this.onEvent('PowerUpCollected', (event) => {
            const { playerId, powerUpType, position } = event.data;
            
            // Remove power-up from game world
            this.game.removePowerUp(position);
            
            // Show collection effect
            this.game.showCollectionEffect(position, powerUpType);
        });
        
        // Enemy spawn events
        this.onEvent('EnemySpawned', (event) => {
            const { enemyId, type, position, health } = event.data;
            
            // Spawn enemy in game world
            this.game.spawnEnemy(enemyId, type, position, health);
        });
    }
    
    onEvent(eventType, handler) {
        if (!this.eventHandlers.has(eventType)) {
            this.eventHandlers.set(eventType, []);
        }
        
        this.eventHandlers.get(eventType).push(handler);
        
        // Setup blockchain listener
        this.connector.contract.on(eventType, (...args) => {
            const event = this.parseBlockchainEvent(eventType, args);
            this.handleEvent(eventType, event);
        });
    }
    
    handleEvent(eventType, event) {
        const handlers = this.eventHandlers.get(eventType) || [];
        
        for (const handler of handlers) {
            try {
                handler(event);
            } catch (error) {
                console.error(`Error handling ${eventType}:`, error);
            }
        }
    }
}
```

## Real-time Event Streaming

### 1. Stream Management

```javascript
class SomniaStreamManager {
    constructor(connector) {
        this.connector = connector;
        this.streams = new Map();
        this.reconnectAttempts = 0;
        this.maxReconnectAttempts = 5;
    }
    
    // Create a new data stream
    createStream(streamId, config) {
        const stream = new SomniaDataStream(streamId, {
            ...config,
            onData: (data) => this.handleStreamData(streamId, data),
            onError: (error) => this.handleStreamError(streamId, error),
            onReconnect: () => this.handleStreamReconnect(streamId)
        });
        
        this.streams.set(streamId, stream);
        return stream;
    }
    
    // Handle incoming stream data
    handleStreamData(streamId, data) {
        try {
            // Validate data
            if (!this.validateStreamData(data)) {
                console.warn('Invalid stream data received:', data);
                return;
            }
            
            // Process based on data type
            switch (data.type) {
                case 'GAME_STATE_UPDATE':
                    this.handleGameStateUpdate(data);
                    break;
                    
                case 'PLAYER_ACTION':
                    this.handlePlayerAction(data);
                    break;
                    
                case 'LEADERBOARD_UPDATE':
                    this.handleLeaderboardUpdate(data);
                    break;
                    
                default:
                    console.warn('Unknown stream data type:', data.type);
            }
        } catch (error) {
            console.error('Error processing stream data:', error);
        }
    }
    
    // Handle stream errors with automatic recovery
    handleStreamError(streamId, error) {
        console.error(`Stream ${streamId} error:`, error);
        
        const stream = this.streams.get(streamId);
        if (stream && this.reconnectAttempts < this.maxReconnectAttempts) {
            setTimeout(() => {
                this.reconnectStream(streamId);
            }, Math.pow(2, this.reconnectAttempts) * 1000); // Exponential backoff
            
            this.reconnectAttempts++;
        }
    }
    
    async reconnectStream(streamId) {
        try {
            const stream = this.streams.get(streamId);
            if (stream) {
                await stream.reconnect();
                this.reconnectAttempts = 0;
                console.log(`Stream ${streamId} reconnected successfully`);
            }
        } catch (error) {
            console.error(`Failed to reconnect stream ${streamId}:`, error);
            this.handleStreamError(streamId, error);
        }
    }
}
```

### 2. Data Synchronization

```javascript
class DataSynchronizer {
    constructor(localState, streamManager) {
        this.localState = localState;
        this.streamManager = streamManager;
        this.syncQueue = [];
        this.lastSyncTimestamp = 0;
    }
    
    // Sync local state with blockchain
    async syncWithBlockchain() {
        try {
            // Get latest blockchain state
            const blockchainState = await this.getBlockchainState();
            
            // Compare timestamps
            if (blockchainState.timestamp > this.lastSyncTimestamp) {
                // Merge states
                const mergedState = this.mergeStates(
                    this.localState,
                    blockchainState
                );
                
                // Apply merged state
                this.applyState(mergedState);
                
                // Update sync timestamp
                this.lastSyncTimestamp = blockchainState.timestamp;
            }
        } catch (error) {
            console.error('Sync failed:', error);
        }
    }
    
    mergeStates(localState, blockchainState) {
        const merged = { ...localState };
        
        // Blockchain state takes precedence for conflicts
        for (const key in blockchainState.data) {
            const localValue = localState[key];
            const blockchainValue = blockchainState.data[key];
            
            if (!localValue || 
                blockchainValue.timestamp > localValue.timestamp) {
                merged[key] = blockchainValue;
            }
        }
        
        return merged;
    }
    
    // Optimistic updates with rollback capability
    async optimisticUpdate(key, value, emitToBlockchain = true) {
        // Store original value for potential rollback
        const originalValue = this.localState[key];
        
        // Apply update locally
        this.localState[key] = {
            ...value,
            timestamp: Date.now(),
            optimistic: true
        };
        
        // Emit to UI immediately
        this.emitStateChange(key, value);
        
        if (emitToBlockchain) {
            try {
                // Emit to blockchain
                await this.emitToBlockchain(key, value);
                
                // Mark as confirmed
                this.localState[key].optimistic = false;
            } catch (error) {
                // Rollback on failure
                this.localState[key] = originalValue;
                this.emitStateChange(key, originalValue);
                throw error;
            }
        }
    }
}
```

## State Management

### 1. Reactive State Store

```javascript
class ReactiveStateStore {
    constructor() {
        this.state = {};
        this.subscribers = new Map();
        this.middleware = [];
    }
    
    // Subscribe to state changes
    subscribe(path, callback) {
        if (!this.subscribers.has(path)) {
            this.subscribers.set(path, new Set());
        }
        
        this.subscribers.get(path).add(callback);
        
        // Return unsubscribe function
        return () => {
            this.subscribers.get(path).delete(callback);
        };
    }
    
    // Update state and notify subscribers
    setState(path, value) {
        // Apply middleware
        for (const middleware of this.middleware) {
            value = middleware(path, value, this.state);
        }
        
        // Update state
        this.setNestedValue(this.state, path, value);
        
        // Notify subscribers
        this.notifySubscribers(path, value);
    }
    
    // Get state value
    getState(path) {
        return this.getNestedValue(this.state, path);
    }
    
    // Add middleware for state transformations
    addMiddleware(middleware) {
        this.middleware.push(middleware);
    }
    
    notifySubscribers(path, value) {
        // Notify exact path subscribers
        const exactSubscribers = this.subscribers.get(path);
        if (exactSubscribers) {
            exactSubscribers.forEach(callback => {
                try {
                    callback(value, path);
                } catch (error) {
                    console.error('Subscriber error:', error);
                }
            });
        }
        
        // Notify parent path subscribers
        const pathParts = path.split('.');
        for (let i = pathParts.length - 1; i > 0; i--) {
            const parentPath = pathParts.slice(0, i).join('.');
            const parentSubscribers = this.subscribers.get(parentPath);
            
            if (parentSubscribers) {
                const parentValue = this.getState(parentPath);
                parentSubscribers.forEach(callback => {
                    try {
                        callback(parentValue, parentPath);
                    } catch (error) {
                        console.error('Parent subscriber error:', error);
                    }
                });
            }
        }
    }
}
```

### 2. Game State Integration

```javascript
class GameStateManager {
    constructor(somniaConnector) {
        this.connector = somniaConnector;
        this.store = new ReactiveStateStore();
        this.setupStateSync();
    }
    
    setupStateSync() {
        // Sync player state
        this.store.subscribe('player', (playerState) => {
            this.connector.emitPlayerState(playerState);
        });
        
        // Sync game state
        this.store.subscribe('game', (gameState) => {
            this.connector.emitGameState(gameState);
        });
        
        // Listen for blockchain updates
        this.connector.onPlayerStateUpdate((data) => {
            this.store.setState('player', data);
        });
        
        this.connector.onGameStateUpdate((data) => {
            this.store.setState('game', data);
        });
    }
    
    // Player actions
    updatePlayerPosition(position) {
        this.store.setState('player.position', position);
    }
    
    updatePlayerHealth(health) {
        this.store.setState('player.health', health);
    }
    
    updateScore(score) {
        this.store.setState('player.score', score);
    }
    
    // Game actions
    spawnEnemy(enemy) {
        const enemies = this.store.getState('game.enemies') || [];
        enemies.push(enemy);
        this.store.setState('game.enemies', enemies);
    }
    
    removeEnemy(enemyId) {
        const enemies = this.store.getState('game.enemies') || [];
        const filtered = enemies.filter(enemy => enemy.id !== enemyId);
        this.store.setState('game.enemies', filtered);
    }
}
```

## Performance Optimization

### 1. Event Batching

```javascript
class EventBatcher {
    constructor(connector, batchSize = 10, flushInterval = 100) {
        this.connector = connector;
        this.batchSize = batchSize;
        this.flushInterval = flushInterval;
        this.eventBatch = [];
        this.flushTimer = null;
    }
    
    addEvent(event) {
        this.eventBatch.push({
            ...event,
            timestamp: Date.now()
        });
        
        // Flush if batch is full
        if (this.eventBatch.length >= this.batchSize) {
            this.flush();
        } else {
            // Schedule flush if not already scheduled
            if (!this.flushTimer) {
                this.flushTimer = setTimeout(() => {
                    this.flush();
                }, this.flushInterval);
            }
        }
    }
    
    async flush() {
        if (this.eventBatch.length === 0) return;
        
        const batch = [...this.eventBatch];
        this.eventBatch = [];
        
        // Clear flush timer
        if (this.flushTimer) {
            clearTimeout(this.flushTimer);
            this.flushTimer = null;
        }
        
        try {
            await this.connector.emitEventBatch(batch);
        } catch (error) {
            console.error('Batch flush failed:', error);
            // Re-add failed events to batch
            this.eventBatch.unshift(...batch);
        }
    }
}
```

### 2. Connection Pooling

```javascript
class ConnectionPool {
    constructor(maxConnections = 5) {
        this.maxConnections = maxConnections;
        this.connections = [];
        this.activeConnections = 0;
        this.waitingQueue = [];
    }
    
    async getConnection() {
        // Return existing connection if available
        if (this.connections.length > 0) {
            return this.connections.pop();
        }
        
        // Create new connection if under limit
        if (this.activeConnections < this.maxConnections) {
            this.activeConnections++;
            return await this.createConnection();
        }
        
        // Wait for connection to become available
        return new Promise((resolve) => {
            this.waitingQueue.push(resolve);
        });
    }
    
    releaseConnection(connection) {
        // Serve waiting requests first
        if (this.waitingQueue.length > 0) {
            const resolve = this.waitingQueue.shift();
            resolve(connection);
        } else {
            // Return to pool
            this.connections.push(connection);
        }
    }
    
    async createConnection() {
        const provider = new ethers.JsonRpcProvider(
            process.env.VITE_SOMNIA_RPC_URL
        );
        
        // Test connection
        await provider.getNetwork();
        
        return provider;
    }
}
```

## Error Handling

### 1. Comprehensive Error Handling

```javascript
class SomniaErrorHandler {
    constructor() {
        this.errorTypes = {
            NETWORK_ERROR: 'network',
            CONTRACT_ERROR: 'contract',
            VALIDATION_ERROR: 'validation',
            TIMEOUT_ERROR: 'timeout'
        };
        
        this.retryStrategies = new Map();
        this.setupRetryStrategies();
    }
    
    setupRetryStrategies() {
        // Network errors - exponential backoff
        this.retryStrategies.set(this.errorTypes.NETWORK_ERROR, {
            maxRetries: 5,
            baseDelay: 1000,
            backoffMultiplier: 2
        });
        
        // Contract errors - immediate retry with limit
        this.retryStrategies.set(this.errorTypes.CONTRACT_ERROR, {
            maxRetries: 3,
            baseDelay: 500,
            backoffMultiplier: 1
        });
        
        // Validation errors - no retry
        this.retryStrategies.set(this.errorTypes.VALIDATION_ERROR, {
            maxRetries: 0
        });
    }
    
    async handleError(error, operation, context = {}) {
        const errorType = this.classifyError(error);
        const strategy = this.retryStrategies.get(errorType);
        
        if (!strategy || strategy.maxRetries === 0) {
            throw error;
        }
        
        return this.retryWithStrategy(operation, strategy, context);
    }
    
    classifyError(error) {
        if (error.code === 'NETWORK_ERROR' || error.code === 'TIMEOUT') {
            return this.errorTypes.NETWORK_ERROR;
        }
        
        if (error.code === 'CALL_EXCEPTION' || error.code === 'UNPREDICTABLE_GAS_LIMIT') {
            return this.errorTypes.CONTRACT_ERROR;
        }
        
        if (error.code === 'INVALID_ARGUMENT') {
            return this.errorTypes.VALIDATION_ERROR;
        }
        
        return this.errorTypes.NETWORK_ERROR; // Default
    }
    
    async retryWithStrategy(operation, strategy, context) {
        let lastError;
        
        for (let attempt = 0; attempt <= strategy.maxRetries; attempt++) {
            try {
                return await operation(context);
            } catch (error) {
                lastError = error;
                
                if (attempt < strategy.maxRetries) {
                    const delay = strategy.baseDelay * 
                        Math.pow(strategy.backoffMultiplier, attempt);
                    
                    console.warn(`Retry attempt ${attempt + 1} in ${delay}ms:`, error.message);
                    await this.delay(delay);
                }
            }
        }
        
        throw lastError;
    }
    
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}
```

## Best Practices

### 1. Event Design Patterns

```javascript
// Good: Structured event with metadata
const goodEvent = {
    type: 'PLAYER_ACTION',
    version: '1.0',
    data: {
        playerId: 'player123',
        action: 'FIRE_WEAPON',
        position: { x: 10, y: 0, z: 5 },
        direction: { x: 1, y: 0, z: 0 },
        weaponType: 'LASER'
    },
    metadata: {
        timestamp: Date.now(),
        sessionId: 'session456',
        gameVersion: '1.2.3'
    }
};

// Bad: Unstructured event
const badEvent = {
    player: 'player123',
    x: 10,
    y: 0,
    z: 5,
    action: 'fire',
    weapon: 'laser'
};
```

### 2. State Management Patterns

```javascript
// Good: Immutable state updates
const updateGameState = (currentState, action) => {
    switch (action.type) {
        case 'UPDATE_PLAYER_POSITION':
            return {
                ...currentState,
                players: {
                    ...currentState.players,
                    [action.playerId]: {
                        ...currentState.players[action.playerId],
                        position: action.position,
                        lastUpdate: Date.now()
                    }
                }
            };
        
        default:
            return currentState;
    }
};

// Bad: Mutating state directly
const badUpdateGameState = (currentState, action) => {
    currentState.players[action.playerId].position = action.position;
    return currentState;
};
```

### 3. Performance Monitoring

```javascript
class PerformanceMonitor {
    constructor() {
        this.metrics = {
            eventLatency: [],
            throughput: 0,
            errorRate: 0
        };
    }
    
    measureEventLatency(startTime) {
        const latency = Date.now() - startTime;
        this.metrics.eventLatency.push(latency);
        
        // Keep only last 100 measurements
        if (this.metrics.eventLatency.length > 100) {
            this.metrics.eventLatency.shift();
        }
        
        return latency;
    }
    
    getAverageLatency() {
        if (this.metrics.eventLatency.length === 0) return 0;
        
        const sum = this.metrics.eventLatency.reduce((a, b) => a + b, 0);
        return sum / this.metrics.eventLatency.length;
    }
    
    reportMetrics() {
        console.log('Performance Metrics:', {
            averageLatency: this.getAverageLatency(),
            throughput: this.metrics.throughput,
            errorRate: this.metrics.errorRate
        });
    }
}
```

This integration guide provides a comprehensive foundation for working with Somnia Data Streams. Use these patterns and examples as a starting point for building your own reactive blockchain applications.