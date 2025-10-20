# Developer Guide: Somnia Space Raiders

This comprehensive guide will help developers understand, modify, and extend the Somnia Space Raiders game. Whether you're new to blockchain gaming or an experienced developer, this guide provides the knowledge needed to work with Somnia Data Streams.

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Somnia Data Streams Integration](#somnia-data-streams-integration)
3. [Game Engine Deep Dive](#game-engine-deep-dive)
4. [Blockchain Integration Patterns](#blockchain-integration-patterns)
5. [Performance Optimization](#performance-optimization)
6. [Testing Strategies](#testing-strategies)
7. [Deployment Guide](#deployment-guide)
8. [Troubleshooting](#troubleshooting)

## Architecture Overview

### System Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Frontend UI   │    │   Game Engine   │    │   Blockchain    │
│                 │    │                 │    │                 │
│ • UI Manager    │◄──►│ • Three.js      │◄──►│ • Somnia        │
│ • HUD Elements  │    │ • Physics       │    │ • Data Streams  │
│ • Leaderboard   │    │ • Entities      │    │ • Smart Contract│
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         └───────────────────────┼───────────────────────┘
                                 │
                    ┌─────────────────┐
                    │ Event Coordinator│
                    │                 │
                    │ • State Sync    │
                    │ • Event Router  │
                    │ • Data Flow     │
                    └─────────────────┘
```

### Core Components

#### 1. SomniaConnector (`src/blockchain/SomniaConnector.js`)
- **Purpose**: Manages all blockchain interactions
- **Key Features**:
  - Web3 wallet connection
  - Smart contract interactions
  - Real-time event streaming
  - Network management

#### 2. Game Engine (`src/game/Game.js`)
- **Purpose**: Core game logic and rendering
- **Key Features**:
  - Three.js scene management
  - Physics simulation
  - Entity lifecycle management
  - Collision detection

#### 3. UIManager (`src/ui/UIManager.js`)
- **Purpose**: User interface management
- **Key Features**:
  - HUD updates
  - Leaderboard display
  - Connection status
  - Game notifications

## Somnia Data Streams Integration

### Understanding Data Streams

Somnia Data Streams enable real-time, reactive programming on the blockchain. Here's how they work in our game:

#### 1. Event Emission Pattern

```javascript
// Player action triggers blockchain event
async emitPlayerMovement(movementData) {
    try {
        // Emit to blockchain
        const tx = await this.contract.emitMovement(
            movementData.playerId,
            movementData.position,
            movementData.rotation,
            movementData.timestamp
        );
        
        // Wait for confirmation
        await tx.wait();
        
        // Update local state
        this.updateLocalState(movementData);
    } catch (error) {
        console.error('Failed to emit movement:', error);
        // Fallback to local-only update
        this.updateLocalState(movementData);
    }
}
```

#### 2. Event Listening Pattern

```javascript
// React to blockchain events
setupEventListeners() {
    // Listen for player movements
    this.contract.on('PlayerMovement', (playerId, position, rotation, timestamp) => {
        if (playerId !== this.currentPlayerId) {
            this.game.updateRemotePlayer(playerId, { position, rotation, timestamp });
        }
    });
    
    // Listen for score updates
    this.contract.on('ScoreUpdate', (playerId, score, timestamp) => {
        this.game.gameState.updatePlayerScore(playerId, score);
        this.uiManager.updateLeaderboard();
    });
}
```

#### 3. State Synchronization

```javascript
// Sync game state with blockchain
async syncGameState() {
    try {
        // Get latest blockchain state
        const blockchainState = await this.contract.getGameState();
        
        // Merge with local state
        this.game.gameState.mergeBlockchainState(blockchainState);
        
        // Update UI
        this.uiManager.updateFromGameState(this.game.gameState);
    } catch (error) {
        console.error('State sync failed:', error);
    }
}
```

### Best Practices for Data Streams

#### 1. Event Batching
```javascript
// Batch multiple events for efficiency
class EventBatcher {
    constructor(batchSize = 10, flushInterval = 1000) {
        this.batch = [];
        this.batchSize = batchSize;
        this.flushInterval = flushInterval;
        this.startBatchTimer();
    }
    
    addEvent(event) {
        this.batch.push(event);
        if (this.batch.length >= this.batchSize) {
            this.flush();
        }
    }
    
    async flush() {
        if (this.batch.length === 0) return;
        
        try {
            await this.contract.emitBatchEvents(this.batch);
            this.batch = [];
        } catch (error) {
            console.error('Batch flush failed:', error);
        }
    }
}
```

#### 2. Optimistic Updates
```javascript
// Update UI immediately, sync with blockchain later
async optimisticUpdate(action, data) {
    // 1. Update UI immediately
    this.updateUI(action, data);
    
    // 2. Emit to blockchain
    try {
        await this.emitToBlockchain(action, data);
    } catch (error) {
        // 3. Revert UI if blockchain fails
        this.revertUI(action, data);
        throw error;
    }
}
```

## Game Engine Deep Dive

### Entity System Architecture

#### Base Entity Class
```javascript
class Entity {
    constructor(scene, position = { x: 0, y: 0, z: 0 }) {
        this.scene = scene;
        this.position = position;
        this.mesh = null;
        this.body = null; // Physics body
        this.active = true;
        this.id = this.generateId();
    }
    
    // Lifecycle methods
    init() { /* Override in subclasses */ }
    update(deltaTime) { /* Override in subclasses */ }
    destroy() { /* Cleanup resources */ }
    
    // Common functionality
    setPosition(x, y, z) {
        this.position = { x, y, z };
        if (this.mesh) {
            this.mesh.position.set(x, y, z);
        }
        if (this.body) {
            this.body.position.set(x, y, z);
        }
    }
}
```

#### Player Entity Implementation
```javascript
class Player extends Entity {
    constructor(scene, somniaConnector) {
        super(scene);
        this.somniaConnector = somniaConnector;
        this.health = 100;
        this.energy = 100;
        this.weapons = new WeaponSystem();
        this.powerUps = new PowerUpManager();
    }
    
    update(deltaTime, inputManager) {
        // Handle input
        this.handleMovement(inputManager, deltaTime);
        this.handleActions(inputManager);
        
        // Update systems
        this.weapons.update(deltaTime);
        this.powerUps.update(deltaTime);
        
        // Emit movement to blockchain
        if (this.hasMovementChanged()) {
            this.emitMovement();
        }
    }
    
    async emitMovement() {
        await this.somniaConnector.emitPlayerMovement({
            playerId: this.id,
            position: this.position,
            rotation: this.rotation,
            timestamp: Date.now()
        });
    }
}
```

### Physics Integration

#### Collision Detection System
```javascript
class CollisionSystem {
    constructor(world) {
        this.world = world; // Cannon.js world
        this.spatialGrid = new SpatialGrid(100); // Optimization
    }
    
    update() {
        // Update spatial grid
        this.updateSpatialGrid();
        
        // Check collisions
        this.checkPlayerCollisions();
        this.checkProjectileCollisions();
        this.checkPowerUpCollisions();
    }
    
    checkPlayerCollisions() {
        const nearbyEnemies = this.spatialGrid.getNearby(
            this.player.position, 
            this.player.collisionRadius
        );
        
        for (const enemy of nearbyEnemies) {
            if (this.isColliding(this.player, enemy)) {
                this.handlePlayerEnemyCollision(this.player, enemy);
            }
        }
    }
}
```

### Performance Optimization Techniques

#### 1. Object Pooling
```javascript
class ObjectPool {
    constructor(createFn, resetFn, initialSize = 50) {
        this.createFn = createFn;
        this.resetFn = resetFn;
        this.pool = [];
        this.active = [];
        
        // Pre-populate pool
        for (let i = 0; i < initialSize; i++) {
            this.pool.push(this.createFn());
        }
    }
    
    acquire() {
        let obj = this.pool.pop();
        if (!obj) {
            obj = this.createFn();
        }
        this.active.push(obj);
        return obj;
    }
    
    release(obj) {
        const index = this.active.indexOf(obj);
        if (index > -1) {
            this.active.splice(index, 1);
            this.resetFn(obj);
            this.pool.push(obj);
        }
    }
}

// Usage
const projectilePool = new ObjectPool(
    () => new Projectile(),
    (projectile) => projectile.reset(),
    100
);
```

#### 2. Level of Detail (LOD)
```javascript
class LODManager {
    constructor(camera) {
        this.camera = camera;
        this.lodLevels = [
            { distance: 50, detail: 'high' },
            { distance: 100, detail: 'medium' },
            { distance: 200, detail: 'low' }
        ];
    }
    
    updateLOD(entities) {
        for (const entity of entities) {
            const distance = this.camera.position.distanceTo(entity.position);
            const lodLevel = this.getLODLevel(distance);
            entity.setLOD(lodLevel);
        }
    }
    
    getLODLevel(distance) {
        for (const level of this.lodLevels) {
            if (distance < level.distance) {
                return level.detail;
            }
        }
        return 'lowest';
    }
}
```

## Blockchain Integration Patterns

### Smart Contract Interface

```solidity
// Example Somnia game contract
contract SomniaSpaceRaiders {
    struct Player {
        address wallet;
        uint256 score;
        uint256 level;
        uint256 lastActive;
    }
    
    struct GameEvent {
        address player;
        string eventType;
        bytes data;
        uint256 timestamp;
    }
    
    mapping(address => Player) public players;
    GameEvent[] public gameEvents;
    
    event PlayerMovement(address indexed player, int256 x, int256 y, int256 z, uint256 timestamp);
    event ScoreUpdate(address indexed player, uint256 score, uint256 timestamp);
    event PowerUpCollected(address indexed player, string powerUpType, uint256 timestamp);
    
    function emitMovement(int256 x, int256 y, int256 z) external {
        emit PlayerMovement(msg.sender, x, y, z, block.timestamp);
    }
    
    function updateScore(uint256 newScore) external {
        players[msg.sender].score = newScore;
        emit ScoreUpdate(msg.sender, newScore, block.timestamp);
    }
}
```

### Event Handling Patterns

#### 1. Event Aggregation
```javascript
class EventAggregator {
    constructor() {
        this.handlers = new Map();
        this.eventQueue = [];
        this.processing = false;
    }
    
    subscribe(eventType, handler) {
        if (!this.handlers.has(eventType)) {
            this.handlers.set(eventType, []);
        }
        this.handlers.get(eventType).push(handler);
    }
    
    emit(eventType, data) {
        this.eventQueue.push({ eventType, data, timestamp: Date.now() });
        this.processQueue();
    }
    
    async processQueue() {
        if (this.processing) return;
        this.processing = true;
        
        while (this.eventQueue.length > 0) {
            const event = this.eventQueue.shift();
            await this.processEvent(event);
        }
        
        this.processing = false;
    }
}
```

#### 2. State Reconciliation
```javascript
class StateReconciler {
    constructor(localState, blockchainState) {
        this.localState = localState;
        this.blockchainState = blockchainState;
    }
    
    reconcile() {
        const conflicts = this.findConflicts();
        const resolution = this.resolveConflicts(conflicts);
        return this.applyResolution(resolution);
    }
    
    findConflicts() {
        const conflicts = [];
        
        // Compare timestamps and values
        for (const key in this.localState) {
            if (this.blockchainState[key] && 
                this.localState[key].timestamp < this.blockchainState[key].timestamp) {
                conflicts.push({
                    key,
                    local: this.localState[key],
                    blockchain: this.blockchainState[key]
                });
            }
        }
        
        return conflicts;
    }
}
```

## Testing Strategies

### Unit Testing

```javascript
// Example test for Player entity
describe('Player Entity', () => {
    let player, mockSomniaConnector, mockScene;
    
    beforeEach(() => {
        mockScene = new MockScene();
        mockSomniaConnector = new MockSomniaConnector();
        player = new Player(mockScene, mockSomniaConnector);
    });
    
    test('should emit movement when position changes', async () => {
        // Arrange
        const newPosition = { x: 10, y: 0, z: 5 };
        
        // Act
        player.setPosition(newPosition.x, newPosition.y, newPosition.z);
        await player.update(16); // 16ms delta time
        
        // Assert
        expect(mockSomniaConnector.emitPlayerMovement).toHaveBeenCalledWith({
            playerId: player.id,
            position: newPosition,
            rotation: player.rotation,
            timestamp: expect.any(Number)
        });
    });
});
```

### Integration Testing

```javascript
// Test blockchain integration
describe('Blockchain Integration', () => {
    let somniaConnector, mockProvider;
    
    beforeEach(async () => {
        mockProvider = new MockProvider();
        somniaConnector = new SomniaConnector();
        await somniaConnector.connect(mockProvider);
    });
    
    test('should handle network disconnection gracefully', async () => {
        // Simulate network failure
        mockProvider.simulateDisconnection();
        
        // Attempt to emit event
        const result = await somniaConnector.emitPlayerMovement({
            playerId: 'test',
            position: { x: 0, y: 0, z: 0 }
        });
        
        // Should fallback to local storage
        expect(result.fallback).toBe(true);
        expect(localStorage.getItem('pendingEvents')).toBeTruthy();
    });
});
```

## Deployment Guide

### Production Build

```bash
# 1. Install dependencies
npm install

# 2. Build for production
npm run build

# 3. Test production build
npm run preview

# 4. Deploy to hosting service
npm run deploy
```

### Environment Configuration

```javascript
// vite.config.js - Production optimizations
export default defineConfig({
    build: {
        target: 'es2015',
        minify: 'terser',
        rollupOptions: {
            output: {
                manualChunks: {
                    vendor: ['three', 'cannon-es'],
                    blockchain: ['ethers']
                }
            }
        }
    },
    define: {
        'process.env.NODE_ENV': JSON.stringify('production')
    }
});
```

### Performance Monitoring

```javascript
// Performance monitoring setup
class PerformanceMonitor {
    constructor() {
        this.metrics = {
            fps: 0,
            frameTime: 0,
            memoryUsage: 0,
            blockchainLatency: 0
        };
    }
    
    startMonitoring() {
        setInterval(() => {
            this.updateMetrics();
            this.reportMetrics();
        }, 1000);
    }
    
    updateMetrics() {
        this.metrics.fps = this.calculateFPS();
        this.metrics.memoryUsage = this.getMemoryUsage();
        this.metrics.blockchainLatency = this.getBlockchainLatency();
    }
}
```

## Troubleshooting

### Common Issues

#### 1. MetaMask Connection Issues
```javascript
// Debug MetaMask connection
async function debugMetaMaskConnection() {
    if (!window.ethereum) {
        console.error('MetaMask not installed');
        return;
    }
    
    try {
        const accounts = await window.ethereum.request({
            method: 'eth_requestAccounts'
        });
        console.log('Connected accounts:', accounts);
        
        const chainId = await window.ethereum.request({
            method: 'eth_chainId'
        });
        console.log('Current chain ID:', chainId);
        
    } catch (error) {
        console.error('MetaMask connection error:', error);
    }
}
```

#### 2. Performance Issues
```javascript
// Performance debugging
class PerformanceDebugger {
    constructor() {
        this.frameCount = 0;
        this.lastTime = performance.now();
    }
    
    checkPerformance() {
        const now = performance.now();
        const deltaTime = now - this.lastTime;
        
        if (deltaTime > 16.67) { // > 60 FPS
            console.warn(`Frame took ${deltaTime}ms (target: 16.67ms)`);
            this.analyzeBottlenecks();
        }
        
        this.lastTime = now;
        this.frameCount++;
    }
    
    analyzeBottlenecks() {
        // Check entity count
        console.log('Active entities:', this.game.entities.length);
        
        // Check draw calls
        console.log('Draw calls:', this.renderer.info.render.calls);
        
        // Check memory usage
        console.log('Memory:', performance.memory);
    }
}
```

### Debug Tools

#### 1. Blockchain Event Logger
```javascript
class BlockchainEventLogger {
    constructor(somniaConnector) {
        this.connector = somniaConnector;
        this.events = [];
    }
    
    startLogging() {
        this.connector.contract.on('*', (event) => {
            this.events.push({
                type: event.event,
                data: event.args,
                timestamp: Date.now(),
                blockNumber: event.blockNumber
            });
            
            console.log('Blockchain Event:', event);
        });
    }
    
    exportLogs() {
        return JSON.stringify(this.events, null, 2);
    }
}
```

#### 2. Game State Inspector
```javascript
class GameStateInspector {
    constructor(game) {
        this.game = game;
        this.createDebugUI();
    }
    
    createDebugUI() {
        const gui = new dat.GUI();
        
        // Player stats
        const playerFolder = gui.addFolder('Player');
        playerFolder.add(this.game.player, 'health', 0, 100);
        playerFolder.add(this.game.player, 'energy', 0, 100);
        
        // Game state
        const gameFolder = gui.addFolder('Game State');
        gameFolder.add(this.game.gameState, 'score');
        gameFolder.add(this.game.gameState, 'level');
        
        // Performance
        const perfFolder = gui.addFolder('Performance');
        perfFolder.add(this.game, 'fps').listen();
        perfFolder.add(this.game, 'entityCount').listen();
    }
}
```

This developer guide provides comprehensive coverage of the Somnia Space Raiders architecture and implementation details. Use it as a reference for understanding, modifying, and extending the game's functionality.