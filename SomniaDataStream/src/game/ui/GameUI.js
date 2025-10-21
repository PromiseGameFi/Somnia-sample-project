export class GameUI {
    constructor(game) {
        this.game = game;
        this.canvas = game.canvas;
        this.ctx = game.ctx;
        
        // UI state
        this.showDebug = false;
        this.eventLog = [];
        this.maxLogEntries = 10;
        
        // Connection status
        this.connectionStatus = 'disconnected';
        this.lastEventTime = 0;
        this.eventCount = 0;
        this.transactionCount = 0;
        
        // Animation properties
        this.pulseAnimation = 0;
        this.dataStreamAnimation = 0;
        
        // UI elements positions
        this.uiElements = {
            connectionStatus: { x: 20, y: 20, width: 200, height: 30 },
            playerStats: { x: 20, y: 60, width: 200, height: 120 },
            dataStream: { x: this.canvas.width - 320, y: 20, width: 300, height: 200 },
            eventLog: { x: this.canvas.width - 320, y: 240, width: 300, height: 150 },
            gameInfo: { x: 20, y: 200, width: 200, height: 80 }
        };
        
        this.setupEventListeners();
    }

    setupEventListeners() {
        // Listen to blockchain events for UI updates
        if (this.game.somniaConnector) {
            this.game.somniaConnector.on('connected', () => {
                this.connectionStatus = 'connected';
                this.addEventToLog('🟢 Connected to Somnia Network');
            });

            this.game.somniaConnector.on('disconnected', () => {
                this.connectionStatus = 'disconnected';
                this.addEventToLog('🔴 Disconnected from Somnia Network');
            });

            this.game.somniaConnector.on('playerAction', (data) => {
                this.onBlockchainEvent('Player Action', data);
            });

            this.game.somniaConnector.on('playerShoot', (data) => {
                this.onBlockchainEvent('Player Shot', data);
            });

            this.game.somniaConnector.on('enemyAction', (data) => {
                this.onBlockchainEvent('Enemy Action', data);
            });

            this.game.somniaConnector.on('collectiblePickup', (data) => {
                this.onBlockchainEvent('Collectible Pickup', data);
            });

            this.game.somniaConnector.on('transactionConfirmed', (data) => {
                this.transactionCount++;
                this.onBlockchainEvent('Transaction Confirmed', data);
            });
        }
    }

    onBlockchainEvent(eventType, data) {
        this.lastEventTime = Date.now();
        this.eventCount++;
        this.addEventToLog(`📡 ${eventType}`);
        
        // Trigger visual effects
        this.pulseAnimation = 1.0;
        this.dataStreamAnimation = 1.0;
    }

    addEventToLog(message) {
        const timestamp = new Date().toLocaleTimeString();
        this.eventLog.unshift({
            message,
            timestamp,
            id: Date.now()
        });
        
        // Keep only recent events
        if (this.eventLog.length > this.maxLogEntries) {
            this.eventLog = this.eventLog.slice(0, this.maxLogEntries);
        }
    }

    update(deltaTime) {
        // Update animations
        if (this.pulseAnimation > 0) {
            this.pulseAnimation -= deltaTime * 0.002;
            this.pulseAnimation = Math.max(0, this.pulseAnimation);
        }
        
        if (this.dataStreamAnimation > 0) {
            this.dataStreamAnimation -= deltaTime * 0.001;
            this.dataStreamAnimation = Math.max(0, this.dataStreamAnimation);
        }
        
        // Update UI element positions based on canvas size
        this.updateUIPositions();
    }

    updateUIPositions() {
        const width = this.canvas.width;
        const height = this.canvas.height;
        
        // Right-aligned elements
        this.uiElements.dataStream.x = width - 320;
        this.uiElements.eventLog.x = width - 320;
    }

    render() {
        this.renderConnectionStatus();
        this.renderPlayerStats();
        this.renderDataStreamVisualizer();
        this.renderEventLog();
        this.renderGameInfo();
        
        if (this.showDebug) {
            this.renderDebugInfo();
        }
    }

    renderConnectionStatus() {
        const element = this.uiElements.connectionStatus;
        
        // Background
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        this.ctx.fillRect(element.x, element.y, element.width, element.height);
        
        // Border with connection status color
        const borderColor = this.connectionStatus === 'connected' ? '#48bb78' : '#f56565';
        this.ctx.strokeStyle = borderColor;
        this.ctx.lineWidth = 2;
        this.ctx.strokeRect(element.x, element.y, element.width, element.height);
        
        // Status text
        this.ctx.fillStyle = '#ffffff';
        this.ctx.font = '14px Arial';
        this.ctx.textAlign = 'left';
        
        const statusText = this.connectionStatus === 'connected' ? 
            '🟢 Somnia Connected' : '🔴 Somnia Disconnected';
        
        this.ctx.fillText(statusText, element.x + 10, element.y + 20);
        
        // Pulse effect when connected
        if (this.connectionStatus === 'connected' && this.pulseAnimation > 0) {
            this.ctx.strokeStyle = `rgba(72, 187, 120, ${this.pulseAnimation})`;
            this.ctx.lineWidth = 4;
            this.ctx.strokeRect(element.x - 2, element.y - 2, element.width + 4, element.height + 4);
        }
    }

    renderPlayerStats() {
        const element = this.uiElements.playerStats;
        const player = this.game.player;
        
        // Background
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        this.ctx.fillRect(element.x, element.y, element.width, element.height);
        
        // Border
        this.ctx.strokeStyle = '#4a5568';
        this.ctx.lineWidth = 2;
        this.ctx.strokeRect(element.x, element.y, element.width, element.height);
        
        // Stats text
        this.ctx.fillStyle = '#ffffff';
        this.ctx.font = '12px Arial';
        this.ctx.textAlign = 'left';
        
        const stats = [
            `Health: ${player.health}/100`,
            `Energy: ${player.energy}/100`,
            `Score: ${this.game.gameState.score}`,
            `Level: ${this.game.levelManager.getCurrentLevel()}`,
            `Weapon: Level ${player.weaponLevel || 1}`
        ];
        
        stats.forEach((stat, index) => {
            this.ctx.fillText(stat, element.x + 10, element.y + 20 + index * 18);
        });
        
        // Health bar
        this.renderBar(element.x + 10, element.y + 100, 180, 8, player.health, 100, '#e53e3e');
        
        // Energy bar
        this.renderBar(element.x + 10, element.y + 110, 180, 8, player.energy, 100, '#3182ce');
    }

    renderBar(x, y, width, height, current, max, color) {
        // Background
        this.ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
        this.ctx.fillRect(x, y, width, height);
        
        // Fill
        const fillWidth = (current / max) * width;
        this.ctx.fillStyle = color;
        this.ctx.fillRect(x, y, fillWidth, height);
        
        // Border
        this.ctx.strokeStyle = '#ffffff';
        this.ctx.lineWidth = 1;
        this.ctx.strokeRect(x, y, width, height);
    }

    renderDataStreamVisualizer() {
        const element = this.uiElements.dataStream;
        
        // Background
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
        this.ctx.fillRect(element.x, element.y, element.width, element.height);
        
        // Border with data stream effect
        const borderIntensity = 0.5 + this.dataStreamAnimation * 0.5;
        this.ctx.strokeStyle = `rgba(56, 178, 172, ${borderIntensity})`;
        this.ctx.lineWidth = 2;
        this.ctx.strokeRect(element.x, element.y, element.width, element.height);
        
        // Title
        this.ctx.fillStyle = '#38b2ac';
        this.ctx.font = 'bold 14px Arial';
        this.ctx.textAlign = 'left';
        this.ctx.fillText('📡 Somnia Data Stream', element.x + 10, element.y + 20);
        
        // Data stream stats
        this.ctx.fillStyle = '#ffffff';
        this.ctx.font = '12px Arial';
        
        const streamStats = [
            `Events: ${this.eventCount}`,
            `Transactions: ${this.transactionCount}`,
            `Last Event: ${this.getTimeSinceLastEvent()}`,
            `Status: ${this.connectionStatus === 'connected' ? 'Active' : 'Inactive'}`
        ];
        
        streamStats.forEach((stat, index) => {
            this.ctx.fillText(stat, element.x + 10, element.y + 45 + index * 16);
        });
        
        // Data stream visualization
        this.renderDataStreamAnimation(element);
    }

    renderDataStreamAnimation(element) {
        const streamY = element.y + 120;
        const streamHeight = 60;
        
        // Stream lines
        for (let i = 0; i < 5; i++) {
            const lineY = streamY + i * 12;
            const alpha = 0.3 + this.dataStreamAnimation * 0.7;
            
            this.ctx.strokeStyle = `rgba(56, 178, 172, ${alpha})`;
            this.ctx.lineWidth = 2;
            
            this.ctx.beginPath();
            this.ctx.moveTo(element.x + 10, lineY);
            
            // Create flowing line effect
            const time = Date.now() * 0.001;
            for (let x = 0; x < element.width - 20; x += 5) {
                const waveY = lineY + Math.sin((x * 0.02) + time + i) * 3;
                this.ctx.lineTo(element.x + 10 + x, waveY);
            }
            
            this.ctx.stroke();
        }
        
        // Data packets
        if (this.dataStreamAnimation > 0.5) {
            for (let i = 0; i < 3; i++) {
                const packetX = element.x + 20 + (this.dataStreamAnimation * 200) + i * 80;
                const packetY = streamY + 20 + i * 15;
                
                this.ctx.fillStyle = `rgba(72, 187, 120, ${this.dataStreamAnimation})`;
                this.ctx.fillRect(packetX, packetY, 8, 8);
            }
        }
    }

    renderEventLog() {
        const element = this.uiElements.eventLog;
        
        // Background
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        this.ctx.fillRect(element.x, element.y, element.width, element.height);
        
        // Border
        this.ctx.strokeStyle = '#4a5568';
        this.ctx.lineWidth = 2;
        this.ctx.strokeRect(element.x, element.y, element.width, element.height);
        
        // Title
        this.ctx.fillStyle = '#ffffff';
        this.ctx.font = 'bold 12px Arial';
        this.ctx.textAlign = 'left';
        this.ctx.fillText('📋 Event Log', element.x + 10, element.y + 15);
        
        // Event entries
        this.ctx.font = '10px Arial';
        this.eventLog.slice(0, 8).forEach((event, index) => {
            const alpha = 1 - (index * 0.1); // Fade older events
            this.ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
            
            const text = `${event.timestamp} ${event.message}`;
            const maxWidth = element.width - 20;
            
            // Truncate long messages
            const truncatedText = text.length > 35 ? text.substring(0, 32) + '...' : text;
            
            this.ctx.fillText(truncatedText, element.x + 10, element.y + 35 + index * 14);
        });
    }

    renderGameInfo() {
        const element = this.uiElements.gameInfo;
        
        // Background
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        this.ctx.fillRect(element.x, element.y, element.width, element.height);
        
        // Border
        this.ctx.strokeStyle = '#4a5568';
        this.ctx.lineWidth = 2;
        this.ctx.strokeRect(element.x, element.y, element.width, element.height);
        
        // Game info
        this.ctx.fillStyle = '#ffffff';
        this.ctx.font = '12px Arial';
        this.ctx.textAlign = 'left';
        
        const gameInfo = [
            `🎮 Platformer Shooter`,
            `🎯 Level ${this.game.levelManager.getCurrentLevel()}`,
            `👾 Enemies: ${this.game.enemies.length}`,
            `💎 Collectibles: ${this.game.levelManager.getCollectibles().length}`
        ];
        
        gameInfo.forEach((info, index) => {
            this.ctx.fillText(info, element.x + 10, element.y + 20 + index * 15);
        });
    }

    renderDebugInfo() {
        // Debug overlay
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
        this.ctx.fillRect(0, this.canvas.height - 100, this.canvas.width, 100);
        
        this.ctx.fillStyle = '#00ff00';
        this.ctx.font = '12px monospace';
        this.ctx.textAlign = 'left';
        
        const debugInfo = [
            `FPS: ${Math.round(1000 / (this.game.deltaTime || 16))}`,
            `Player: (${Math.round(this.game.player.x)}, ${Math.round(this.game.player.y)})`,
            `Camera: (${Math.round(this.game.camera.x)}, ${Math.round(this.game.camera.y)})`,
            `Entities: P:1 E:${this.game.enemies.length} Pr:${this.game.projectiles.length}`,
            `Connection: ${this.connectionStatus}`,
            `Events: ${this.eventCount} | Transactions: ${this.transactionCount}`
        ];
        
        debugInfo.forEach((info, index) => {
            this.ctx.fillText(info, 10, this.canvas.height - 80 + index * 12);
        });
    }

    getTimeSinceLastEvent() {
        if (this.lastEventTime === 0) return 'Never';
        
        const timeDiff = Date.now() - this.lastEventTime;
        if (timeDiff < 1000) return 'Just now';
        if (timeDiff < 60000) return `${Math.floor(timeDiff / 1000)}s ago`;
        return `${Math.floor(timeDiff / 60000)}m ago`;
    }

    toggleDebug() {
        this.showDebug = !this.showDebug;
    }

    handleInput(key) {
        switch (key) {
            case 'F3':
                this.toggleDebug();
                break;
        }
    }

    resize(width, height) {
        this.updateUIPositions();
    }
}