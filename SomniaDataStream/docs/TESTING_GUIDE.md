# Testing Guide: Somnia Space Raiders

Comprehensive testing strategy and implementation guide for the Somnia Space Raiders game, covering unit tests, integration tests, end-to-end tests, and blockchain testing.

## Table of Contents

1. [Testing Strategy](#testing-strategy)
2. [Test Environment Setup](#test-environment-setup)
3. [Unit Testing](#unit-testing)
4. [Integration Testing](#integration-testing)
5. [End-to-End Testing](#end-to-end-testing)
6. [Blockchain Testing](#blockchain-testing)
7. [Performance Testing](#performance-testing)
8. [Visual Testing](#visual-testing)
9. [Continuous Integration](#continuous-integration)
10. [Test Data Management](#test-data-management)

## Testing Strategy

### Testing Pyramid

```
    /\
   /  \     E2E Tests (Few)
  /____\    - User workflows
 /      \   - Cross-browser
/__________\ - Performance

Integration Tests (Some)
- Component interaction
- API integration
- Blockchain integration

Unit Tests (Many)
- Individual functions
- Component logic
- Game mechanics
```

### Test Categories

1. **Unit Tests**: Individual components and functions
2. **Integration Tests**: Component interactions and API calls
3. **E2E Tests**: Complete user workflows
4. **Blockchain Tests**: Smart contract interactions
5. **Performance Tests**: Frame rate, memory usage, load times
6. **Visual Tests**: UI consistency and rendering

## Test Environment Setup

### Dependencies Installation

```bash
# Core testing dependencies
npm install --save-dev \
  vitest \
  @vitest/ui \
  jsdom \
  @testing-library/dom \
  @testing-library/user-event \
  @testing-library/jest-dom

# E2E testing
npm install --save-dev \
  playwright \
  @playwright/test

# Blockchain testing
npm install --save-dev \
  hardhat \
  @nomiclabs/hardhat-ethers \
  @nomiclabs/hardhat-waffle \
  ethereum-waffle \
  chai

# Performance testing
npm install --save-dev \
  lighthouse \
  puppeteer

# Visual testing
npm install --save-dev \
  @storybook/addon-visual-tests
```

### Vitest Configuration

```javascript
// vitest.config.js
import { defineConfig } from 'vitest/config';
import { resolve } from 'path';

export default defineConfig({
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.js'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'src/test/',
        '**/*.d.ts',
        '**/*.config.js'
      ],
      thresholds: {
        global: {
          branches: 80,
          functions: 80,
          lines: 80,
          statements: 80
        }
      }
    },
    testTimeout: 10000,
    hookTimeout: 10000
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
      '@test': resolve(__dirname, './src/test')
    }
  }
});
```

### Test Setup File

```javascript
// src/test/setup.js
import { vi } from 'vitest';
import '@testing-library/jest-dom';

// Mock Web3 and MetaMask
global.ethereum = {
  request: vi.fn(),
  on: vi.fn(),
  removeListener: vi.fn(),
  isMetaMask: true
};

// Mock WebGL context
const mockWebGL = {
  getExtension: vi.fn(),
  getParameter: vi.fn(),
  createShader: vi.fn(),
  shaderSource: vi.fn(),
  compileShader: vi.fn(),
  createProgram: vi.fn(),
  attachShader: vi.fn(),
  linkProgram: vi.fn(),
  useProgram: vi.fn(),
  getAttribLocation: vi.fn(),
  getUniformLocation: vi.fn(),
  enableVertexAttribArray: vi.fn(),
  vertexAttribPointer: vi.fn(),
  uniform1f: vi.fn(),
  uniformMatrix4fv: vi.fn(),
  createBuffer: vi.fn(),
  bindBuffer: vi.fn(),
  bufferData: vi.fn(),
  drawArrays: vi.fn(),
  viewport: vi.fn(),
  clearColor: vi.fn(),
  clear: vi.fn(),
  enable: vi.fn(),
  depthFunc: vi.fn(),
  blendFunc: vi.fn()
};

HTMLCanvasElement.prototype.getContext = vi.fn((type) => {
  if (type === 'webgl' || type === 'webgl2') {
    return mockWebGL;
  }
  return null;
});

// Mock requestAnimationFrame
global.requestAnimationFrame = vi.fn((cb) => setTimeout(cb, 16));
global.cancelAnimationFrame = vi.fn();

// Mock performance API
global.performance = {
  now: vi.fn(() => Date.now()),
  mark: vi.fn(),
  measure: vi.fn(),
  getEntriesByType: vi.fn(() => []),
  getEntriesByName: vi.fn(() => [])
};

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn()
};
global.localStorage = localStorageMock;
```

## Unit Testing

### Game Engine Tests

```javascript
// src/test/game/Game.test.js
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Game } from '@/game/Game.js';

describe('Game Engine', () => {
  let game;
  let mockContainer;

  beforeEach(() => {
    mockContainer = document.createElement('div');
    game = new Game(mockContainer);
  });

  describe('Initialization', () => {
    it('should initialize with default settings', () => {
      expect(game.isRunning).toBe(false);
      expect(game.isPaused).toBe(false);
      expect(game.scene).toBeDefined();
      expect(game.camera).toBeDefined();
      expect(game.renderer).toBeDefined();
    });

    it('should create game entities', () => {
      expect(game.player).toBeDefined();
      expect(game.enemies).toBeInstanceOf(Array);
      expect(game.powerUps).toBeInstanceOf(Array);
      expect(game.projectiles).toBeInstanceOf(Array);
    });
  });

  describe('Game Loop', () => {
    it('should start the game loop', () => {
      const animateSpy = vi.spyOn(game, 'animate');
      game.start();
      
      expect(game.isRunning).toBe(true);
      expect(animateSpy).toHaveBeenCalled();
    });

    it('should stop the game loop', () => {
      game.start();
      game.stop();
      
      expect(game.isRunning).toBe(false);
    });

    it('should pause and resume the game', () => {
      game.start();
      game.pause();
      
      expect(game.isPaused).toBe(true);
      
      game.resume();
      expect(game.isPaused).toBe(false);
    });
  });

  describe('Entity Management', () => {
    it('should add entities to the scene', () => {
      const initialChildren = game.scene.children.length;
      game.addEntity({ mesh: { position: { x: 0, y: 0, z: 0 } } });
      
      expect(game.scene.children.length).toBe(initialChildren + 1);
    });

    it('should remove entities from the scene', () => {
      const entity = { mesh: { position: { x: 0, y: 0, z: 0 } } };
      game.addEntity(entity);
      const childrenAfterAdd = game.scene.children.length;
      
      game.removeEntity(entity);
      expect(game.scene.children.length).toBe(childrenAfterAdd - 1);
    });
  });
});
```

### Player Entity Tests

```javascript
// src/test/game/entities/Player.test.js
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Player } from '@/game/entities/Player.js';
import { InputManager } from '@/game/InputManager.js';

describe('Player Entity', () => {
  let player;
  let mockInputManager;
  let mockSomniaConnector;

  beforeEach(() => {
    mockInputManager = {
      isKeyPressed: vi.fn(),
      getMouseDelta: vi.fn(() => ({ x: 0, y: 0 })),
      isMousePressed: vi.fn()
    };

    mockSomniaConnector = {
      emitPlayerAction: vi.fn()
    };

    player = new Player(mockInputManager, mockSomniaConnector);
  });

  describe('Movement', () => {
    it('should move forward when W key is pressed', () => {
      mockInputManager.isKeyPressed.mockReturnValue(true);
      const initialZ = player.position.z;
      
      player.update(0.016); // 60 FPS delta
      
      expect(player.position.z).toBeLessThan(initialZ);
    });

    it('should rotate based on mouse input', () => {
      mockInputManager.getMouseDelta.mockReturnValue({ x: 10, y: 5 });
      const initialRotationY = player.rotation.y;
      
      player.update(0.016);
      
      expect(player.rotation.y).not.toBe(initialRotationY);
    });

    it('should respect movement boundaries', () => {
      player.position.x = 100; // Beyond boundary
      player.update(0.016);
      
      expect(player.position.x).toBeLessThanOrEqual(player.maxX);
    });
  });

  describe('Combat', () => {
    it('should fire projectiles when mouse is pressed', () => {
      mockInputManager.isMousePressed.mockReturnValue(true);
      const fireSpy = vi.spyOn(player, 'fire');
      
      player.update(0.016);
      
      expect(fireSpy).toHaveBeenCalled();
    });

    it('should respect fire rate limits', () => {
      mockInputManager.isMousePressed.mockReturnValue(true);
      const fireSpy = vi.spyOn(player, 'fire');
      
      player.update(0.016);
      player.update(0.016); // Immediate second update
      
      expect(fireSpy).toHaveBeenCalledTimes(1);
    });

    it('should take damage and reduce health', () => {
      const initialHealth = player.health;
      player.takeDamage(25);
      
      expect(player.health).toBe(initialHealth - 25);
    });

    it('should die when health reaches zero', () => {
      player.takeDamage(player.health);
      
      expect(player.isAlive).toBe(false);
    });
  });

  describe('Power-ups', () => {
    it('should apply rapid fire power-up', () => {
      const initialFireRate = player.fireRate;
      player.applyPowerUp('rapidFire');
      
      expect(player.fireRate).toBeGreaterThan(initialFireRate);
    });

    it('should remove power-up after duration', async () => {
      const initialFireRate = player.fireRate;
      player.applyPowerUp('rapidFire');
      
      // Fast-forward time
      vi.advanceTimersByTime(5000);
      
      expect(player.fireRate).toBe(initialFireRate);
    });
  });
});
```

### Blockchain Integration Tests

```javascript
// src/test/blockchain/SomniaConnector.test.js
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { SomniaConnector } from '@/blockchain/SomniaConnector.js';

describe('SomniaConnector', () => {
  let connector;
  let mockProvider;
  let mockContract;

  beforeEach(() => {
    mockProvider = {
      request: vi.fn(),
      on: vi.fn(),
      removeListener: vi.fn()
    };

    mockContract = {
      getGameState: vi.fn(),
      submitScore: vi.fn(),
      on: vi.fn(),
      off: vi.fn()
    };

    global.ethereum = mockProvider;
    connector = new SomniaConnector();
    connector.provider = mockProvider;
    connector.contract = mockContract;
  });

  describe('Connection', () => {
    it('should connect to MetaMask', async () => {
      mockProvider.request.mockResolvedValue(['0x123...']);
      
      const result = await connector.connect();
      
      expect(result).toBe(true);
      expect(mockProvider.request).toHaveBeenCalledWith({
        method: 'eth_requestAccounts'
      });
    });

    it('should handle connection errors', async () => {
      mockProvider.request.mockRejectedValue(new Error('User rejected'));
      
      const result = await connector.connect();
      
      expect(result).toBe(false);
    });

    it('should switch to Somnia network', async () => {
      mockProvider.request.mockResolvedValue();
      
      await connector.switchToSomniaNetwork();
      
      expect(mockProvider.request).toHaveBeenCalledWith({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: '0x3c6' }]
      });
    });
  });

  describe('Game Events', () => {
    it('should emit player movement events', () => {
      const emitSpy = vi.spyOn(connector, 'emit');
      
      connector.emitPlayerMovement({ x: 10, y: 0, z: 5 });
      
      expect(emitSpy).toHaveBeenCalledWith('playerMovement', {
        position: { x: 10, y: 0, z: 5 },
        timestamp: expect.any(Number)
      });
    });

    it('should emit score updates', () => {
      const emitSpy = vi.spyOn(connector, 'emit');
      
      connector.emitScoreUpdate(1500);
      
      expect(emitSpy).toHaveBeenCalledWith('scoreUpdate', {
        score: 1500,
        timestamp: expect.any(Number)
      });
    });
  });

  describe('Smart Contract Interaction', () => {
    it('should submit score to blockchain', async () => {
      mockContract.submitScore.mockResolvedValue({ hash: '0xabc...' });
      
      const result = await connector.submitScore(2500);
      
      expect(mockContract.submitScore).toHaveBeenCalledWith(2500);
      expect(result.hash).toBe('0xabc...');
    });

    it('should get leaderboard data', async () => {
      const mockLeaderboard = [
        { player: '0x123...', score: 5000 },
        { player: '0x456...', score: 4500 }
      ];
      mockContract.getLeaderboard.mockResolvedValue(mockLeaderboard);
      
      const leaderboard = await connector.getLeaderboard();
      
      expect(leaderboard).toEqual(mockLeaderboard);
    });
  });
});
```

## Integration Testing

### Game System Integration

```javascript
// src/test/integration/GameSystems.test.js
import { describe, it, expect, beforeEach } from 'vitest';
import { Game } from '@/game/Game.js';
import { CollisionSystem } from '@/game/systems/CollisionSystem.js';
import { SpawnSystem } from '@/game/systems/SpawnSystem.js';

describe('Game Systems Integration', () => {
  let game;
  let collisionSystem;
  let spawnSystem;

  beforeEach(() => {
    const container = document.createElement('div');
    game = new Game(container);
    collisionSystem = new CollisionSystem(game);
    spawnSystem = new SpawnSystem(game);
  });

  it('should handle player-enemy collisions', () => {
    // Spawn enemy near player
    const enemy = spawnSystem.spawnEnemy('scout', {
      x: game.player.position.x,
      y: game.player.position.y,
      z: game.player.position.z + 1
    });

    const initialHealth = game.player.health;
    
    // Trigger collision detection
    collisionSystem.checkCollisions();
    
    expect(game.player.health).toBeLessThan(initialHealth);
  });

  it('should handle projectile-enemy collisions', () => {
    // Create projectile and enemy
    const projectile = game.player.fire();
    const enemy = spawnSystem.spawnEnemy('scout', {
      x: projectile.position.x,
      y: projectile.position.y,
      z: projectile.position.z - 5
    });

    const initialEnemyHealth = enemy.health;
    
    // Move projectile towards enemy
    projectile.position.z -= 10;
    collisionSystem.checkCollisions();
    
    expect(enemy.health).toBeLessThan(initialEnemyHealth);
  });

  it('should spawn enemies based on level progression', () => {
    game.gameState.level = 5;
    const initialEnemyCount = game.enemies.length;
    
    spawnSystem.update(0.016);
    
    expect(game.enemies.length).toBeGreaterThanOrEqual(initialEnemyCount);
  });
});
```

### UI Integration Tests

```javascript
// src/test/integration/UIIntegration.test.js
import { describe, it, expect, beforeEach } from 'vitest';
import { UIManager } from '@/ui/UIManager.js';
import { GameState } from '@/game/GameState.js';

describe('UI Integration', () => {
  let uiManager;
  let gameState;

  beforeEach(() => {
    document.body.innerHTML = `
      <div id="ui-container">
        <div id="score">0</div>
        <div id="health">100</div>
        <div id="level">1</div>
        <div id="leaderboard"></div>
      </div>
    `;
    
    uiManager = new UIManager();
    gameState = new GameState();
  });

  it('should update UI when game state changes', () => {
    gameState.score = 1500;
    gameState.level = 3;
    
    uiManager.updateGameState(gameState);
    
    expect(document.getElementById('score').textContent).toBe('1500');
    expect(document.getElementById('level').textContent).toBe('3');
  });

  it('should display leaderboard correctly', () => {
    const mockLeaderboard = [
      { player: 'Player1', score: 5000 },
      { player: 'Player2', score: 4500 },
      { player: 'Player3', score: 4000 }
    ];
    
    uiManager.updateLeaderboard(mockLeaderboard);
    
    const leaderboardElement = document.getElementById('leaderboard');
    expect(leaderboardElement.children.length).toBe(3);
    expect(leaderboardElement.children[0].textContent).toContain('Player1');
    expect(leaderboardElement.children[0].textContent).toContain('5000');
  });
});
```

## End-to-End Testing

### Playwright Configuration

```javascript
// playwright.config.js
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure'
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] }
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] }
    },
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] }
    },
    {
      name: 'Mobile Chrome',
      use: { ...devices['Pixel 5'] }
    }
  ],
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI
  }
});
```

### E2E Test Examples

```javascript
// e2e/game-flow.spec.js
import { test, expect } from '@playwright/test';

test.describe('Game Flow', () => {
  test('should complete full game session', async ({ page }) => {
    await page.goto('/');
    
    // Wait for game to load
    await expect(page.locator('#game-container')).toBeVisible();
    
    // Start game
    await page.click('#start-button');
    await expect(page.locator('#game-ui')).toBeVisible();
    
    // Check initial game state
    await expect(page.locator('#score')).toHaveText('0');
    await expect(page.locator('#health')).toHaveText('100');
    await expect(page.locator('#level')).toHaveText('1');
    
    // Simulate gameplay
    await page.keyboard.press('KeyW'); // Move forward
    await page.mouse.click(400, 300); // Fire weapon
    
    // Wait for score update
    await page.waitForFunction(() => {
      const score = document.getElementById('score').textContent;
      return parseInt(score) > 0;
    });
    
    // Pause game
    await page.keyboard.press('Escape');
    await expect(page.locator('#pause-menu')).toBeVisible();
    
    // Resume game
    await page.keyboard.press('Escape');
    await expect(page.locator('#pause-menu')).not.toBeVisible();
  });

  test('should handle MetaMask connection', async ({ page }) => {
    // Mock MetaMask
    await page.addInitScript(() => {
      window.ethereum = {
        request: async (params) => {
          if (params.method === 'eth_requestAccounts') {
            return ['0x1234567890123456789012345678901234567890'];
          }
          return null;
        },
        on: () => {},
        removeListener: () => {},
        isMetaMask: true
      };
    });
    
    await page.goto('/');
    
    // Connect wallet
    await page.click('#connect-wallet');
    
    // Check connection status
    await expect(page.locator('#wallet-status')).toHaveText('Connected');
    await expect(page.locator('#wallet-address')).toContainText('0x1234');
  });

  test('should display leaderboard', async ({ page }) => {
    await page.goto('/');
    
    // Navigate to leaderboard
    await page.click('#leaderboard-tab');
    
    // Check leaderboard is visible
    await expect(page.locator('#leaderboard')).toBeVisible();
    
    // Check for leaderboard entries
    const entries = page.locator('.leaderboard-entry');
    await expect(entries).toHaveCount.greaterThan(0);
    
    // Check entry format
    const firstEntry = entries.first();
    await expect(firstEntry.locator('.player-name')).toBeVisible();
    await expect(firstEntry.locator('.player-score')).toBeVisible();
  });
});
```

### Performance E2E Tests

```javascript
// e2e/performance.spec.js
import { test, expect } from '@playwright/test';

test.describe('Performance Tests', () => {
  test('should maintain 60 FPS during gameplay', async ({ page }) => {
    await page.goto('/');
    
    // Start performance monitoring
    await page.evaluate(() => {
      window.fpsCounter = {
        frames: 0,
        lastTime: performance.now(),
        fps: 0
      };
      
      function countFPS() {
        window.fpsCounter.frames++;
        const now = performance.now();
        if (now - window.fpsCounter.lastTime >= 1000) {
          window.fpsCounter.fps = window.fpsCounter.frames;
          window.fpsCounter.frames = 0;
          window.fpsCounter.lastTime = now;
        }
        requestAnimationFrame(countFPS);
      }
      countFPS();
    });
    
    // Start game
    await page.click('#start-button');
    
    // Play for 10 seconds
    await page.waitForTimeout(10000);
    
    // Check FPS
    const fps = await page.evaluate(() => window.fpsCounter.fps);
    expect(fps).toBeGreaterThan(30); // Minimum acceptable FPS
  });

  test('should load within performance budget', async ({ page }) => {
    const startTime = Date.now();
    
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    const loadTime = Date.now() - startTime;
    expect(loadTime).toBeLessThan(5000); // 5 second budget
    
    // Check resource sizes
    const performanceEntries = await page.evaluate(() => {
      return performance.getEntriesByType('resource').map(entry => ({
        name: entry.name,
        size: entry.transferSize,
        duration: entry.duration
      }));
    });
    
    const totalSize = performanceEntries.reduce((sum, entry) => sum + entry.size, 0);
    expect(totalSize).toBeLessThan(5 * 1024 * 1024); // 5MB budget
  });
});
```

## Blockchain Testing

### Hardhat Test Environment

```javascript
// test/contracts/SomniaSpaceRaiders.test.js
const { expect } = require('chai');
const { ethers } = require('hardhat');

describe('SomniaSpaceRaiders Contract', function () {
  let contract;
  let owner;
  let player1;
  let player2;

  beforeEach(async function () {
    [owner, player1, player2] = await ethers.getSigners();
    
    const SomniaSpaceRaiders = await ethers.getContractFactory('SomniaSpaceRaiders');
    contract = await SomniaSpaceRaiders.deploy();
    await contract.deployed();
  });

  describe('Score Submission', function () {
    it('should allow players to submit scores', async function () {
      await contract.connect(player1).submitScore(1500);
      
      const playerStats = await contract.getPlayerStats(player1.address);
      expect(playerStats.highScore).to.equal(1500);
      expect(playerStats.gamesPlayed).to.equal(1);
    });

    it('should update high score only if new score is higher', async function () {
      await contract.connect(player1).submitScore(1500);
      await contract.connect(player1).submitScore(1200);
      
      const playerStats = await contract.getPlayerStats(player1.address);
      expect(playerStats.highScore).to.equal(1500);
      expect(playerStats.gamesPlayed).to.equal(2);
    });

    it('should emit ScoreSubmitted event', async function () {
      await expect(contract.connect(player1).submitScore(1500))
        .to.emit(contract, 'ScoreSubmitted')
        .withArgs(player1.address, 1500);
    });
  });

  describe('Leaderboard', function () {
    beforeEach(async function () {
      await contract.connect(player1).submitScore(2000);
      await contract.connect(player2).submitScore(1500);
    });

    it('should return top players', async function () {
      const leaderboard = await contract.getLeaderboard(10);
      
      expect(leaderboard.length).to.equal(2);
      expect(leaderboard[0].player).to.equal(player1.address);
      expect(leaderboard[0].score).to.equal(2000);
      expect(leaderboard[1].player).to.equal(player2.address);
      expect(leaderboard[1].score).to.equal(1500);
    });

    it('should limit leaderboard size', async function () {
      const leaderboard = await contract.getLeaderboard(1);
      expect(leaderboard.length).to.equal(1);
    });
  });

  describe('Game Events', function () {
    it('should emit PlayerAction events', async function () {
      await expect(contract.connect(player1).emitPlayerAction('fire', '{"x":10,"y":0,"z":5}'))
        .to.emit(contract, 'PlayerAction')
        .withArgs(player1.address, 'fire', '{"x":10,"y":0,"z":5}');
    });

    it('should emit PowerUpCollected events', async function () {
      await expect(contract.connect(player1).emitPowerUpCollected('rapidFire'))
        .to.emit(contract, 'PowerUpCollected')
        .withArgs(player1.address, 'rapidFire');
    });
  });
});
```

### Mock Contract for Frontend Testing

```javascript
// src/test/mocks/MockContract.js
export class MockContract {
  constructor() {
    this.events = new Map();
    this.playerStats = new Map();
    this.leaderboard = [];
  }

  async submitScore(score) {
    const playerAddress = '0x1234567890123456789012345678901234567890';
    const currentStats = this.playerStats.get(playerAddress) || {
      highScore: 0,
      gamesPlayed: 0,
      totalScore: 0
    };

    const newStats = {
      highScore: Math.max(currentStats.highScore, score),
      gamesPlayed: currentStats.gamesPlayed + 1,
      totalScore: currentStats.totalScore + score
    };

    this.playerStats.set(playerAddress, newStats);
    this.updateLeaderboard(playerAddress, newStats.highScore);

    return {
      hash: '0xabcdef1234567890',
      wait: async () => ({ status: 1 })
    };
  }

  async getPlayerStats(address) {
    return this.playerStats.get(address) || {
      highScore: 0,
      gamesPlayed: 0,
      totalScore: 0
    };
  }

  async getLeaderboard(limit = 10) {
    return this.leaderboard.slice(0, limit);
  }

  updateLeaderboard(player, score) {
    const existingIndex = this.leaderboard.findIndex(entry => entry.player === player);
    
    if (existingIndex >= 0) {
      this.leaderboard[existingIndex].score = score;
    } else {
      this.leaderboard.push({ player, score });
    }

    this.leaderboard.sort((a, b) => b.score - a.score);
  }

  on(event, callback) {
    if (!this.events.has(event)) {
      this.events.set(event, []);
    }
    this.events.get(event).push(callback);
  }

  off(event, callback) {
    if (this.events.has(event)) {
      const callbacks = this.events.get(event);
      const index = callbacks.indexOf(callback);
      if (index >= 0) {
        callbacks.splice(index, 1);
      }
    }
  }

  emit(event, ...args) {
    if (this.events.has(event)) {
      this.events.get(event).forEach(callback => callback(...args));
    }
  }
}
```

## Performance Testing

### Lighthouse Integration

```javascript
// scripts/lighthouse-test.js
const lighthouse = require('lighthouse');
const chromeLauncher = require('chrome-launcher');

async function runLighthouseTest() {
  const chrome = await chromeLauncher.launch({ chromeFlags: ['--headless'] });
  
  const options = {
    logLevel: 'info',
    output: 'html',
    onlyCategories: ['performance', 'accessibility', 'best-practices'],
    port: chrome.port
  };

  const runnerResult = await lighthouse('http://localhost:3000', options);
  
  // Extract scores
  const scores = {
    performance: runnerResult.lhr.categories.performance.score * 100,
    accessibility: runnerResult.lhr.categories.accessibility.score * 100,
    bestPractices: runnerResult.lhr.categories['best-practices'].score * 100
  };

  console.log('Lighthouse Scores:', scores);
  
  // Assert minimum scores
  if (scores.performance < 80) {
    throw new Error(`Performance score ${scores.performance} below threshold`);
  }
  
  if (scores.accessibility < 90) {
    throw new Error(`Accessibility score ${scores.accessibility} below threshold`);
  }

  await chrome.kill();
  return scores;
}

if (require.main === module) {
  runLighthouseTest().catch(console.error);
}

module.exports = { runLighthouseTest };
```

### Memory Leak Detection

```javascript
// src/test/performance/MemoryLeaks.test.js
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { Game } from '@/game/Game.js';

describe('Memory Leak Detection', () => {
  let game;
  let initialMemory;

  beforeEach(() => {
    // Force garbage collection if available
    if (global.gc) {
      global.gc();
    }
    
    initialMemory = performance.memory?.usedJSHeapSize || 0;
    
    const container = document.createElement('div');
    game = new Game(container);
  });

  afterEach(() => {
    if (game) {
      game.dispose();
      game = null;
    }
    
    // Force garbage collection
    if (global.gc) {
      global.gc();
    }
  });

  it('should not leak memory during game sessions', async () => {
    // Start and stop multiple game sessions
    for (let i = 0; i < 10; i++) {
      game.start();
      
      // Simulate gameplay
      for (let j = 0; j < 100; j++) {
        game.update(0.016);
      }
      
      game.stop();
      game.reset();
    }

    // Force garbage collection
    if (global.gc) {
      global.gc();
    }

    const finalMemory = performance.memory?.usedJSHeapSize || 0;
    const memoryIncrease = finalMemory - initialMemory;
    
    // Allow for some memory increase but not excessive
    expect(memoryIncrease).toBeLessThan(50 * 1024 * 1024); // 50MB threshold
  });

  it('should properly dispose of Three.js resources', () => {
    const initialGeometries = game.renderer.info.memory.geometries;
    const initialTextures = game.renderer.info.memory.textures;
    
    // Create and destroy many objects
    for (let i = 0; i < 100; i++) {
      const enemy = game.spawnSystem.spawnEnemy('scout');
      game.removeEntity(enemy);
    }

    const finalGeometries = game.renderer.info.memory.geometries;
    const finalTextures = game.renderer.info.memory.textures;
    
    // Should not accumulate resources
    expect(finalGeometries).toBeLessThanOrEqual(initialGeometries + 5);
    expect(finalTextures).toBeLessThanOrEqual(initialTextures + 5);
  });
});
```

## Continuous Integration

### GitHub Actions Workflow

```yaml
# .github/workflows/test.yml
name: Test Suite

on:
  push:
    branches: [ main, develop ]
  pull_request:
    branches: [ main ]

jobs:
  unit-tests:
    runs-on: ubuntu-latest
    
    steps:
    - uses: actions/checkout@v3
    
    - name: Setup Node.js
      uses: actions/setup-node@v3
      with:
        node-version: '18'
        cache: 'npm'
    
    - name: Install dependencies
      run: npm ci
    
    - name: Run unit tests
      run: npm run test:unit
    
    - name: Upload coverage
      uses: codecov/codecov-action@v3
      with:
        file: ./coverage/lcov.info

  e2e-tests:
    runs-on: ubuntu-latest
    
    steps:
    - uses: actions/checkout@v3
    
    - name: Setup Node.js
      uses: actions/setup-node@v3
      with:
        node-version: '18'
        cache: 'npm'
    
    - name: Install dependencies
      run: npm ci
    
    - name: Install Playwright
      run: npx playwright install --with-deps
    
    - name: Run E2E tests
      run: npm run test:e2e
    
    - name: Upload test results
      uses: actions/upload-artifact@v3
      if: failure()
      with:
        name: playwright-report
        path: playwright-report/

  blockchain-tests:
    runs-on: ubuntu-latest
    
    steps:
    - uses: actions/checkout@v3
    
    - name: Setup Node.js
      uses: actions/setup-node@v3
      with:
        node-version: '18'
        cache: 'npm'
    
    - name: Install dependencies
      run: npm ci
    
    - name: Run blockchain tests
      run: npm run test:blockchain
      env:
        PRIVATE_KEY: ${{ secrets.TEST_PRIVATE_KEY }}
        SOMNIA_TESTNET_RPC_URL: ${{ secrets.SOMNIA_TESTNET_RPC_URL }}

  performance-tests:
    runs-on: ubuntu-latest
    
    steps:
    - uses: actions/checkout@v3
    
    - name: Setup Node.js
      uses: actions/setup-node@v3
      with:
        node-version: '18'
        cache: 'npm'
    
    - name: Install dependencies
      run: npm ci
    
    - name: Build application
      run: npm run build
    
    - name: Run Lighthouse tests
      run: npm run test:lighthouse
    
    - name: Upload Lighthouse report
      uses: actions/upload-artifact@v3
      with:
        name: lighthouse-report
        path: lighthouse-report.html
```

### Package.json Test Scripts

```json
{
  "scripts": {
    "test": "vitest",
    "test:unit": "vitest run --coverage",
    "test:watch": "vitest --watch",
    "test:e2e": "playwright test",
    "test:e2e:ui": "playwright test --ui",
    "test:blockchain": "hardhat test",
    "test:lighthouse": "node scripts/lighthouse-test.js",
    "test:all": "npm run test:unit && npm run test:e2e && npm run test:blockchain",
    "test:ci": "npm run test:unit && npm run test:e2e -- --reporter=junit"
  }
}
```

This comprehensive testing guide provides a robust foundation for ensuring the quality and reliability of the Somnia Space Raiders game across all components and integration points.