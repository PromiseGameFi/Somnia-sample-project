# Troubleshooting Guide: Somnia Space Raiders

Comprehensive troubleshooting guide for common issues, debugging techniques, and solutions for the Somnia Space Raiders game.

## Table of Contents

1. [Common Issues](#common-issues)
2. [Development Environment](#development-environment)
3. [Blockchain Integration](#blockchain-integration)
4. [Performance Issues](#performance-issues)
5. [Browser Compatibility](#browser-compatibility)
6. [Network and Connectivity](#network-and-connectivity)
7. [Build and Deployment](#build-and-deployment)
8. [Debugging Tools](#debugging-tools)
9. [Error Codes Reference](#error-codes-reference)
10. [Getting Help](#getting-help)

## Common Issues

### Game Won't Start

#### Symptoms
- Black screen after loading
- "Game failed to initialize" error
- Console errors about WebGL

#### Solutions

1. **Check WebGL Support**
   ```javascript
   // Test WebGL availability
   function checkWebGL() {
     const canvas = document.createElement('canvas');
     const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
     
     if (!gl) {
       console.error('WebGL not supported');
       return false;
     }
     
     console.log('WebGL Renderer:', gl.getParameter(gl.RENDERER));
     console.log('WebGL Version:', gl.getParameter(gl.VERSION));
     return true;
   }
   
   checkWebGL();
   ```

2. **Update Graphics Drivers**
   - NVIDIA: Download from nvidia.com/drivers
   - AMD: Download from amd.com/support
   - Intel: Download from intel.com/content/www/us/en/support

3. **Browser Settings**
   - Enable hardware acceleration in browser settings
   - Clear browser cache and cookies
   - Disable browser extensions that might interfere

4. **Check Console for Errors**
   ```javascript
   // Enable debug mode
   localStorage.setItem('debug', 'true');
   location.reload();
   ```

### MetaMask Connection Issues

#### Symptoms
- "Please install MetaMask" message when MetaMask is installed
- Connection fails silently
- Wrong network errors

#### Solutions

1. **Verify MetaMask Installation**
   ```javascript
   // Check if MetaMask is properly injected
   if (typeof window.ethereum !== 'undefined') {
     console.log('MetaMask is installed');
     console.log('Provider:', window.ethereum);
   } else {
     console.error('MetaMask not detected');
   }
   ```

2. **Network Configuration**
   ```javascript
   // Add Somnia network manually
   async function addSomniaNetwork() {
     try {
       await window.ethereum.request({
         method: 'wallet_addEthereumChain',
         params: [{
           chainId: '0x3c6', // 966 in hex
           chainName: 'Somnia Network',
           nativeCurrency: {
             name: 'STT',
             symbol: 'STT',
             decimals: 18
           },
           rpcUrls: ['https://testnet-rpc.somnia.network'],
           blockExplorerUrls: ['https://testnet-explorer.somnia.network']
         }]
       });
     } catch (error) {
       console.error('Failed to add network:', error);
     }
   }
   ```

3. **Clear MetaMask Cache**
   - Settings → Advanced → Reset Account
   - Reimport account using seed phrase

4. **Check Permissions**
   ```javascript
   // Request account access
   async function requestAccounts() {
     try {
       const accounts = await window.ethereum.request({
         method: 'eth_requestAccounts'
       });
       console.log('Connected accounts:', accounts);
       return accounts;
     } catch (error) {
       console.error('User rejected connection:', error);
     }
   }
   ```

### Performance Issues

#### Symptoms
- Low frame rate (< 30 FPS)
- Game stuttering or freezing
- High memory usage
- Browser becomes unresponsive

#### Solutions

1. **Check System Requirements**
   ```javascript
   // System capability check
   function checkSystemCapabilities() {
     const canvas = document.createElement('canvas');
     const gl = canvas.getContext('webgl');
     
     const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
     const renderer = gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL);
     const vendor = gl.getParameter(debugInfo.UNMASKED_VENDOR_WEBGL);
     
     console.log('GPU Vendor:', vendor);
     console.log('GPU Renderer:', renderer);
     
     // Check available memory
     if (performance.memory) {
       console.log('Memory Usage:', {
         used: Math.round(performance.memory.usedJSHeapSize / 1048576) + ' MB',
         total: Math.round(performance.memory.totalJSHeapSize / 1048576) + ' MB',
         limit: Math.round(performance.memory.jsHeapSizeLimit / 1048576) + ' MB'
       });
     }
   }
   ```

2. **Adjust Graphics Settings**
   ```javascript
   // Reduce graphics quality
   const gameSettings = {
     shadows: false,
     particleCount: 50, // Reduce from default 200
     enemyCount: 10,    // Reduce from default 20
     renderDistance: 100, // Reduce from default 200
     antialiasing: false
   };
   
   // Apply settings
   game.updateSettings(gameSettings);
   ```

3. **Monitor Performance**
   ```javascript
   // FPS counter
   class FPSCounter {
     constructor() {
       this.fps = 0;
       this.frames = 0;
       this.lastTime = performance.now();
     }
     
     update() {
       this.frames++;
       const now = performance.now();
       
       if (now - this.lastTime >= 1000) {
         this.fps = Math.round((this.frames * 1000) / (now - this.lastTime));
         this.frames = 0;
         this.lastTime = now;
         
         console.log('FPS:', this.fps);
         
         if (this.fps < 30) {
           console.warn('Low FPS detected, consider reducing graphics settings');
         }
       }
     }
   }
   ```

## Development Environment

### Node.js Version Issues

#### Symptoms
- `npm install` fails
- Build errors with cryptic messages
- Module compatibility issues

#### Solutions

1. **Check Node.js Version**
   ```bash
   node --version
   npm --version
   ```

2. **Use Node Version Manager**
   ```bash
   # Install nvm (Windows)
   # Download from: https://github.com/coreybutler/nvm-windows
   
   # Install and use correct Node version
   nvm install 18.17.0
   nvm use 18.17.0
   ```

3. **Clear npm Cache**
   ```bash
   npm cache clean --force
   rm -rf node_modules package-lock.json
   npm install
   ```

### Vite Development Server Issues

#### Symptoms
- Server won't start
- Hot reload not working
- Module resolution errors

#### Solutions

1. **Port Conflicts**
   ```bash
   # Check what's using port 3000
   netstat -ano | findstr :3000
   
   # Use different port
   npm run dev -- --port 3001
   ```

2. **Clear Vite Cache**
   ```bash
   rm -rf node_modules/.vite
   npm run dev
   ```

3. **Check Vite Configuration**
   ```javascript
   // vite.config.js debugging
   export default defineConfig({
     // ... other config
     logLevel: 'info',
     clearScreen: false,
     server: {
       host: true,
       port: 3000,
       strictPort: true
     }
   });
   ```

### Module Import Errors

#### Symptoms
- "Cannot resolve module" errors
- Import path issues
- TypeScript errors

#### Solutions

1. **Check Import Paths**
   ```javascript
   // Correct import paths
   import { Game } from './game/Game.js';           // ✓ Correct
   import { Game } from './game/Game';              // ✗ Missing .js
   import { Game } from '../game/Game.js';         // ✓ Relative path
   import { Game } from '@/game/Game.js';          // ✓ Alias (if configured)
   ```

2. **Verify File Extensions**
   ```bash
   # Check actual file extensions
   ls -la src/game/
   ```

3. **Update Path Aliases**
   ```javascript
   // vite.config.js
   export default defineConfig({
     resolve: {
       alias: {
         '@': path.resolve(__dirname, './src'),
         '@components': path.resolve(__dirname, './src/components'),
         '@utils': path.resolve(__dirname, './src/utils')
       }
     }
   });
   ```

## Blockchain Integration

### RPC Connection Errors

#### Symptoms
- "Network Error" messages
- Timeout errors
- "Failed to fetch" errors

#### Solutions

1. **Test RPC Endpoint**
   ```bash
   # Test RPC connectivity
   curl -X POST \
     -H "Content-Type: application/json" \
     -d '{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1}' \
     https://testnet-rpc.somnia.network
   ```

2. **Check Network Configuration**
   ```javascript
   // Debug network settings
   async function debugNetwork() {
     try {
       const network = await window.ethereum.request({
         method: 'eth_chainId'
       });
       console.log('Current Chain ID:', network);
       
       const accounts = await window.ethereum.request({
         method: 'eth_accounts'
       });
       console.log('Connected Accounts:', accounts);
       
     } catch (error) {
       console.error('Network debug error:', error);
     }
   }
   ```

3. **Fallback RPC URLs**
   ```javascript
   // Multiple RPC endpoints for redundancy
   const rpcUrls = [
     'https://testnet-rpc.somnia.network',
     'https://backup-rpc.somnia.network',
     'https://public-rpc.somnia.network'
   ];
   
   async function connectWithFallback() {
     for (const url of rpcUrls) {
       try {
         const provider = new ethers.providers.JsonRpcProvider(url);
         await provider.getNetwork();
         console.log('Connected to:', url);
         return provider;
       } catch (error) {
         console.warn('Failed to connect to:', url);
       }
     }
     throw new Error('All RPC endpoints failed');
   }
   ```

### Smart Contract Interaction Errors

#### Symptoms
- "Contract not deployed" errors
- Transaction failures
- Gas estimation errors

#### Solutions

1. **Verify Contract Deployment**
   ```javascript
   // Check if contract exists
   async function verifyContract(address) {
     try {
       const provider = new ethers.providers.Web3Provider(window.ethereum);
       const code = await provider.getCode(address);
       
       if (code === '0x') {
         console.error('Contract not deployed at:', address);
         return false;
       }
       
       console.log('Contract verified at:', address);
       return true;
     } catch (error) {
       console.error('Contract verification failed:', error);
       return false;
     }
   }
   ```

2. **Gas Estimation Issues**
   ```javascript
   // Manual gas estimation
   async function estimateGasWithFallback(contract, method, params) {
     try {
       const gasEstimate = await contract.estimateGas[method](...params);
       return gasEstimate.mul(120).div(100); // Add 20% buffer
     } catch (error) {
       console.warn('Gas estimation failed, using fallback');
       return ethers.utils.parseUnits('100000', 'wei'); // Fallback gas limit
     }
   }
   ```

3. **Transaction Debugging**
   ```javascript
   // Enhanced transaction handling
   async function sendTransactionWithRetry(contract, method, params, maxRetries = 3) {
     for (let i = 0; i < maxRetries; i++) {
       try {
         const gasLimit = await estimateGasWithFallback(contract, method, params);
         const tx = await contract[method](...params, { gasLimit });
         
         console.log('Transaction sent:', tx.hash);
         const receipt = await tx.wait();
         console.log('Transaction confirmed:', receipt);
         
         return receipt;
       } catch (error) {
         console.error(`Transaction attempt ${i + 1} failed:`, error);
         
         if (i === maxRetries - 1) throw error;
         
         // Wait before retry
         await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)));
       }
     }
   }
   ```

### Wallet Connection Issues

#### Symptoms
- "User rejected request" errors
- Wallet not responding
- Account switching issues

#### Solutions

1. **Handle User Rejection**
   ```javascript
   async function connectWalletWithErrorHandling() {
     try {
       const accounts = await window.ethereum.request({
         method: 'eth_requestAccounts'
       });
       return accounts;
     } catch (error) {
       if (error.code === 4001) {
         console.log('User rejected connection');
         // Show user-friendly message
         showNotification('Please connect your wallet to continue', 'warning');
       } else {
         console.error('Unexpected error:', error);
         showNotification('Failed to connect wallet', 'error');
       }
       return null;
     }
   }
   ```

2. **Account Change Handling**
   ```javascript
   // Listen for account changes
   window.ethereum.on('accountsChanged', (accounts) => {
     if (accounts.length === 0) {
       console.log('Wallet disconnected');
       handleWalletDisconnect();
     } else {
       console.log('Account changed to:', accounts[0]);
       handleAccountChange(accounts[0]);
     }
   });
   
   // Listen for network changes
   window.ethereum.on('chainChanged', (chainId) => {
     console.log('Network changed to:', chainId);
     if (chainId !== '0x3c6') { // Not Somnia network
       showNetworkWarning();
     }
   });
   ```

## Performance Issues

### Memory Leaks

#### Symptoms
- Gradually increasing memory usage
- Browser becomes slow over time
- "Out of memory" errors

#### Solutions

1. **Identify Memory Leaks**
   ```javascript
   // Memory monitoring
   class MemoryMonitor {
     constructor() {
       this.measurements = [];
       this.interval = setInterval(() => this.measure(), 5000);
     }
     
     measure() {
       if (performance.memory) {
         const memory = {
           used: performance.memory.usedJSHeapSize,
           total: performance.memory.totalJSHeapSize,
           timestamp: Date.now()
         };
         
         this.measurements.push(memory);
         
         // Keep only last 20 measurements
         if (this.measurements.length > 20) {
           this.measurements.shift();
         }
         
         this.checkForLeaks();
       }
     }
     
     checkForLeaks() {
       if (this.measurements.length < 10) return;
       
       const recent = this.measurements.slice(-5);
       const older = this.measurements.slice(-10, -5);
       
       const recentAvg = recent.reduce((sum, m) => sum + m.used, 0) / recent.length;
       const olderAvg = older.reduce((sum, m) => sum + m.used, 0) / older.length;
       
       const increase = recentAvg - olderAvg;
       const increasePercent = (increase / olderAvg) * 100;
       
       if (increasePercent > 10) {
         console.warn('Potential memory leak detected:', {
           increase: Math.round(increase / 1048576) + ' MB',
           percentage: Math.round(increasePercent) + '%'
         });
       }
     }
     
     dispose() {
       clearInterval(this.interval);
     }
   }
   ```

2. **Proper Resource Cleanup**
   ```javascript
   // Three.js resource disposal
   class ResourceManager {
     constructor() {
       this.geometries = new Set();
       this.materials = new Set();
       this.textures = new Set();
     }
     
     trackGeometry(geometry) {
       this.geometries.add(geometry);
       return geometry;
     }
     
     trackMaterial(material) {
       this.materials.add(material);
       return material;
     }
     
     trackTexture(texture) {
       this.textures.add(texture);
       return texture;
     }
     
     dispose() {
       this.geometries.forEach(geometry => geometry.dispose());
       this.materials.forEach(material => material.dispose());
       this.textures.forEach(texture => texture.dispose());
       
       this.geometries.clear();
       this.materials.clear();
       this.textures.clear();
     }
   }
   ```

### Frame Rate Issues

#### Symptoms
- Choppy animation
- Input lag
- Inconsistent frame timing

#### Solutions

1. **Performance Profiling**
   ```javascript
   // Frame time analysis
   class PerformanceProfiler {
     constructor() {
       this.frameTimes = [];
       this.lastFrameTime = performance.now();
     }
     
     startFrame() {
       this.frameStartTime = performance.now();
     }
     
     endFrame() {
       const frameTime = performance.now() - this.frameStartTime;
       this.frameTimes.push(frameTime);
       
       if (this.frameTimes.length > 60) {
         this.frameTimes.shift();
       }
       
       if (frameTime > 16.67) { // Slower than 60 FPS
         console.warn('Slow frame detected:', frameTime.toFixed(2) + 'ms');
       }
     }
     
     getAverageFrameTime() {
       if (this.frameTimes.length === 0) return 0;
       return this.frameTimes.reduce((sum, time) => sum + time, 0) / this.frameTimes.length;
     }
     
     getFPS() {
       return 1000 / this.getAverageFrameTime();
     }
   }
   ```

2. **Optimize Rendering**
   ```javascript
   // Level-of-detail system
   class LODManager {
     constructor(camera) {
       this.camera = camera;
       this.objects = [];
     }
     
     addObject(object, highDetail, mediumDetail, lowDetail) {
       this.objects.push({
         object,
         meshes: { high: highDetail, medium: mediumDetail, low: lowDetail },
         currentLOD: 'high'
       });
     }
     
     update() {
       this.objects.forEach(obj => {
         const distance = this.camera.position.distanceTo(obj.object.position);
         let targetLOD;
         
         if (distance < 50) targetLOD = 'high';
         else if (distance < 100) targetLOD = 'medium';
         else targetLOD = 'low';
         
         if (targetLOD !== obj.currentLOD) {
           obj.object.remove(obj.meshes[obj.currentLOD]);
           obj.object.add(obj.meshes[targetLOD]);
           obj.currentLOD = targetLOD;
         }
       });
     }
   }
   ```

## Browser Compatibility

### WebGL Support Issues

#### Symptoms
- "WebGL not supported" errors
- Rendering artifacts
- Context loss errors

#### Solutions

1. **WebGL Feature Detection**
   ```javascript
   function detectWebGLFeatures() {
     const canvas = document.createElement('canvas');
     const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
     
     if (!gl) {
       return { supported: false };
     }
     
     const features = {
       supported: true,
       version: gl.getParameter(gl.VERSION),
       renderer: gl.getParameter(gl.RENDERER),
       vendor: gl.getParameter(gl.VENDOR),
       maxTextureSize: gl.getParameter(gl.MAX_TEXTURE_SIZE),
       maxVertexAttribs: gl.getParameter(gl.MAX_VERTEX_ATTRIBS),
       extensions: gl.getSupportedExtensions()
     };
     
     // Check for required extensions
     const requiredExtensions = [
       'OES_vertex_array_object',
       'WEBGL_depth_texture',
       'OES_texture_float'
     ];
     
     features.missingExtensions = requiredExtensions.filter(
       ext => !features.extensions.includes(ext)
     );
     
     return features;
   }
   ```

2. **Context Loss Handling**
   ```javascript
   // Handle WebGL context loss
   function setupContextLossHandling(canvas, renderer) {
     canvas.addEventListener('webglcontextlost', (event) => {
       event.preventDefault();
       console.warn('WebGL context lost');
       
       // Stop rendering loop
       if (game.isRunning) {
         game.pause();
       }
       
       // Show user notification
       showNotification('Graphics context lost. Attempting to restore...', 'warning');
     });
     
     canvas.addEventListener('webglcontextrestored', () => {
       console.log('WebGL context restored');
       
       // Reinitialize renderer
       renderer.setSize(canvas.clientWidth, canvas.clientHeight);
       
       // Reload textures and shaders
       reloadAssets();
       
       // Resume game
       if (game.isPaused) {
         game.resume();
       }
       
       showNotification('Graphics context restored', 'success');
     });
   }
   ```

### Mobile Browser Issues

#### Symptoms
- Touch controls not working
- Performance issues on mobile
- Layout problems

#### Solutions

1. **Touch Event Handling**
   ```javascript
   // Mobile-specific input handling
   class MobileInputManager {
     constructor() {
       this.touches = new Map();
       this.setupTouchEvents();
     }
     
     setupTouchEvents() {
       document.addEventListener('touchstart', this.handleTouchStart.bind(this), { passive: false });
       document.addEventListener('touchmove', this.handleTouchMove.bind(this), { passive: false });
       document.addEventListener('touchend', this.handleTouchEnd.bind(this), { passive: false });
     }
     
     handleTouchStart(event) {
       event.preventDefault();
       
       for (const touch of event.changedTouches) {
         this.touches.set(touch.identifier, {
           startX: touch.clientX,
           startY: touch.clientY,
           currentX: touch.clientX,
           currentY: touch.clientY,
           startTime: Date.now()
         });
       }
     }
     
     handleTouchMove(event) {
       event.preventDefault();
       
       for (const touch of event.changedTouches) {
         const touchData = this.touches.get(touch.identifier);
         if (touchData) {
           touchData.currentX = touch.clientX;
           touchData.currentY = touch.clientY;
         }
       }
     }
     
     handleTouchEnd(event) {
       for (const touch of event.changedTouches) {
         this.touches.delete(touch.identifier);
       }
     }
   }
   ```

2. **Mobile Performance Optimization**
   ```javascript
   // Detect mobile device and adjust settings
   function isMobileDevice() {
     return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
   }
   
   function getMobileSettings() {
     return {
       shadows: false,
       particleCount: 25,
       enemyCount: 5,
       renderDistance: 50,
       antialiasing: false,
       pixelRatio: Math.min(window.devicePixelRatio, 2)
     };
   }
   
   // Apply mobile optimizations
   if (isMobileDevice()) {
     const mobileSettings = getMobileSettings();
     game.updateSettings(mobileSettings);
   }
   ```

## Network and Connectivity

### CORS Issues

#### Symptoms
- "CORS policy" errors in console
- Failed to load resources
- Network requests blocked

#### Solutions

1. **Development Server CORS**
   ```javascript
   // vite.config.js
   export default defineConfig({
     server: {
       cors: {
         origin: ['http://localhost:3000', 'http://127.0.0.1:3000'],
         credentials: true
       },
       proxy: {
         '/api': {
           target: 'https://api.somnia.network',
           changeOrigin: true,
           rewrite: (path) => path.replace(/^\/api/, '')
         }
       }
     }
   });
   ```

2. **Production CORS Headers**
   ```nginx
   # nginx.conf
   location / {
     add_header Access-Control-Allow-Origin *;
     add_header Access-Control-Allow-Methods "GET, POST, OPTIONS";
     add_header Access-Control-Allow-Headers "Origin, Content-Type, Accept, Authorization";
     
     if ($request_method = 'OPTIONS') {
       return 204;
     }
   }
   ```

### Slow Loading Times

#### Symptoms
- Long initial load times
- Assets taking time to download
- Blank screen during loading

#### Solutions

1. **Asset Optimization**
   ```javascript
   // Preload critical assets
   class AssetPreloader {
     constructor() {
       this.loadedAssets = 0;
       this.totalAssets = 0;
       this.onProgress = null;
     }
     
     async preloadAssets(assetList) {
       this.totalAssets = assetList.length;
       const promises = assetList.map(asset => this.loadAsset(asset));
       
       return Promise.all(promises);
     }
     
     async loadAsset(assetPath) {
       return new Promise((resolve, reject) => {
         const extension = assetPath.split('.').pop().toLowerCase();
         
         if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(extension)) {
           const img = new Image();
           img.onload = () => {
             this.loadedAssets++;
             this.updateProgress();
             resolve(img);
           };
           img.onerror = reject;
           img.src = assetPath;
         } else {
           // Handle other asset types
           fetch(assetPath)
             .then(response => response.blob())
             .then(blob => {
               this.loadedAssets++;
               this.updateProgress();
               resolve(blob);
             })
             .catch(reject);
         }
       });
     }
     
     updateProgress() {
       const progress = this.loadedAssets / this.totalAssets;
       if (this.onProgress) {
         this.onProgress(progress);
       }
     }
   }
   ```

2. **Code Splitting**
   ```javascript
   // Dynamic imports for code splitting
   async function loadGameModule() {
     try {
       const { Game } = await import('./game/Game.js');
       return Game;
     } catch (error) {
       console.error('Failed to load game module:', error);
       throw error;
     }
   }
   
   // Load modules on demand
   async function initializeGame() {
     showLoadingScreen();
     
     try {
       const Game = await loadGameModule();
       const game = new Game();
       hideLoadingScreen();
       return game;
     } catch (error) {
       showErrorScreen('Failed to load game');
       throw error;
     }
   }
   ```

## Build and Deployment

### Build Failures

#### Symptoms
- Build process stops with errors
- Missing dependencies
- TypeScript compilation errors

#### Solutions

1. **Clean Build Environment**
   ```bash
   # Complete clean and rebuild
   rm -rf node_modules
   rm -rf dist
   rm package-lock.json
   npm cache clean --force
   npm install
   npm run build
   ```

2. **Dependency Conflicts**
   ```bash
   # Check for dependency issues
   npm ls
   npm audit
   npm audit fix
   
   # Update dependencies
   npm update
   ```

3. **Build Configuration Debug**
   ```javascript
   // vite.config.js with debugging
   export default defineConfig({
     build: {
       sourcemap: true,
       rollupOptions: {
         onwarn(warning, warn) {
           // Log build warnings
           console.warn('Build warning:', warning);
           warn(warning);
         }
       }
     },
     logLevel: 'info'
   });
   ```

### Deployment Issues

#### Symptoms
- 404 errors after deployment
- Assets not loading
- Routing issues

#### Solutions

1. **Static File Serving**
   ```nginx
   # nginx.conf for SPA
   server {
     listen 80;
     server_name yourdomain.com;
     root /var/www/somnia-space-raiders/dist;
     index index.html;
     
     # Handle client-side routing
     location / {
       try_files $uri $uri/ /index.html;
     }
     
     # Cache static assets
     location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg)$ {
       expires 1y;
       add_header Cache-Control "public, immutable";
     }
   }
   ```

2. **Environment Variables**
   ```bash
   # Check environment variables in production
   echo $VITE_SOMNIA_RPC_URL
   echo $VITE_CONTRACT_ADDRESS
   
   # Set production environment variables
   export VITE_ENVIRONMENT=production
   export VITE_SOMNIA_RPC_URL=https://mainnet-rpc.somnia.network
   ```

## Debugging Tools

### Browser Developer Tools

1. **Performance Profiling**
   ```javascript
   // Performance marks for profiling
   performance.mark('game-init-start');
   // ... game initialization code
   performance.mark('game-init-end');
   performance.measure('game-init', 'game-init-start', 'game-init-end');
   
   // View measurements
   console.table(performance.getEntriesByType('measure'));
   ```

2. **Memory Analysis**
   ```javascript
   // Memory usage tracking
   function logMemoryUsage() {
     if (performance.memory) {
       console.log('Memory Usage:', {
         used: `${Math.round(performance.memory.usedJSHeapSize / 1048576)} MB`,
         total: `${Math.round(performance.memory.totalJSHeapSize / 1048576)} MB`,
         limit: `${Math.round(performance.memory.jsHeapSizeLimit / 1048576)} MB`
       });
     }
   }
   
   // Call periodically
   setInterval(logMemoryUsage, 5000);
   ```

### Custom Debug Tools

```javascript
// Debug overlay
class DebugOverlay {
  constructor() {
    this.enabled = localStorage.getItem('debug') === 'true';
    this.overlay = null;
    this.stats = {};
    
    if (this.enabled) {
      this.createOverlay();
    }
  }
  
  createOverlay() {
    this.overlay = document.createElement('div');
    this.overlay.style.cssText = `
      position: fixed;
      top: 10px;
      left: 10px;
      background: rgba(0, 0, 0, 0.8);
      color: white;
      padding: 10px;
      font-family: monospace;
      font-size: 12px;
      z-index: 10000;
      border-radius: 5px;
    `;
    document.body.appendChild(this.overlay);
  }
  
  updateStats(newStats) {
    if (!this.enabled || !this.overlay) return;
    
    Object.assign(this.stats, newStats);
    
    this.overlay.innerHTML = Object.entries(this.stats)
      .map(([key, value]) => `${key}: ${value}`)
      .join('<br>');
  }
  
  toggle() {
    this.enabled = !this.enabled;
    localStorage.setItem('debug', this.enabled.toString());
    
    if (this.enabled && !this.overlay) {
      this.createOverlay();
    } else if (!this.enabled && this.overlay) {
      this.overlay.remove();
      this.overlay = null;
    }
  }
}

// Usage
const debugOverlay = new DebugOverlay();

// Update debug info in game loop
function updateDebugInfo() {
  debugOverlay.updateStats({
    FPS: Math.round(game.fps),
    Entities: game.entities.length,
    Memory: `${Math.round(performance.memory?.usedJSHeapSize / 1048576)} MB`,
    Position: `${game.player.position.x.toFixed(1)}, ${game.player.position.z.toFixed(1)}`
  });
}
```

## Error Codes Reference

### Game Engine Errors

| Code | Description | Solution |
|------|-------------|----------|
| GE001 | WebGL context creation failed | Update graphics drivers, enable hardware acceleration |
| GE002 | Shader compilation error | Check WebGL support, update browser |
| GE003 | Texture loading failed | Check asset paths, network connectivity |
| GE004 | Audio context creation failed | Check browser audio permissions |
| GE005 | Memory allocation failed | Reduce graphics settings, close other tabs |

### Blockchain Errors

| Code | Description | Solution |
|------|-------------|----------|
| BC001 | MetaMask not detected | Install MetaMask extension |
| BC002 | Wrong network | Switch to Somnia network |
| BC003 | Transaction failed | Check gas limit, account balance |
| BC004 | Contract not found | Verify contract address, network |
| BC005 | RPC connection failed | Check network connectivity, try different RPC |

### Network Errors

| Code | Description | Solution |
|------|-------------|----------|
| NE001 | CORS policy violation | Configure server CORS headers |
| NE002 | Asset loading timeout | Check network speed, CDN status |
| NE003 | WebSocket connection failed | Check firewall, proxy settings |
| NE004 | API rate limit exceeded | Implement request throttling |
| NE005 | SSL certificate error | Update certificates, check domain |

## Getting Help

### Community Resources

1. **GitHub Issues**
   - Search existing issues before creating new ones
   - Provide detailed reproduction steps
   - Include browser/system information

2. **Discord Community**
   - Join the Somnia Discord server
   - Use appropriate channels for different topics
   - Follow community guidelines

3. **Documentation**
   - Check the official documentation first
   - Look for similar issues in troubleshooting guides
   - Review API reference for correct usage

### Reporting Bugs

When reporting bugs, include:

1. **Environment Information**
   ```javascript
   // Copy this debug info when reporting issues
   console.log('Debug Info:', {
     userAgent: navigator.userAgent,
     webgl: !!document.createElement('canvas').getContext('webgl'),
     memory: performance.memory ? {
       used: Math.round(performance.memory.usedJSHeapSize / 1048576) + ' MB',
       limit: Math.round(performance.memory.jsHeapSizeLimit / 1048576) + ' MB'
     } : 'Not available',
     screen: `${screen.width}x${screen.height}`,
     viewport: `${window.innerWidth}x${window.innerHeight}`,
     pixelRatio: window.devicePixelRatio,
     connection: navigator.connection ? {
       effectiveType: navigator.connection.effectiveType,
       downlink: navigator.connection.downlink
     } : 'Not available'
   });
   ```

2. **Steps to Reproduce**
   - Clear, numbered steps
   - Expected vs actual behavior
   - Screenshots or videos if applicable

3. **Console Logs**
   - Include relevant error messages
   - Network tab information for connectivity issues
   - Performance tab data for performance issues

### Emergency Contacts

For critical production issues:
- Email: support@somnia.network
- Emergency hotline: Available in production documentation
- Status page: status.somnia.network

This troubleshooting guide should help resolve most common issues. If you encounter problems not covered here, please refer to the community resources or contact support.