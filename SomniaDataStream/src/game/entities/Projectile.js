import * as THREE from 'three';

export class Projectile {
    constructor(scene, type = 'player') {
        this.scene = scene;
        this.type = type; // 'player' or 'enemy'
        
        // Projectile properties
        this.id = this.generateId();
        this.radius = 0.1;
        this.speed = 50;
        this.damage = 25;
        this.maxDistance = 100;
        this.traveledDistance = 0;
        
        // Position and movement
        this.position = new THREE.Vector3();
        this.velocity = new THREE.Vector3();
        this.direction = new THREE.Vector3();
        
        // Visual properties
        this.color = type === 'player' ? 0x00ff88 : 0xff4400;
        this.emissiveColor = type === 'player' ? 0x004422 : 0x441100;
        
        // State
        this.isActive = true;
        this.hasHit = false;
        
        // 3D objects
        this.mesh = null;
        this.trail = null;
        this.light = null;
        
        // Trail system
        this.trailPositions = [];
        this.maxTrailLength = 10;
        
        // Special effects
        this.glowIntensity = 1.0;
        this.animationTime = 0;
        
        console.log(`🔫 Projectile created: ${this.type}`);
    }

    generateId() {
        return 'projectile_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }

    init() {
        this.createProjectileMesh();
        this.createTrailEffect();
        this.createLightEffect();
        
        console.log(`✅ Projectile ${this.type} initialized`);
    }

    createProjectileMesh() {
        // Create different projectile shapes based on type
        let geometry;
        
        if (this.type === 'player') {
            // Player projectiles are sleek energy bolts
            geometry = new THREE.CapsuleGeometry(this.radius, this.radius * 4, 4, 8);
        } else {
            // Enemy projectiles are more aggressive looking
            geometry = new THREE.ConeGeometry(this.radius, this.radius * 6, 6);
        }
        
        const material = new THREE.MeshLambertMaterial({
            color: this.color,
            emissive: this.emissiveColor,
            transparent: true,
            opacity: 0.9
        });
        
        this.mesh = new THREE.Mesh(geometry, material);
        this.mesh.castShadow = false; // Projectiles don't cast shadows for performance
        this.mesh.receiveShadow = false;
        
        // Add glow effect
        this.createGlowEffect();
        
        this.scene.add(this.mesh);
    }

    createGlowEffect() {
        // Create outer glow
        const glowGeometry = this.mesh.geometry.clone();
        glowGeometry.scale(2, 2, 2);
        
        const glowMaterial = new THREE.MeshBasicMaterial({
            color: this.color,
            transparent: true,
            opacity: 0.3,
            side: THREE.BackSide
        });
        
        const glowMesh = new THREE.Mesh(glowGeometry, glowMaterial);
        this.mesh.add(glowMesh);
    }

    createTrailEffect() {
        // Create trail geometry
        const trailGeometry = new THREE.BufferGeometry();
        const positions = new Float32Array(this.maxTrailLength * 3);
        const colors = new Float32Array(this.maxTrailLength * 3);
        const opacities = new Float32Array(this.maxTrailLength);
        
        // Initialize with current position
        for (let i = 0; i < this.maxTrailLength; i++) {
            positions[i * 3] = this.position.x;
            positions[i * 3 + 1] = this.position.y;
            positions[i * 3 + 2] = this.position.z;
            
            const color = new THREE.Color(this.color);
            colors[i * 3] = color.r;
            colors[i * 3 + 1] = color.g;
            colors[i * 3 + 2] = color.b;
            
            opacities[i] = (i / this.maxTrailLength) * 0.8;
        }
        
        trailGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        trailGeometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
        trailGeometry.setAttribute('opacity', new THREE.BufferAttribute(opacities, 1));
        
        const trailMaterial = new THREE.PointsMaterial({
            size: this.radius * 2,
            vertexColors: true,
            transparent: true,
            opacity: 0.6,
            blending: THREE.AdditiveBlending
        });
        
        this.trail = new THREE.Points(trailGeometry, trailMaterial);
        this.scene.add(this.trail);
    }

    createLightEffect() {
        // Add point light for dynamic lighting
        this.light = new THREE.PointLight(this.color, 0.5, 10);
        this.light.position.copy(this.position);
        this.scene.add(this.light);
    }

    update(deltaTime) {
        if (!this.isActive) return;
        
        this.animationTime += deltaTime;
        
        // Update position
        this.updatePosition(deltaTime);
        
        // Update trail
        this.updateTrail();
        
        // Update visual effects
        this.updateVisualEffects(deltaTime);
        
        // Check if projectile should be destroyed
        this.checkLifetime();
        
        // Update mesh position
        this.updateMeshPosition();
    }

    updatePosition(deltaTime) {
        // Move projectile
        const movement = this.velocity.clone().multiplyScalar(deltaTime);
        this.position.add(movement);
        this.traveledDistance += movement.length();
        
        // Add slight wobble for energy effect (player projectiles only)
        if (this.type === 'player') {
            const wobble = Math.sin(this.animationTime * 20) * 0.05;
            this.position.x += wobble * this.direction.z;
            this.position.z -= wobble * this.direction.x;
        }
    }

    updateTrail() {
        // Add current position to trail
        this.trailPositions.unshift(this.position.clone());
        
        // Limit trail length
        if (this.trailPositions.length > this.maxTrailLength) {
            this.trailPositions.pop();
        }
        
        // Update trail geometry
        if (this.trail && this.trailPositions.length > 1) {
            const positions = this.trail.geometry.attributes.position.array;
            const opacities = this.trail.geometry.attributes.opacity.array;
            
            for (let i = 0; i < this.trailPositions.length && i < this.maxTrailLength; i++) {
                const pos = this.trailPositions[i];
                positions[i * 3] = pos.x;
                positions[i * 3 + 1] = pos.y;
                positions[i * 3 + 2] = pos.z;
                
                // Fade trail from front to back
                opacities[i] = (1 - i / this.maxTrailLength) * 0.8;
            }
            
            this.trail.geometry.attributes.position.needsUpdate = true;
            this.trail.geometry.attributes.opacity.needsUpdate = true;
        }
    }

    updateVisualEffects(deltaTime) {
        // Pulse glow effect
        const pulse = 0.8 + 0.2 * Math.sin(this.animationTime * 10);
        
        if (this.mesh) {
            this.mesh.material.emissive.setHex(this.emissiveColor);
            this.mesh.material.emissive.multiplyScalar(pulse);
            
            // Rotate projectile for visual effect
            if (this.type === 'player') {
                this.mesh.rotation.z += deltaTime * 10;
            } else {
                this.mesh.rotation.x += deltaTime * 15;
            }
        }
        
        // Update light intensity
        if (this.light) {
            this.light.intensity = 0.3 + pulse * 0.2;
        }
    }

    updateMeshPosition() {
        if (this.mesh) {
            this.mesh.position.copy(this.position);
            
            // Orient projectile in direction of travel
            this.mesh.lookAt(this.position.clone().add(this.direction));
        }
        
        if (this.light) {
            this.light.position.copy(this.position);
        }
    }

    checkLifetime() {
        // Destroy if traveled too far
        if (this.traveledDistance >= this.maxDistance) {
            this.destroy();
        }
    }

    // Collision detection
    checkCollision(target, targetRadius) {
        if (!this.isActive || this.hasHit) return false;
        
        const distance = this.position.distanceTo(target);
        return distance <= (this.radius + targetRadius);
    }

    // Hit handling
    onHit(target = null) {
        if (this.hasHit) return;
        
        this.hasHit = true;
        this.isActive = false;
        
        // Create hit effect
        this.createHitEffect();
        
        // Apply damage if target is provided
        if (target && target.takeDamage) {
            target.takeDamage(this.damage);
        }
        
        console.log(`💥 Projectile ${this.type} hit target`);
        
        // Destroy after hit effect
        setTimeout(() => this.destroy(), 200);
    }

    createHitEffect() {
        // Create explosion effect
        const explosionGeometry = new THREE.SphereGeometry(this.radius * 3);
        const explosionMaterial = new THREE.MeshBasicMaterial({
            color: this.color,
            transparent: true,
            opacity: 0.8
        });
        
        const explosion = new THREE.Mesh(explosionGeometry, explosionMaterial);
        explosion.position.copy(this.position);
        this.scene.add(explosion);
        
        // Create spark particles
        this.createSparkParticles();
        
        // Animate explosion
        const startTime = Date.now();
        const duration = 200; // ms
        
        const animateExplosion = () => {
            const elapsed = Date.now() - startTime;
            const progress = elapsed / duration;
            
            if (progress >= 1) {
                this.scene.remove(explosion);
                return;
            }
            
            // Scale up and fade out
            const scale = 1 + progress * 2;
            explosion.scale.setScalar(scale);
            explosion.material.opacity = 0.8 * (1 - progress);
            
            requestAnimationFrame(animateExplosion);
        };
        
        animateExplosion();
    }

    createSparkParticles() {
        const sparkCount = 15;
        const sparkGeometry = new THREE.BufferGeometry();
        const positions = new Float32Array(sparkCount * 3);
        const velocities = [];
        
        for (let i = 0; i < sparkCount; i++) {
            // Random direction
            const direction = new THREE.Vector3(
                (Math.random() - 0.5) * 2,
                (Math.random() - 0.5) * 2,
                (Math.random() - 0.5) * 2
            ).normalize();
            
            positions[i * 3] = this.position.x;
            positions[i * 3 + 1] = this.position.y;
            positions[i * 3 + 2] = this.position.z;
            
            velocities.push(direction.multiplyScalar(Math.random() * 10 + 5));
        }
        
        sparkGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        
        const sparkMaterial = new THREE.PointsMaterial({
            color: this.color,
            size: 0.1,
            transparent: true,
            opacity: 1.0
        });
        
        const sparks = new THREE.Points(sparkGeometry, sparkMaterial);
        this.scene.add(sparks);
        
        // Animate sparks
        const startTime = Date.now();
        const duration = 500; // ms
        
        const animateSparks = () => {
            const elapsed = Date.now() - startTime;
            const progress = elapsed / duration;
            
            if (progress >= 1) {
                this.scene.remove(sparks);
                return;
            }
            
            const positions = sparks.geometry.attributes.position.array;
            
            for (let i = 0; i < sparkCount; i++) {
                const velocity = velocities[i];
                
                positions[i * 3] += velocity.x * 0.016; // ~60fps
                positions[i * 3 + 1] += velocity.y * 0.016;
                positions[i * 3 + 2] += velocity.z * 0.016;
                
                // Apply gravity
                velocity.y -= 9.8 * 0.016;
            }
            
            sparks.geometry.attributes.position.needsUpdate = true;
            sparks.material.opacity = 1 - progress;
            
            requestAnimationFrame(animateSparks);
        };
        
        animateSparks();
    }

    // Getters
    getPosition() {
        return this.position.clone();
    }

    getVelocity() {
        return this.velocity.clone();
    }

    getDamage() {
        return this.damage;
    }

    getRadius() {
        return this.radius;
    }

    isActive() {
        return this.isActive && !this.hasHit;
    }

    getType() {
        return this.type;
    }

    // Setters
    setPosition(x, y, z) {
        this.position.set(x, y, z);
        this.updateMeshPosition();
    }

    setVelocity(x, y, z) {
        this.velocity.set(x, y, z);
        this.direction.copy(this.velocity).normalize();
    }

    setDirection(direction) {
        this.direction.copy(direction).normalize();
        this.velocity.copy(this.direction).multiplyScalar(this.speed);
    }

    setDamage(damage) {
        this.damage = damage;
    }

    setSpeed(speed) {
        this.speed = speed;
        if (this.direction.length() > 0) {
            this.velocity.copy(this.direction).multiplyScalar(this.speed);
        }
    }

    setMaxDistance(distance) {
        this.maxDistance = distance;
    }

    // Special projectile types
    static createPlayerProjectile(scene, position, direction, powerUps = {}) {
        const projectile = new Projectile(scene, 'player');
        
        // Apply power-up modifications
        if (powerUps.damage) {
            projectile.setDamage(projectile.getDamage() * 2);
            projectile.color = 0xff0088;
            projectile.emissiveColor = 0x440022;
        }
        
        if (powerUps.rapidFire) {
            projectile.setSpeed(projectile.speed * 1.5);
        }
        
        projectile.init();
        projectile.setPosition(position.x, position.y, position.z);
        projectile.setDirection(direction);
        
        return projectile;
    }

    static createEnemyProjectile(scene, position, direction, enemyType = 'basic') {
        const projectile = new Projectile(scene, 'enemy');
        
        // Modify based on enemy type
        switch (enemyType) {
            case 'heavy':
                projectile.setDamage(40);
                projectile.setSpeed(30);
                projectile.radius = 0.15;
                projectile.color = 0xff2200;
                break;
                
            case 'bomber':
                projectile.setDamage(60);
                projectile.setSpeed(25);
                projectile.radius = 0.2;
                projectile.color = 0xff8800;
                break;
                
            case 'scout':
                projectile.setDamage(15);
                projectile.setSpeed(70);
                projectile.radius = 0.08;
                projectile.color = 0xff6600;
                break;
                
            default: // fighter
                projectile.setDamage(25);
                projectile.setSpeed(50);
                break;
        }
        
        projectile.init();
        projectile.setPosition(position.x, position.y, position.z);
        projectile.setDirection(direction);
        
        return projectile;
    }

    destroy() {
        this.isActive = false;
        
        // Remove from scene
        if (this.mesh) {
            this.scene.remove(this.mesh);
        }
        
        if (this.trail) {
            this.scene.remove(this.trail);
        }
        
        if (this.light) {
            this.scene.remove(this.light);
        }
        
        console.log(`💥 Projectile ${this.type} destroyed`);
    }
}