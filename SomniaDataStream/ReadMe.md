# Somnia Data Stream Platformer 🎮

A real-time 2D platformer game built with **Somnia Data Streams** to demonstrate the power of reactive blockchain programming. This project showcases how to build engaging, real-time applications that leverage blockchain technology for enhanced gameplay experiences.

## 🎮 Game Overview

**Somnia Data Stream Platformer** is an action-packed 2D platformer where players:
- Navigate through platform-based levels
- Battle AI enemies with various attack patterns
- Collect power-ups and items
- Experience real-time blockchain data visualization
- See live blockchain events as visual effects

## 🌟 Key Features

### Real-time Blockchain Integration
- **Live Data Streams**: Player actions are streamed in real-time using Somnia Data Streams
- **On-chain Leaderboards**: Scores and achievements are tracked on the Somnia blockchain
- **Reactive Gameplay**: Game state responds instantly to blockchain events
- **Multiplayer Ready**: Built for real-time multiplayer experiences

### Advanced Game Mechanics
- **2D Canvas Graphics**: Smooth 2D rendering with visual effects
- **Platformer Physics**: Jump mechanics and collision detection
- **AI Enemies**: Multiple enemy types with patrol and attack patterns
- **Data Stream Visualization**: Real-time blockchain events as particle effects
- **Level Progression**: Platform-based levels with increasing difficulty

### Development Mode
- **Demo Mode**: Runs without MetaMask for easy demonstration
- **Mock Blockchain**: Simulates blockchain events for development
- **Visual Feedback**: Clear indicators of blockchain activity
- **Easy Setup**: No wallet connection required for testing

## 🛠 Technology Stack

- **Frontend**: Vanilla JavaScript, HTML5 Canvas, Vite
- **Blockchain**: Somnia Network, Ethers.js
- **Game Engine**: Custom 2D engine
- **Build Tool**: Vite
- **Styling**: Modern CSS with animations

## 🚀 Quick Start

### Prerequisites
- Node.js (v16 or higher)
- MetaMask or compatible Web3 wallet
- Modern web browser with WebGL support

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd SomniaDataStream
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Start development server**
   ```bash
   npm run dev
   ```

4. **Open your browser**
   Navigate to `http://localhost:3000`

### Environment Setup

Create a `.env` file in the root directory:
```env
# Development mode (set to 'false' to require MetaMask)
VITE_DEV_MODE=true

# Somnia RPC URL
VITE_SOMNIA_RPC_URL=https://dream-rpc.somnia.network

# Optional: Custom contract address
VITE_GAME_CONTRACT_ADDRESS=0xYourContractAddress
```

**Development Mode Options:**
- `VITE_DEV_MODE=true` - Demo mode without MetaMask (default)
- `VITE_DEV_MODE=false` - Production mode requiring wallet connection

## 🎯 How to Play

1. **Launch Game**: Click "Launch Game" to start (no wallet required in demo mode)
2. **Controls**:
   - **A/D or ←/→**: Move left/right
   - **W or ↑ or Space**: Jump
   - **Mouse Click**: Shoot projectiles
   - **P**: Pause/Resume game
   - **R**: Restart game
3. **Objectives**:
   - Navigate through platform levels
   - Defeat enemies to earn points
   - Collect items and power-ups
   - Watch blockchain data streams in real-time
   - Complete levels to progress

## 📁 Project Structure

```
SomniaDataStream/
├── src/
│   ├── blockchain/
│   │   └── SomniaConnector.js    # Blockchain integration
│   ├── game/
│   │   ├── Game.js               # Main game engine
│   │   ├── InputManager.js       # Input handling
│   │   ├── GameState.js          # Game state management
│   │   ├── entities/
│   │   │   ├── Player.js         # Player character
│   │   │   ├── Enemy.js          # AI enemies
│   │   │   ├── PowerUp.js        # Collectible items
│   │   │   └── Projectile.js     # Bullets and effects
│   │   └── systems/
│   │       ├── CollisionSystem.js # Collision detection
│   │       └── SpawnSystem.js     # Entity spawning
│   ├── ui/
│   │   └── UIManager.js          # User interface
│   └── main.js                   # Application entry point
├── index.html                    # Main HTML file
├── package.json                  # Dependencies
└── vite.config.js               # Build configuration
```

## 🔗 Somnia Data Streams Integration

This project demonstrates several key concepts of Somnia Data Streams:

### Real-time Event Streaming
```javascript
// Example: Streaming player movement
await this.somniaConnector.emitPlayerMovement({
    playerId: this.playerId,
    position: this.position,
    rotation: this.rotation,
    timestamp: Date.now()
});
```

### Reactive State Management
```javascript
// Example: Reacting to score updates
this.somniaConnector.onScoreUpdate((data) => {
    this.gameState.updateScore(data.score);
    this.uiManager.updateScore(data.score);
});
```

### Live Leaderboards
```javascript
// Example: Real-time leaderboard updates
this.somniaConnector.onLeaderboardUpdate((leaderboard) => {
    this.uiManager.updateLeaderboard(leaderboard);
});
```

## 🎨 Customization

### Adding New Enemy Types
1. Extend the `Enemy` class in `src/game/entities/Enemy.js`
2. Define new enemy properties and behaviors
3. Update the spawn system in `src/game/systems/SpawnSystem.js`

### Creating New Power-ups
1. Add new power-up types in `src/game/entities/PowerUp.js`
2. Implement effects in the `applyEffect` method
3. Update spawn probabilities in the spawn system

### Modifying Game Mechanics
- **Difficulty**: Adjust scaling in `src/game/GameState.js`
- **Physics**: Modify parameters in `src/game/Game.js`
- **Controls**: Update mappings in `src/game/InputManager.js`

## 🧪 Testing

### Development Testing
```bash
npm run dev
```

### Production Build
```bash
npm run build
npm run preview
```

### Deployment
```bash
npm run deploy
```

## 📊 Performance Optimization

The game includes several optimization techniques:
- **Spatial Partitioning**: Efficient collision detection
- **Object Pooling**: Reuse of projectiles and effects
- **LOD System**: Level-of-detail for distant objects
- **Frustum Culling**: Only render visible objects

## 🔧 Configuration

### Game Settings
Modify game parameters in `src/game/GameState.js`:
```javascript
const CONFIG = {
    DIFFICULTY_SCALING: 1.1,
    MAX_ENEMIES: 20,
    SPAWN_RATE: 2000,
    POWER_UP_CHANCE: 0.1
};
```

### Blockchain Settings
Update network configuration in `src/blockchain/SomniaConnector.js`:
```javascript
const SOMNIA_NETWORK = {
    chainId: '0x...', // Somnia chain ID
    chainName: 'Somnia Network',
    rpcUrls: ['https://your-rpc-url'],
    // ... other network details
};
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🆘 Support

- **Documentation**: Check the `/docs` folder for detailed guides
- **Issues**: Report bugs on GitHub Issues
- **Community**: Join our Discord for discussions

## 🙏 Acknowledgments

- **Somnia Network**: For providing the blockchain infrastructure
- **Three.js Community**: For the amazing 3D graphics library
- **Vite Team**: For the excellent build tool

---

**Built with ❤️ for the Somnia ecosystem**