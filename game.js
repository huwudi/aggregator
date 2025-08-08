class Vector2 {
    constructor(x = 0, y = 0) {
        this.x = x;
        this.y = y;
    }
    
    add(other) {
        return new Vector2(this.x + other.x, this.y + other.y);
    }
    
    subtract(other) {
        return new Vector2(this.x - other.x, this.y - other.y);
    }
    
    multiply(scalar) {
        return new Vector2(this.x * scalar, this.y * scalar);
    }
    
    magnitude() {
        return Math.sqrt(this.x * this.x + this.y * this.y);
    }
    
    normalize() {
        const mag = this.magnitude();
        if (mag === 0) return new Vector2(0, 0);
        return new Vector2(this.x / mag, this.y / mag);
    }
    
    distance(other) {
        return this.subtract(other).magnitude();
    }
    
    angle() {
        return Math.atan2(this.y, this.x);
    }
    
    rotate(angle) {
        const cos = Math.cos(angle);
        const sin = Math.sin(angle);
        return new Vector2(
            this.x * cos - this.y * sin,
            this.x * sin + this.y * cos
        );
    }
    
    clone() {
        return new Vector2(this.x, this.y);
    }
}

class Entity {
    constructor(x = 0, y = 0) {
        this.position = new Vector2(x, y);
        this.velocity = new Vector2(0, 0);
        this.rotation = 0;
        this.size = new Vector2(32, 32);
        this.active = true;
        this.health = 100;
        this.maxHealth = 100;
        this.speed = 100;
        this.rotationSpeed = 3;
        this.color = '#fff';
        this.type = 'entity';
        this.lastUpdateTime = 0;
    }
    
    update(deltaTime) {
        if (!this.active) return;
        
        this.position = this.position.add(this.velocity.multiply(deltaTime));
        this.lastUpdateTime = Date.now();
    }
    
    render(ctx) {
        if (!this.active) return;
        
        ctx.save();
        ctx.translate(this.position.x, this.position.y);
        ctx.rotate(this.rotation);
        ctx.fillStyle = this.color;
        ctx.fillRect(-this.size.x / 2, -this.size.y / 2, this.size.x, this.size.y);
        ctx.restore();
    }
    
    getBounds() {
        return {
            left: this.position.x - this.size.x / 2,
            right: this.position.x + this.size.x / 2,
            top: this.position.y - this.size.y / 2,
            bottom: this.position.y + this.size.y / 2
        };
    }
    
    collidesWith(other) {
        const bounds1 = this.getBounds();
        const bounds2 = other.getBounds();
        
        return bounds1.left < bounds2.right &&
               bounds1.right > bounds2.left &&
               bounds1.top < bounds2.bottom &&
               bounds1.bottom > bounds2.top;
    }
    
    takeDamage(amount) {
        this.health -= amount;
        if (this.health <= 0) {
            this.health = 0;
            this.destroy();
        }
    }
    
    heal(amount) {
        this.health = Math.min(this.maxHealth, this.health + amount);
    }
    
    destroy() {
        this.active = false;
    }
    
    getForwardVector() {
        return new Vector2(Math.cos(this.rotation), Math.sin(this.rotation));
    }
    
    getRightVector() {
        return new Vector2(Math.cos(this.rotation + Math.PI / 2), Math.sin(this.rotation + Math.PI / 2));
    }
}

class Tank extends Entity {
    constructor(x, y, isPlayer = false) {
        super(x, y);
        this.type = 'tank';
        this.isPlayer = isPlayer;
        this.size = new Vector2(40, 40);
        this.turretRotation = 0;
        this.turretRotationSpeed = 2;
        this.fireRate = 500;
        this.lastFireTime = 0;
        this.armor = 2;
        this.ammunition = 50;
        this.maxAmmunition = 50;
        this.reloadTime = 2000;
        this.lastReloadTime = 0;
        this.isReloading = false;
        this.trackMarks = [];
        this.engineSound = null;
        this.moveDirection = new Vector2(0, 0);
        this.targetRotation = 0;
        this.smoothRotation = true;
        this.acceleration = 200;
        this.deceleration = 300;
        this.maxSpeed = 120;
        this.currentSpeed = 0;
        this.isDrifting = false;
        this.driftFactor = 0.95;
        this.experience = 0;
        this.level = 1;
        this.killCount = 0;
        
        if (isPlayer) {
            this.color = '#00ff00';
            this.health = 150;
            this.maxHealth = 150;
            this.ammunition = -1;
        } else {
            this.color = '#ff0000';
            this.health = 80;
            this.maxHealth = 80;
        }
    }
    
    update(deltaTime) {
        if (!this.active) return;
        
        this.updateMovement(deltaTime);
        this.updateRotation(deltaTime);
        this.updateTurret(deltaTime);
        this.updateReloading();
        this.updateTrackMarks();
        
        super.update(deltaTime);
        
        this.constrainToWorld();
    }
    
    updateMovement(deltaTime) {
        if (this.moveDirection.magnitude() > 0) {
            this.currentSpeed = Math.min(this.maxSpeed, this.currentSpeed + this.acceleration * deltaTime);
            
            if (this.currentSpeed > 50) {
                this.addTrackMark();
            }
        } else {
            this.currentSpeed = Math.max(0, this.currentSpeed - this.deceleration * deltaTime);
        }
        
        if (this.currentSpeed > 0) {
            const forward = this.getForwardVector();
            const moveVector = forward.multiply(this.currentSpeed);
            this.velocity = moveVector;
            
            if (this.isDrifting) {
                this.velocity = this.velocity.multiply(this.driftFactor);
            }
        } else {
            this.velocity = new Vector2(0, 0);
        }
    }
    
    updateRotation(deltaTime) {
        if (this.smoothRotation && this.targetRotation !== this.rotation) {
            const angleDiff = this.targetRotation - this.rotation;
            const normalizedDiff = Math.atan2(Math.sin(angleDiff), Math.cos(angleDiff));
            
            if (Math.abs(normalizedDiff) > 0.1) {
                this.rotation += Math.sign(normalizedDiff) * this.rotationSpeed * deltaTime;
            } else {
                this.rotation = this.targetRotation;
            }
        }
    }
    
    updateTurret(deltaTime) {
        if (this.isPlayer && game.inputManager.mousePosition) {
            const mousePos = game.inputManager.mousePosition;
            const dx = mousePos.x - this.position.x;
            const dy = mousePos.y - this.position.y;
            this.turretRotation = Math.atan2(dy, dx);
        }
    }
    
    updateReloading() {
        if (this.isReloading && Date.now() - this.lastReloadTime >= this.reloadTime) {
            this.isReloading = false;
            this.ammunition = this.maxAmmunition;
        }
    }
    
    updateTrackMarks() {
        this.trackMarks = this.trackMarks.filter(mark => Date.now() - mark.time < 5000);
    }
    
    addTrackMark() {
        if (this.trackMarks.length === 0 || 
            this.position.distance(this.trackMarks[this.trackMarks.length - 1].position) > 20) {
            this.trackMarks.push({
                position: this.position.clone(),
                rotation: this.rotation,
                time: Date.now()
            });
            
            if (this.trackMarks.length > 50) {
                this.trackMarks.shift();
            }
        }
    }
    
    constrainToWorld() {
        const bounds = this.getBounds();
        const worldBounds = game.world.getBounds();
        
        if (bounds.left < worldBounds.left) {
            this.position.x = worldBounds.left + this.size.x / 2;
            this.velocity.x = 0;
        }
        if (bounds.right > worldBounds.right) {
            this.position.x = worldBounds.right - this.size.x / 2;
            this.velocity.x = 0;
        }
        if (bounds.top < worldBounds.top) {
            this.position.y = worldBounds.top + this.size.y / 2;
            this.velocity.y = 0;
        }
        if (bounds.bottom > worldBounds.bottom) {
            this.position.y = worldBounds.bottom - this.size.y / 2;
            this.velocity.y = 0;
        }
    }
    
    move(direction) {
        this.moveDirection = direction.normalize();
        if (direction.magnitude() > 0) {
            this.targetRotation = direction.angle();
        }
    }
    
    rotate(angle) {
        this.rotation += angle;
    }
    
    rotateTurret(angle) {
        this.turretRotation += angle;
    }
    
    fire() {
        if (this.canFire()) {
            const bullet = this.createBullet();
            game.scene.addEntity(bullet);
            
            this.lastFireTime = Date.now();
            
            if (this.ammunition > 0) {
                this.ammunition--;
                if (this.ammunition === 0) {
                    this.startReload();
                }
            }
            
            game.particleSystem.createMuzzleFlash(
                this.position.add(this.getTurretTip()),
                this.turretRotation
            );
            
            if (game.soundManager) {
                game.soundManager.playSound('tankFire');
            }
            
            return bullet;
        }
        return null;
    }
    
    canFire() {
        return !this.isReloading && 
               Date.now() - this.lastFireTime >= this.fireRate &&
               (this.ammunition > 0 || this.ammunition === -1);
    }
    
    createBullet() {
        const turretTip = this.getTurretTip();
        const spawnPos = this.position.add(turretTip);
        const direction = new Vector2(Math.cos(this.turretRotation), Math.sin(this.turretRotation));
        
        return new Bullet(spawnPos.x, spawnPos.y, direction, this);
    }
    
    getTurretTip() {
        const turretLength = this.size.x / 2 + 15;
        return new Vector2(
            Math.cos(this.turretRotation) * turretLength,
            Math.sin(this.turretRotation) * turretLength
        );
    }
    
    startReload() {
        this.isReloading = true;
        this.lastReloadTime = Date.now();
    }
    
    takeDamage(amount, attacker = null) {
        const actualDamage = Math.max(1, amount - this.armor);
        super.takeDamage(actualDamage);
        
        if (game.particleSystem) {
            game.particleSystem.createHitEffect(this.position, actualDamage);
        }
        
        if (this.health <= 0 && attacker && attacker.isPlayer) {
            attacker.addExperience(50);
            attacker.killCount++;
            game.score += 100;
        }
    }
    
    addExperience(amount) {
        this.experience += amount;
        const expNeeded = this.level * 100;
        if (this.experience >= expNeeded) {
            this.levelUp();
        }
    }
    
    levelUp() {
        this.level++;
        this.experience = 0;
        this.maxHealth += 25;
        this.health = this.maxHealth;
        this.armor++;
        this.fireRate = Math.max(200, this.fireRate - 50);
        
        if (game.particleSystem) {
            game.particleSystem.createLevelUpEffect(this.position);
        }
    }
    
    render(ctx) {
        if (!this.active) return;
        
        this.renderTrackMarks(ctx);
        this.renderBody(ctx);
        this.renderTurret(ctx);
        this.renderHealthBar(ctx);
        
        if (this.isReloading) {
            this.renderReloadIndicator(ctx);
        }
    }
    
    renderTrackMarks(ctx) {
        ctx.save();
        ctx.globalAlpha = 0.3;
        ctx.strokeStyle = '#444';
        ctx.lineWidth = 3;
        
        for (let i = 0; i < this.trackMarks.length - 1; i++) {
            const mark = this.trackMarks[i];
            const nextMark = this.trackMarks[i + 1];
            const age = (Date.now() - mark.time) / 5000;
            
            ctx.globalAlpha = 0.3 * (1 - age);
            ctx.beginPath();
            ctx.moveTo(mark.position.x, mark.position.y);
            ctx.lineTo(nextMark.position.x, nextMark.position.y);
            ctx.stroke();
        }
        
        ctx.restore();
    }
    
    renderBody(ctx) {
        ctx.save();
        ctx.translate(this.position.x, this.position.y);
        ctx.rotate(this.rotation);
        
        ctx.fillStyle = this.color;
        ctx.fillRect(-this.size.x / 2, -this.size.y / 2, this.size.x, this.size.y);
        
        ctx.strokeStyle = this.isPlayer ? '#00aa00' : '#aa0000';
        ctx.lineWidth = 2;
        ctx.strokeRect(-this.size.x / 2, -this.size.y / 2, this.size.x, this.size.y);
        
        ctx.fillStyle = '#333';
        for (let i = -1; i <= 1; i++) {
            ctx.fillRect(-this.size.x / 2 - 3, i * 8, 6, 4);
            ctx.fillRect(this.size.x / 2 - 3, i * 8, 6, 4);
        }
        
        ctx.restore();
    }
    
    renderTurret(ctx) {
        ctx.save();
        ctx.translate(this.position.x, this.position.y);
        ctx.rotate(this.turretRotation);
        
        ctx.fillStyle = this.color;
        ctx.fillRect(-5, -8, 25, 16);
        
        ctx.strokeStyle = this.isPlayer ? '#00aa00' : '#aa0000';
        ctx.lineWidth = 1;
        ctx.strokeRect(-5, -8, 25, 16);
        
        ctx.fillStyle = '#222';
        ctx.fillRect(15, -3, 8, 6);
        
        ctx.restore();
        
        ctx.save();
        ctx.translate(this.position.x, this.position.y);
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.arc(0, 0, 12, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.strokeStyle = this.isPlayer ? '#00aa00' : '#aa0000';
        ctx.lineWidth = 2;
        ctx.stroke();
        ctx.restore();
    }
    
    renderHealthBar(ctx) {
        const barWidth = this.size.x;
        const barHeight = 4;
        const yOffset = -this.size.y / 2 - 10;
        
        ctx.save();
        ctx.translate(this.position.x, this.position.y + yOffset);
        
        ctx.fillStyle = '#333';
        ctx.fillRect(-barWidth / 2, 0, barWidth, barHeight);
        
        const healthPercent = this.health / this.maxHealth;
        const healthColor = healthPercent > 0.6 ? '#0f0' : healthPercent > 0.3 ? '#ff0' : '#f00';
        
        ctx.fillStyle = healthColor;
        ctx.fillRect(-barWidth / 2, 0, barWidth * healthPercent, barHeight);
        
        ctx.strokeStyle = '#666';
        ctx.lineWidth = 1;
        ctx.strokeRect(-barWidth / 2, 0, barWidth, barHeight);
        
        ctx.restore();
    }
    
    renderReloadIndicator(ctx) {
        const progress = (Date.now() - this.lastReloadTime) / this.reloadTime;
        const barWidth = this.size.x;
        const barHeight = 3;
        const yOffset = this.size.y / 2 + 8;
        
        ctx.save();
        ctx.translate(this.position.x, this.position.y + yOffset);
        
        ctx.fillStyle = '#444';
        ctx.fillRect(-barWidth / 2, 0, barWidth, barHeight);
        
        ctx.fillStyle = '#ff0';
        ctx.fillRect(-barWidth / 2, 0, barWidth * progress, barHeight);
        
        ctx.restore();
    }
}

class EnemyTank extends Tank {
    constructor(x, y) {
        super(x, y, false);
        this.type = 'enemyTank';
        this.ai = new TankAI(this);
        this.patrolPoints = [];
        this.currentPatrolIndex = 0;
        this.detectionRange = 200;
        this.attackRange = 150;
        this.lastPathUpdate = 0;
        this.pathUpdateInterval = 500;
        this.currentPath = [];
        this.pathIndex = 0;
        this.stuckTimer = 0;
        this.lastPosition = this.position.clone();
        this.aggressionLevel = Math.random();
        this.accuracy = 0.7 + Math.random() * 0.3;
        this.reactionTime = 200 + Math.random() * 300;
        this.lastReactionTime = 0;
        this.behaviorState = 'patrol';
        this.alertLevel = 0;
        this.maxAlertLevel = 100;
        this.alertDecayRate = 10;
    }
    
    update(deltaTime) {
        if (!this.active) return;
        
        this.ai.update(deltaTime);
        this.updateAlertLevel(deltaTime);
        this.updateBehaviorState();
        this.updateStuckDetection();
        
        super.update(deltaTime);
    }
    
    updateAlertLevel(deltaTime) {
        if (this.canSeePlayer()) {
            this.alertLevel = Math.min(this.maxAlertLevel, this.alertLevel + 50 * deltaTime);
        } else {
            this.alertLevel = Math.max(0, this.alertLevel - this.alertDecayRate * deltaTime);
        }
    }
    
    updateBehaviorState() {
        if (this.alertLevel > 80) {
            this.behaviorState = 'combat';
        } else if (this.alertLevel > 40) {
            this.behaviorState = 'investigate';
        } else {
            this.behaviorState = 'patrol';
        }
    }
    
    updateStuckDetection() {
        if (this.position.distance(this.lastPosition) < 5) {
            this.stuckTimer += 1;
        } else {
            this.stuckTimer = 0;
            this.lastPosition = this.position.clone();
        }
        
        if (this.stuckTimer > 60) {
            this.handleStuckSituation();
            this.stuckTimer = 0;
        }
    }
    
    handleStuckSituation() {
        this.rotation += Math.PI / 2;
        this.move(new Vector2(Math.cos(this.rotation), Math.sin(this.rotation)));
    }
    
    canSeePlayer() {
        if (!game.player || !game.player.active) return false;
        
        const distance = this.position.distance(game.player.position);
        if (distance > this.detectionRange) return false;
        
        const directionToPlayer = game.player.position.subtract(this.position).normalize();
        const forward = this.getForwardVector();
        const angle = Math.acos(Math.max(-1, Math.min(1, 
            directionToPlayer.x * forward.x + directionToPlayer.y * forward.y
        )));
        
        if (angle > Math.PI / 3) return false;
        
        return !game.world.hasObstacleBetween(this.position, game.player.position);
    }
    
    getPlayerDirection() {
        if (!game.player) return new Vector2(0, 0);
        return game.player.position.subtract(this.position).normalize();
    }
    
    shouldFire() {
        if (!game.player || !this.canFire()) return false;
        
        const distance = this.position.distance(game.player.position);
        if (distance > this.attackRange) return false;
        
        if (Date.now() - this.lastReactionTime < this.reactionTime) return false;
        
        const directionToPlayer = this.getPlayerDirection();
        const turretDirection = new Vector2(Math.cos(this.turretRotation), Math.sin(this.turretRotation));
        const angle = Math.acos(Math.max(-1, Math.min(1,
            directionToPlayer.x * turretDirection.x + directionToPlayer.y * turretDirection.y
        )));
        
        return angle < 0.1 && Math.random() < this.accuracy;
    }
    
    aimAtPlayer() {
        if (!game.player) return;
        
        const playerPos = game.player.position;
        const playerVel = game.player.velocity;
        const distance = this.position.distance(playerPos);
        const bulletSpeed = 400;
        const timeToHit = distance / bulletSpeed;
        
        const predictedPos = playerPos.add(playerVel.multiply(timeToHit));
        const directionToPredicted = predictedPos.subtract(this.position);
        
        const inaccuracy = (1 - this.accuracy) * 0.5;
        const randomOffset = new Vector2(
            (Math.random() - 0.5) * inaccuracy,
            (Math.random() - 0.5) * inaccuracy
        );
        
        const finalDirection = directionToPredicted.add(randomOffset);
        this.turretRotation = finalDirection.angle();
    }
    
    setPatrolPoints(points) {
        this.patrolPoints = points;
        this.currentPatrolIndex = 0;
    }
    
    getNextPatrolPoint() {
        if (this.patrolPoints.length === 0) return null;
        
        const point = this.patrolPoints[this.currentPatrolIndex];
        this.currentPatrolIndex = (this.currentPatrolIndex + 1) % this.patrolPoints.length;
        return point;
    }
    
    render(ctx) {
        super.render(ctx);
        
        if (this.alertLevel > 0) {
            this.renderAlertIndicator(ctx);
        }
        
        if (game.debug && this.currentPath.length > 0) {
            this.renderPath(ctx);
        }
    }
    
    renderAlertIndicator(ctx) {
        const alertPercent = this.alertLevel / this.maxAlertLevel;
        const radius = 5 + alertPercent * 10;
        
        ctx.save();
        ctx.translate(this.position.x, this.position.y - this.size.y / 2 - 20);
        
        ctx.fillStyle = alertPercent > 0.8 ? '#ff0000' : 
                       alertPercent > 0.4 ? '#ffff00' : '#ffaa00';
        ctx.globalAlpha = alertPercent;
        
        ctx.beginPath();
        ctx.arc(0, 0, radius, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.restore();
    }
    
    renderPath(ctx) {
        if (this.currentPath.length < 2) return;
        
        ctx.save();
        ctx.strokeStyle = '#ff00ff';
        ctx.lineWidth = 2;
        ctx.globalAlpha = 0.5;
        
        ctx.beginPath();
        ctx.moveTo(this.currentPath[0].x, this.currentPath[0].y);
        
        for (let i = 1; i < this.currentPath.length; i++) {
            ctx.lineTo(this.currentPath[i].x, this.currentPath[i].y);
        }
        
        ctx.stroke();
        ctx.restore();
    }
}

class TankAI {
    constructor(tank) {
        this.tank = tank;
        this.state = 'patrol';
        this.target = null;
        this.lastDecisionTime = 0;
        this.decisionInterval = 200;
        this.avoidanceVector = new Vector2(0, 0);
        this.avoidanceStrength = 100;
    }
    
    update(deltaTime) {
        if (Date.now() - this.lastDecisionTime < this.decisionInterval) return;
        
        this.updateState();
        this.executeCurrentState(deltaTime);
        
        this.lastDecisionTime = Date.now();
    }
    
    updateState() {
        const playerVisible = this.tank.canSeePlayer();
        const playerDistance = game.player ? 
            this.tank.position.distance(game.player.position) : Infinity;
        
        if (playerVisible && playerDistance < this.tank.attackRange) {
            this.state = 'attack';
            this.target = game.player;
        } else if (playerVisible && playerDistance < this.tank.detectionRange) {
            this.state = 'pursue';
            this.target = game.player;
        } else if (this.tank.alertLevel > 40) {
            this.state = 'investigate';
        } else {
            this.state = 'patrol';
            this.target = null;
        }
    }
    
    executeCurrentState(deltaTime) {
        switch (this.state) {
            case 'patrol':
                this.executePatrol();
                break;
            case 'pursue':
                this.executePursue();
                break;
            case 'attack':
                this.executeAttack();
                break;
            case 'investigate':
                this.executeInvestigate();
                break;
        }
        
        this.updateAvoidance();
        this.applyMovement();
    }
    
    executePatrol() {
        const patrolPoint = this.tank.getNextPatrolPoint();
        if (patrolPoint) {
            const direction = patrolPoint.subtract(this.tank.position);
            if (direction.magnitude() > 20) {
                this.tank.move(direction.normalize());
            }
        } else {
            if (Math.random() < 0.1) {
                const randomDirection = new Vector2(
                    Math.random() - 0.5,
                    Math.random() - 0.5
                ).normalize();
                this.tank.move(randomDirection);
            }
        }
    }
    
    executePursue() {
        if (!this.target) return;
        
        const direction = this.target.position.subtract(this.tank.position);
        this.tank.move(direction.normalize());
        
        this.tank.aimAtPlayer();
        
        if (this.tank.shouldFire()) {
            this.tank.fire();
        }
    }
    
    executeAttack() {
        if (!this.target) return;
        
        this.tank.aimAtPlayer();
        
        if (this.tank.shouldFire()) {
            this.tank.fire();
        }
        
        const distance = this.tank.position.distance(this.target.position);
        if (distance > this.tank.attackRange * 0.8) {
            const direction = this.target.position.subtract(this.tank.position);
            this.tank.move(direction.normalize());
        } else if (distance < this.tank.attackRange * 0.4) {
            const direction = this.tank.position.subtract(this.target.position);
            this.tank.move(direction.normalize());
        }
    }
    
    executeInvestigate() {
        if (game.player) {
            const lastKnownPosition = game.player.position;
            const direction = lastKnownPosition.subtract(this.tank.position);
            
            if (direction.magnitude() > 30) {
                this.tank.move(direction.normalize());
            } else {
                const searchDirection = new Vector2(
                    Math.cos(Date.now() * 0.001) * 0.5,
                    Math.sin(Date.now() * 0.001) * 0.5
                );
                this.tank.move(searchDirection);
            }
        }
    }
    
    updateAvoidance() {
        this.avoidanceVector = new Vector2(0, 0);
        
        const nearbyObstacles = game.world.getObstaclesNear(this.tank.position, 80);
        
        for (const obstacle of nearbyObstacles) {
            const direction = this.tank.position.subtract(obstacle.position);
            const distance = direction.magnitude();
            
            if (distance < 60) {
                const avoidanceForce = direction.normalize().multiply(
                    this.avoidanceStrength / (distance + 1)
                );
                this.avoidanceVector = this.avoidanceVector.add(avoidanceForce);
            }
        }
        
        const nearbyTanks = game.scene.getEntitiesOfType('enemyTank')
            .filter(tank => tank !== this.tank && tank.active);
        
        for (const tank of nearbyTanks) {
            const direction = this.tank.position.subtract(tank.position);
            const distance = direction.magnitude();
            
            if (distance < 80) {
                const avoidanceForce = direction.normalize().multiply(50 / (distance + 1));
                this.avoidanceVector = this.avoidanceVector.add(avoidanceForce);
            }
        }
    }
    
    applyMovement() {
        if (this.avoidanceVector.magnitude() > 0) {
            const currentMove = this.tank.moveDirection.clone();
            const avoidanceNormalized = this.avoidanceVector.normalize();
            
            const blendedDirection = currentMove.add(avoidanceNormalized.multiply(0.5));
            this.tank.move(blendedDirection);
        }
    }
}

class Bullet extends Entity {
    constructor(x, y, direction, owner) {
        super(x, y);
        this.type = 'bullet';
        this.size = new Vector2(6, 6);
        this.velocity = direction.normalize().multiply(400);
        this.owner = owner;
        this.damage = 25;
        this.range = 300;
        this.startPosition = new Vector2(x, y);
        this.color = '#ffff00';
        this.trail = [];
        this.trailLength = 8;
        this.penetration = 1;
        this.hitTargets = [];
    }
    
    update(deltaTime) {
        if (!this.active) return;
        
        this.updateTrail();
        
        super.update(deltaTime);
        
        if (this.startPosition.distance(this.position) > this.range) {
            this.destroy();
            return;
        }
        
        this.checkCollisions();
        this.constrainToWorld();
    }
    
    updateTrail() {
        this.trail.push(this.position.clone());
        if (this.trail.length > this.trailLength) {
            this.trail.shift();
        }
    }
    
    checkCollisions() {
        const entities = game.scene.getAllEntities();
        
        for (const entity of entities) {
            if (!entity.active || entity === this || entity === this.owner) continue;
            if (this.hitTargets.includes(entity)) continue;
            
            if (this.collidesWith(entity)) {
                this.handleCollision(entity);
                
                this.hitTargets.push(entity);
                this.penetration--;
                
                if (this.penetration <= 0) {
                    this.destroy();
                    break;
                }
            }
        }
        
        if (game.world.collidesWithObstacles(this)) {
            this.handleWallCollision();
        }
    }
    
    handleCollision(entity) {
        if (entity.type === 'tank' || entity.type === 'enemyTank') {
            entity.takeDamage(this.damage, this.owner);
            
            if (game.particleSystem) {
                game.particleSystem.createHitEffect(this.position, this.damage);
            }
            
            if (game.soundManager) {
                game.soundManager.playSound('bulletHit');
            }
        }
    }
    
    handleWallCollision() {
        if (game.particleSystem) {
            game.particleSystem.createSparkEffect(this.position, this.velocity);
        }
        
        if (game.soundManager) {
            game.soundManager.playSound('bulletWall');
        }
        
        this.destroy();
    }
    
    constrainToWorld() {
        const bounds = this.getBounds();
        const worldBounds = game.world.getBounds();
        
        if (bounds.left < worldBounds.left || bounds.right > worldBounds.right ||
            bounds.top < worldBounds.top || bounds.bottom > worldBounds.bottom) {
            this.handleWallCollision();
        }
    }
    
    render(ctx) {
        if (!this.active) return;
        
        this.renderTrail(ctx);
        
        ctx.save();
        ctx.translate(this.position.x, this.position.y);
        ctx.rotate(this.velocity.angle());
        
        ctx.fillStyle = this.color;
        ctx.fillRect(-this.size.x / 2, -this.size.y / 2, this.size.x, this.size.y);
        
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(-this.size.x / 4, -this.size.y / 4, this.size.x / 2, this.size.y / 2);
        
        ctx.restore();
    }
    
    renderTrail(ctx) {
        if (this.trail.length < 2) return;
        
        ctx.save();
        ctx.strokeStyle = this.color;
        ctx.lineWidth = 2;
        ctx.globalAlpha = 0.6;
        
        ctx.beginPath();
        ctx.moveTo(this.trail[0].x, this.trail[0].y);
        
        for (let i = 1; i < this.trail.length; i++) {
            const alpha = i / this.trail.length;
            ctx.globalAlpha = 0.6 * alpha;
            ctx.lineTo(this.trail[i].x, this.trail[i].y);
        }
        
        ctx.stroke();
        ctx.restore();
    }
}

class Obstacle extends Entity {
    constructor(x, y, width, height, type = 'wall') {
        super(x, y);
        this.type = 'obstacle';
        this.obstacleType = type;
        this.size = new Vector2(width, height);
        this.health = type === 'destructible' ? 100 : -1;
        this.maxHealth = this.health;
        this.color = this.getColorByType();
        this.isDestructible = type === 'destructible';
    }
    
    getColorByType() {
        switch (this.obstacleType) {
            case 'wall': return '#666';
            case 'destructible': return '#8B4513';
            case 'water': return '#0066cc';
            case 'bush': return '#228B22';
            default: return '#666';
        }
    }
    
    takeDamage(amount, attacker = null) {
        if (!this.isDestructible) return;
        
        super.takeDamage(amount, attacker);
        
        if (game.particleSystem) {
            game.particleSystem.createDebrisEffect(this.position, this.obstacleType);
        }
        
        if (this.health <= 0 && attacker && attacker.isPlayer) {
            game.score += 10;
        }
    }
    
    render(ctx) {
        if (!this.active) return;
        
        ctx.save();
        ctx.translate(this.position.x, this.position.y);
        
        switch (this.obstacleType) {
            case 'wall':
                this.renderWall(ctx);
                break;
            case 'destructible':
                this.renderDestructible(ctx);
                break;
            case 'water':
                this.renderWater(ctx);
                break;
            case 'bush':
                this.renderBush(ctx);
                break;
        }
        
        ctx.restore();
        
        if (this.isDestructible && this.health < this.maxHealth) {
            this.renderHealthBar(ctx);
        }
    }
    
    renderWall(ctx) {
        ctx.fillStyle = this.color;
        ctx.fillRect(-this.size.x / 2, -this.size.y / 2, this.size.x, this.size.y);
        
        ctx.strokeStyle = '#444';
        ctx.lineWidth = 2;
        ctx.strokeRect(-this.size.x / 2, -this.size.y / 2, this.size.x, this.size.y);
        
        const brickWidth = 20;
        const brickHeight = 10;
        ctx.strokeStyle = '#888';
        ctx.lineWidth = 1;
        
        for (let y = -this.size.y / 2; y < this.size.y / 2; y += brickHeight) {
            for (let x = -this.size.x / 2; x < this.size.x / 2; x += brickWidth) {
                ctx.strokeRect(x, y, brickWidth, brickHeight);
            }
        }
    }
    
    renderDestructible(ctx) {
        ctx.fillStyle = this.color;
        ctx.fillRect(-this.size.x / 2, -this.size.y / 2, this.size.x, this.size.y);
        
        ctx.strokeStyle = '#654321';
        ctx.lineWidth = 2;
        ctx.strokeRect(-this.size.x / 2, -this.size.y / 2, this.size.x, this.size.y);
        
        const damage = 1 - (this.health / this.maxHealth);
        if (damage > 0) {
            ctx.fillStyle = '#333';
            for (let i = 0; i < damage * 10; i++) {
                const x = (Math.random() - 0.5) * this.size.x;
                const y = (Math.random() - 0.5) * this.size.y;
                ctx.fillRect(x - 2, y - 2, 4, 4);
            }
        }
    }
    
    renderWater(ctx) {
        ctx.fillStyle = this.color;
        ctx.fillRect(-this.size.x / 2, -this.size.y / 2, this.size.x, this.size.y);
        
        const time = Date.now() * 0.003;
        ctx.strokeStyle = '#4488ff';
        ctx.lineWidth = 1;
        
        for (let i = 0; i < 5; i++) {
            const y = Math.sin(time + i) * 5 - this.size.y / 2 + (i + 1) * this.size.y / 6;
            ctx.beginPath();
            ctx.moveTo(-this.size.x / 2, y);
            ctx.lineTo(this.size.x / 2, y);
            ctx.stroke();
        }
    }
    
    renderBush(ctx) {
        ctx.fillStyle = this.color;
        
        for (let i = 0; i < 8; i++) {
            const angle = (i / 8) * Math.PI * 2;
            const radius = this.size.x / 3 + Math.sin(Date.now() * 0.002 + i) * 3;
            const x = Math.cos(angle) * radius;
            const y = Math.sin(angle) * radius;
            
            ctx.beginPath();
            ctx.arc(x, y, 8, 0, Math.PI * 2);
            ctx.fill();
        }
    }
    
    renderHealthBar(ctx) {
        const barWidth = this.size.x;
        const barHeight = 4;
        const yOffset = -this.size.y / 2 - 8;
        
        ctx.save();
        ctx.translate(this.position.x, this.position.y + yOffset);
        
        ctx.fillStyle = '#333';
        ctx.fillRect(-barWidth / 2, 0, barWidth, barHeight);
        
        const healthPercent = this.health / this.maxHealth;
        ctx.fillStyle = healthPercent > 0.5 ? '#0f0' : '#ff0';
        ctx.fillRect(-barWidth / 2, 0, barWidth * healthPercent, barHeight);
        
        ctx.restore();
    }
}

class Powerup extends Entity {
    constructor(x, y, type) {
        super(x, y);
        this.type = 'powerup';
        this.powerupType = type;
        this.size = new Vector2(24, 24);
        this.color = this.getColorByType();
        this.bobOffset = Math.random() * Math.PI * 2;
        this.rotationSpeed = 2;
        this.glowIntensity = 0;
        this.lifetime = 30000;
        this.spawnTime = Date.now();
    }
    
    getColorByType() {
        switch (this.powerupType) {
            case 'health': return '#00ff00';
            case 'damage': return '#ff0000';
            case 'speed': return '#0000ff';
            case 'armor': return '#ffff00';
            case 'ammo': return '#ff8800';
            case 'rapidfire': return '#ff00ff';
            default: return '#ffffff';
        }
    }
    
    update(deltaTime) {
        if (!this.active) return;
        
        this.rotation += this.rotationSpeed * deltaTime;
        this.glowIntensity = Math.sin(Date.now() * 0.005) * 0.5 + 0.5;
        
        if (Date.now() - this.spawnTime > this.lifetime) {
            this.destroy();
        }
        
        this.checkPlayerCollision();
        
        super.update(deltaTime);
    }
    
    checkPlayerCollision() {
        if (game.player && game.player.active && this.collidesWith(game.player)) {
            this.applyEffect(game.player);
            this.destroy();
        }
    }
    
    applyEffect(player) {
        switch (this.powerupType) {
            case 'health':
                player.heal(50);
                break;
            case 'damage':
                break;
            case 'speed':
                break;
            case 'armor':
                player.armor += 1;
                break;
            case 'ammo':
                player.ammunition = player.maxAmmunition;
                break;
            case 'rapidfire':
                break;
        }
        
        if (game.particleSystem) {
            game.particleSystem.createPowerupEffect(this.position, this.powerupType);
        }
        
        if (game.soundManager) {
            game.soundManager.playSound('powerup');
        }
        
        game.score += 20;
    }
    
    render(ctx) {
        if (!this.active) return;
        
        const bobAmount = Math.sin(Date.now() * 0.003 + this.bobOffset) * 3;
        
        ctx.save();
        ctx.translate(this.position.x, this.position.y + bobAmount);
        ctx.rotate(this.rotation);
        
        ctx.shadowColor = this.color;
        ctx.shadowBlur = 10 + this.glowIntensity * 10;
        
        ctx.fillStyle = this.color;
        ctx.fillRect(-this.size.x / 2, -this.size.y / 2, this.size.x, this.size.y);
        
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2;
        ctx.strokeRect(-this.size.x / 2, -this.size.y / 2, this.size.x, this.size.y);
        
        ctx.shadowBlur = 0;
        
        this.renderIcon(ctx);
        
        ctx.restore();
    }
    
    renderIcon(ctx) {
        ctx.fillStyle = '#ffffff';
        ctx.font = '16px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        
        let icon = '';
        switch (this.powerupType) {
            case 'health': icon = '+'; break;
            case 'damage': icon = '!'; break;
            case 'speed': icon = '>>'; break;
            case 'armor': icon = '◊'; break;
            case 'ammo': icon = '∞'; break;
            case 'rapidfire': icon = '※'; break;
        }
        
        ctx.fillText(icon, 0, 0);
    }
}

class ParticleSystem {
    constructor() {
        this.particles = [];
        this.maxParticles = 500;
    }
    
    update(deltaTime) {
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const particle = this.particles[i];
            particle.update(deltaTime);
            
            if (!particle.active) {
                this.particles.splice(i, 1);
            }
        }
    }
    
    render(ctx) {
        for (const particle of this.particles) {
            particle.render(ctx);
        }
    }
    
    createParticle(x, y, velocity, color, size, lifetime) {
        if (this.particles.length >= this.maxParticles) {
            this.particles.shift();
        }
        
        const particle = new Particle(x, y, velocity, color, size, lifetime);
        this.particles.push(particle);
        return particle;
    }
    
    createExplosion(position, size = 50, particleCount = 20) {
        for (let i = 0; i < particleCount; i++) {
            const angle = (i / particleCount) * Math.PI * 2;
            const speed = 50 + Math.random() * 100;
            const velocity = new Vector2(Math.cos(angle) * speed, Math.sin(angle) * speed);
            
            const colors = ['#ff4400', '#ff6600', '#ff8800', '#ffaa00', '#ffcc00'];
            const color = colors[Math.floor(Math.random() * colors.length)];
            
            this.createParticle(
                position.x + (Math.random() - 0.5) * size,
                position.y + (Math.random() - 0.5) * size,
                velocity,
                color,
                2 + Math.random() * 4,
                0.5 + Math.random() * 1
            );
        }
    }
    
    createMuzzleFlash(position, rotation) {
        for (let i = 0; i < 8; i++) {
            const angle = rotation + (Math.random() - 0.5) * 0.5;
            const speed = 100 + Math.random() * 50;
            const velocity = new Vector2(Math.cos(angle) * speed, Math.sin(angle) * speed);
            
            this.createParticle(
                position.x,
                position.y,
                velocity,
                '#ffff88',
                1 + Math.random() * 2,
                0.1 + Math.random() * 0.2
            );
        }
    }
    
    createHitEffect(position, damage) {
        const particleCount = Math.min(15, Math.max(5, damage / 5));
        
        for (let i = 0; i < particleCount; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = 30 + Math.random() * 70;
            const velocity = new Vector2(Math.cos(angle) * speed, Math.sin(angle) * speed);
            
            this.createParticle(
                position.x,
                position.y,
                velocity,
                '#ff0000',
                1 + Math.random() * 3,
                0.3 + Math.random() * 0.5
            );
        }
    }
    
    createSparkEffect(position, bulletVelocity) {
        for (let i = 0; i < 6; i++) {
            const angle = bulletVelocity.angle() + Math.PI + (Math.random() - 0.5) * 1;
            const speed = 20 + Math.random() * 40;
            const velocity = new Vector2(Math.cos(angle) * speed, Math.sin(angle) * speed);
            
            this.createParticle(
                position.x,
                position.y,
                velocity,
                '#ffff00',
                1 + Math.random() * 2,
                0.2 + Math.random() * 0.3
            );
        }
    }
    
    createDebrisEffect(position, obstacleType) {
        const colors = {
            'destructible': ['#8B4513', '#A0522D', '#CD853F'],
            'wall': ['#666', '#888', '#aaa']
        };
        
        const particleColors = colors[obstacleType] || colors['wall'];
        
        for (let i = 0; i < 12; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = 20 + Math.random() * 60;
            const velocity = new Vector2(Math.cos(angle) * speed, Math.sin(angle) * speed);
            
            const color = particleColors[Math.floor(Math.random() * particleColors.length)];
            
            this.createParticle(
                position.x + (Math.random() - 0.5) * 20,
                position.y + (Math.random() - 0.5) * 20,
                velocity,
                color,
                2 + Math.random() * 4,
                1 + Math.random() * 2
            );
        }
    }
    
    createPowerupEffect(position, powerupType) {
        const colors = {
            'health': ['#00ff00', '#88ff88'],
            'damage': ['#ff0000', '#ff8888'],
            'speed': ['#0000ff', '#8888ff'],
            'armor': ['#ffff00', '#ffff88'],
            'ammo': ['#ff8800', '#ffaa88'],
            'rapidfire': ['#ff00ff', '#ff88ff']
        };
        
        const particleColors = colors[powerupType] || ['#ffffff'];
        
        for (let i = 0; i < 15; i++) {
            const angle = (i / 15) * Math.PI * 2;
            const speed = 30 + Math.random() * 40;
            const velocity = new Vector2(Math.cos(angle) * speed, Math.sin(angle) * speed);
            
            const color = particleColors[Math.floor(Math.random() * particleColors.length)];
            
            this.createParticle(
                position.x,
                position.y,
                velocity,
                color,
                2 + Math.random() * 3,
                0.8 + Math.random() * 0.7
            );
        }
    }
    
    createLevelUpEffect(position) {
        for (let i = 0; i < 20; i++) {
            const angle = (i / 20) * Math.PI * 2;
            const speed = 40 + Math.random() * 60;
            const velocity = new Vector2(Math.cos(angle) * speed, Math.sin(angle) * speed);
            
            this.createParticle(
                position.x,
                position.y,
                velocity,
                '#ffff00',
                3 + Math.random() * 4,
                1 + Math.random() * 1
            );
        }
    }
}

class Particle {
    constructor(x, y, velocity, color, size, lifetime) {
        this.position = new Vector2(x, y);
        this.velocity = velocity;
        this.color = color;
        this.size = size;
        this.lifetime = lifetime;
        this.age = 0;
        this.active = true;
        this.gravity = 50;
        this.friction = 0.95;
        this.alpha = 1;
    }
    
    update(deltaTime) {
        if (!this.active) return;
        
        this.age += deltaTime;
        
        if (this.age >= this.lifetime) {
            this.active = false;
            return;
        }
        
        this.velocity.y += this.gravity * deltaTime;
        this.velocity = this.velocity.multiply(this.friction);
        
        this.position = this.position.add(this.velocity.multiply(deltaTime));
        
        this.alpha = 1 - (this.age / this.lifetime);
        this.size = this.size * 0.99;
    }
    
    render(ctx) {
        if (!this.active || this.alpha <= 0) return;
        
        ctx.save();
        ctx.globalAlpha = this.alpha;
        ctx.fillStyle = this.color;
        
        ctx.beginPath();
        ctx.arc(this.position.x, this.position.y, this.size, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.restore();
    }
}

class World {
    constructor(width, height) {
        this.width = width;
        this.height = height;
        this.obstacles = [];
        this.spawnPoints = [];
        this.powerupSpawns = [];
        this.backgroundPattern = null;
    }
    
    getBounds() {
        return {
            left: 0,
            right: this.width,
            top: 0,
            bottom: this.height
        };
    }
    
    addObstacle(obstacle) {
        this.obstacles.push(obstacle);
    }
    
    removeObstacle(obstacle) {
        const index = this.obstacles.indexOf(obstacle);
        if (index > -1) {
            this.obstacles.splice(index, 1);
        }
    }
    
    getObstaclesNear(position, radius) {
        return this.obstacles.filter(obstacle => {
            return obstacle.active && position.distance(obstacle.position) <= radius;
        });
    }
    
    collidesWithObstacles(entity) {
        for (const obstacle of this.obstacles) {
            if (obstacle.active && entity.collidesWith(obstacle)) {
                return obstacle;
            }
        }
        return null;
    }
    
    hasObstacleBetween(pos1, pos2) {
        for (const obstacle of this.obstacles) {
            if (!obstacle.active) continue;
            
            if (this.lineIntersectsRect(pos1, pos2, obstacle.getBounds())) {
                return true;
            }
        }
        return false;
    }
    
    lineIntersectsRect(lineStart, lineEnd, rect) {
        const dx = lineEnd.x - lineStart.x;
        const dy = lineEnd.y - lineStart.y;
        
        const t1 = (rect.left - lineStart.x) / dx;
        const t2 = (rect.right - lineStart.x) / dx;
        const t3 = (rect.top - lineStart.y) / dy;
        const t4 = (rect.bottom - lineStart.y) / dy;
        
        const tMin = Math.max(Math.min(t1, t2), Math.min(t3, t4));
        const tMax = Math.min(Math.max(t1, t2), Math.max(t3, t4));
        
        return tMax >= 0 && tMin <= tMax && tMin <= 1;
    }
    
    addSpawnPoint(x, y, type = 'enemy') {
        this.spawnPoints.push({ position: new Vector2(x, y), type: type });
    }
    
    getSpawnPoints(type = null) {
        if (type) {
            return this.spawnPoints.filter(spawn => spawn.type === type);
        }
        return this.spawnPoints;
    }
    
    generateLevel(levelNumber) {
        this.obstacles = [];
        this.spawnPoints = [];
        this.powerupSpawns = [];
        
        this.generateBorder();
        this.generateMaze(levelNumber);
        this.generateSpawnPoints(levelNumber);
        this.generatePowerupSpawns();
    }
    
    generateBorder() {
        const wallThickness = 32;
        
        this.addObstacle(new Obstacle(this.width / 2, wallThickness / 2, this.width, wallThickness, 'wall'));
        this.addObstacle(new Obstacle(this.width / 2, this.height - wallThickness / 2, this.width, wallThickness, 'wall'));
        this.addObstacle(new Obstacle(wallThickness / 2, this.height / 2, wallThickness, this.height, 'wall'));
        this.addObstacle(new Obstacle(this.width - wallThickness / 2, this.height / 2, wallThickness, this.height, 'wall'));
    }
    
    generateMaze(levelNumber) {
        const complexity = Math.min(10, 3 + levelNumber);
        const destructibleChance = 0.3 + (levelNumber * 0.05);
        
        for (let i = 0; i < complexity; i++) {
            const x = 100 + Math.random() * (this.width - 200);
            const y = 100 + Math.random() * (this.height - 200);
            const width = 32 + Math.random() * 64;
            const height = 32 + Math.random() * 64;
            
            const type = Math.random() < destructibleChance ? 'destructible' : 'wall';
            
            if (!this.wouldBlockSpawn(x, y, width, height)) {
                this.addObstacle(new Obstacle(x, y, width, height, type));
            }
        }
        
        if (levelNumber > 3) {
            for (let i = 0; i < Math.floor(levelNumber / 2); i++) {
                const x = 150 + Math.random() * (this.width - 300);
                const y = 150 + Math.random() * (this.height - 300);
                const size = 60 + Math.random() * 40;
                
                this.addObstacle(new Obstacle(x, y, size, size, 'water'));
            }
        }
        
        if (levelNumber > 5) {
            for (let i = 0; i < levelNumber - 3; i++) {
                const x = 100 + Math.random() * (this.width - 200);
                const y = 100 + Math.random() * (this.height - 200);
                const size = 40 + Math.random() * 30;
                
                this.addObstacle(new Obstacle(x, y, size, size, 'bush'));
            }
        }
    }
    
    wouldBlockSpawn(x, y, width, height) {
        const spawnAreas = [
            { x: 100, y: 100, radius: 80 },
            { x: this.width - 100, y: this.height - 100, radius: 80 }
        ];
        
        for (const area of spawnAreas) {
            const distance = Math.sqrt((x - area.x) ** 2 + (y - area.y) ** 2);
            if (distance < area.radius + Math.max(width, height) / 2) {
                return true;
            }
        }
        
        return false;
    }
    
    generateSpawnPoints(levelNumber) {
        this.addSpawnPoint(100, 100, 'player');
        
        const enemyCount = Math.min(8, 2 + levelNumber);
        
        for (let i = 0; i < enemyCount; i++) {
            let attempts = 0;
            let validSpawn = false;
            
            while (!validSpawn && attempts < 20) {
                const x = 200 + Math.random() * (this.width - 400);
                const y = 200 + Math.random() * (this.height - 400);
                
                const playerDistance = Math.sqrt((x - 100) ** 2 + (y - 100) ** 2);
                
                if (playerDistance > 150 && !this.collidesWithObstacles({ position: new Vector2(x, y), getBounds: () => ({ left: x - 20, right: x + 20, top: y - 20, bottom: y + 20 }) })) {
                    this.addSpawnPoint(x, y, 'enemy');
                    validSpawn = true;
                }
                
                attempts++;
            }
        }
    }
    
    generatePowerupSpawns() {
        for (let i = 0; i < 5; i++) {
            let attempts = 0;
            let validSpawn = false;
            
            while (!validSpawn && attempts < 15) {
                const x = 150 + Math.random() * (this.width - 300);
                const y = 150 + Math.random() * (this.height - 300);
                
                if (!this.collidesWithObstacles({ position: new Vector2(x, y), getBounds: () => ({ left: x - 12, right: x + 12, top: y - 12, bottom: y + 12 }) })) {
                    this.powerupSpawns.push(new Vector2(x, y));
                    validSpawn = true;
                }
                
                attempts++;
            }
        }
    }
    
    update(deltaTime) {
        for (let i = this.obstacles.length - 1; i >= 0; i--) {
            const obstacle = this.obstacles[i];
            obstacle.update(deltaTime);
            
            if (!obstacle.active) {
                this.obstacles.splice(i, 1);
            }
        }
    }
    
    render(ctx) {
        this.renderBackground(ctx);
        
        for (const obstacle of this.obstacles) {
            obstacle.render(ctx);
        }
        
        if (game.debug) {
            this.renderDebugInfo(ctx);
        }
    }
    
    renderBackground(ctx) {
        ctx.fillStyle = '#111';
        ctx.fillRect(0, 0, this.width, this.height);
        
        ctx.strokeStyle = '#222';
        ctx.lineWidth = 1;
        
        const gridSize = 40;
        for (let x = 0; x <= this.width; x += gridSize) {
            ctx.beginPath();
            ctx.moveTo(x, 0);
            ctx.lineTo(x, this.height);
            ctx.stroke();
        }
        
        for (let y = 0; y <= this.height; y += gridSize) {
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(this.width, y);
            ctx.stroke();
        }
    }
    
    renderDebugInfo(ctx) {
        ctx.save();
        
        for (const spawn of this.spawnPoints) {
            ctx.fillStyle = spawn.type === 'player' ? '#00ff00' : '#ff0000';
            ctx.globalAlpha = 0.5;
            ctx.beginPath();
            ctx.arc(spawn.position.x, spawn.position.y, 20, 0, Math.PI * 2);
            ctx.fill();
        }
        
        for (const spawn of this.powerupSpawns) {
            ctx.fillStyle = '#ffff00';
            ctx.globalAlpha = 0.3;
            ctx.beginPath();
            ctx.arc(spawn.x, spawn.y, 15, 0, Math.PI * 2);
            ctx.fill();
        }
        
        ctx.restore();
    }
}

class Scene {
    constructor() {
        this.entities = [];
        this.entitiesToAdd = [];
        this.entitiesToRemove = [];
    }
    
    addEntity(entity) {
        this.entitiesToAdd.push(entity);
    }
    
    removeEntity(entity) {
        this.entitiesToRemove.push(entity);
    }
    
    getAllEntities() {
        return this.entities.slice();
    }
    
    getEntitiesOfType(type) {
        return this.entities.filter(entity => entity.type === type);
    }
    
    update(deltaTime) {
        for (const entity of this.entitiesToAdd) {
            this.entities.push(entity);
        }
        this.entitiesToAdd = [];
        
        for (const entity of this.entitiesToRemove) {
            const index = this.entities.indexOf(entity);
            if (index > -1) {
                this.entities.splice(index, 1);
            }
        }
        this.entitiesToRemove = [];
        
        for (let i = this.entities.length - 1; i >= 0; i--) {
            const entity = this.entities[i];
            entity.update(deltaTime);
            
            if (!entity.active) {
                this.entities.splice(i, 1);
            }
        }
    }
    
    render(ctx) {
        const sortedEntities = this.entities.slice().sort((a, b) => {
            const renderOrder = { 'bullet': 3, 'powerup': 2, 'tank': 1, 'enemyTank': 1, 'obstacle': 0 };
            return (renderOrder[a.type] || 0) - (renderOrder[b.type] || 0);
        });
        
        for (const entity of sortedEntities) {
            entity.render(ctx);
        }
    }
    
    clear() {
        this.entities = [];
        this.entitiesToAdd = [];
        this.entitiesToRemove = [];
    }
}

class InputManager {
    constructor() {
        this.keys = {};
        this.mousePosition = new Vector2(0, 0);
        this.mouseButtons = {};
        
        this.setupEventListeners();
    }
    
    setupEventListeners() {
        document.addEventListener('keydown', (e) => {
            this.keys[e.code] = true;
            
            if (e.code === 'KeyR' && game.gameState === 'playing') {
                game.restartLevel();
            }
            if (e.code === 'KeyP' && game.gameState === 'playing') {
                game.togglePause();
            }
        });
        
        document.addEventListener('keyup', (e) => {
            this.keys[e.code] = false;
        });
        
        const canvas = document.getElementById('gameCanvas');
        
        canvas.addEventListener('mousemove', (e) => {
            const rect = canvas.getBoundingClientRect();
            this.mousePosition.x = e.clientX - rect.left;
            this.mousePosition.y = e.clientY - rect.top;
        });
        
        canvas.addEventListener('mousedown', (e) => {
            this.mouseButtons[e.button] = true;
        });
        
        canvas.addEventListener('mouseup', (e) => {
            this.mouseButtons[e.button] = false;
        });
        
        canvas.addEventListener('contextmenu', (e) => {
            e.preventDefault();
        });
    }
    
    isKeyPressed(keyCode) {
        return !!this.keys[keyCode];
    }
    
    isMousePressed(button = 0) {
        return !!this.mouseButtons[button];
    }
    
    getMovementVector() {
        const movement = new Vector2(0, 0);
        
        if (this.isKeyPressed('KeyW') || this.isKeyPressed('ArrowUp')) {
            movement.y -= 1;
        }
        if (this.isKeyPressed('KeyS') || this.isKeyPressed('ArrowDown')) {
            movement.y += 1;
        }
        if (this.isKeyPressed('KeyA') || this.isKeyPressed('ArrowLeft')) {
            movement.x -= 1;
        }
        if (this.isKeyPressed('KeyD') || this.isKeyPressed('ArrowRight')) {
            movement.x += 1;
        }
        
        return movement;
    }
    
    shouldFire() {
        return this.isKeyPressed('Space') || this.isMousePressed(0);
    }
}

class SoundManager {
    constructor() {
        this.sounds = {};
        this.volume = 0.5;
        this.enabled = true;
        
        this.loadSounds();
    }
    
    loadSounds() {
        const soundFiles = {
            'tankFire': this.createTankFireSound(),
            'bulletHit': this.createBulletHitSound(),
            'bulletWall': this.createBulletWallSound(),
            'tankDestroy': this.createTankDestroySound(),
            'powerup': this.createPowerupSound(),
            'levelUp': this.createLevelUpSound()
        };
        
        for (const [name, sound] of Object.entries(soundFiles)) {
            this.sounds[name] = sound;
        }
    }
    
    createTankFireSound() {
        return this.createSound(0.1, [
            { freq: 150, time: 0, vol: 0.3 },
            { freq: 100, time: 0.05, vol: 0.1 },
            { freq: 50, time: 0.1, vol: 0 }
        ]);
    }
    
    createBulletHitSound() {
        return this.createSound(0.2, [
            { freq: 200, time: 0, vol: 0.2 },
            { freq: 150, time: 0.1, vol: 0.1 },
            { freq: 100, time: 0.2, vol: 0 }
        ]);
    }
    
    createBulletWallSound() {
        return this.createSound(0.15, [
            { freq: 300, time: 0, vol: 0.15 },
            { freq: 200, time: 0.05, vol: 0.1 },
            { freq: 100, time: 0.15, vol: 0 }
        ]);
    }
    
    createTankDestroySound() {
        return this.createSound(0.5, [
            { freq: 100, time: 0, vol: 0.4 },
            { freq: 80, time: 0.2, vol: 0.3 },
            { freq: 60, time: 0.4, vol: 0.1 },
            { freq: 40, time: 0.5, vol: 0 }
        ]);
    }
    
    createPowerupSound() {
        return this.createSound(0.3, [
            { freq: 400, time: 0, vol: 0.2 },
            { freq: 600, time: 0.1, vol: 0.3 },
            { freq: 800, time: 0.2, vol: 0.2 },
            { freq: 1000, time: 0.3, vol: 0 }
        ]);
    }
    
    createLevelUpSound() {
        return this.createSound(0.8, [
            { freq: 300, time: 0, vol: 0.3 },
            { freq: 400, time: 0.2, vol: 0.4 },
            { freq: 500, time: 0.4, vol: 0.4 },
            { freq: 600, time: 0.6, vol: 0.3 },
            { freq: 700, time: 0.8, vol: 0 }
        ]);
    }
    
    createSound(duration, notes) {
        if (!window.AudioContext && !window.webkitAudioContext) {
            return null;
        }
        
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        const sampleRate = audioContext.sampleRate;
        const buffer = audioContext.createBuffer(1, duration * sampleRate, sampleRate);
        const data = buffer.getChannelData(0);
        
        for (let i = 0; i < data.length; i++) {
            const time = i / sampleRate;
            let sample = 0;
            
            for (const note of notes) {
                if (time >= note.time) {
                    const freq = note.freq;
                    const vol = note.vol;
                    sample += Math.sin(2 * Math.PI * freq * time) * vol;
                }
            }
            
            data[i] = sample * 0.1;
        }
        
        return buffer;
    }
    
    playSound(name) {
        if (!this.enabled || !this.sounds[name]) return;
        
        try {
            const audioContext = new (window.AudioContext || window.webkitAudioContext)();
            const source = audioContext.createBufferSource();
            const gainNode = audioContext.createGain();
            
            source.buffer = this.sounds[name];
            gainNode.gain.value = this.volume;
            
            source.connect(gainNode);
            gainNode.connect(audioContext.destination);
            
            source.start();
        } catch (error) {
            console.warn('Could not play sound:', error);
        }
    }
    
    setVolume(volume) {
        this.volume = Math.max(0, Math.min(1, volume));
    }
    
    toggleEnabled() {
        this.enabled = !this.enabled;
    }
}

class Game {
    constructor() {
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.minimapCanvas = document.getElementById('minimapCanvas');
        this.minimapCtx = this.minimapCanvas.getContext('2d');
        
        this.scene = new Scene();
        this.world = new World(800, 600);
        this.inputManager = new InputManager();
        this.particleSystem = new ParticleSystem();
        this.soundManager = new SoundManager();
        
        this.player = null;
        this.enemies = [];
        this.powerups = [];
        
        this.gameState = 'menu';
        this.currentLevel = 1;
        this.score = 0;
        this.gameTime = 0;
        this.lastTime = 0;
        this.isPaused = false;
        this.debug = false;
        
        this.powerupSpawnTimer = 0;
        this.powerupSpawnInterval = 15000;
        
        this.levelStartTime = 0;
        this.levelCompleteDelay = 2000;
        
        this.camera = {
            x: 0,
            y: 0,
            targetX: 0,
            targetY: 0,
            smoothing: 0.1
        };
        
        this.init();
    }
    
    init() {
        this.showMainMenu();
        this.startGameLoop();
    }
    
    startGameLoop() {
        const gameLoop = (currentTime) => {
            const deltaTime = (currentTime - this.lastTime) / 1000;
            this.lastTime = currentTime;
            
            if (this.gameState === 'playing' && !this.isPaused) {
                this.update(Math.min(deltaTime, 0.016));
            }
            
            this.render();
            
            requestAnimationFrame(gameLoop);
        };
        
        requestAnimationFrame(gameLoop);
    }
    
    update(deltaTime) {
        this.gameTime += deltaTime;
        
        this.handleInput();
        
        this.scene.update(deltaTime);
        this.world.update(deltaTime);
        this.particleSystem.update(deltaTime);
        
        this.updateCamera(deltaTime);
        this.updatePowerupSpawning(deltaTime);
        this.updateGameLogic();
        
        this.updateUI();
    }
    
    handleInput() {
        if (!this.player || !this.player.active) return;
        
        const movement = this.inputManager.getMovementVector();
        if (movement.magnitude() > 0) {
            this.player.move(movement);
        } else {
            this.player.move(new Vector2(0, 0));
        }
        
        if (this.inputManager.shouldFire()) {
            this.player.fire();
        }
    }
    
    updateCamera(deltaTime) {
        if (this.player && this.player.active) {
            this.camera.targetX = this.player.position.x - this.canvas.width / 2;
            this.camera.targetY = this.player.position.y - this.canvas.height / 2;
        }
        
        this.camera.x += (this.camera.targetX - this.camera.x) * this.camera.smoothing;
        this.camera.y += (this.camera.targetY - this.camera.y) * this.camera.smoothing;
        
        this.camera.x = Math.max(0, Math.min(this.world.width - this.canvas.width, this.camera.x));
        this.camera.y = Math.max(0, Math.min(this.world.height - this.canvas.height, this.camera.y));
    }
    
    updatePowerupSpawning(deltaTime) {
        this.powerupSpawnTimer += deltaTime * 1000;
        
        if (this.powerupSpawnTimer >= this.powerupSpawnInterval) {
            this.spawnRandomPowerup();
            this.powerupSpawnTimer = 0;
        }
    }
    
    updateGameLogic() {
        this.enemies = this.scene.getEntitiesOfType('enemyTank').filter(tank => tank.active);
        this.powerups = this.scene.getEntitiesOfType('powerup').filter(powerup => powerup.active);
        
        if (this.enemies.length === 0 && this.gameState === 'playing') {
            setTimeout(() => {
                if (this.enemies.length === 0) {
                    this.completeLevel();
                }
            }, this.levelCompleteDelay);
        }
        
        if (this.player && !this.player.active) {
            this.gameOver();
        }
    }
    
    spawnRandomPowerup() {
        if (this.world.powerupSpawns.length === 0 || this.powerups.length >= 3) return;
        
        const availableSpawns = this.world.powerupSpawns.filter(spawn => {
            return !this.powerups.some(powerup => powerup.position.distance(spawn) < 50);
        });
        
        if (availableSpawns.length === 0) return;
        
        const spawn = availableSpawns[Math.floor(Math.random() * availableSpawns.length)];
        const powerupTypes = ['health', 'damage', 'speed', 'armor', 'ammo', 'rapidfire'];
        const type = powerupTypes[Math.floor(Math.random() * powerupTypes.length)];
        
        const powerup = new Powerup(spawn.x, spawn.y, type);
        this.scene.addEntity(powerup);
    }
    
    render() {
        this.ctx.save();
        this.ctx.translate(-this.camera.x, -this.camera.y);
        
        this.world.render(this.ctx);
        this.scene.render(this.ctx);
        this.particleSystem.render(this.ctx);
        
        this.ctx.restore();
        
        this.renderMinimap();
        
        if (this.isPaused) {
            this.renderPauseOverlay();
        }
    }
    
    renderMinimap() {
        const scale = this.minimapCanvas.width / this.world.width;
        
        this.minimapCtx.fillStyle = '#000';
        this.minimapCtx.fillRect(0, 0, this.minimapCanvas.width, this.minimapCanvas.height);
        
        this.minimapCtx.save();
        this.minimapCtx.scale(scale, scale);
        
        for (const obstacle of this.world.obstacles) {
            if (!obstacle.active) continue;
            
            this.minimapCtx.fillStyle = obstacle.obstacleType === 'wall' ? '#666' : '#444';
            this.minimapCtx.fillRect(
                obstacle.position.x - obstacle.size.x / 2,
                obstacle.position.y - obstacle.size.y / 2,
                obstacle.size.x,
                obstacle.size.y
            );
        }
        
        if (this.player && this.player.active) {
            this.minimapCtx.fillStyle = '#00ff00';
            this.minimapCtx.fillRect(this.player.position.x - 3, this.player.position.y - 3, 6, 6);
        }
        
        for (const enemy of this.enemies) {
            this.minimapCtx.fillStyle = '#ff0000';
            this.minimapCtx.fillRect(enemy.position.x - 2, enemy.position.y - 2, 4, 4);
        }
        
        for (const powerup of this.powerups) {
            this.minimapCtx.fillStyle = powerup.color;
            this.minimapCtx.fillRect(powerup.position.x - 1, powerup.position.y - 1, 2, 2);
        }
        
        this.minimapCtx.restore();
        
        this.minimapCtx.strokeStyle = '#333';
        this.minimapCtx.lineWidth = 2;
        this.minimapCtx.strokeRect(0, 0, this.minimapCanvas.width, this.minimapCanvas.height);
    }
    
    renderPauseOverlay() {
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        this.ctx.fillStyle = '#fff';
        this.ctx.font = '48px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.fillText('暂停', this.canvas.width / 2, this.canvas.height / 2);
        
        this.ctx.font = '24px Arial';
        this.ctx.fillText('按 P 继续游戏', this.canvas.width / 2, this.canvas.height / 2 + 50);
    }
    
    updateUI() {
        if (this.player) {
            document.getElementById('playerHealth').textContent = Math.max(0, this.player.health);
            document.getElementById('healthFill').style.width = (this.player.health / this.player.maxHealth * 100) + '%';
            document.getElementById('ammoCount').textContent = this.player.ammunition === -1 ? '∞' : this.player.ammunition;
        }
        
        document.getElementById('playerScore').textContent = this.score;
        document.getElementById('currentLevel').textContent = this.currentLevel;
        document.getElementById('enemyCount').textContent = this.enemies.length;
        
        const minutes = Math.floor(this.gameTime / 60);
        const seconds = Math.floor(this.gameTime % 60);
        document.getElementById('gameTime').textContent = 
            minutes.toString().padStart(2, '0') + ':' + seconds.toString().padStart(2, '0');
    }
    
    startGame() {
        this.hideMainMenu();
        this.currentLevel = 1;
        this.score = 0;
        this.gameTime = 0;
        this.gameState = 'playing';
        
        this.loadLevel(this.currentLevel);
    }
    
    loadLevel(levelNumber) {
        this.scene.clear();
        this.world.generateLevel(levelNumber);
        
        const playerSpawn = this.world.getSpawnPoints('player')[0];
        if (playerSpawn) {
            this.player = new Tank(playerSpawn.position.x, playerSpawn.position.y, true);
            this.scene.addEntity(this.player);
        }
        
        const enemySpawns = this.world.getSpawnPoints('enemy');
        for (const spawn of enemySpawns) {
            const enemy = new EnemyTank(spawn.position.x, spawn.position.y);
            
            const patrolPoints = [];
            for (let i = 0; i < 3; i++) {
                patrolPoints.push(new Vector2(
                    100 + Math.random() * (this.world.width - 200),
                    100 + Math.random() * (this.world.height - 200)
                ));
            }
            enemy.setPatrolPoints(patrolPoints);
            
            this.scene.addEntity(enemy);
        }
        
        for (const obstacle of this.world.obstacles) {
            this.scene.addEntity(obstacle);
        }
        
        this.levelStartTime = Date.now();
        this.powerupSpawnTimer = 0;
    }
    
    completeLevel() {
        this.currentLevel++;
        this.score += 500 + (this.currentLevel * 100);
        
        if (this.player) {
            this.player.addExperience(100);
        }
        
        setTimeout(() => {
            this.loadLevel(this.currentLevel);
        }, 1000);
    }
    
    gameOver() {
        this.gameState = 'gameOver';
        this.showGameOverScreen();
    }
    
    restartGame() {
        this.hideGameOverScreen();
        this.startGame();
    }
    
    restartLevel() {
        this.loadLevel(this.currentLevel);
    }
    
    togglePause() {
        this.isPaused = !this.isPaused;
    }
    
    showMainMenu() {
        document.getElementById('mainMenu').style.display = 'block';
    }
    
    hideMainMenu() {
        document.getElementById('mainMenu').style.display = 'none';
    }
    
    showGameOverScreen() {
        document.getElementById('gameOverTitle').textContent = '游戏结束';
        document.getElementById('finalScore').textContent = this.score;
        document.getElementById('gameOverScreen').style.display = 'block';
    }
    
    hideGameOverScreen() {
        document.getElementById('gameOverScreen').style.display = 'none';
    }
}

let game;

function startGame() {
    if (!game) {
        game = new Game();
    }
    game.startGame();
}

function restartGame() {
    game.restartGame();
}

function showMainMenu() {
    game.gameState = 'menu';
    game.hideGameOverScreen();
    game.showMainMenu();
}

function showInstructions() {
    alert('游戏说明:\n\n使用WASD键控制坦克移动\n鼠标瞄准，空格键或左键射击\nR键重新开始关卡\nP键暂停游戏\n\n消灭所有敌人即可过关！');
}

function showSettings() {
    const volume = prompt('设置音量 (0-100):', Math.round(game.soundManager.volume * 100));
    if (volume !== null) {
        const vol = Math.max(0, Math.min(100, parseInt(volume) || 50)) / 100;
        game.soundManager.setVolume(vol);
    }
}

window.addEventListener('load', () => {
    game = new Game();
});