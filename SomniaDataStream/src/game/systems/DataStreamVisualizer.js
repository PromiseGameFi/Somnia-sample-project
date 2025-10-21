export class DataStreamVisualizer {
    constructor(canvas, somniaConnector) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.somniaConnector = somniaConnector;
        
        // Data stream particles
        this.particles = [];
        this.maxParticles = 50;
        
        // Event queue for displaying recent blockchain events
        this.eventQueue = [];
        this.maxEvents = 10;
        
        // Visual settings
        this.streamColor = '#00ffff';
        this.eventColors = {
            'player_move': '#00ff00',
            'player_shoot': '#ffff00',
            'player_damage': '#ff4444',
            'enemy_spawn': '#ff8800',
            'enemy_shoot': '#ff0000',
            'enemy_damage': '#ff6666',
            'enemy_death': '#8800ff',
            'collectible_pickup': '#00ff88',
            'level_complete': '#ffff88',
            'connection': '#0088ff',
            'error': '#ff0088'
        };
        
        // Stream flow animation
        this.streamFlow = 0;
        this.streamSpeed = 2;
        
        // Connection status
        this.isConnected = false;
        this.connectionPulse = 0;
        
        // Data throughput tracking
        this.dataPoints = [];
        this.maxDataPoints = 60; // 1 second at 60fps
        this.currentThroughput = 0;
        
        // Event listeners for blockchain events
        this.setupEventListeners();
        
        console.log('📊 DataStreamVisualizer initialized');
    }

    setupEventListeners() {
        // Listen for blockchain connection status
        this.somniaConnector.on('connected', () => {
            this.isConnected = true;
            this.addEvent('connection', 'Connected to Somnia Network');
        });
        
        this.somniaConnector.on('disconnected', () => {
            this.isConnected = false;
            this.addEvent('error', 'Disconnected from Somnia Network');
        });
        
        // Listen for game events being sent to blockchain
        this.somniaConnector.on('playerAction', (data) => {
            this.addEvent('player_move', `Player: ${data.action}`);
            this.addDataPoint();
        });
        
        this.somniaConnector.on('playerShoot', (data) => {
            this.addEvent('player_shoot', 'Player fired weapon');
            this.addDataPoint();
            this.createStreamParticle(data.x, data.y, 'player_shoot');
        });
        
        this.somniaConnector.on('playerDamage', (data) => {
            this.addEvent('player_damage', `Player took ${data.damage} damage`);
            this.addDataPoint();
            this.createStreamParticle(data.x, data.y, 'player_damage');
        });
        
        this.somniaConnector.on('enemyAction', (data) => {
            this.addEvent(`enemy_${data.action}`, `Enemy ${data.action}: ${data.enemyType}`);
            this.addDataPoint();
            this.createStreamParticle(data.x, data.y, `enemy_${data.action}`);
        });
        
        this.somniaConnector.on('collectiblePickup', (data) => {
            this.addEvent('collectible_pickup', `Collected: ${data.type}`);
            this.addDataPoint();
            this.createStreamParticle(data.x, data.y, 'collectible_pickup');
        });
        
        this.somniaConnector.on('levelComplete', (data) => {
            this.addEvent('level_complete', `Level ${data.level} completed!`);
            this.addDataPoint();
        });
        
        // Listen for blockchain transaction confirmations
        this.somniaConnector.on('transactionConfirmed', (data) => {
            this.addEvent('connection', `TX confirmed: ${data.hash.substring(0, 8)}...`);
            this.addDataPoint();
        });
        
        this.somniaConnector.on('error', (error) => {
            this.addEvent('error', `Error: ${error.message}`);
        });
    }

    addEvent(type, message) {
        const event = {
            type,
            message,
            timestamp: Date.now(),
            id: Math.random().toString(36).substr(2, 9),
            alpha: 1.0,
            y: 0
        };
        
        this.eventQueue.unshift(event);
        
        // Limit queue size
        if (this.eventQueue.length > this.maxEvents) {
            this.eventQueue.pop();
        }
        
        console.log(`📡 Data Stream Event: ${type} - ${message}`);
    }

    addDataPoint() {
        const now = Date.now();
        this.dataPoints.push(now);
        
        // Remove old data points (older than 1 second)
        this.dataPoints = this.dataPoints.filter(point => now - point < 1000);
        
        // Update throughput
        this.currentThroughput = this.dataPoints.length;
    }

    createStreamParticle(x, y, eventType) {
        if (this.particles.length >= this.maxParticles) {
            this.particles.shift(); // Remove oldest particle
        }
        
        const particle = {
            x: x,
            y: y,
            targetX: this.canvas.width - 50, // Move towards data stream panel
            targetY: 50,
            vx: 0,
            vy: 0,
            life: 1.0,
            maxLife: 1.0,
            size: 3 + Math.random() * 3,
            color: this.eventColors[eventType] || this.streamColor,
            type: eventType,
            trail: []
        };
        
        this.particles.push(particle);
    }

    update(deltaTime) {
        // Update stream flow animation
        this.streamFlow += this.streamSpeed * deltaTime;
        if (this.streamFlow > 100) {
            this.streamFlow = 0;
        }
        
        // Update connection pulse
        this.connectionPulse += deltaTime * 3;
        
        // Update particles
        this.updateParticles(deltaTime);
        
        // Update event queue animations
        this.updateEventQueue(deltaTime);
        
        // Generate ambient stream particles when connected
        if (this.isConnected && Math.random() < 0.1) {
            this.createAmbientStreamParticle();
        }
    }

    updateParticles(deltaTime) {
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const particle = this.particles[i];
            
            // Calculate direction to target
            const dx = particle.targetX - particle.x;
            const dy = particle.targetY - particle.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            if (distance > 5) {
                // Move towards target
                const speed = 200 + Math.random() * 100;
                particle.vx = (dx / distance) * speed;
                particle.vy = (dy / distance) * speed;
                
                particle.x += particle.vx * deltaTime;
                particle.y += particle.vy * deltaTime;
                
                // Add to trail
                particle.trail.push({ x: particle.x, y: particle.y });
                if (particle.trail.length > 8) {
                    particle.trail.shift();
                }
            } else {
                // Reached target, fade out
                particle.life -= deltaTime * 2;
            }
            
            // Update life
            particle.life -= deltaTime * 0.5;
            
            // Remove dead particles
            if (particle.life <= 0) {
                this.particles.splice(i, 1);
            }
        }
    }

    updateEventQueue(deltaTime) {
        for (let i = 0; i < this.eventQueue.length; i++) {
            const event = this.eventQueue[i];
            
            // Animate position
            const targetY = i * 25 + 10;
            event.y += (targetY - event.y) * deltaTime * 8;
            
            // Fade out old events
            const age = (Date.now() - event.timestamp) / 1000;
            if (age > 5) {
                event.alpha = Math.max(0, 1 - (age - 5) * 0.5);
            }
        }
        
        // Remove fully faded events
        this.eventQueue = this.eventQueue.filter(event => event.alpha > 0);
    }

    createAmbientStreamParticle() {
        // Create particles that flow across the screen to show data stream activity
        const particle = {
            x: -10,
            y: 30 + Math.random() * 40,
            targetX: this.canvas.width + 10,
            targetY: 30 + Math.random() * 40,
            vx: 150 + Math.random() * 100,
            vy: (Math.random() - 0.5) * 20,
            life: 1.0,
            maxLife: 1.0,
            size: 1 + Math.random() * 2,
            color: this.streamColor,
            type: 'ambient',
            trail: []
        };
        
        this.particles.push(particle);
    }

    render() {
        // Draw data stream background panel
        this.drawStreamPanel();
        
        // Draw connection status
        this.drawConnectionStatus();
        
        // Draw throughput meter
        this.drawThroughputMeter();
        
        // Draw event queue
        this.drawEventQueue();
        
        // Draw stream particles
        this.drawParticles();
        
        // Draw stream flow lines
        this.drawStreamFlow();
    }

    drawStreamPanel() {
        const panelWidth = 300;
        const panelHeight = 400;
        const panelX = this.canvas.width - panelWidth - 10;
        const panelY = 10;
        
        // Semi-transparent background
        this.ctx.fillStyle = 'rgba(0, 20, 40, 0.8)';
        this.ctx.fillRect(panelX, panelY, panelWidth, panelHeight);
        
        // Border
        this.ctx.strokeStyle = this.isConnected ? this.streamColor : '#666666';
        this.ctx.lineWidth = 2;
        this.ctx.strokeRect(panelX, panelY, panelWidth, panelHeight);
        
        // Title
        this.ctx.fillStyle = this.streamColor;
        this.ctx.font = 'bold 16px monospace';
        this.ctx.fillText('SOMNIA DATA STREAM', panelX + 10, panelY + 25);
        
        // Subtitle
        this.ctx.fillStyle = '#aaaaaa';
        this.ctx.font = '12px monospace';
        this.ctx.fillText('Real-time Blockchain Events', panelX + 10, panelY + 45);
    }

    drawConnectionStatus() {
        const panelX = this.canvas.width - 290;
        const statusY = 70;
        
        // Connection indicator
        const pulseAlpha = 0.5 + 0.5 * Math.sin(this.connectionPulse);
        
        if (this.isConnected) {
            this.ctx.fillStyle = `rgba(0, 255, 0, ${pulseAlpha})`;
            this.ctx.fillRect(panelX, statusY, 10, 10);
            
            this.ctx.fillStyle = '#00ff00';
            this.ctx.font = '12px monospace';
            this.ctx.fillText('CONNECTED', panelX + 15, statusY + 9);
        } else {
            this.ctx.fillStyle = `rgba(255, 0, 0, ${pulseAlpha})`;
            this.ctx.fillRect(panelX, statusY, 10, 10);
            
            this.ctx.fillStyle = '#ff0000';
            this.ctx.font = '12px monospace';
            this.ctx.fillText('DISCONNECTED', panelX + 15, statusY + 9);
        }
    }

    drawThroughputMeter() {
        const panelX = this.canvas.width - 290;
        const meterY = 95;
        const meterWidth = 200;
        const meterHeight = 20;
        
        // Background
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
        this.ctx.fillRect(panelX, meterY, meterWidth, meterHeight);
        
        // Throughput bar
        const maxThroughput = 20; // events per second
        const throughputPercent = Math.min(this.currentThroughput / maxThroughput, 1);
        
        // Color based on throughput
        let barColor = '#00ff00';
        if (throughputPercent > 0.7) {
            barColor = '#ffff00';
        }
        if (throughputPercent > 0.9) {
            barColor = '#ff0000';
        }
        
        this.ctx.fillStyle = barColor;
        this.ctx.fillRect(panelX, meterY, meterWidth * throughputPercent, meterHeight);
        
        // Border
        this.ctx.strokeStyle = this.streamColor;
        this.ctx.lineWidth = 1;
        this.ctx.strokeRect(panelX, meterY, meterWidth, meterHeight);
        
        // Label
        this.ctx.fillStyle = '#aaaaaa';
        this.ctx.font = '10px monospace';
        this.ctx.fillText(`Throughput: ${this.currentThroughput}/sec`, panelX, meterY - 5);
    }

    drawEventQueue() {
        const panelX = this.canvas.width - 290;
        const queueStartY = 130;
        
        // Queue title
        this.ctx.fillStyle = this.streamColor;
        this.ctx.font = '12px monospace';
        this.ctx.fillText('Recent Events:', panelX, queueStartY);
        
        // Draw events
        for (let i = 0; i < this.eventQueue.length; i++) {
            const event = this.eventQueue[i];
            const y = queueStartY + 20 + event.y;
            
            // Event type indicator
            this.ctx.fillStyle = this.eventColors[event.type] || this.streamColor;
            this.ctx.globalAlpha = event.alpha;
            this.ctx.fillRect(panelX, y - 8, 8, 8);
            
            // Event message
            this.ctx.fillStyle = '#ffffff';
            this.ctx.font = '10px monospace';
            
            // Truncate long messages
            let message = event.message;
            if (message.length > 35) {
                message = message.substring(0, 32) + '...';
            }
            
            this.ctx.fillText(message, panelX + 12, y);
            
            // Timestamp
            const age = (Date.now() - event.timestamp) / 1000;
            this.ctx.fillStyle = '#666666';
            this.ctx.font = '8px monospace';
            this.ctx.fillText(`${age.toFixed(1)}s`, panelX + 220, y);
        }
        
        this.ctx.globalAlpha = 1.0;
    }

    drawParticles() {
        for (const particle of this.particles) {
            this.ctx.globalAlpha = particle.life;
            
            // Draw trail
            if (particle.trail.length > 1) {
                this.ctx.strokeStyle = particle.color;
                this.ctx.lineWidth = 1;
                this.ctx.beginPath();
                
                for (let i = 0; i < particle.trail.length; i++) {
                    const point = particle.trail[i];
                    const alpha = (i / particle.trail.length) * particle.life;
                    
                    if (i === 0) {
                        this.ctx.moveTo(point.x, point.y);
                    } else {
                        this.ctx.lineTo(point.x, point.y);
                    }
                }
                
                this.ctx.stroke();
            }
            
            // Draw particle
            this.ctx.fillStyle = particle.color;
            this.ctx.beginPath();
            this.ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
            this.ctx.fill();
            
            // Add glow effect for important events
            if (particle.type !== 'ambient') {
                this.ctx.shadowColor = particle.color;
                this.ctx.shadowBlur = 10;
                this.ctx.beginPath();
                this.ctx.arc(particle.x, particle.y, particle.size * 0.5, 0, Math.PI * 2);
                this.ctx.fill();
                this.ctx.shadowBlur = 0;
            }
        }
        
        this.ctx.globalAlpha = 1.0;
    }

    drawStreamFlow() {
        if (!this.isConnected) return;
        
        // Draw flowing data lines across the top of the screen
        const lineCount = 5;
        const lineSpacing = 8;
        
        for (let i = 0; i < lineCount; i++) {
            const y = 20 + i * lineSpacing;
            const offset = (this.streamFlow + i * 20) % 100;
            
            this.ctx.strokeStyle = this.streamColor;
            this.ctx.globalAlpha = 0.3 + 0.2 * Math.sin(this.connectionPulse + i);
            this.ctx.lineWidth = 1;
            this.ctx.setLineDash([5, 5]);
            
            this.ctx.beginPath();
            this.ctx.moveTo(-offset, y);
            this.ctx.lineTo(this.canvas.width - offset, y);
            this.ctx.stroke();
        }
        
        this.ctx.setLineDash([]);
        this.ctx.globalAlpha = 1.0;
    }

    // Public methods for manual event triggering
    triggerPlayerEvent(type, data) {
        this.addEvent(`player_${type}`, `Player: ${type}`);
        this.addDataPoint();
        if (data && data.x !== undefined && data.y !== undefined) {
            this.createStreamParticle(data.x, data.y, `player_${type}`);
        }
    }

    triggerEnemyEvent(type, data) {
        this.addEvent(`enemy_${type}`, `Enemy: ${type}`);
        this.addDataPoint();
        if (data && data.x !== undefined && data.y !== undefined) {
            this.createStreamParticle(data.x, data.y, `enemy_${type}`);
        }
    }

    triggerGameEvent(type, message, data = null) {
        this.addEvent(type, message);
        this.addDataPoint();
        if (data && data.x !== undefined && data.y !== undefined) {
            this.createStreamParticle(data.x, data.y, type);
        }
    }

    // Getters for game integration
    getConnectionStatus() {
        return this.isConnected;
    }

    getCurrentThroughput() {
        return this.currentThroughput;
    }

    getEventCount() {
        return this.eventQueue.length;
    }

    // Cleanup
    destroy() {
        this.particles = [];
        this.eventQueue = [];
        this.dataPoints = [];
        console.log('📊 DataStreamVisualizer destroyed');
    }
}