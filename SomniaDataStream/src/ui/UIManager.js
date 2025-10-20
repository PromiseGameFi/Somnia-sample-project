export class UIManager {
    constructor() {
        this.elements = {
            startScreen: document.getElementById('startScreen'),
            loadingScreen: document.getElementById('loadingScreen'),
            connectionStatus: document.getElementById('connectionStatus'),
            score: document.getElementById('score'),
            health: document.getElementById('health'),
            energy: document.getElementById('energy'),
            level: document.getElementById('level'),
            leaderboardList: document.getElementById('leaderboardList'),
            loadingText: document.querySelector('.loading-text'),
            loadingSubtext: document.querySelector('.loading-subtext')
        };

        this.playerStats = {
            score: 0,
            health: 100,
            energy: 100,
            level: 1
        };

        this.leaderboard = [];
        this.updateInterval = null;
        
        this.init();
    }

    init() {
        // Start periodic updates
        this.updateInterval = setInterval(() => {
            this.updateLeaderboard();
        }, 5000); // Update every 5 seconds

        console.log('🎨 UI Manager initialized');
    }

    showStartScreen() {
        if (this.elements.startScreen) {
            this.elements.startScreen.style.display = 'flex';
        }
    }

    hideStartScreen() {
        if (this.elements.startScreen) {
            this.elements.startScreen.style.display = 'none';
        }
    }

    showLoadingScreen(text = 'Loading...', subtext = '') {
        if (this.elements.loadingScreen) {
            this.elements.loadingScreen.style.display = 'flex';
        }
        if (this.elements.loadingText) {
            this.elements.loadingText.textContent = text;
        }
        if (this.elements.loadingSubtext) {
            this.elements.loadingSubtext.textContent = subtext;
        }
    }

    hideLoadingScreen() {
        if (this.elements.loadingScreen) {
            this.elements.loadingScreen.style.display = 'none';
        }
    }

    updateConnectionStatus(isConnected) {
        if (!this.elements.connectionStatus) return;

        if (isConnected) {
            this.elements.connectionStatus.textContent = 'Connected to Somnia';
            this.elements.connectionStatus.className = 'connected';
        } else {
            this.elements.connectionStatus.textContent = 'Disconnected';
            this.elements.connectionStatus.className = 'disconnected';
        }
    }

    updatePlayerStats(stats) {
        // Update internal stats
        this.playerStats = { ...this.playerStats, ...stats };

        // Update UI elements
        if (this.elements.score) {
            this.elements.score.textContent = this.formatNumber(this.playerStats.score);
        }
        if (this.elements.health) {
            this.elements.health.textContent = this.playerStats.health;
            // Change color based on health
            const healthElement = this.elements.health;
            if (this.playerStats.health > 70) {
                healthElement.style.color = '#00ff00';
            } else if (this.playerStats.health > 30) {
                healthElement.style.color = '#ffff00';
            } else {
                healthElement.style.color = '#ff0000';
            }
        }
        if (this.elements.energy) {
            this.elements.energy.textContent = this.playerStats.energy;
            // Change color based on energy
            const energyElement = this.elements.energy;
            if (this.playerStats.energy > 50) {
                energyElement.style.color = '#00ffff';
            } else if (this.playerStats.energy > 20) {
                energyElement.style.color = '#ffff00';
            } else {
                energyElement.style.color = '#ff8800';
            }
        }
        if (this.elements.level) {
            this.elements.level.textContent = this.playerStats.level;
        }
    }

    updateScore(newScore) {
        this.updatePlayerStats({ score: newScore });
        
        // Add score animation effect
        if (this.elements.score) {
            this.elements.score.style.transform = 'scale(1.2)';
            this.elements.score.style.color = '#ffff00';
            setTimeout(() => {
                this.elements.score.style.transform = 'scale(1)';
                this.elements.score.style.color = '#00ff00';
            }, 200);
        }
    }

    updateHealth(newHealth) {
        const oldHealth = this.playerStats.health;
        this.updatePlayerStats({ health: newHealth });
        
        // Add damage/heal effect
        if (this.elements.health && newHealth !== oldHealth) {
            if (newHealth < oldHealth) {
                // Damage effect
                this.elements.health.style.color = '#ff0000';
                this.elements.health.style.transform = 'scale(1.3)';
            } else {
                // Heal effect
                this.elements.health.style.color = '#00ff00';
                this.elements.health.style.transform = 'scale(1.2)';
            }
            
            setTimeout(() => {
                this.elements.health.style.transform = 'scale(1)';
                this.updatePlayerStats({ health: newHealth }); // Reapply color logic
            }, 300);
        }
    }

    updateEnergy(newEnergy) {
        this.updatePlayerStats({ energy: newEnergy });
    }

    updateLevel(newLevel) {
        const oldLevel = this.playerStats.level;
        this.updatePlayerStats({ level: newLevel });
        
        // Level up effect
        if (newLevel > oldLevel && this.elements.level) {
            this.showLevelUpEffect();
        }
    }

    showLevelUpEffect() {
        // Create level up notification
        const notification = document.createElement('div');
        notification.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: linear-gradient(45deg, #ffff00, #ff8800);
            color: #000;
            padding: 20px 40px;
            border-radius: 10px;
            font-size: 24px;
            font-weight: bold;
            z-index: 1000;
            animation: levelUpPulse 2s ease-out forwards;
            pointer-events: none;
        `;
        notification.textContent = 'LEVEL UP!';
        
        // Add animation keyframes
        if (!document.getElementById('levelUpAnimation')) {
            const style = document.createElement('style');
            style.id = 'levelUpAnimation';
            style.textContent = `
                @keyframes levelUpPulse {
                    0% { transform: translate(-50%, -50%) scale(0.5); opacity: 0; }
                    50% { transform: translate(-50%, -50%) scale(1.2); opacity: 1; }
                    100% { transform: translate(-50%, -50%) scale(1); opacity: 0; }
                }
            `;
            document.head.appendChild(style);
        }
        
        document.body.appendChild(notification);
        
        setTimeout(() => {
            document.body.removeChild(notification);
        }, 2000);
    }

    async updateLeaderboard(leaderboardData = null) {
        if (!this.elements.leaderboardList) return;

        try {
            // Use provided data or generate mock data
            let leaderboard = leaderboardData;
            if (!leaderboard) {
                leaderboard = await this.generateMockLeaderboard();
            }

            this.leaderboard = leaderboard;

            // Clear current leaderboard
            this.elements.leaderboardList.innerHTML = '';

            // Add leaderboard entries
            leaderboard.slice(0, 10).forEach((entry, index) => {
                const item = document.createElement('div');
                item.className = 'leaderboard-item';
                
                const rank = index + 1;
                const playerName = this.formatAddress(entry.address);
                const score = this.formatNumber(entry.score);
                
                item.innerHTML = `
                    <span>${rank}. ${playerName}</span>
                    <span>${score}</span>
                `;
                
                // Highlight current player
                if (entry.isCurrentPlayer) {
                    item.style.background = 'rgba(0, 255, 255, 0.2)';
                    item.style.border = '1px solid #00ffff';
                }
                
                this.elements.leaderboardList.appendChild(item);
            });

        } catch (error) {
            console.error('❌ Failed to update leaderboard:', error);
        }
    }

    async generateMockLeaderboard() {
        // Generate dynamic mock leaderboard data
        const mockPlayers = [
            { address: '0x1234567890123456789012345678901234567890', baseScore: 15000 },
            { address: '0x2345678901234567890123456789012345678901', baseScore: 12000 },
            { address: '0x3456789012345678901234567890123456789012', baseScore: 9000 },
            { address: '0x4567890123456789012345678901234567890123', baseScore: 7500 },
            { address: '0x5678901234567890123456789012345678901234', baseScore: 6000 },
            { address: '0x6789012345678901234567890123456789012345', baseScore: 4500 },
            { address: '0x7890123456789012345678901234567890123456', baseScore: 3000 },
            { address: '0x8901234567890123456789012345678901234567', baseScore: 2000 }
        ];

        // Add some randomness to scores
        const leaderboard = mockPlayers.map(player => ({
            address: player.address,
            score: player.baseScore + Math.floor(Math.random() * 1000),
            isCurrentPlayer: false
        }));

        // Add current player if available
        const currentPlayerScore = this.playerStats.score;
        if (currentPlayerScore > 0) {
            leaderboard.push({
                address: 'You',
                score: currentPlayerScore,
                isCurrentPlayer: true
            });
        }

        // Sort by score
        return leaderboard.sort((a, b) => b.score - a.score);
    }

    formatNumber(num) {
        if (num >= 1000000) {
            return (num / 1000000).toFixed(1) + 'M';
        } else if (num >= 1000) {
            return (num / 1000).toFixed(1) + 'K';
        }
        return num.toString();
    }

    formatAddress(address) {
        if (address === 'You') return address;
        if (address.length > 10) {
            return address.slice(0, 6) + '...' + address.slice(-4);
        }
        return address;
    }

    showNotification(message, type = 'info', duration = 3000) {
        const notification = document.createElement('div');
        notification.style.cssText = `
            position: fixed;
            top: 100px;
            right: 20px;
            padding: 15px 20px;
            border-radius: 5px;
            color: white;
            font-weight: bold;
            z-index: 1000;
            animation: slideInRight 0.3s ease-out;
            max-width: 300px;
            word-wrap: break-word;
        `;

        // Set color based on type
        switch (type) {
            case 'success':
                notification.style.background = 'rgba(0, 255, 0, 0.8)';
                notification.style.border = '2px solid #00ff00';
                break;
            case 'error':
                notification.style.background = 'rgba(255, 0, 0, 0.8)';
                notification.style.border = '2px solid #ff0000';
                break;
            case 'warning':
                notification.style.background = 'rgba(255, 255, 0, 0.8)';
                notification.style.border = '2px solid #ffff00';
                notification.style.color = '#000';
                break;
            default:
                notification.style.background = 'rgba(0, 255, 255, 0.8)';
                notification.style.border = '2px solid #00ffff';
        }

        notification.textContent = message;

        // Add animation keyframes if not exists
        if (!document.getElementById('notificationAnimation')) {
            const style = document.createElement('style');
            style.id = 'notificationAnimation';
            style.textContent = `
                @keyframes slideInRight {
                    from { transform: translateX(100%); opacity: 0; }
                    to { transform: translateX(0); opacity: 1; }
                }
                @keyframes slideOutRight {
                    from { transform: translateX(0); opacity: 1; }
                    to { transform: translateX(100%); opacity: 0; }
                }
            `;
            document.head.appendChild(style);
        }

        document.body.appendChild(notification);

        // Auto remove after duration
        setTimeout(() => {
            notification.style.animation = 'slideOutRight 0.3s ease-out';
            setTimeout(() => {
                if (document.body.contains(notification)) {
                    document.body.removeChild(notification);
                }
            }, 300);
        }, duration);
    }

    destroy() {
        if (this.updateInterval) {
            clearInterval(this.updateInterval);
        }
        console.log('🗑️ UI Manager destroyed');
    }
}