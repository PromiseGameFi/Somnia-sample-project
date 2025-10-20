export class GameState {
    constructor() {
        this.score = 0;
        this.level = 1;
        this.lives = 3;
        this.gameTime = 0;
        this.isGameOver = false;
        this.isPaused = false;
        
        // Statistics
        this.stats = {
            enemiesKilled: 0,
            powerUpsCollected: 0,
            shotsfired: 0,
            accuracy: 0,
            maxCombo: 0,
            currentCombo: 0,
            totalDamageDealt: 0,
            totalDamageTaken: 0,
            distanceTraveled: 0
        };
        
        // Level progression
        this.levelThresholds = [
            0,      // Level 1
            1000,   // Level 2
            2500,   // Level 3
            5000,   // Level 4
            10000,  // Level 5
            20000,  // Level 6
            35000,  // Level 7
            50000,  // Level 8
            75000,  // Level 9
            100000  // Level 10
        ];
        
        // Difficulty scaling
        this.difficulty = {
            enemySpawnRate: 1.0,
            enemyHealth: 1.0,
            enemySpeed: 1.0,
            powerUpSpawnRate: 1.0,
            scoreMultiplier: 1.0
        };
        
        // Achievements
        this.achievements = new Set();
        this.achievementDefinitions = this.initAchievements();
        
        // Session data
        this.sessionStartTime = Date.now();
        this.lastSaveTime = Date.now();
        
        console.log('🎯 Game state initialized');
    }

    initAchievements() {
        return {
            'first_kill': {
                name: 'First Blood',
                description: 'Destroy your first enemy',
                condition: () => this.stats.enemiesKilled >= 1
            },
            'score_1000': {
                name: 'Getting Started',
                description: 'Reach 1,000 points',
                condition: () => this.score >= 1000
            },
            'score_10000': {
                name: 'Space Ace',
                description: 'Reach 10,000 points',
                condition: () => this.score >= 10000
            },
            'level_5': {
                name: 'Veteran Pilot',
                description: 'Reach level 5',
                condition: () => this.level >= 5
            },
            'combo_10': {
                name: 'Combo Master',
                description: 'Achieve a 10x combo',
                condition: () => this.stats.maxCombo >= 10
            },
            'accuracy_90': {
                name: 'Sharpshooter',
                description: 'Achieve 90% accuracy',
                condition: () => this.stats.accuracy >= 90
            },
            'powerups_50': {
                name: 'Power Collector',
                description: 'Collect 50 power-ups',
                condition: () => this.stats.powerUpsCollected >= 50
            },
            'survivor': {
                name: 'Survivor',
                description: 'Survive for 10 minutes',
                condition: () => this.gameTime >= 600
            },
            'no_damage': {
                name: 'Untouchable',
                description: 'Complete a level without taking damage',
                condition: () => this.stats.totalDamageTaken === 0 && this.level > 1
            },
            'speed_demon': {
                name: 'Speed Demon',
                description: 'Travel 10,000 units',
                condition: () => this.stats.distanceTraveled >= 10000
            }
        };
    }

    update(deltaTime) {
        if (this.isPaused || this.isGameOver) return;
        
        this.gameTime += deltaTime;
        
        // Check for level progression
        this.checkLevelProgression();
        
        // Update difficulty
        this.updateDifficulty();
        
        // Check achievements
        this.checkAchievements();
        
        // Auto-save periodically
        if (Date.now() - this.lastSaveTime > 30000) { // Every 30 seconds
            this.saveProgress();
        }
    }

    addScore(points) {
        const multipliedPoints = Math.floor(points * this.difficulty.scoreMultiplier * (1 + this.stats.currentCombo * 0.1));
        this.score += multipliedPoints;
        
        // Increase combo
        this.stats.currentCombo++;
        this.stats.maxCombo = Math.max(this.stats.maxCombo, this.stats.currentCombo);
        
        console.log(`🏆 Score: +${multipliedPoints} (Total: ${this.score})`);
        
        return multipliedPoints;
    }

    resetCombo() {
        this.stats.currentCombo = 0;
    }

    addEnemyKill() {
        this.stats.enemiesKilled++;
        this.addScore(100);
    }

    addPowerUpCollected() {
        this.stats.powerUpsCollected++;
        this.addScore(50);
    }

    addShotFired() {
        this.stats.shotsfired++;
        this.updateAccuracy();
    }

    addDamageDealt(damage) {
        this.stats.totalDamageDealt += damage;
    }

    addDamageTaken(damage) {
        this.stats.totalDamageTaken += damage;
        this.resetCombo(); // Reset combo when taking damage
    }

    addDistanceTraveled(distance) {
        this.stats.distanceTraveled += distance;
    }

    updateAccuracy() {
        if (this.stats.shotsfired > 0) {
            // This is a simplified accuracy calculation
            // In a real game, you'd track hits vs misses
            const estimatedHits = this.stats.enemiesKilled * 2; // Assume 2 shots per kill on average
            this.stats.accuracy = Math.min(100, (estimatedHits / this.stats.shotsfired) * 100);
        }
    }

    checkLevelProgression() {
        const newLevel = this.calculateLevel();
        
        if (newLevel > this.level) {
            const oldLevel = this.level;
            this.level = newLevel;
            
            console.log(`🆙 Level up! ${oldLevel} → ${this.level}`);
            
            // Level up bonus
            this.addScore(this.level * 500);
            
            // Reset damage taken for "Untouchable" achievement
            if (this.level > oldLevel + 1) {
                this.stats.totalDamageTaken = 0;
            }
            
            return true;
        }
        
        return false;
    }

    calculateLevel() {
        for (let i = this.levelThresholds.length - 1; i >= 0; i--) {
            if (this.score >= this.levelThresholds[i]) {
                return i + 1;
            }
        }
        return 1;
    }

    updateDifficulty() {
        // Scale difficulty based on level
        const baseLevel = Math.max(1, this.level);
        
        this.difficulty.enemySpawnRate = 1.0 + (baseLevel - 1) * 0.2;
        this.difficulty.enemyHealth = 1.0 + (baseLevel - 1) * 0.15;
        this.difficulty.enemySpeed = 1.0 + (baseLevel - 1) * 0.1;
        this.difficulty.powerUpSpawnRate = Math.max(0.5, 1.0 - (baseLevel - 1) * 0.05);
        this.difficulty.scoreMultiplier = 1.0 + (baseLevel - 1) * 0.1;
    }

    checkAchievements() {
        for (const [id, achievement] of Object.entries(this.achievementDefinitions)) {
            if (!this.achievements.has(id) && achievement.condition()) {
                this.unlockAchievement(id, achievement);
            }
        }
    }

    unlockAchievement(id, achievement) {
        this.achievements.add(id);
        console.log(`🏅 Achievement unlocked: ${achievement.name}`);
        
        // Achievement bonus
        this.addScore(1000);
        
        // Trigger UI notification
        if (window.uiManager) {
            window.uiManager.showNotification(
                `Achievement: ${achievement.name}`,
                'achievement',
                3000
            );
        }
    }

    loseLife() {
        this.lives--;
        this.resetCombo();
        
        if (this.lives <= 0) {
            this.gameOver();
        }
        
        console.log(`💔 Life lost! Lives remaining: ${this.lives}`);
    }

    gainLife() {
        this.lives++;
        console.log(`💚 Extra life! Lives: ${this.lives}`);
    }

    gameOver() {
        this.isGameOver = true;
        
        console.log('💀 Game Over!');
        console.log(`Final Score: ${this.score}`);
        console.log(`Level Reached: ${this.level}`);
        console.log(`Time Played: ${Math.floor(this.gameTime)}s`);
        
        // Save high score
        this.saveHighScore();
        
        // Generate final stats
        return this.getFinalStats();
    }

    pause() {
        this.isPaused = true;
    }

    resume() {
        this.isPaused = false;
    }

    reset() {
        this.score = 0;
        this.level = 1;
        this.lives = 3;
        this.gameTime = 0;
        this.isGameOver = false;
        this.isPaused = false;
        
        // Reset stats
        this.stats = {
            enemiesKilled: 0,
            powerUpsCollected: 0,
            shotsFired: 0,
            accuracy: 0,
            maxCombo: 0,
            currentCombo: 0,
            totalDamageDealt: 0,
            totalDamageTaken: 0,
            distanceTraveled: 0
        };
        
        // Reset difficulty
        this.difficulty = {
            enemySpawnRate: 1.0,
            enemyHealth: 1.0,
            enemySpeed: 1.0,
            powerUpSpawnRate: 1.0,
            scoreMultiplier: 1.0
        };
        
        // Keep achievements but reset session-specific ones
        this.achievements.delete('no_damage');
        
        this.sessionStartTime = Date.now();
        
        console.log('🔄 Game state reset');
    }

    // Data persistence
    saveProgress() {
        const saveData = {
            score: this.score,
            level: this.level,
            lives: this.lives,
            gameTime: this.gameTime,
            stats: this.stats,
            achievements: Array.from(this.achievements),
            timestamp: Date.now()
        };
        
        try {
            localStorage.setItem('somniaSpaceRaiders_progress', JSON.stringify(saveData));
            this.lastSaveTime = Date.now();
            console.log('💾 Progress saved');
        } catch (error) {
            console.warn('⚠️ Failed to save progress:', error);
        }
    }

    loadProgress() {
        try {
            const saveData = localStorage.getItem('somniaSpaceRaiders_progress');
            if (saveData) {
                const data = JSON.parse(saveData);
                
                this.score = data.score || 0;
                this.level = data.level || 1;
                this.lives = data.lives || 3;
                this.gameTime = data.gameTime || 0;
                this.stats = { ...this.stats, ...data.stats };
                this.achievements = new Set(data.achievements || []);
                
                console.log('📁 Progress loaded');
                return true;
            }
        } catch (error) {
            console.warn('⚠️ Failed to load progress:', error);
        }
        
        return false;
    }

    saveHighScore() {
        try {
            const highScores = this.getHighScores();
            
            const newScore = {
                score: this.score,
                level: this.level,
                time: this.gameTime,
                date: new Date().toISOString(),
                stats: { ...this.stats }
            };
            
            highScores.push(newScore);
            highScores.sort((a, b) => b.score - a.score);
            highScores.splice(10); // Keep only top 10
            
            localStorage.setItem('somniaSpaceRaiders_highScores', JSON.stringify(highScores));
            
            console.log('🏆 High score saved');
        } catch (error) {
            console.warn('⚠️ Failed to save high score:', error);
        }
    }

    getHighScores() {
        try {
            const highScores = localStorage.getItem('somniaSpaceRaiders_highScores');
            return highScores ? JSON.parse(highScores) : [];
        } catch (error) {
            console.warn('⚠️ Failed to load high scores:', error);
            return [];
        }
    }

    // Getters
    getScore() {
        return this.score;
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
        const minutes = Math.floor(this.gameTime / 60);
        const seconds = Math.floor(this.gameTime % 60);
        return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }

    getStats() {
        return { ...this.stats };
    }

    getDifficulty() {
        return { ...this.difficulty };
    }

    getAchievements() {
        return Array.from(this.achievements);
    }

    getProgress() {
        const nextLevelThreshold = this.levelThresholds[this.level] || this.levelThresholds[this.levelThresholds.length - 1];
        const currentLevelThreshold = this.levelThresholds[this.level - 1] || 0;
        const progress = (this.score - currentLevelThreshold) / (nextLevelThreshold - currentLevelThreshold);
        
        return Math.min(1, Math.max(0, progress));
    }

    getFinalStats() {
        return {
            score: this.score,
            level: this.level,
            time: this.getFormattedTime(),
            stats: this.getStats(),
            achievements: this.getAchievements().length,
            isNewHighScore: this.isNewHighScore()
        };
    }

    isNewHighScore() {
        const highScores = this.getHighScores();
        return highScores.length === 0 || this.score > highScores[0].score;
    }

    // Debug methods
    getDebugInfo() {
        return {
            score: this.score,
            level: this.level,
            lives: this.lives,
            gameTime: this.getFormattedTime(),
            difficulty: this.difficulty,
            stats: this.stats,
            achievements: this.achievements.size,
            isGameOver: this.isGameOver,
            isPaused: this.isPaused
        };
    }
}