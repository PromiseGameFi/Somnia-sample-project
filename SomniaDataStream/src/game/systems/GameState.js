export class GameState {
    constructor() {
        // Game state
        this.score = 0;
        this.highScore = this.loadHighScore();
        this.level = 1;
        this.lives = 3;
        this.gameTime = 0;
        
        // Game status
        this.isGameOver = false;
        this.isPaused = false;
        this.isLevelComplete = false;
        this.isNewHighScore = false;
        
        // Statistics
        this.stats = {
            enemiesKilled: 0,
            collectiblesGathered: 0,
            shotsfired: 0,
            damageDealt: 0,
            damageTaken: 0,
            jumps: 0,
            distanceTraveled: 0,
            timeAlive: 0,
            levelsCompleted: 0
        };
        
        // Score multipliers
        this.scoreMultiplier = 1;
        this.multiplierTimer = 0;
        this.maxMultiplier = 5;
        
        // Events
        this.eventListeners = new Map();
        
        console.log('🎯 GameState initialized');
    }

    update(deltaTime) {
        if (this.isPaused || this.isGameOver) return;
        
        // Update game time
        this.gameTime += deltaTime;
        this.stats.timeAlive += deltaTime;
        
        // Update score multiplier
        if (this.multiplierTimer > 0) {
            this.multiplierTimer -= deltaTime;
            if (this.multiplierTimer <= 0) {
                this.scoreMultiplier = Math.max(1, this.scoreMultiplier - 1);
                if (this.scoreMultiplier > 1) {
                    this.multiplierTimer = 5000; // 5 seconds per multiplier level
                }
            }
        }
        
        // Check for new high score
        if (this.score > this.highScore && !this.isNewHighScore) {
            this.isNewHighScore = true;
            this.highScore = this.score;
            this.saveHighScore();
            this.emit('newHighScore', { score: this.score });
        }
    }

    // Score management
    addScore(points, reason = 'unknown') {
        const multipliedPoints = Math.floor(points * this.scoreMultiplier);
        this.score += multipliedPoints;
        
        // Increase multiplier for consecutive scoring
        if (reason === 'enemy_kill' || reason === 'collectible') {
            this.increaseMultiplier();
        }
        
        this.emit('scoreAdded', { 
            points: multipliedPoints, 
            originalPoints: points,
            multiplier: this.scoreMultiplier,
            reason,
            totalScore: this.score 
        });
        
        console.log(`💰 +${multipliedPoints} points (${reason}) | Total: ${this.score}`);
    }

    increaseMultiplier() {
        if (this.scoreMultiplier < this.maxMultiplier) {
            this.scoreMultiplier++;
            this.multiplierTimer = 5000; // Reset timer
            this.emit('multiplierIncreased', { multiplier: this.scoreMultiplier });
        } else {
            this.multiplierTimer = 5000; // Reset timer at max multiplier
        }
    }

    resetMultiplier() {
        this.scoreMultiplier = 1;
        this.multiplierTimer = 0;
        this.emit('multiplierReset');
    }

    // Statistics tracking
    incrementStat(statName, amount = 1) {
        if (this.stats.hasOwnProperty(statName)) {
            this.stats[statName] += amount;
            this.emit('statUpdated', { stat: statName, value: this.stats[statName] });
        }
    }

    // Game state management
    pauseGame() {
        this.isPaused = true;
        this.emit('gamePaused');
    }

    resumeGame() {
        this.isPaused = false;
        this.emit('gameResumed');
    }

    gameOver() {
        this.isGameOver = true;
        this.saveHighScore();
        this.emit('gameOver', {
            score: this.score,
            highScore: this.highScore,
            level: this.level,
            stats: this.stats,
            isNewHighScore: this.isNewHighScore
        });
        console.log('💀 Game Over! Final Score:', this.score);
    }

    restartGame() {
        // Reset game state
        this.score = 0;
        this.level = 1;
        this.lives = 3;
        this.gameTime = 0;
        this.isGameOver = false;
        this.isPaused = false;
        this.isLevelComplete = false;
        this.isNewHighScore = false;
        
        // Reset multiplier
        this.resetMultiplier();
        
        // Reset statistics
        Object.keys(this.stats).forEach(key => {
            this.stats[key] = 0;
        });
        
        this.emit('gameRestarted');
        console.log('🔄 Game restarted');
    }

    nextLevel() {
        this.level++;
        this.isLevelComplete = false;
        this.incrementStat('levelsCompleted');
        
        // Bonus points for level completion
        const levelBonus = this.level * 100;
        this.addScore(levelBonus, 'level_complete');
        
        this.emit('levelCompleted', { 
            level: this.level - 1, 
            newLevel: this.level,
            bonus: levelBonus 
        });
        
        console.log(`🎯 Level ${this.level} started! Bonus: ${levelBonus} points`);
    }

    loseLife() {
        this.lives--;
        this.resetMultiplier(); // Lose multiplier on death
        
        this.emit('lifeLost', { lives: this.lives });
        
        if (this.lives <= 0) {
            this.gameOver();
        } else {
            console.log(`💔 Life lost! Lives remaining: ${this.lives}`);
        }
    }

    gainLife() {
        this.lives++;
        this.emit('lifeGained', { lives: this.lives });
        console.log(`💚 Extra life! Lives: ${this.lives}`);
    }

    // High score persistence
    saveHighScore() {
        try {
            localStorage.setItem('somniaShooter_highScore', this.highScore.toString());
        } catch (error) {
            console.warn('Could not save high score:', error);
        }
    }

    loadHighScore() {
        try {
            const saved = localStorage.getItem('somniaShooter_highScore');
            return saved ? parseInt(saved, 10) : 0;
        } catch (error) {
            console.warn('Could not load high score:', error);
            return 0;
        }
    }

    // Event system
    on(event, callback) {
        if (!this.eventListeners.has(event)) {
            this.eventListeners.set(event, []);
        }
        this.eventListeners.get(event).push(callback);
    }

    off(event, callback) {
        if (this.eventListeners.has(event)) {
            const listeners = this.eventListeners.get(event);
            const index = listeners.indexOf(callback);
            if (index > -1) {
                listeners.splice(index, 1);
            }
        }
    }

    emit(event, data = null) {
        if (this.eventListeners.has(event)) {
            this.eventListeners.get(event).forEach(callback => {
                try {
                    callback(data);
                } catch (error) {
                    console.error(`Error in event listener for ${event}:`, error);
                }
            });
        }
    }

    // Getters
    getScore() {
        return this.score;
    }

    getHighScore() {
        return this.highScore;
    }

    getLevel() {
        return this.level;
    }

    getLives() {
        return this.lives;
    }

    getGameTime() {
        return this.gameTime;
    }

    getFormattedTime() {
        const minutes = Math.floor(this.gameTime / 60000);
        const seconds = Math.floor((this.gameTime % 60000) / 1000);
        return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }

    getStats() {
        return { ...this.stats };
    }

    getMultiplier() {
        return this.scoreMultiplier;
    }

    // Game state queries
    isPlaying() {
        return !this.isGameOver && !this.isPaused;
    }

    canPause() {
        return !this.isGameOver;
    }

    // Debug information
    getDebugInfo() {
        return {
            score: this.score,
            highScore: this.highScore,
            level: this.level,
            lives: this.lives,
            gameTime: this.getFormattedTime(),
            multiplier: this.scoreMultiplier,
            multiplierTimer: Math.ceil(this.multiplierTimer / 1000),
            isGameOver: this.isGameOver,
            isPaused: this.isPaused,
            stats: this.stats
        };
    }
}