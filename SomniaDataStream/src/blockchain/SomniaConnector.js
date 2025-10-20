import { ethers } from 'ethers';

export class SomniaConnector {
    constructor() {
        this.provider = null;
        this.signer = null;
        this.gameContract = null;
        this.isConnected = false;
        this.playerAddress = null;
        this.eventListeners = new Map();
        
        // Somnia network configuration
        this.networkConfig = {
            chainId: '0x7A69', // Somnia testnet chain ID (example)
            chainName: 'Somnia Testnet',
            rpcUrls: [import.meta.env.VITE_SOMNIA_RPC_URL || 'https://dream-rpc.somnia.network'],
            nativeCurrency: {
                name: 'STT',
                symbol: 'STT',
                decimals: 18
            },
            blockExplorerUrls: ['https://explorer.somnia.network']
        };

        // Mock contract ABI for demonstration
        this.gameContractABI = [
            "function updatePlayerPosition(uint256 x, uint256 y, uint256 z) external",
            "function fireWeapon(uint256 targetX, uint256 targetY, uint256 targetZ) external",
            "function collectPowerUp(uint256 powerUpId) external",
            "function getPlayerStats(address player) external view returns (uint256 score, uint256 health, uint256 energy, uint256 level)",
            "function getLeaderboard() external view returns (address[] memory players, uint256[] memory scores)",
            "event PlayerMoved(address indexed player, uint256 x, uint256 y, uint256 z, uint256 timestamp)",
            "event WeaponFired(address indexed player, uint256 targetX, uint256 targetY, uint256 targetZ, uint256 timestamp)",
            "event PowerUpCollected(address indexed player, uint256 powerUpId, uint256 timestamp)",
            "event ScoreUpdated(address indexed player, uint256 newScore, uint256 timestamp)"
        ];

        // Mock contract address (in real implementation, this would be deployed)
        this.gameContractAddress = "0x1234567890123456789012345678901234567890";
    }

    async connect() {
        try {
            console.log('🔗 Connecting to Somnia network...');

            // Check if MetaMask is available
            if (typeof window.ethereum === 'undefined') {
                throw new Error('MetaMask is not installed. Please install MetaMask to continue.');
            }

            // Create provider
            this.provider = new ethers.BrowserProvider(window.ethereum);

            // Request account access
            await window.ethereum.request({ method: 'eth_requestAccounts' });

            // Get signer
            this.signer = await this.provider.getSigner();
            this.playerAddress = await this.signer.getAddress();

            // Check if we're on the correct network
            const network = await this.provider.getNetwork();
            if (network.chainId.toString() !== this.networkConfig.chainId) {
                await this.switchToSomniaNetwork();
            }

            // Initialize game contract (mock for demonstration)
            this.gameContract = new ethers.Contract(
                this.gameContractAddress,
                this.gameContractABI,
                this.signer
            );

            // Set up event listeners
            this.setupEventListeners();

            this.isConnected = true;
            console.log('✅ Connected to Somnia network successfully!');
            console.log('👤 Player address:', this.playerAddress);

            return true;

        } catch (error) {
            console.error('❌ Failed to connect to Somnia:', error);
            throw error;
        }
    }

    async switchToSomniaNetwork() {
        try {
            await window.ethereum.request({
                method: 'wallet_switchEthereumChain',
                params: [{ chainId: this.networkConfig.chainId }],
            });
        } catch (switchError) {
            // This error code indicates that the chain has not been added to MetaMask
            if (switchError.code === 4902) {
                try {
                    await window.ethereum.request({
                        method: 'wallet_addEthereumChain',
                        params: [this.networkConfig],
                    });
                } catch (addError) {
                    throw new Error('Failed to add Somnia network to MetaMask');
                }
            } else {
                throw new Error('Failed to switch to Somnia network');
            }
        }
    }

    setupEventListeners() {
        if (!this.gameContract) return;

        // Listen for player movement events
        this.gameContract.on('PlayerMoved', (player, x, y, z, timestamp) => {
            this.emit('playerMoved', { player, x, y, z, timestamp });
        });

        // Listen for weapon fire events
        this.gameContract.on('WeaponFired', (player, targetX, targetY, targetZ, timestamp) => {
            this.emit('weaponFired', { player, targetX, targetY, targetZ, timestamp });
        });

        // Listen for power-up collection events
        this.gameContract.on('PowerUpCollected', (player, powerUpId, timestamp) => {
            this.emit('powerUpCollected', { player, powerUpId, timestamp });
        });

        // Listen for score updates
        this.gameContract.on('ScoreUpdated', (player, newScore, timestamp) => {
            this.emit('scoreUpdated', { player, newScore, timestamp });
        });
    }

    // Event emitter methods
    on(event, callback) {
        if (!this.eventListeners.has(event)) {
            this.eventListeners.set(event, []);
        }
        this.eventListeners.get(event).push(callback);
    }

    emit(event, data) {
        if (this.eventListeners.has(event)) {
            this.eventListeners.get(event).forEach(callback => callback(data));
        }
    }

    // Game interaction methods
    async updatePlayerPosition(x, y, z) {
        if (!this.isConnected || !this.gameContract) {
            console.warn('⚠️ Not connected to Somnia network');
            return;
        }

        try {
            // In a real implementation, this would call the smart contract
            // For demo purposes, we'll simulate the transaction
            console.log(`📍 Updating player position: (${x}, ${y}, ${z})`);
            
            // Simulate transaction delay
            await new Promise(resolve => setTimeout(resolve, 50));
            
            // Emit mock event
            this.emit('playerMoved', {
                player: this.playerAddress,
                x: Math.floor(x),
                y: Math.floor(y),
                z: Math.floor(z),
                timestamp: Date.now()
            });

        } catch (error) {
            console.error('❌ Failed to update player position:', error);
        }
    }

    async fireWeapon(targetX, targetY, targetZ) {
        if (!this.isConnected || !this.gameContract) {
            console.warn('⚠️ Not connected to Somnia network');
            return;
        }

        try {
            console.log(`🔫 Firing weapon at: (${targetX}, ${targetY}, ${targetZ})`);
            
            // Simulate transaction
            await new Promise(resolve => setTimeout(resolve, 30));
            
            this.emit('weaponFired', {
                player: this.playerAddress,
                targetX: Math.floor(targetX),
                targetY: Math.floor(targetY),
                targetZ: Math.floor(targetZ),
                timestamp: Date.now()
            });

        } catch (error) {
            console.error('❌ Failed to fire weapon:', error);
        }
    }

    async collectPowerUp(powerUpId) {
        if (!this.isConnected || !this.gameContract) {
            console.warn('⚠️ Not connected to Somnia network');
            return;
        }

        try {
            console.log(`⚡ Collecting power-up: ${powerUpId}`);
            
            // Simulate transaction
            await new Promise(resolve => setTimeout(resolve, 40));
            
            this.emit('powerUpCollected', {
                player: this.playerAddress,
                powerUpId,
                timestamp: Date.now()
            });

        } catch (error) {
            console.error('❌ Failed to collect power-up:', error);
        }
    }

    async updateScore(newScore) {
        if (!this.isConnected) return;

        try {
            this.emit('scoreUpdated', {
                player: this.playerAddress,
                newScore,
                timestamp: Date.now()
            });
        } catch (error) {
            console.error('❌ Failed to update score:', error);
        }
    }

    // Mock data for demonstration
    async getPlayerStats(playerAddress = null) {
        const address = playerAddress || this.playerAddress;
        
        // Return mock data for demonstration
        return {
            score: Math.floor(Math.random() * 10000),
            health: 100,
            energy: Math.floor(Math.random() * 100),
            level: Math.floor(Math.random() * 10) + 1
        };
    }

    async getLeaderboard() {
        // Return mock leaderboard data
        const mockPlayers = [
            { address: '0x1234...5678', score: 15420 },
            { address: '0x2345...6789', score: 12350 },
            { address: '0x3456...7890', score: 9870 },
            { address: '0x4567...8901', score: 8420 },
            { address: '0x5678...9012', score: 7650 }
        ];

        return mockPlayers.sort((a, b) => b.score - a.score);
    }

    disconnect() {
        if (this.gameContract) {
            this.gameContract.removeAllListeners();
        }
        
        this.provider = null;
        this.signer = null;
        this.gameContract = null;
        this.isConnected = false;
        this.playerAddress = null;
        this.eventListeners.clear();
        
        console.log('🔌 Disconnected from Somnia network');
    }

    getPlayerAddress() {
        return this.playerAddress;
    }

    isNetworkConnected() {
        return this.isConnected;
    }
}