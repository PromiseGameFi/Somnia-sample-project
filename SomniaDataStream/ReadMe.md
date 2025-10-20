# Somnia Space Raiders 🚀

A real-time multiplayer space shooter game built with **Somnia Data Streams** to demonstrate the power of reactive blockchain programming. This project showcases how to build engaging, real-time applications that leverage blockchain technology for enhanced gameplay experiences.

## 🎮 Game Overview

**Somnia Space Raiders** is an action-packed 3D space shooter where players:
- Navigate through space in real-time
- Battle AI enemies with various weapon systems
- Collect power-ups to enhance abilities
- Compete on live leaderboards
- Earn achievements tracked on-chain

## 🌟 Key Features

### Real-time Blockchain Integration
- **Live Data Streams**: Player actions are streamed in real-time using Somnia Data Streams
- **On-chain Leaderboards**: Scores and achievements are tracked on the Somnia blockchain
- **Reactive Gameplay**: Game state responds instantly to blockchain events
- **Multiplayer Ready**: Built for real-time multiplayer experiences

### Advanced Game Mechanics
- **3D Graphics**: Powered by Three.js for immersive visuals
- **Physics Engine**: Realistic movement and collision detection
- **AI Enemies**: Multiple enemy types with unique behaviors
- **Power-up System**: Various enhancements for weapons and abilities
- **Progressive Difficulty**: Dynamic scaling based on player performance

## 🛠 Technology Stack

- **Frontend**: Vanilla JavaScript, Three.js, Vite
- **Blockchain**: Somnia Network, Ethers.js
- **Physics**: Cannon.js
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
VITE_SOMNIA_RPC_URL=https://your-somnia-rpc-url
VITE_CONTRACT_ADDRESS=0xYourContractAddress
```

## 🎯 How to Play

1. **Connect Wallet**: Click "Connect Wallet" to link your MetaMask
2. **Start Game**: Press "Start Game" to begin your space adventure
3. **Controls**:
   - **WASD**: Move your ship
   - **Mouse**: Aim and look around
   - **Left Click**: Fire primary weapon
   - **Space**: Jump/Boost
   - **R**: Reload weapon
4. **Objectives**:
   - Destroy enemies to earn points
   - Collect power-ups for advantages
   - Survive as long as possible
   - Climb the leaderboard

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