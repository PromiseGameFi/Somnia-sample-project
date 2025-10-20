import * as THREE from 'three';

export class PowerUp {
    constructor(scene) {
        this.scene = scene;
        
        // PowerUp properties
        this.id = this.generateId();
        this.type = this.selectRandomType();
        this.radius = 0.8;
        this.rotationSpeed = 2;
        this.bobSpeed = 3;
        this.bobHeight = 0.5;
        
        // Position and animation
        this.position = new THREE.Vector3();
        this.basePosition = new THREE.Vector3();
        this.rotation = new THREE.Euler();
        this.animationTime = 0;
        
        // Lifetime
        this.maxLifetime = 30; // seconds
        this.currentLifetime = 0;
        this.isExpired = false;
        this.isCollected = false;
        
        // 3D objects
        this.mesh = null;
        this.glowMesh = null;
        this.particles = null;
        
        // Type-specific properties
        this.applyTypeProperties();
        
        console.log(`⚡ PowerUp created: ${this.type}`);
    }

    generateId() {
        return 'powerup_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }

    selectRandomType() {
        const types = ['health', 'shield', 'rapidFire', 'energyBoost', 'damage', 'multiShot'];
        const weights = [0.25, 0.15, 0.15, 0.15, 0.15, 0.15]; // Health is more common
        
        const random = Math.random();
        let weightSum = 0;
        
        for (let i = 0; i < types.length; i++) {
            weightSum += weights[i];
            if (random <= weightSum) {
                return types[i];
            }
        }
        
        return types[0]; // Fallback
    }

    applyTypeProperties() {
        switch (this.type) {
            case 'health':
                this.color = 0x00ff00;
                this.emissiveColor = 0x004400;
                this.effect = { heal: 50 };
                this.description = 'Restores 50 health';
                break;
                
            case 'shield':
                this.color = 0x00ffff;
                this.emissiveColor = 0x004444;
                this.effect = { shield: true, duration: 15 };
                this.description = 'Temporary shield for 15 seconds';
                break;
                
            case 'rapidFire':
                this.color = 0xff4400;
                this.emissiveColor = 0x441100;
                this.effect = { rapidFire: true, duration: 10 };
                this.description = 'Rapid fire for 10 seconds';
                break;
                
            case 'energyBoost':
                this.color = 0xffff00;
                this.emissiveColor = 0x444400;
                this.effect = { energyBoost: true, duration: 20 };
                this.description = 'Increased energy capacity for 20 seconds';
                break;
                
            case 'damage':
                this.color = 0xff0044;
                this.emissiveColor = 0x440011;
                this.effect = { damage: true, duration: 12, multiplier: 2 };
                this.description = 'Double damage for 12 seconds';
                break;
                
            case 'multiShot':
                this.color = 0x8844ff;
                this.emissiveColor = 0x221144;
                this.effect = { multiShot: true, duration: 8 };
                this.description = 'Multi-shot for 8 seconds';
                break;
        }
    }

    init() {
        this.createPowerUpMesh();
        this.createGlowEffect();
        this.createParticleEffect();
        this.updateMeshPosition();
        
        console.log(`✅ PowerUp ${this.type} initialized`);
    }

    createPowerUpMesh() {
        // Create different geometries based on type
        let geometry;
        
        switch (this.type) {
            case 'health':
                geometry = this.createCrossGeometry();
                break;
            case 'shield':
                geometry = new THREE.OctahedronGeometry(this.radius);
                break;
            case 'rapidFire':
                geometry = new THREE.ConeGeometry(this.radius, this.radius * 2, 6);
                break;
            case 'energyBoost':
                geometry = new THREE.SphereGeometry(this.radius, 8, 6);
                break;
            case 'damage':
                geometry = new THREE.TetrahedronGeometry(this.radius);
                break;
            case 'multiShot':
                geometry = this.createStarGeometry();
                break;
            default:
                geometry = new THREE.BoxGeometry(this.radius, this.radius, this.radius);
        }
        
        const material = new THREE.MeshLambertMaterial({
            color: this.color,
            emissive: this.emissiveColor,
            transparent: true,
            opacity: 0.9
        });
        
        this.mesh = new THREE.Mesh(geometry, material);
        this.mesh.castShadow = true;
        this.mesh.receiveShadow = true;
        
        // Add type-specific details
        this.addTypeSpecificDetails();
        
        this.scene.add(this.mesh);
    }

    createCrossGeometry() {
        // Create a cross shape for health power-up
        const shape = new THREE.Shape();
        
        // Horizontal bar
        shape.moveTo(-0.8, -0.2);
        shape.lineTo(0.8, -0.2);
        shape.lineTo(0.8, 0.2);
        shape.lineTo(-0.8, 0.2);
        shape.lineTo(-0.8, -0.2);
        
        // Vertical bar
        shape.moveTo(-0.2, -0.8);
        shape.lineTo(0.2, -0.8);
        shape.lineTo(0.2, 0.8);
        shape.lineTo(-0.2, 0.8);
        shape.lineTo(-0.2, -0.8);
        
        const extrudeSettings = {
            depth: 0.2,
            bevelEnabled: true,
            bevelSegments: 2,
            steps: 2,
            bevelSize: 0.05,
            bevelThickness: 0.05
        };
        
        return new THREE.ExtrudeGeometry(shape, extrudeSettings);
    }

    createStarGeometry() {
        // Create a star shape for multi-shot power-up
        const starPoints = 5;
        const outerRadius = this.radius;
        const innerRadius = this.radius * 0.5;
        
        const shape = new THREE.Shape();
        
        for (let i = 0; i < starPoints * 2; i++) {
            const angle = (i / (starPoints * 2)) * Math.PI * 2;
            const radius = i % 2 === 0 ? outerRadius : innerRadius;
            const x = Math.cos(angle) * radius;
            const y = Math.sin(angle) * radius;
            
            if (i === 0) {
                shape.moveTo(x, y);
            } else {
                shape.lineTo(x, y);
            }
        }
        
        const extrudeSettings = {
            depth: 0.2,
            bevelEnabled: true,
            bevelSegments: 2,
            steps: 2,
            bevelSize: 0.02,
            bevelThickness: 0.02
        };
        
        return new THREE.ExtrudeGeometry(shape, extrudeSettings);
    }

    addTypeSpecificDetails() {
        switch (this.type) {
            case 'shield':
                // Add rotating rings
                const ringGeometry = new THREE.TorusGeometry(this.radius * 1.2, 0.1, 8, 16);
                const ringMaterial = new THREE.MeshBasicMaterial({
                    color: this.color,
                    transparent: true,
                    opacity: 0.5
                });
                
                for (let i = 0; i < 3; i++) {
                    const ring = new THREE.Mesh(ringGeometry, ringMaterial);
                    ring.rotation.x = (i / 3) * Math.PI;
                    ring.rotation.y = (i / 3) * Math.PI;
                    this.mesh.add(ring);
                }
                break;
                
            case 'rapidFire':
                // Add flame effect
                const flameGeometry = new THREE.ConeGeometry(0.2, 0.8, 4);
                const flameMaterial = new THREE.MeshBasicMaterial({
                    color: 0xff8800,
                    transparent: true,
                    opacity: 0.7
                });
                
                for (let i = 0; i < 4; i++) {
                    const flame = new THREE.Mesh(flameGeometry, flameMaterial);
                    const angle = (i / 4) * Math.PI * 2;
                    flame.position.x = Math.cos(angle) * 0.5;
                    flame.position.z = Math.sin(angle) * 0.5;
                    flame.position.y = this.radius;
                    this.mesh.add(flame);
                }
                break;
                
            case 'energyBoost':
                // Add electric arcs
                const arcGeometry = new THREE.TorusGeometry(this.radius * 0.8, 0.05, 4, 8);
                const arcMaterial = new THREE.MeshBasicMaterial({
                    color: 0xffffff,
                    emissive: 0xffff00
                });
                
                for (let i = 0; i < 2; i++) {
                    const arc = new THREE.Mesh(arcGeometry, arcMaterial);
                    arc.rotation.x = i * Math.PI / 2;
                    arc.rotation.z = i * Math.PI / 3;
                    this.mesh.add(arc);
                }
                break;
        }
    }

    createGlowEffect() {
        // Create outer glow
        const glowGeometry = this.mesh.geometry.clone();
        glowGeometry.scale(1.5, 1.5, 1.5);
        
        const glowMaterial = new THREE.MeshBasicMaterial({
            color: this.color,
            transparent: true,
            opacity: 0.2,
            side: THREE.BackSide
        });
        
        this.glowMesh = new THREE.Mesh(glowGeometry, glowMaterial);
        this.mesh.add(this.glowMesh);
    }

    createParticleEffect() {
        // Create floating particles around the power-up
        const particleCount = 20;
        const geometry = new THREE.BufferGeometry();
        const positions = new Float32Array(particleCount * 3);
        const colors = new Float32Array(particleCount * 3);
        
        const color = new THREE.Color(this.color);
        
        for (let i = 0; i < particleCount; i++) {
            // Random position around the power-up
            const angle = Math.random() * Math.PI * 2;
            const radius = this.radius + Math.random() * 2;
            const height = (Math.random() - 0.5) * 3;
            
            positions[i * 3] = Math.cos(angle) * radius;
            positions[i * 3 + 1] = height;
            positions[i * 3 + 2] = Math.sin(angle) * radius;
            
            colors[i * 3] = color.r;
            colors[i * 3 + 1] = color.g;
            colors[i * 3 + 2] = color.b;
        }
        
        geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
        
        const material = new THREE.PointsMaterial({
            size: 0.1,
            vertexColors: true,
            transparent: true,
            opacity: 0.8
        });
        
        this.particles = new THREE.Points(geometry, material);
        this.mesh.add(this.particles);
    }

    update(deltaTime) {
        if (this.isExpired || this.isCollected) return;
        
        // Update lifetime
        this.currentLifetime += deltaTime;
        if (this.currentLifetime >= this.maxLifetime) {
            this.expire();
            return;
        }
        
        // Update animation
        this.updateAnimation(deltaTime);
        
        // Update visual effects
        this.updateVisualEffects(deltaTime);
        
        // Update mesh position
        this.updateMeshPosition();
        
        // Update expiration warning
        this.updateExpirationWarning();
    }

    updateAnimation(deltaTime) {
        this.animationTime += deltaTime;
        
        // Rotation
        this.rotation.y += this.rotationSpeed * deltaTime;
        this.rotation.x += this.rotationSpeed * 0.5 * deltaTime;
        
        // Bobbing motion
        const bobOffset = Math.sin(this.animationTime * this.bobSpeed) * this.bobHeight;
        this.position.copy(this.basePosition);
        this.position.y += bobOffset;
    }

    updateVisualEffects(deltaTime) {
        // Pulse glow effect
        if (this.glowMesh) {
            const pulse = 0.5 + 0.5 * Math.sin(this.animationTime * 4);
            this.glowMesh.material.opacity = 0.1 + pulse * 0.2;
        }
        
        // Animate particles
        if (this.particles) {
            const positions = this.particles.geometry.attributes.position.array;
            
            for (let i = 0; i < positions.length; i += 3) {
                // Rotate particles around the power-up
                const angle = this.animationTime + (i / 3) * 0.5;
                const radius = this.radius + 1 + Math.sin(angle * 2) * 0.5;
                
                positions[i] = Math.cos(angle) * radius;
                positions[i + 2] = Math.sin(angle) * radius;
                positions[i + 1] += Math.sin(this.animationTime * 3 + i) * 0.01;
            }
            
            this.particles.geometry.attributes.position.needsUpdate = true;
        }
        
        // Scale animation based on lifetime
        const lifePercent = this.currentLifetime / this.maxLifetime;
        if (lifePercent > 0.8) {
            // Start shrinking when close to expiration
            const shrinkFactor = 1 - (lifePercent - 0.8) * 5;
            this.mesh.scale.setScalar(Math.max(0.1, shrinkFactor));
        }
    }

    updateExpirationWarning() {
        const timeLeft = this.maxLifetime - this.currentLifetime;
        
        if (timeLeft <= 5 && timeLeft > 0) {
            // Flash warning
            const flashSpeed = Math.max(2, 10 - timeLeft * 2);
            const flash = Math.sin(this.animationTime * flashSpeed) > 0;
            
            if (this.mesh) {
                this.mesh.material.opacity = flash ? 0.5 : 0.9;
            }
        }
    }

    updateMeshPosition() {
        if (this.mesh) {
            this.mesh.position.copy(this.position);
            this.mesh.rotation.copy(this.rotation);
        }
    }

    applyEffect(player) {
        if (this.isCollected) return;
        
        this.isCollected = true;
        
        // Apply the power-up effect to the player
        switch (this.type) {
            case 'health':
                player.heal(this.effect.heal);
                break;
                
            case 'shield':
                player.applyPowerUp('shield', this.effect.duration);
                break;
                
            case 'rapidFire':
                player.applyPowerUp('rapidFire', this.effect.duration);
                break;
                
            case 'energyBoost':
                player.applyPowerUp('energyBoost', this.effect.duration);
                break;
                
            case 'damage':
                player.applyPowerUp('damage', this.effect.duration);
                break;
                
            case 'multiShot':
                player.applyPowerUp('multiShot', this.effect.duration);
                break;
        }
        
        // Create collection effect
        this.createCollectionEffect();
        
        // Update game stats
        if (window.gameState) {
            window.gameState.addPowerUpCollected();
        }
        
        console.log(`⚡ PowerUp ${this.type} collected!`);
    }

    createCollectionEffect() {
        // Create burst effect when collected
        const burstGeometry = new THREE.SphereGeometry(this.radius * 2);
        const burstMaterial = new THREE.MeshBasicMaterial({
            color: this.color,
            transparent: true,
            opacity: 0.8
        });
        const burst = new THREE.Mesh(burstGeometry, burstMaterial);
        
        burst.position.copy(this.position);
        this.scene.add(burst);
        
        // Animate burst
        const startTime = Date.now();
        const duration = 300; // ms
        
        const animateBurst = () => {
            const elapsed = Date.now() - startTime;
            const progress = elapsed / duration;
            
            if (progress >= 1) {
                this.scene.remove(burst);
                return;
            }
            
            // Scale up and fade out
            const scale = 1 + progress * 3;
            burst.scale.setScalar(scale);
            burst.material.opacity = 0.8 * (1 - progress);
            
            requestAnimationFrame(animateBurst);
        };
        
        animateBurst();
    }

    expire() {
        this.isExpired = true;
        
        // Create expiration effect
        this.createExpirationEffect();
        
        console.log(`⏰ PowerUp ${this.type} expired`);
    }

    createExpirationEffect() {
        // Simple fade out effect
        if (this.mesh) {
            const startTime = Date.now();
            const duration = 500; // ms
            const originalOpacity = this.mesh.material.opacity;
            
            const animateFade = () => {
                const elapsed = Date.now() - startTime;
                const progress = elapsed / duration;
                
                if (progress >= 1) {
                    return;
                }
                
                this.mesh.material.opacity = originalOpacity * (1 - progress);
                
                requestAnimationFrame(animateFade);
            };
            
            animateFade();
        }
    }

    // Getters
    getPosition() {
        return this.position.clone();
    }

    getRadius() {
        return this.radius;
    }

    isExpired() {
        return this.isExpired || this.isCollected;
    }

    getType() {
        return this.type;
    }

    getDescription() {
        return this.description;
    }

    getTimeLeft() {
        return Math.max(0, this.maxLifetime - this.currentLifetime);
    }

    // Setters
    setPosition(x, y, z) {
        this.position.set(x, y, z);
        this.basePosition.copy(this.position);
        this.updateMeshPosition();
    }

    setLifetime(lifetime) {
        this.maxLifetime = lifetime;
    }

    destroy() {
        if (this.mesh) {
            this.scene.remove(this.mesh);
        }
        
        console.log(`💥 PowerUp ${this.type} destroyed`);
    }
}