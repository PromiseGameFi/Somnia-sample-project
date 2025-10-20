# API Reference: Somnia Space Raiders

Complete API documentation for the Somnia Space Raiders game, including all classes, methods, and integration points.

## Table of Contents

1. [SomniaConnector API](#somniaconnector-api)
2. [Game Engine API](#game-engine-api)
3. [Entity System API](#entity-system-api)
4. [UI Manager API](#ui-manager-api)
5. [Game State API](#game-state-api)
6. [Event System API](#event-system-api)
7. [Utility Functions](#utility-functions)

## SomniaConnector API

### Class: `SomniaConnector`

Main interface for blockchain interactions and Somnia Data Streams integration.

#### Constructor

```javascript
new SomniaConnector()
```

Creates a new SomniaConnector instance.

#### Properties

| Property | Type | Description |
|----------|------|-------------|
| `provider` | `ethers.BrowserProvider` | Web3 provider instance |
| `signer` | `ethers.Signer` | Ethereum signer |
| `contract` | `ethers.Contract` | Smart contract instance |
| `isConnected` | `boolean` | Connection status |
| `currentAccount` | `string` | Connected wallet address |

#### Methods

##### `connect()`

```javascript
async connect(): Promise<void>
```

Connects to the Somnia network and initializes the contract.

**Throws:**
- `Error` - If Web3 provider is not found
- `Error` - If network connection fails

**Example:**
```javascript
const connector = new SomniaConnector();
await connector.connect();
```

##### `disconnect()`

```javascript
disconnect(): void
```

Disconnects from the network and cleans up resources.

##### `emitPlayerMovement(data)`

```javascript
async emitPlayerMovement(data: PlayerMovementData): Promise<TransactionResponse>
```

Emits player movement event to the blockchain.

**Parameters:**
- `data` (PlayerMovementData): Movement data object

```typescript
interface PlayerMovementData {
    playerId: string;
    position: { x: number, y: number, z: number };
    rotation: { x: number, y: number, z: number };
    timestamp: number;
}
```

**Returns:** Promise resolving to transaction response

**Example:**
```javascript
await connector.emitPlayerMovement({
    playerId: 'player123',
    position: { x: 10, y: 0, z: 5 },
    rotation: { x: 0, y: 1.57, z: 0 },
    timestamp: Date.now()
});
```

##### `emitWeaponFire(data)`

```javascript
async emitWeaponFire(data: WeaponFireData): Promise<TransactionResponse>
```

Emits weapon fire event to the blockchain.

**Parameters:**
- `data` (WeaponFireData): Weapon fire data

```typescript
interface WeaponFireData {
    playerId: string;
    weaponType: string;
    position: { x: number, y: number, z: number };
    direction: { x: number, y: number, z: number };
    timestamp: number;
}
```

##### `emitScoreUpdate(data)`

```javascript
async emitScoreUpdate(data: ScoreUpdateData): Promise<TransactionResponse>
```

Emits score update event to the blockchain.

**Parameters:**
- `data` (ScoreUpdateData): Score update data

```typescript
interface ScoreUpdateData {
    playerId: string;
    score: number;
    reason: string;
    timestamp: number;
}
```

##### Event Listeners

```javascript
onPlayerMovement(callback: (data: PlayerMovementData) => void): void
onWeaponFire(callback: (data: WeaponFireData) => void): void
onScoreUpdate(callback: (data: ScoreUpdateData) => void): void
onPowerUpCollected(callback: (data: PowerUpData) => void): void
```

**Example:**
```javascript
connector.onScoreUpdate((data) => {
    console.log(`Player ${data.playerId} scored ${data.score} points!`);
});
```

## Game Engine API

### Class: `Game`

Main game engine class managing the 3D scene, physics, and game loop.

#### Constructor

```javascript
new Game(container: HTMLElement, somniaConnector: SomniaConnector)
```

**Parameters:**
- `container` - HTML element to render the game
- `somniaConnector` - Blockchain connector instance

#### Properties

| Property | Type | Description |
|----------|------|-------------|
| `scene` | `THREE.Scene` | Three.js scene |
| `camera` | `THREE.PerspectiveCamera` | Game camera |
| `renderer` | `THREE.WebGLRenderer` | WebGL renderer |
| `world` | `CANNON.World` | Physics world |
| `player` | `Player` | Player entity |
| `entities` | `Array<Entity>` | All game entities |
| `isRunning` | `boolean` | Game running state |

#### Methods

##### `init()`

```javascript
async init(): Promise<void>
```

Initializes the game engine, scene, and all systems.

##### `start()`

```javascript
start(): void
```

Starts the game loop.

##### `stop()`

```javascript
stop(): void
```

Stops the game loop and pauses the game.

##### `update(deltaTime)`

```javascript
update(deltaTime: number): void
```

Updates all game systems and entities.

**Parameters:**
- `deltaTime` - Time elapsed since last frame (milliseconds)

##### `render()`

```javascript
render(): void
```

Renders the current frame.

##### `addEntity(entity)`

```javascript
addEntity(entity: Entity): void
```

Adds an entity to the game world.

##### `removeEntity(entity)`

```javascript
removeEntity(entity: Entity): void
```

Removes an entity from the game world.

##### `spawnEnemy(type, position)`

```javascript
spawnEnemy(type: string, position: Vector3): Enemy
```

Spawns an enemy at the specified position.

**Parameters:**
- `type` - Enemy type ('scout', 'fighter', 'heavy', 'bomber')
- `position` - Spawn position

**Returns:** Created enemy instance

##### `spawnPowerUp(type, position)`

```javascript
spawnPowerUp(type: string, position: Vector3): PowerUp
```

Spawns a power-up at the specified position.

## Entity System API

### Class: `Entity` (Base Class)

Base class for all game entities.

#### Constructor

```javascript
new Entity(scene: THREE.Scene, position?: Vector3)
```

#### Properties

| Property | Type | Description |
|----------|------|-------------|
| `id` | `string` | Unique entity identifier |
| `scene` | `THREE.Scene` | Three.js scene reference |
| `position` | `Vector3` | Entity position |
| `rotation` | `Vector3` | Entity rotation |
| `mesh` | `THREE.Object3D` | 3D mesh |
| `body` | `CANNON.Body` | Physics body |
| `active` | `boolean` | Entity active state |

#### Methods

##### `init()`

```javascript
init(): void
```

Initialize the entity (override in subclasses).

##### `update(deltaTime)`

```javascript
update(deltaTime: number): void
```

Update entity logic (override in subclasses).

##### `destroy()`

```javascript
destroy(): void
```

Clean up entity resources.

### Class: `Player`

Player character entity.

#### Constructor

```javascript
new Player(scene: THREE.Scene, somniaConnector: SomniaConnector)
```

#### Properties

| Property | Type | Description |
|----------|------|-------------|
| `health` | `number` | Player health (0-100) |
| `energy` | `number` | Player energy (0-100) |
| `score` | `number` | Current score |
| `level` | `number` | Current level |
| `weapons` | `WeaponSystem` | Weapon management |
| `powerUps` | `Array<PowerUp>` | Active power-ups |

#### Methods

##### `takeDamage(amount)`

```javascript
takeDamage(amount: number): void
```

Reduces player health by the specified amount.

##### `heal(amount)`

```javascript
heal(amount: number): void
```

Increases player health by the specified amount.

##### `addScore(points, reason)`

```javascript
addScore(points: number, reason: string): void
```

Adds points to the player's score.

##### `applyPowerUp(powerUp)`

```javascript
applyPowerUp(powerUp: PowerUp): void
```

Applies a power-up effect to the player.

### Class: `Enemy`

AI-controlled enemy entity.

#### Constructor

```javascript
new Enemy(scene: THREE.Scene, type: string, position: Vector3)
```

#### Properties

| Property | Type | Description |
|----------|------|-------------|
| `type` | `string` | Enemy type |
| `health` | `number` | Enemy health |
| `maxHealth` | `number` | Maximum health |
| `speed` | `number` | Movement speed |
| `damage` | `number` | Attack damage |
| `aiState` | `string` | Current AI state |

#### Methods

##### `takeDamage(amount)`

```javascript
takeDamage(amount: number): void
```

Reduces enemy health and handles death.

##### `setTarget(target)`

```javascript
setTarget(target: Entity): void
```

Sets the enemy's target for AI behavior.

### Class: `PowerUp`

Collectible power-up entity.

#### Constructor

```javascript
new PowerUp(scene: THREE.Scene, type: string, position: Vector3)
```

#### Properties

| Property | Type | Description |
|----------|------|-------------|
| `type` | `string` | Power-up type |
| `effect` | `object` | Effect configuration |
| `duration` | `number` | Effect duration (ms) |
| `lifetime` | `number` | Power-up lifetime (ms) |

#### Methods

##### `applyEffect(player)`

```javascript
applyEffect(player: Player): void
```

Applies the power-up effect to the player.

## UI Manager API

### Class: `UIManager`

Manages all user interface elements and updates.

#### Constructor

```javascript
new UIManager()
```

#### Methods

##### `showStartScreen()`

```javascript
showStartScreen(): void
```

Displays the game start screen.

##### `hideStartScreen()`

```javascript
hideStartScreen(): void
```

Hides the game start screen.

##### `showLoadingScreen(message)`

```javascript
showLoadingScreen(message?: string): void
```

Shows loading screen with optional message.

##### `hideLoadingScreen()`

```javascript
hideLoadingScreen(): void
```

Hides the loading screen.

##### `updateConnectionStatus(status)`

```javascript
updateConnectionStatus(status: string): void
```

Updates the blockchain connection status display.

**Parameters:**
- `status` - Connection status ('connected', 'connecting', 'disconnected', 'error')

##### `updatePlayerStats(stats)`

```javascript
updatePlayerStats(stats: PlayerStats): void
```

Updates the player statistics display.

```typescript
interface PlayerStats {
    health: number;
    energy: number;
    score: number;
    level: number;
    lives: number;
}
```

##### `updateLeaderboard(leaderboard)`

```javascript
updateLeaderboard(leaderboard: Array<LeaderboardEntry>): void
```

Updates the leaderboard display.

```typescript
interface LeaderboardEntry {
    rank: number;
    playerId: string;
    score: number;
    level: number;
}
```

##### `showNotification(message, type)`

```javascript
showNotification(message: string, type?: string): void
```

Shows a notification message.

**Parameters:**
- `message` - Notification text
- `type` - Notification type ('info', 'success', 'warning', 'error')

## Game State API

### Class: `GameState`

Manages game progression, scoring, and statistics.

#### Constructor

```javascript
new GameState()
```

#### Properties

| Property | Type | Description |
|----------|------|-------------|
| `score` | `number` | Current score |
| `level` | `number` | Current level |
| `lives` | `number` | Remaining lives |
| `gameTime` | `number` | Total game time (ms) |
| `statistics` | `object` | Game statistics |

#### Methods

##### `addScore(points, reason)`

```javascript
addScore(points: number, reason: string): void
```

Adds points to the score and checks for level progression.

##### `loseLife()`

```javascript
loseLife(): boolean
```

Removes a life and returns whether the game should continue.

**Returns:** `true` if lives remain, `false` if game over

##### `checkLevelProgression()`

```javascript
checkLevelProgression(): boolean
```

Checks if the player should advance to the next level.

**Returns:** `true` if level increased

##### `getStatistics()`

```javascript
getStatistics(): GameStatistics
```

Returns current game statistics.

```typescript
interface GameStatistics {
    enemiesKilled: number;
    powerUpsCollected: number;
    shotsfired: number;
    shotsHit: number;
    accuracy: number;
    survivalTime: number;
}
```

##### `saveProgress()`

```javascript
saveProgress(): void
```

Saves current progress to local storage.

##### `loadProgress()`

```javascript
loadProgress(): void
```

Loads saved progress from local storage.

## Event System API

### Class: `EventEmitter`

Generic event emitter for game events.

#### Methods

##### `on(event, callback)`

```javascript
on(event: string, callback: Function): void
```

Registers an event listener.

##### `off(event, callback)`

```javascript
off(event: string, callback: Function): void
```

Removes an event listener.

##### `emit(event, ...args)`

```javascript
emit(event: string, ...args: any[]): void
```

Emits an event to all registered listeners.

##### `once(event, callback)`

```javascript
once(event: string, callback: Function): void
```

Registers a one-time event listener.

## Utility Functions

### Vector3 Operations

```javascript
// Create a new Vector3
function createVector3(x: number, y: number, z: number): Vector3

// Calculate distance between two points
function distance(a: Vector3, b: Vector3): number

// Normalize a vector
function normalize(vector: Vector3): Vector3

// Linear interpolation between two vectors
function lerp(a: Vector3, b: Vector3, t: number): Vector3
```

### Math Utilities

```javascript
// Clamp a value between min and max
function clamp(value: number, min: number, max: number): number

// Map a value from one range to another
function map(value: number, inMin: number, inMax: number, outMin: number, outMax: number): number

// Generate random number between min and max
function random(min: number, max: number): number

// Convert degrees to radians
function degToRad(degrees: number): number

// Convert radians to degrees
function radToDeg(radians: number): number
```

### Color Utilities

```javascript
// Create a color from hex string
function hexToColor(hex: string): THREE.Color

// Create a color from RGB values
function rgbToColor(r: number, g: number, b: number): THREE.Color

// Interpolate between two colors
function lerpColor(colorA: THREE.Color, colorB: THREE.Color, t: number): THREE.Color
```

### Storage Utilities

```javascript
// Save data to local storage
function saveToStorage(key: string, data: any): void

// Load data from local storage
function loadFromStorage(key: string): any

// Clear specific storage key
function clearStorage(key: string): void

// Clear all game storage
function clearAllStorage(): void
```

### Performance Utilities

```javascript
// Measure function execution time
function measureTime(fn: Function): number

// Throttle function calls
function throttle(fn: Function, delay: number): Function

// Debounce function calls
function debounce(fn: Function, delay: number): Function

// Object pool for performance optimization
class ObjectPool<T> {
    constructor(createFn: () => T, resetFn: (obj: T) => void, initialSize?: number)
    acquire(): T
    release(obj: T): void
}
```

## Error Handling

### Error Types

```typescript
interface GameError extends Error {
    code: string;
    context?: any;
}

interface BlockchainError extends GameError {
    transactionHash?: string;
    blockNumber?: number;
}

interface NetworkError extends GameError {
    statusCode?: number;
    endpoint?: string;
}
```

### Error Codes

| Code | Description |
|------|-------------|
| `WALLET_NOT_CONNECTED` | Web3 wallet not connected |
| `NETWORK_MISMATCH` | Wrong blockchain network |
| `CONTRACT_ERROR` | Smart contract interaction failed |
| `INSUFFICIENT_FUNDS` | Not enough tokens for transaction |
| `TRANSACTION_FAILED` | Blockchain transaction failed |
| `GAME_INIT_ERROR` | Game initialization failed |
| `ASSET_LOAD_ERROR` | Failed to load game assets |

This API reference provides comprehensive documentation for all public interfaces in the Somnia Space Raiders game. Use it as a guide for integration and extension development.