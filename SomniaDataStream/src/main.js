import { Game } from './game/Game.js';
import { SomniaConnector } from './blockchain/SomniaConnector.js';
import { UIManager } from './ui/UIManager.js';

class SomniaSpaceRaiders {
    constructor() {
        this.game = null;
        this.somniaConnector = null;
        this.uiManager = null;
        this.isGameRunning = false;
        
        this.init();
    }

    async init() {
        console.log('🚀 Initializing Somnia Space Raiders...');
        
        // Initialize UI Manager
        this.uiManager = new UIManager();
        
        // Initialize Somnia Connector
        this.somniaConnector = new SomniaConnector();
        
        // Set up event listeners
        this.setupEventListeners();
        
        console.log('✅ Somnia Space Raiders initialized successfully!');
    }

    setupEventListeners() {
        // Make startGame globally available
        window.startGame = () => this.startGame();
        
        // Handle window resize
        window.addEventListener('resize', () => {
            if (this.game) {
                this.game.handleResize();
            }
        });

        // Handle visibility change
        document.addEventListener('visibilitychange', () => {
            if (this.game) {
                if (document.hidden) {
                    this.game.pause();
                } else {
                    this.game.resume();
                }
            }
        });
    }

    async startGame() {
        if (this.isGameRunning) return;
        
        try {
            // Show loading screen
            this.uiManager.showLoadingScreen('Connecting to Somnia Network...');
            
            // Connect to Somnia
            await this.somniaConnector.connect();
            this.uiManager.updateConnectionStatus(true);
            
            // Initialize game
            this.uiManager.showLoadingScreen('Initializing Game Engine...');
            this.game = new Game(this.somniaConnector, this.uiManager);
            await this.game.init();
            
            // Hide start screen and loading
            this.uiManager.hideStartScreen();
            this.uiManager.hideLoadingScreen();
            
            // Start game loop
            this.game.start();
            this.isGameRunning = true;
            
            console.log('🎮 Game started successfully!');
            
        } catch (error) {
            console.error('❌ Failed to start game:', error);
            this.uiManager.hideLoadingScreen();
            this.uiManager.updateConnectionStatus(false);
            alert('Failed to connect to Somnia network. Please check your connection and try again.');
        }
    }

    async stopGame() {
        if (!this.isGameRunning) return;
        
        if (this.game) {
            this.game.stop();
            this.game = null;
        }
        
        this.isGameRunning = false;
        this.uiManager.showStartScreen();
        
        console.log('🛑 Game stopped');
    }
}

// Initialize the application when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new SomniaSpaceRaiders();
});

// Handle errors
window.addEventListener('error', (event) => {
    console.error('💥 Application error:', event.error);
});

window.addEventListener('unhandledrejection', (event) => {
    console.error('💥 Unhandled promise rejection:', event.reason);
});