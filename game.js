// 游戏主类
class Game {
    constructor() {
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.width = this.canvas.width;
        this.height = this.canvas.height;
        
        // 游戏状态
        this.gameState = 'playing'; // playing, paused, gameOver, victory
        this.selectedPlant = null;
        this.sun = 150;
        this.lives = 3;
        this.wave = 1;
        this.waveProgress = 0;
        this.lastWaveTime = 0;
        this.waveDelay = 30000; // 30秒一波
        
        // 游戏对象数组
        this.plants = [];
        this.zombies = [];
        this.projectiles = [];
        this.suns = [];
        this.particles = [];
        
        // 网格系统 (5行9列)
        this.gridRows = 5;
        this.gridCols = 9;
        this.gridStartX = 220;
        this.gridStartY = 80;
        this.cellWidth = 82;
        this.cellHeight = 98;
        this.grid = this.createGrid();
        
        // 时间管理
        this.lastTime = 0;
        this.gameTime = 0;
        
        // 事件绑定
        this.bindEvents();
        
        // 开始游戏循环
        this.gameLoop();
        
        // 初始阳光生成
        this.generateInitialSun();
        
        // 初始化管理器
        this.initManagers();
    }
    
    createGrid() {
        const grid = [];
        for (let row = 0; row < this.gridRows; row++) {
            grid[row] = [];
            for (let col = 0; col < this.gridCols; col++) {
                grid[row][col] = null;
            }
        }
        return grid;
    }
    
    bindEvents() {
        // 植物卡片选择
        document.querySelectorAll('.plant-card').forEach(card => {
            card.addEventListener('click', (e) => {
                const plantType = card.dataset.plant;
                this.selectPlant(plantType, card);
            });
        });
        
        // 画布点击事件
        this.canvas.addEventListener('click', (e) => {
            this.handleCanvasClick(e);
        });
        
        // 鼠标移动事件
        this.canvas.addEventListener('mousemove', (e) => {
            this.handleMouseMove(e);
        });
    }
    
    selectPlant(plantType, cardElement) {
        const cost = PlantFactory.getCost(plantType);
        if (this.sun >= cost) {
            // 清除之前的选择
            document.querySelectorAll('.plant-card').forEach(c => c.classList.remove('selected'));
            cardElement.classList.add('selected');
            this.selectedPlant = plantType;
            this.canvas.style.cursor = 'crosshair';
        }
    }
    
    handleCanvasClick(e) {
        const rect = this.canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        
        // 检查是否点击了阳光
        for (let i = this.suns.length - 1; i >= 0; i--) {
            const sun = this.suns[i];
            if (sun.contains(x, y)) {
                this.collectSun(sun, i);
                return;
            }
        }
        
        // 种植植物
        if (this.selectedPlant) {
            this.plantAt(x, y);
        }
    }
    
    handleMouseMove(e) {
        const rect = this.canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        
        // 保存鼠标位置用于预览
        this.mouseX = x;
        this.mouseY = y;
        
        // 检查鼠标是否悬停在阳光上
        let overSun = false;
        for (const sun of this.suns) {
            if (sun.contains(x, y)) {
                overSun = true;
                break;
            }
        }
        
        if (overSun) {
            this.canvas.style.cursor = 'pointer';
        } else if (this.selectedPlant) {
            this.canvas.style.cursor = 'crosshair';
        } else {
            this.canvas.style.cursor = 'default';
        }
    }
    
    plantAt(x, y) {
        console.log('plantAt called:', x, y, 'selectedPlant:', this.selectedPlant);
        const gridPos = this.getGridPosition(x, y);
        console.log('gridPos:', gridPos);
        
        if (gridPos && this.canPlantAt(gridPos.row, gridPos.col)) {
            const cost = PlantFactory.getCost(this.selectedPlant);
            console.log('Plant cost:', cost, 'Current sun:', this.sun);
            
            if (this.sun >= cost) {
                const plant = PlantFactory.createPlant(this.selectedPlant, gridPos.row, gridPos.col, this);
                console.log('Plant created:', plant);
                
                this.plants.push(plant);
                this.grid[gridPos.row][gridPos.col] = plant;
                this.sun -= cost;
                this.updateUI();
                
                // 取消选择
                this.selectedPlant = null;
                document.querySelectorAll('.plant-card').forEach(c => c.classList.remove('selected'));
                this.canvas.style.cursor = 'default';
                console.log('Plant placed successfully');
                return true;
            } else {
                console.log('Not enough sun');
            }
        } else {
            console.log('Cannot plant at this position');
        }
        return false;
    }
    
    getGridPosition(x, y) {
        const col = Math.floor((x - this.gridStartX) / this.cellWidth);
        const row = Math.floor((y - this.gridStartY) / this.cellHeight);
        
        if (row >= 0 && row < this.gridRows && col >= 0 && col < this.gridCols) {
            return { row, col };
        }
        return null;
    }
    
    canPlantAt(row, col) {
        return this.grid[row][col] === null;
    }
    
    collectSun(sun, index) {
        this.sun += sun.value;
        this.suns.splice(index, 1);
        this.updateUI();
        
        // 添加收集效果
        this.addParticle(new CollectEffect(sun.x, sun.y, '+' + sun.value));
    }
    
    generateInitialSun() {
        // 生成初始阳光
        for (let i = 0; i < 3; i++) {
            setTimeout(() => {
                this.generateSun();
            }, i * 3000);
        }
    }
    
    generateSun() {
        const x = Math.random() * (this.width - 100) + 50;
        const startY = -50;
        const endY = Math.random() * 200 + 100;
        this.suns.push(new Sun(x, startY, endY));
    }
    
    spawnZombie() {
        const row = Math.floor(Math.random() * this.gridRows);
        const zombie = ZombieFactory.createZombie('basic', row, this);
        this.zombies.push(zombie);
    }
    
    addProjectile(projectile) {
        this.projectiles.push(projectile);
    }
    
    addParticle(particle) {
        this.particles.push(particle);
    }
    
    update(deltaTime) {
        if (this.gameState !== 'playing') return;
        
        this.gameTime += deltaTime;
        
        // 更新所有游戏对象
        this.updatePlants(deltaTime);
        this.updateZombies(deltaTime);
        this.updateProjectiles(deltaTime);
        this.updateSuns(deltaTime);
        this.updateParticles(deltaTime);
        
        // 处理碰撞
        this.handleCollisions();
        
        // 生成僵尸波次
        this.updateWaves(deltaTime);
        
        // 定期生成阳光
        if (this.gameTime % 15000 < deltaTime) {
            this.generateSun();
        }
        
        // 检查游戏结束条件
        this.checkGameEnd();
        
        // 更新UI
        this.updateUI();
    }
    
    updatePlants(deltaTime) {
        for (let i = this.plants.length - 1; i >= 0; i--) {
            const plant = this.plants[i];
            plant.update(deltaTime);
            
            if (plant.health <= 0) {
                this.grid[plant.row][plant.col] = null;
                this.plants.splice(i, 1);
            }
        }
    }
    
    updateZombies(deltaTime) {
        for (let i = this.zombies.length - 1; i >= 0; i--) {
            const zombie = this.zombies[i];
            zombie.update(deltaTime);
            
            if (zombie.health <= 0) {
                this.zombies.splice(i, 1);
                this.addParticle(new DeathEffect(zombie.x, zombie.y));
            } else if (zombie.x < -50) {
                // 僵尸到达了房子
                this.zombies.splice(i, 1);
                this.lives--;
                if (this.lives <= 0) {
                    this.gameOver();
                }
            }
        }
    }
    
    updateProjectiles(deltaTime) {
        for (let i = this.projectiles.length - 1; i >= 0; i--) {
            const projectile = this.projectiles[i];
            projectile.update(deltaTime);
            
            if (projectile.x > this.width + 50 || projectile.destroyed) {
                this.projectiles.splice(i, 1);
            }
        }
    }
    
    updateSuns(deltaTime) {
        for (let i = this.suns.length - 1; i >= 0; i--) {
            const sun = this.suns[i];
            sun.update(deltaTime);
            
            if (sun.expired) {
                this.suns.splice(i, 1);
            }
        }
    }
    
    updateParticles(deltaTime) {
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const particle = this.particles[i];
            particle.update(deltaTime);
            
            if (particle.isDead()) {
                this.particles.splice(i, 1);
            }
        }
    }
    
    handleCollisions() {
        // 子弹与僵尸碰撞
        for (const projectile of this.projectiles) {
            if (projectile.destroyed) continue;
            
            for (const zombie of this.zombies) {
                if (zombie.row === projectile.row && 
                    projectile.x >= zombie.x - 20 && 
                    projectile.x <= zombie.x + 40) {
                    
                    zombie.takeDamage(projectile.damage);
                    
                    // 应用特殊效果
                    if (projectile.effect) {
                        projectile.effect(zombie);
                    }
                    
                    projectile.destroyed = true;
                    this.addParticle(new HitEffect(projectile.x, projectile.y));
                    break;
                }
            }
        }
        
        // 僵尸与植物碰撞
        for (const zombie of this.zombies) {
            const gridPos = this.getGridPosition(zombie.x, zombie.getY());
            if (gridPos && this.grid[gridPos.row][gridPos.col]) {
                const plant = this.grid[gridPos.row][gridPos.col];
                if (zombie.x <= plant.getX() + 40) {
                    zombie.attack(plant);
                }
            }
        }
    }
    
    updateWaves(deltaTime) {
        this.waveProgress += deltaTime;
        
        if (this.waveProgress >= this.waveDelay) {
            this.waveProgress = 0;
            this.wave++;
            
            // 生成一波僵尸
            const zombieCount = Math.min(5 + this.wave, 15);
            for (let i = 0; i < zombieCount; i++) {
                setTimeout(() => {
                    if (this.gameState === 'playing') {
                        this.spawnZombie();
                    }
                }, i * 2000);
            }
        }
        
        // 在波次间隔中随机生成僵尸
        if (Math.random() < 0.0002 * this.wave && this.zombies.length < 10) {
            this.spawnZombie();
        }
    }
    
    checkGameEnd() {
        if (this.lives <= 0) {
            this.gameOver();
        }
    }
    
    gameOver() {
        this.gameState = 'gameOver';
        document.getElementById('gameOverScreen').style.display = 'flex';
        document.getElementById('gameOverTitle').textContent = '游戏结束';
        document.getElementById('gameOverMessage').textContent = '僵尸吃掉了你的大脑！';
    }
    
    victory() {
        this.gameState = 'victory';
        document.getElementById('gameOverScreen').style.display = 'flex';
        document.getElementById('gameOverTitle').textContent = '胜利！';
        document.getElementById('gameOverMessage').textContent = '你成功保卫了家园！';
    }
    
    updateUI() {
        document.getElementById('sunCount').textContent = this.sun;
        document.getElementById('waveCount').textContent = this.wave;
        document.getElementById('lives').textContent = this.lives;
        
        // 更新植物卡片状态
        document.querySelectorAll('.plant-card').forEach(card => {
            const plantType = card.dataset.plant;
            const cost = PlantFactory.getCost(plantType);
            
            if (this.sun < cost) {
                card.classList.add('disabled');
            } else {
                card.classList.remove('disabled');
            }
        });
    }
    
    render() {
        // 清空画布
        this.ctx.clearRect(0, 0, this.width, this.height);
        
        // 绘制网格
        this.drawGrid();
        
        // 绘制游戏对象
        this.plants.forEach(plant => plant.render(this.ctx));
        this.zombies.forEach(zombie => zombie.render(this.ctx));
        this.projectiles.forEach(projectile => projectile.render(this.ctx));
        this.suns.forEach(sun => sun.render(this.ctx));
        this.particles.forEach(particle => particle.render(this.ctx));
        
        // 绘制选择的植物预览
        if (this.selectedPlant) {
            this.drawPlantPreview();
        }
    }
    
    drawGrid() {
        this.ctx.strokeStyle = 'rgba(139, 69, 19, 0.3)';
        this.ctx.lineWidth = 2;
        
        // 绘制垂直线
        for (let col = 0; col <= this.gridCols; col++) {
            const x = this.gridStartX + col * this.cellWidth;
            this.ctx.beginPath();
            this.ctx.moveTo(x, this.gridStartY);
            this.ctx.lineTo(x, this.gridStartY + this.gridRows * this.cellHeight);
            this.ctx.stroke();
        }
        
        // 绘制水平线
        for (let row = 0; row <= this.gridRows; row++) {
            const y = this.gridStartY + row * this.cellHeight;
            this.ctx.beginPath();
            this.ctx.moveTo(this.gridStartX, y);
            this.ctx.lineTo(this.gridStartX + this.gridCols * this.cellWidth, y);
            this.ctx.stroke();
        }
    }
    
    drawPlantPreview() {
        // 获取鼠标位置
        const mouseX = this.mouseX || 0;
        const mouseY = this.mouseY || 0;
        
        const gridPos = this.getGridPosition(mouseX, mouseY);
        if (gridPos && this.canPlantAt(gridPos.row, gridPos.col)) {
            const x = this.gridStartX + gridPos.col * this.cellWidth + this.cellWidth / 2;
            const y = this.gridStartY + gridPos.row * this.cellHeight + this.cellHeight / 2;
            
            // 绘制预览格子
            this.ctx.save();
            this.ctx.globalAlpha = 0.5;
            this.ctx.fillStyle = '#00FF00';
            this.ctx.fillRect(
                this.gridStartX + gridPos.col * this.cellWidth,
                this.gridStartY + gridPos.row * this.cellHeight,
                this.cellWidth,
                this.cellHeight
            );
            
            // 绘制植物预览图标
            this.ctx.globalAlpha = 0.7;
            this.ctx.fillStyle = '#FFFFFF';
            this.ctx.font = '24px Arial';
            this.ctx.textAlign = 'center';
            
            let icon = '';
            switch(this.selectedPlant) {
                case 'sunflower': icon = '🌻'; break;
                case 'peashooter': icon = '🌱'; break;
                case 'wallnut': icon = '🥜'; break;
                case 'repeater': icon = '🌿'; break;
                case 'snowpea': icon = '❄️'; break;
                case 'cherrybomb': icon = '🍒'; break;
                case 'potatomine': icon = '🥔'; break;
                case 'threepeater': icon = '🌾'; break;
                case 'tallnut': icon = '🌰'; break;
                case 'pumpkin': icon = '🎃'; break;
            }
            
            this.ctx.fillText(icon, x, y + 8);
            this.ctx.restore();
        }
    }
    
    gameLoop() {
        const currentTime = performance.now();
        const deltaTime = currentTime - this.lastTime;
        this.lastTime = currentTime;
        
        this.update(deltaTime);
        this.render();
        
        requestAnimationFrame(() => this.gameLoop());
    }
}

// 游戏工具函数
function restartGame() {
    document.getElementById('gameOverScreen').style.display = 'none';
    window.game = new Game();
}

// 植物基类
class Plant {
    constructor(row, col, game) {
        this.row = row;
        this.col = col;
        this.game = game;
        this.health = 100;
        this.maxHealth = 100;
        this.lastActionTime = 0;
        this.actionCooldown = 1000; // 默认1秒冷却
        this.size = 30;
    }
    
    getX() {
        return this.game.gridStartX + this.col * this.game.cellWidth + this.game.cellWidth / 2;
    }
    
    getY() {
        return this.game.gridStartY + this.row * this.game.cellHeight + this.game.cellHeight / 2;
    }
    
    takeDamage(damage) {
        this.health -= damage;
        if (this.health < 0) this.health = 0;
    }
    
    canAct(currentTime) {
        return currentTime - this.lastActionTime >= this.actionCooldown;
    }
    
    update(deltaTime) {
        // 子类实现具体逻辑
    }
    
    render(ctx) {
        const x = this.getX();
        const y = this.getY();
        
        // 绘制健康条
        this.drawHealthBar(ctx, x, y);
    }
    
    drawHealthBar(ctx, x, y) {
        if (this.health < this.maxHealth) {
            const barWidth = 40;
            const barHeight = 6;
            const barX = x - barWidth / 2;
            const barY = y - this.size - 15;
            
            // 背景
            ctx.fillStyle = '#ff0000';
            ctx.fillRect(barX, barY, barWidth, barHeight);
            
            // 健康值
            ctx.fillStyle = '#00ff00';
            const healthWidth = (this.health / this.maxHealth) * barWidth;
            ctx.fillRect(barX, barY, healthWidth, barHeight);
            
            // 边框
            ctx.strokeStyle = '#000000';
            ctx.lineWidth = 1;
            ctx.strokeRect(barX, barY, barWidth, barHeight);
        }
    }
}

// 向日葵类
class Sunflower extends Plant {
    constructor(row, col, game) {
        super(row, col, game);
        this.actionCooldown = 8000; // 8秒产生一个阳光
        this.health = 50;
        this.maxHealth = 50;
    }
    
    update(deltaTime) {
        const currentTime = this.game.gameTime;
        if (this.canAct(currentTime)) {
            this.produceSun();
            this.lastActionTime = currentTime;
        }
    }
    
    produceSun() {
        const x = this.getX() + (Math.random() - 0.5) * 40;
        const y = this.getY() - 20;
        this.game.suns.push(new Sun(x, y, y + 60, 25));
    }
    
    render(ctx) {
        super.render(ctx);
        
        const x = this.getX();
        const y = this.getY();
        
        // 绘制向日葵
        ctx.save();
        ctx.translate(x, y);
        
        // 花瓣
        ctx.fillStyle = '#FFD700';
        for (let i = 0; i < 8; i++) {
            ctx.save();
            ctx.rotate((i * Math.PI) / 4);
            ctx.beginPath();
            ctx.ellipse(0, -15, 8, 20, 0, 0, 2 * Math.PI);
            ctx.fill();
            ctx.restore();
        }
        
        // 花心
        ctx.fillStyle = '#8B4513';
        ctx.beginPath();
        ctx.arc(0, 0, 12, 0, 2 * Math.PI);
        ctx.fill();
        
        // 茎
        ctx.fillStyle = '#228B22';
        ctx.fillRect(-3, 0, 6, 20);
        
        ctx.restore();
    }
}

// 豌豆射手类
class Peashooter extends Plant {
    constructor(row, col, game) {
        super(row, col, game);
        this.actionCooldown = 1500; // 1.5秒射击一次
        this.health = 75;
        this.maxHealth = 75;
        this.range = 800; // 射程
    }
    
    update(deltaTime) {
        const currentTime = this.game.gameTime;
        if (this.canAct(currentTime) && this.hasTargetInRange()) {
            this.shoot();
            this.lastActionTime = currentTime;
        }
    }
    
    hasTargetInRange() {
        return this.game.zombies.some(zombie => 
            zombie.row === this.row && zombie.x > this.getX()
        );
    }
    
    shoot() {
        const projectile = new Pea(this.getX() + 25, this.getY(), this.row);
        this.game.addProjectile(projectile);
    }
    
    render(ctx) {
        super.render(ctx);
        
        const x = this.getX();
        const y = this.getY();
        
        ctx.save();
        ctx.translate(x, y);
        
        // 主体
        ctx.fillStyle = '#228B22';
        ctx.beginPath();
        ctx.arc(0, 0, 20, 0, 2 * Math.PI);
        ctx.fill();
        
        // 射击口
        ctx.fillStyle = '#006400';
        ctx.fillRect(15, -8, 20, 16);
        
        // 叶子
        ctx.fillStyle = '#32CD32';
        ctx.beginPath();
        ctx.ellipse(-10, -15, 8, 12, -0.3, 0, 2 * Math.PI);
        ctx.fill();
        
        ctx.restore();
    }
}

// 坚果墙类
class Wallnut extends Plant {
    constructor(row, col, game) {
        super(row, col, game);
        this.health = 200;
        this.maxHealth = 200;
    }
    
    update(deltaTime) {
        // 坚果墙不需要特殊更新逻辑
    }
    
    render(ctx) {
        super.render(ctx);
        
        const x = this.getX();
        const y = this.getY();
        
        ctx.save();
        ctx.translate(x, y);
        
        // 根据健康值改变颜色
        let color = '#8B4513';
        if (this.health < this.maxHealth * 0.3) {
            color = '#654321';
        } else if (this.health < this.maxHealth * 0.6) {
            color = '#A0522D';
        }
        
        // 主体
        ctx.fillStyle = color;
        ctx.fillRect(-20, -25, 40, 50);
        
        // 纹理线条
        ctx.strokeStyle = '#654321';
        ctx.lineWidth = 2;
        for (let i = -15; i <= 15; i += 5) {
            ctx.beginPath();
            ctx.moveTo(i, -25);
            ctx.lineTo(i, 25);
            ctx.stroke();
        }
        
        // 眼睛
        ctx.fillStyle = '#000000';
        ctx.beginPath();
        ctx.arc(-8, -5, 3, 0, 2 * Math.PI);
        ctx.arc(8, -5, 3, 0, 2 * Math.PI);
        ctx.fill();
        
        ctx.restore();
    }
}

// 双发射手类
class Repeater extends Plant {
    constructor(row, col, game) {
        super(row, col, game);
        this.actionCooldown = 1500;
        this.health = 75;
        this.maxHealth = 75;
        this.shotsFired = 0;
        this.burstDelay = 200; // 两发子弹间隔
    }
    
    update(deltaTime) {
        const currentTime = this.game.gameTime;
        if (this.canAct(currentTime) && this.hasTargetInRange()) {
            this.shoot();
            this.lastActionTime = currentTime;
        }
    }
    
    hasTargetInRange() {
        return this.game.zombies.some(zombie => 
            zombie.row === this.row && zombie.x > this.getX()
        );
    }
    
    shoot() {
        // 第一发子弹
        const projectile1 = new Pea(this.getX() + 25, this.getY(), this.row);
        this.game.addProjectile(projectile1);
        
        // 第二发子弹（延迟）
        setTimeout(() => {
            if (this.health > 0) {
                const projectile2 = new Pea(this.getX() + 25, this.getY(), this.row);
                this.game.addProjectile(projectile2);
            }
        }, this.burstDelay);
    }
    
    render(ctx) {
        super.render(ctx);
        
        const x = this.getX();
        const y = this.getY();
        
        ctx.save();
        ctx.translate(x, y);
        
        // 主体
        ctx.fillStyle = '#228B22';
        ctx.beginPath();
        ctx.arc(0, 0, 22, 0, 2 * Math.PI);
        ctx.fill();
        
        // 双射击口
        ctx.fillStyle = '#006400';
        ctx.fillRect(18, -12, 20, 10);
        ctx.fillRect(18, 2, 20, 10);
        
        // 叶子
        ctx.fillStyle = '#32CD32';
        ctx.beginPath();
        ctx.ellipse(-12, -18, 10, 15, -0.3, 0, 2 * Math.PI);
        ctx.fill();
        
        ctx.restore();
    }
}

// 寒冰射手类
class SnowPea extends Plant {
    constructor(row, col, game) {
        super(row, col, game);
        this.actionCooldown = 1800;
        this.health = 75;
        this.maxHealth = 75;
    }
    
    update(deltaTime) {
        const currentTime = this.game.gameTime;
        if (this.canAct(currentTime) && this.hasTargetInRange()) {
            this.shoot();
            this.lastActionTime = currentTime;
        }
    }
    
    hasTargetInRange() {
        return this.game.zombies.some(zombie => 
            zombie.row === this.row && zombie.x > this.getX()
        );
    }
    
    shoot() {
        const projectile = new IcePea(this.getX() + 25, this.getY(), this.row);
        this.game.addProjectile(projectile);
    }
    
    render(ctx) {
        super.render(ctx);
        
        const x = this.getX();
        const y = this.getY();
        
        ctx.save();
        ctx.translate(x, y);
        
        // 主体
        ctx.fillStyle = '#87CEEB';
        ctx.beginPath();
        ctx.arc(0, 0, 20, 0, 2 * Math.PI);
        ctx.fill();
        
        // 射击口
        ctx.fillStyle = '#4682B4';
        ctx.fillRect(15, -8, 20, 16);
        
        // 冰晶效果
        ctx.strokeStyle = '#E0FFFF';
        ctx.lineWidth = 2;
        for (let i = 0; i < 6; i++) {
            ctx.save();
            ctx.rotate((i * Math.PI) / 3);
            ctx.beginPath();
            ctx.moveTo(0, -15);
            ctx.lineTo(0, -25);
            ctx.stroke();
            ctx.restore();
        }
        
        ctx.restore();
    }
}

// 植物工厂类
class PlantFactory {
    static costs = {
        sunflower: 50,
        peashooter: 100,
        wallnut: 50,
        repeater: 200,
        snowpea: 175
    };
    
    static createPlant(type, row, col, game) {
        switch (type) {
            case 'sunflower':
                return new Sunflower(row, col, game);
            case 'peashooter':
                return new Peashooter(row, col, game);
            case 'wallnut':
                return new Wallnut(row, col, game);
            case 'repeater':
                return new Repeater(row, col, game);
            case 'snowpea':
                return new SnowPea(row, col, game);
            default:
                return null;
        }
    }
    
    static getCost(type) {
        return this.costs[type] || 0;
    }
}

// 僵尸基类
class Zombie {
    constructor(row, game) {
        this.row = row;
        this.game = game;
        this.x = game.width + 50;
        this.health = 100;
        this.maxHealth = 100;
        this.speed = 20; // 像素/秒
        this.damage = 25;
        this.attackCooldown = 1000;
        this.lastAttackTime = 0;
        this.isSlowed = false;
        this.slowDuration = 0;
        this.slowEffect = 0.5;
        this.size = 30;
        this.isEating = false;
    }
    
    getY() {
        return this.game.gridStartY + this.row * this.game.cellHeight + this.game.cellHeight / 2;
    }
    
    takeDamage(damage) {
        this.health -= damage;
        if (this.health < 0) this.health = 0;
    }
    
    update(deltaTime) {
        // 更新减速效果
        if (this.isSlowed) {
            this.slowDuration -= deltaTime;
            if (this.slowDuration <= 0) {
                this.isSlowed = false;
            }
        }
        
        // 移动
        if (!this.isEating) {
            const currentSpeed = this.isSlowed ? this.speed * this.slowEffect : this.speed;
            this.x -= (currentSpeed * deltaTime) / 1000;
        }
    }
    
    attack(plant) {
        const currentTime = this.game.gameTime;
        if (currentTime - this.lastAttackTime >= this.attackCooldown) {
            plant.takeDamage(this.damage);
            this.lastAttackTime = currentTime;
            this.isEating = true;
            
            // 停止攻击状态
            setTimeout(() => {
                this.isEating = false;
            }, 500);
        }
    }
    
    applySlowEffect(duration = 3000) {
        this.isSlowed = true;
        this.slowDuration = Math.max(this.slowDuration, duration);
    }
    
    render(ctx) {
        const x = this.x;
        const y = this.getY();
        
        // 绘制健康条
        this.drawHealthBar(ctx, x, y);
        
        // 绘制减速效果
        if (this.isSlowed) {
            ctx.save();
            ctx.globalAlpha = 0.6;
            ctx.fillStyle = '#87CEEB';
            ctx.beginPath();
            ctx.arc(x, y, this.size + 5, 0, 2 * Math.PI);
            ctx.fill();
            ctx.restore();
        }
    }
    
    drawHealthBar(ctx, x, y) {
        if (this.health < this.maxHealth) {
            const barWidth = 40;
            const barHeight = 6;
            const barX = x - barWidth / 2;
            const barY = y - this.size - 15;
            
            // 背景
            ctx.fillStyle = '#ff0000';
            ctx.fillRect(barX, barY, barWidth, barHeight);
            
            // 健康值
            ctx.fillStyle = '#00ff00';
            const healthWidth = (this.health / this.maxHealth) * barWidth;
            ctx.fillRect(barX, barY, healthWidth, barHeight);
            
            // 边框
            ctx.strokeStyle = '#000000';
            ctx.lineWidth = 1;
            ctx.strokeRect(barX, barY, barWidth, barHeight);
        }
    }
}

// 普通僵尸类
class BasicZombie extends Zombie {
    constructor(row, game) {
        super(row, game);
        this.health = 100;
        this.maxHealth = 100;
        this.speed = 25;
        this.damage = 25;
    }
    
    render(ctx) {
        super.render(ctx);
        
        const x = this.x;
        const y = this.getY();
        
        ctx.save();
        ctx.translate(x, y);
        
        // 身体
        ctx.fillStyle = this.isEating ? '#90EE90' : '#8FBC8F';
        ctx.fillRect(-15, -10, 30, 40);
        
        // 头部
        ctx.fillStyle = '#90EE90';
        ctx.beginPath();
        ctx.arc(0, -20, 15, 0, 2 * Math.PI);
        ctx.fill();
        
        // 眼睛
        ctx.fillStyle = '#FF0000';
        ctx.beginPath();
        ctx.arc(-5, -25, 3, 0, 2 * Math.PI);
        ctx.arc(5, -25, 3, 0, 2 * Math.PI);
        ctx.fill();
        
        // 嘴巴
        ctx.fillStyle = '#000000';
        ctx.fillRect(-8, -15, 16, 3);
        
        // 手臂
        ctx.fillStyle = '#8FBC8F';
        ctx.fillRect(-20, -5, 10, 20);
        ctx.fillRect(10, -5, 10, 20);
        
        // 腿部
        ctx.fillRect(-10, 25, 8, 15);
        ctx.fillRect(2, 25, 8, 15);
        
        ctx.restore();
    }
}

// 铁桶僵尸类
class BucketZombie extends Zombie {
    constructor(row, game) {
        super(row, game);
        this.health = 300;
        this.maxHealth = 300;
        this.speed = 20;
        this.damage = 30;
        this.hasBucket = true;
    }
    
    takeDamage(damage) {
        super.takeDamage(damage);
        // 铁桶被打掉
        if (this.health < this.maxHealth * 0.6 && this.hasBucket) {
            this.hasBucket = false;
            this.speed = 25; // 失去铁桶后移动更快
        }
    }
    
    render(ctx) {
        super.render(ctx);
        
        const x = this.x;
        const y = this.getY();
        
        ctx.save();
        ctx.translate(x, y);
        
        // 身体
        ctx.fillStyle = this.isEating ? '#90EE90' : '#8FBC8F';
        ctx.fillRect(-15, -10, 30, 40);
        
        // 头部
        ctx.fillStyle = '#90EE90';
        ctx.beginPath();
        ctx.arc(0, -20, 15, 0, 2 * Math.PI);
        ctx.fill();
        
        // 铁桶
        if (this.hasBucket) {
            ctx.fillStyle = '#C0C0C0';
            ctx.fillRect(-12, -35, 24, 20);
            ctx.strokeStyle = '#808080';
            ctx.lineWidth = 2;
            ctx.strokeRect(-12, -35, 24, 20);
        }
        
        // 眼睛
        ctx.fillStyle = '#FF0000';
        ctx.beginPath();
        ctx.arc(-5, -25, 3, 0, 2 * Math.PI);
        ctx.arc(5, -25, 3, 0, 2 * Math.PI);
        ctx.fill();
        
        // 嘴巴
        ctx.fillStyle = '#000000';
        ctx.fillRect(-8, -15, 16, 3);
        
        // 手臂
        ctx.fillStyle = '#8FBC8F';
        ctx.fillRect(-20, -5, 10, 20);
        ctx.fillRect(10, -5, 10, 20);
        
        // 腿部
        ctx.fillRect(-10, 25, 8, 15);
        ctx.fillRect(2, 25, 8, 15);
        
        ctx.restore();
    }
}

// 路障僵尸类
class ConeZombie extends Zombie {
    constructor(row, game) {
        super(row, game);
        this.health = 200;
        this.maxHealth = 200;
        this.speed = 22;
        this.damage = 25;
        this.hasCone = true;
    }
    
    takeDamage(damage) {
        super.takeDamage(damage);
        // 路障被打掉
        if (this.health < this.maxHealth * 0.5 && this.hasCone) {
            this.hasCone = false;
            this.speed = 25;
        }
    }
    
    render(ctx) {
        super.render(ctx);
        
        const x = this.x;
        const y = this.getY();
        
        ctx.save();
        ctx.translate(x, y);
        
        // 身体
        ctx.fillStyle = this.isEating ? '#90EE90' : '#8FBC8F';
        ctx.fillRect(-15, -10, 30, 40);
        
        // 头部
        ctx.fillStyle = '#90EE90';
        ctx.beginPath();
        ctx.arc(0, -20, 15, 0, 2 * Math.PI);
        ctx.fill();
        
        // 路障
        if (this.hasCone) {
            ctx.fillStyle = '#FF8C00';
            ctx.beginPath();
            ctx.moveTo(0, -35);
            ctx.lineTo(-10, -15);
            ctx.lineTo(10, -15);
            ctx.closePath();
            ctx.fill();
            
            // 路障条纹
            ctx.strokeStyle = '#FF6347';
            ctx.lineWidth = 2;
            for (let i = 0; i < 3; i++) {
                ctx.beginPath();
                ctx.moveTo(-8 + i * 4, -30 + i * 5);
                ctx.lineTo(8 - i * 4, -30 + i * 5);
                ctx.stroke();
            }
        }
        
        // 眼睛
        ctx.fillStyle = '#FF0000';
        ctx.beginPath();
        ctx.arc(-5, -25, 3, 0, 2 * Math.PI);
        ctx.arc(5, -25, 3, 0, 2 * Math.PI);
        ctx.fill();
        
        // 嘴巴
        ctx.fillStyle = '#000000';
        ctx.fillRect(-8, -15, 16, 3);
        
        // 手臂
        ctx.fillStyle = '#8FBC8F';
        ctx.fillRect(-20, -5, 10, 20);
        ctx.fillRect(10, -5, 10, 20);
        
        // 腿部
        ctx.fillRect(-10, 25, 8, 15);
        ctx.fillRect(2, 25, 8, 15);
        
        ctx.restore();
    }
}

// 僵尸工厂类
class ZombieFactory {
    static createZombie(type, row, game) {
        const zombieTypes = ['basic', 'cone', 'bucket'];
        
        // 根据波数增加高级僵尸的概率
        if (type === 'basic') {
            const rand = Math.random();
            const wave = game.wave;
            
            if (wave >= 3 && rand < 0.1) {
                type = 'bucket';
            } else if (wave >= 2 && rand < 0.3) {
                type = 'cone';
            }
        }
        
        switch (type) {
            case 'basic':
                return new BasicZombie(row, game);
            case 'cone':
                return new ConeZombie(row, game);
            case 'bucket':
                return new BucketZombie(row, game);
            default:
                return new BasicZombie(row, game);
        }
    }
}

// 子弹基类
class Projectile {
    constructor(x, y, row) {
        this.x = x;
        this.y = y;
        this.row = row;
        this.speed = 200; // 像素/秒
        this.damage = 25;
        this.destroyed = false;
        this.size = 8;
        this.effect = null;
    }
    
    update(deltaTime) {
        this.x += (this.speed * deltaTime) / 1000;
    }
    
    render(ctx) {
        // 子类实现具体绘制
    }
}

// 豌豆子弹类
class Pea extends Projectile {
    constructor(x, y, row) {
        super(x, y, row);
        this.damage = 25;
        this.speed = 250;
    }
    
    render(ctx) {
        ctx.save();
        ctx.translate(this.x, this.y);
        
        // 豌豆子弹
        ctx.fillStyle = '#32CD32';
        ctx.beginPath();
        ctx.arc(0, 0, this.size, 0, 2 * Math.PI);
        ctx.fill();
        
        // 高光
        ctx.fillStyle = '#90EE90';
        ctx.beginPath();
        ctx.arc(-3, -3, 3, 0, 2 * Math.PI);
        ctx.fill();
        
        ctx.restore();
    }
}

// 冰豌豆子弹类
class IcePea extends Projectile {
    constructor(x, y, row) {
        super(x, y, row);
        this.damage = 25;
        this.speed = 250;
        this.effect = (zombie) => {
            zombie.applySlowEffect(3000); // 3秒减速效果
        };
    }
    
    render(ctx) {
        ctx.save();
        ctx.translate(this.x, this.y);
        
        // 冰豌豆子弹
        ctx.fillStyle = '#87CEEB';
        ctx.beginPath();
        ctx.arc(0, 0, this.size, 0, 2 * Math.PI);
        ctx.fill();
        
        // 冰晶效果
        ctx.strokeStyle = '#E0FFFF';
        ctx.lineWidth = 1;
        for (let i = 0; i < 4; i++) {
            ctx.save();
            ctx.rotate((i * Math.PI) / 2);
            ctx.beginPath();
            ctx.moveTo(0, -this.size);
            ctx.lineTo(0, -this.size - 3);
            ctx.stroke();
            ctx.restore();
        }
        
        ctx.restore();
    }
}

// 阳光类
class Sun {
    constructor(x, startY, endY, value = 25) {
        this.x = x;
        this.y = startY;
        this.startY = startY;
        this.endY = endY;
        this.value = value;
        this.size = 20;
        this.fallSpeed = 50; // 像素/秒
        this.lifetime = 15000; // 15秒生命周期
        this.age = 0;
        this.isFalling = true;
        this.expired = false;
        this.pulseTimer = 0;
    }
    
    update(deltaTime) {
        this.age += deltaTime;
        this.pulseTimer += deltaTime;
        
        // 下落
        if (this.isFalling && this.y < this.endY) {
            this.y += (this.fallSpeed * deltaTime) / 1000;
            if (this.y >= this.endY) {
                this.y = this.endY;
                this.isFalling = false;
            }
        }
        
        // 检查是否过期
        if (this.age >= this.lifetime) {
            this.expired = true;
        }
    }
    
    contains(x, y) {
        const dx = x - this.x;
        const dy = y - this.y;
        return dx * dx + dy * dy <= this.size * this.size;
    }
    
    render(ctx) {
        ctx.save();
        ctx.translate(this.x, this.y);
        
        // 脉动效果
        const pulse = 1 + 0.1 * Math.sin(this.pulseTimer / 200);
        ctx.scale(pulse, pulse);
        
        // 阳光光芒
        ctx.fillStyle = '#FFD700';
        for (let i = 0; i < 8; i++) {
            ctx.save();
            ctx.rotate((i * Math.PI) / 4);
            ctx.beginPath();
            ctx.ellipse(0, 0, this.size + 5, this.size - 5, 0, 0, 2 * Math.PI);
            ctx.fill();
            ctx.restore();
        }
        
        // 阳光主体
        ctx.fillStyle = '#FFE55C';
        ctx.beginPath();
        ctx.arc(0, 0, this.size, 0, 2 * Math.PI);
        ctx.fill();
        
        // 中心高光
        ctx.fillStyle = '#FFFF8F';
        ctx.beginPath();
        ctx.arc(-5, -5, 8, 0, 2 * Math.PI);
        ctx.fill();
        
        // 阳光数值
        ctx.fillStyle = '#8B4513';
        ctx.font = '12px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(this.value.toString(), 0, 4);
        
        ctx.restore();
    }
}

// 粒子效果基类
class Particle {
    constructor(x, y, lifetime = 1000) {
        this.x = x;
        this.y = y;
        this.lifetime = lifetime;
        this.age = 0;
        this.alpha = 1;
    }
    
    update(deltaTime) {
        this.age += deltaTime;
        this.alpha = 1 - (this.age / this.lifetime);
        if (this.alpha < 0) this.alpha = 0;
    }
    
    isDead() {
        return this.age >= this.lifetime;
    }
    
    render(ctx) {
        // 子类实现
    }
}

// 收集效果粒子
class CollectEffect extends Particle {
    constructor(x, y, text) {
        super(x, y, 1500);
        this.text = text;
        this.velocity = -30; // 向上移动
    }
    
    update(deltaTime) {
        super.update(deltaTime);
        this.y += (this.velocity * deltaTime) / 1000;
    }
    
    render(ctx) {
        ctx.save();
        ctx.globalAlpha = this.alpha;
        ctx.fillStyle = '#FFD700';
        ctx.font = 'bold 16px Arial';
        ctx.textAlign = 'center';
        ctx.strokeStyle = '#8B4513';
        ctx.lineWidth = 2;
        ctx.strokeText(this.text, this.x, this.y);
        ctx.fillText(this.text, this.x, this.y);
        ctx.restore();
    }
}

// 击中效果粒子
class HitEffect extends Particle {
    constructor(x, y) {
        super(x, y, 300);
        this.particles = [];
        
        // 创建多个小粒子
        for (let i = 0; i < 6; i++) {
            this.particles.push({
                x: 0,
                y: 0,
                vx: (Math.random() - 0.5) * 100,
                vy: (Math.random() - 0.5) * 100,
                size: Math.random() * 4 + 2
            });
        }
    }
    
    update(deltaTime) {
        super.update(deltaTime);
        
        for (const particle of this.particles) {
            particle.x += (particle.vx * deltaTime) / 1000;
            particle.y += (particle.vy * deltaTime) / 1000;
            particle.vy += 50 * deltaTime / 1000; // 重力
        }
    }
    
    render(ctx) {
        ctx.save();
        ctx.globalAlpha = this.alpha;
        ctx.translate(this.x, this.y);
        
        for (const particle of this.particles) {
            ctx.fillStyle = '#FF6347';
            ctx.beginPath();
            ctx.arc(particle.x, particle.y, particle.size, 0, 2 * Math.PI);
            ctx.fill();
        }
        
        ctx.restore();
    }
}

// 死亡效果粒子
class DeathEffect extends Particle {
    constructor(x, y) {
        super(x, y, 2000);
        this.particles = [];
        
        // 创建更多的粒子用于死亡效果
        for (let i = 0; i < 12; i++) {
            this.particles.push({
                x: 0,
                y: 0,
                vx: (Math.random() - 0.5) * 150,
                vy: (Math.random() - 0.5) * 150 - 50,
                size: Math.random() * 6 + 3,
                color: `hsl(${Math.random() * 60 + 10}, 70%, 50%)` // 红橙色调
            });
        }
    }
    
    update(deltaTime) {
        super.update(deltaTime);
        
        for (const particle of this.particles) {
            particle.x += (particle.vx * deltaTime) / 1000;
            particle.y += (particle.vy * deltaTime) / 1000;
            particle.vy += 80 * deltaTime / 1000; // 重力
            particle.vx *= 0.999; // 空气阻力
        }
    }
    
    render(ctx) {
        ctx.save();
        ctx.globalAlpha = this.alpha;
        ctx.translate(this.x, this.y);
        
        for (const particle of this.particles) {
            ctx.fillStyle = particle.color;
            ctx.beginPath();
            ctx.arc(particle.x, particle.y, particle.size, 0, 2 * Math.PI);
            ctx.fill();
        }
        
        ctx.restore();
    }
}

// 音效管理器
class AudioManager {
    constructor() {
        this.audioContext = null;
        this.sounds = {};
        this.enabled = true;
        this.volume = 0.3;
        
        // 尝试初始化音频上下文
        this.initAudio();
    }
    
    initAudio() {
        try {
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
            this.createSounds();
        } catch (e) {
            console.log('Audio not supported');
            this.enabled = false;
        }
    }
    
    createSounds() {
        // 创建基本音效
        this.sounds.shoot = this.createTone(300, 0.1, 'square');
        this.sounds.plant = this.createTone(400, 0.2, 'sine');
        this.sounds.collect = this.createTone(600, 0.15, 'triangle');
        this.sounds.hit = this.createTone(200, 0.1, 'sawtooth');
        this.sounds.zombieDeath = this.createTone(150, 0.3, 'square');
        this.sounds.plantDamage = this.createTone(250, 0.2, 'sawtooth');
    }
    
    createTone(frequency, duration, waveType = 'sine') {
        if (!this.audioContext) return null;
        
        return () => {
            if (!this.enabled) return;
            
            const oscillator = this.audioContext.createOscillator();
            const gainNode = this.audioContext.createGain();
            
            oscillator.connect(gainNode);
            gainNode.connect(this.audioContext.destination);
            
            oscillator.frequency.setValueAtTime(frequency, this.audioContext.currentTime);
            oscillator.type = waveType;
            
            gainNode.gain.setValueAtTime(0, this.audioContext.currentTime);
            gainNode.gain.linearRampToValueAtTime(this.volume, this.audioContext.currentTime + 0.01);
            gainNode.gain.exponentialRampToValueAtTime(0.001, this.audioContext.currentTime + duration);
            
            oscillator.start(this.audioContext.currentTime);
            oscillator.stop(this.audioContext.currentTime + duration);
        };
    }
    
    play(soundName) {
        if (this.sounds[soundName]) {
            this.sounds[soundName]();
        }
    }
    
    setVolume(volume) {
        this.volume = Math.max(0, Math.min(1, volume));
    }
    
    toggle() {
        this.enabled = !this.enabled;
    }
}

// 背景管理器
class BackgroundManager {
    constructor(game) {
        this.game = game;
        this.clouds = [];
        this.grassPattern = this.createGrassPattern();
        this.initClouds();
    }
    
    initClouds() {
        for (let i = 0; i < 3; i++) {
            this.clouds.push({
                x: Math.random() * this.game.width,
                y: Math.random() * 100 + 20,
                size: Math.random() * 30 + 20,
                speed: Math.random() * 10 + 5
            });
        }
    }
    
    createGrassPattern() {
        const canvas = document.createElement('canvas');
        canvas.width = 100;
        canvas.height = 100;
        const ctx = canvas.getContext('2d');
        
        // 创建草地纹理
        for (let i = 0; i < 50; i++) {
            const x = Math.random() * 100;
            const y = Math.random() * 100;
            const height = Math.random() * 8 + 4;
            
            ctx.strokeStyle = `hsl(${100 + Math.random() * 20}, 70%, ${30 + Math.random() * 20}%)`;
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(x, y);
            ctx.lineTo(x, y - height);
            ctx.stroke();
        }
        
        return canvas;
    }
    
    update(deltaTime) {
        // 更新云朵
        for (const cloud of this.clouds) {
            cloud.x += (cloud.speed * deltaTime) / 1000;
            if (cloud.x > this.game.width + cloud.size) {
                cloud.x = -cloud.size;
                cloud.y = Math.random() * 100 + 20;
            }
        }
    }
    
    render(ctx) {
        // 绘制天空渐变
        const gradient = ctx.createLinearGradient(0, 0, 0, this.game.height);
        gradient.addColorStop(0, '#87CEEB');
        gradient.addColorStop(0.3, '#98FB98');
        gradient.addColorStop(1, '#228B22');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, this.game.width, this.game.height);
        
        // 绘制草坪行
        for (let row = 0; row < this.game.gridRows; row++) {
            const y = this.game.gridStartY + row * this.game.cellHeight;
            const rowColor = row % 2 === 0 ? '#32CD32' : '#228B22';
            ctx.fillStyle = rowColor;
            ctx.fillRect(this.game.gridStartX, y, this.game.gridCols * this.game.cellWidth, this.game.cellHeight);
        }
        
        // 绘制草地纹理
        ctx.globalAlpha = 0.3;
        const pattern = ctx.createPattern(this.grassPattern, 'repeat');
        ctx.fillStyle = pattern;
        ctx.fillRect(this.game.gridStartX, this.game.gridStartY, 
                    this.game.gridCols * this.game.cellWidth, 
                    this.game.gridRows * this.game.cellHeight);
        ctx.globalAlpha = 1;
        
        // 绘制云朵
        ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
        for (const cloud of this.clouds) {
            this.drawCloud(ctx, cloud.x, cloud.y, cloud.size);
        }
    }
    
    drawCloud(ctx, x, y, size) {
        ctx.save();
        ctx.translate(x, y);
        
        // 绘制多个圆形组成云朵
        ctx.beginPath();
        ctx.arc(-size * 0.3, 0, size * 0.4, 0, 2 * Math.PI);
        ctx.arc(size * 0.3, 0, size * 0.4, 0, 2 * Math.PI);
        ctx.arc(0, -size * 0.2, size * 0.5, 0, 2 * Math.PI);
        ctx.fill();
        
        ctx.restore();
    }
}

// 特效管理器
class EffectManager {
    constructor(game) {
        this.game = game;
        this.screenShake = 0;
        this.screenShakeIntensity = 0;
    }
    
    addScreenShake(intensity = 5, duration = 200) {
        this.screenShakeIntensity = Math.max(this.screenShakeIntensity, intensity);
        this.screenShake = Math.max(this.screenShake, duration);
    }
    
    update(deltaTime) {
        if (this.screenShake > 0) {
            this.screenShake -= deltaTime;
            if (this.screenShake <= 0) {
                this.screenShakeIntensity = 0;
            }
        }
    }
    
    applyEffects(ctx) {
        if (this.screenShake > 0) {
            const shakeX = (Math.random() - 0.5) * this.screenShakeIntensity;
            const shakeY = (Math.random() - 0.5) * this.screenShakeIntensity;
            ctx.translate(shakeX, shakeY);
        }
    }
    
    resetEffects(ctx) {
        if (this.screenShake > 0) {
            ctx.setTransform(1, 0, 0, 1, 0, 0);
        }
    }
}

// 游戏统计管理器
class GameStats {
    constructor() {
        this.zombiesKilled = 0;
        this.plantsPlanted = 0;
        this.sunCollected = 0;
        this.wavesSurvived = 0;
        this.startTime = Date.now();
        this.gameTime = 0;
    }
    
    update(deltaTime) {
        this.gameTime += deltaTime;
    }
    
    addZombieKill() {
        this.zombiesKilled++;
    }
    
    addPlantPlanted() {
        this.plantsPlanted++;
    }
    
    addSunCollected(amount) {
        this.sunCollected += amount;
    }
    
    addWaveSurvived() {
        this.wavesSurvived++;
    }
    
    getPlayTime() {
        return Math.floor(this.gameTime / 1000);
    }
    
    getStats() {
        return {
            zombiesKilled: this.zombiesKilled,
            plantsPlanted: this.plantsPlanted,
            sunCollected: this.sunCollected,
            wavesSurvived: this.wavesSurvived,
            playTime: this.getPlayTime()
        };
    }
}

// 扩展Game类以包含新的管理器
Game.prototype.initManagers = function() {
    this.audioManager = new AudioManager();
    this.backgroundManager = new BackgroundManager(this);
    this.effectManager = new EffectManager(this);
    this.stats = new GameStats();
};

// 修改Game类构造函数的末尾
const originalGameInit = Game.prototype.constructor;

// 覆盖原始的update方法以包含新功能
const originalUpdate = Game.prototype.update;
Game.prototype.update = function(deltaTime) {
    originalUpdate.call(this, deltaTime);
    
    if (this.backgroundManager) {
        this.backgroundManager.update(deltaTime);
    }
    if (this.effectManager) {
        this.effectManager.update(deltaTime);
    }
    if (this.stats) {
        this.stats.update(deltaTime);
    }
};

// 覆盖原始的render方法以包含背景和特效
const originalRender = Game.prototype.render;
Game.prototype.render = function() {
    // 清空画布
    this.ctx.clearRect(0, 0, this.width, this.height);
    
    // 应用特效
    this.ctx.save();
    if (this.effectManager) {
        this.effectManager.applyEffects(this.ctx);
    }
    
    // 绘制背景
    if (this.backgroundManager) {
        this.backgroundManager.render(this.ctx);
    }
    
    // 绘制网格
    this.drawGrid();
    
    // 绘制游戏对象
    this.plants.forEach(plant => plant.render(this.ctx));
    this.zombies.forEach(zombie => zombie.render(this.ctx));
    this.projectiles.forEach(projectile => projectile.render(this.ctx));
    this.suns.forEach(sun => sun.render(this.ctx));
    this.particles.forEach(particle => particle.render(this.ctx));
    
    // 绘制选择的植物预览
    if (this.selectedPlant) {
        this.drawPlantPreview();
    }
    
    // 重置特效
    if (this.effectManager) {
        this.effectManager.resetEffects(this.ctx);
    }
    this.ctx.restore();
};

// 增强音效反馈
const originalPlantAt = Game.prototype.plantAt;
Game.prototype.plantAt = function(x, y) {
    const result = originalPlantAt.call(this, x, y);
    if (result === true && this.audioManager) {
        this.audioManager.play('plant');
        if (this.stats) {
            this.stats.addPlantPlanted();
        }
    }
    return result;
};

const originalCollectSun = Game.prototype.collectSun;
Game.prototype.collectSun = function(sun, index) {
    originalCollectSun.call(this, sun, index);
    if (this.audioManager) {
        this.audioManager.play('collect');
    }
    if (this.stats) {
        this.stats.addSunCollected(sun.value);
    }
};

// 为植物射击添加音效
const originalPeashooterShoot = Peashooter.prototype.shoot;
Peashooter.prototype.shoot = function() {
    originalPeashooterShoot.call(this);
    if (this.game.audioManager) {
        this.game.audioManager.play('shoot');
    }
};

const originalRepeaterShoot = Repeater.prototype.shoot;
Repeater.prototype.shoot = function() {
    originalRepeaterShoot.call(this);
    if (this.game.audioManager) {
        this.game.audioManager.play('shoot');
    }
};

const originalSnowPeaShoot = SnowPea.prototype.shoot;
SnowPea.prototype.shoot = function() {
    originalSnowPeaShoot.call(this);
    if (this.game.audioManager) {
        this.game.audioManager.play('shoot');
    }
};

// 为僵尸死亡添加音效和震屏效果
const originalZombieTakeDamage = Zombie.prototype.takeDamage;
Zombie.prototype.takeDamage = function(damage) {
    const wasAlive = this.health > 0;
    originalZombieTakeDamage.call(this, damage);
    
    if (wasAlive && this.health <= 0) {
        if (this.game.audioManager) {
            this.game.audioManager.play('zombieDeath');
        }
        if (this.game.effectManager) {
            this.game.effectManager.addScreenShake(3, 100);
        }
        if (this.game.stats) {
            this.game.stats.addZombieKill();
        }
    } else if (this.game.audioManager) {
        this.game.audioManager.play('hit');
    }
};

// 为植物受伤添加音效
const originalPlantTakeDamage = Plant.prototype.takeDamage;
Plant.prototype.takeDamage = function(damage) {
    originalPlantTakeDamage.call(this, damage);
    if (this.game.audioManager) {
        this.game.audioManager.play('plantDamage');
    }
};

// 添加键盘控制
document.addEventListener('keydown', (e) => {
    if (!window.game) return;
    
    switch (e.key) {
        case 'm':
        case 'M':
            if (window.game.audioManager) {
                window.game.audioManager.toggle();
            }
            break;
        case 'r':
        case 'R':
            if (window.game.gameState === 'gameOver') {
                restartGame();
            }
            break;
        case 'Escape':
            // 取消植物选择
            window.game.selectedPlant = null;
            document.querySelectorAll('.plant-card').forEach(c => c.classList.remove('selected'));
            window.game.canvas.style.cursor = 'default';
            break;
    }
});

// 樱桃炸弹类
class CherryBomb extends Plant {
    constructor(row, col, game) {
        super(row, col, game);
        this.health = 1;
        this.maxHealth = 1;
        this.explosionDelay = 2000; // 2秒后爆炸
        this.plantedTime = 0;
        this.explosionRadius = 120;
        this.damage = 999; // 秒杀伤害
        this.isBlinking = false;
        this.blinkTimer = 0;
    }
    
    update(deltaTime) {
        this.plantedTime += deltaTime;
        
        // 爆炸前闪烁
        if (this.plantedTime > this.explosionDelay - 1000) {
            this.blinkTimer += deltaTime;
            this.isBlinking = (this.blinkTimer % 200) < 100;
        }
        
        // 爆炸
        if (this.plantedTime >= this.explosionDelay) {
            this.explode();
            this.health = 0; // 标记为死亡
        }
    }
    
    explode() {
        const x = this.getX();
        const y = this.getY();
        
        // 伤害范围内的所有僵尸
        for (const zombie of this.game.zombies) {
            const dx = zombie.x - x;
            const dy = zombie.getY() - y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            if (distance <= this.explosionRadius) {
                zombie.takeDamage(this.damage);
            }
        }
        
        // 添加爆炸效果
        this.game.addParticle(new ExplosionEffect(x, y));
        
        // 震屏效果
        if (this.game.effectManager) {
            this.game.effectManager.addScreenShake(8, 300);
        }
        
        // 爆炸音效
        if (this.game.audioManager) {
            this.game.audioManager.play('explosion');
        }
    }
    
    render(ctx) {
        if (!this.isBlinking) {
            super.render(ctx);
        }
        
        const x = this.getX();
        const y = this.getY();
        
        ctx.save();
        ctx.translate(x, y);
        
        if (!this.isBlinking) {
            // 樱桃主体
            ctx.fillStyle = '#DC143C';
            ctx.beginPath();
            ctx.arc(-8, -5, 12, 0, 2 * Math.PI);
            ctx.arc(8, -5, 12, 0, 2 * Math.PI);
            ctx.fill();
            
            // 高光
            ctx.fillStyle = '#FF69B4';
            ctx.beginPath();
            ctx.arc(-8, -8, 4, 0, 2 * Math.PI);
            ctx.arc(8, -8, 4, 0, 2 * Math.PI);
            ctx.fill();
            
            // 茎
            ctx.strokeStyle = '#228B22';
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.moveTo(-5, -15);
            ctx.quadraticCurveTo(0, -25, 5, -20);
            ctx.stroke();
        }
        
        // 爆炸倒计时圈
        if (this.plantedTime > 0) {
            const progress = this.plantedTime / this.explosionDelay;
            ctx.strokeStyle = '#FF0000';
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.arc(0, 0, 25, -Math.PI / 2, -Math.PI / 2 + progress * 2 * Math.PI);
            ctx.stroke();
        }
        
        ctx.restore();
    }
}

// 土豆雷类
class PotatoMine extends Plant {
    constructor(row, col, game) {
        super(row, col, game);
        this.health = 1;
        this.maxHealth = 1;
        this.activationTime = 15000; // 15秒激活
        this.plantedTime = 0;
        this.isActive = false;
        this.damage = 999;
        this.triggered = false;
    }
    
    update(deltaTime) {
        this.plantedTime += deltaTime;
        
        if (!this.isActive && this.plantedTime >= this.activationTime) {
            this.isActive = true;
        }
        
        if (this.isActive && !this.triggered) {
            // 检测僵尸
            for (const zombie of this.game.zombies) {
                if (zombie.row === this.row) {
                    const distance = Math.abs(zombie.x - this.getX());
                    if (distance < 40) {
                        this.explode();
                        this.triggered = true;
                        this.health = 0;
                        break;
                    }
                }
            }
        }
    }
    
    explode() {
        const x = this.getX();
        const y = this.getY();
        
        // 伤害范围内的僵尸
        for (const zombie of this.game.zombies) {
            if (zombie.row === this.row) {
                const distance = Math.abs(zombie.x - x);
                if (distance < 60) {
                    zombie.takeDamage(this.damage);
                }
            }
        }
        
        // 爆炸效果
        this.game.addParticle(new ExplosionEffect(x, y, '#8B4513'));
        
        if (this.game.effectManager) {
            this.game.effectManager.addScreenShake(5, 200);
        }
        
        if (this.game.audioManager) {
            this.game.audioManager.play('explosion');
        }
    }
    
    render(ctx) {
        super.render(ctx);
        
        const x = this.getX();
        const y = this.getY();
        
        ctx.save();
        ctx.translate(x, y);
        
        if (!this.isActive) {
            // 未激活状态 - 小土丘
            ctx.fillStyle = '#8B4513';
            ctx.beginPath();
            ctx.ellipse(0, 10, 20, 8, 0, 0, 2 * Math.PI);
            ctx.fill();
            
            // 激活进度
            const progress = this.plantedTime / this.activationTime;
            ctx.strokeStyle = '#32CD32';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(0, 0, 15, -Math.PI / 2, -Math.PI / 2 + progress * 2 * Math.PI);
            ctx.stroke();
        } else {
            // 激活状态 - 土豆雷
            ctx.fillStyle = '#D2691E';
            ctx.beginPath();
            ctx.ellipse(0, 0, 18, 25, 0, 0, 2 * Math.PI);
            ctx.fill();
            
            // 眼睛
            ctx.fillStyle = '#000000';
            ctx.beginPath();
            ctx.arc(-6, -5, 2, 0, 2 * Math.PI);
            ctx.arc(6, -5, 2, 0, 2 * Math.PI);
            ctx.fill();
            
            // 引线
            ctx.strokeStyle = '#8B4513';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(0, -25);
            ctx.lineTo(0, -30);
            ctx.stroke();
            
            // 闪烁的火花
            if (Math.random() < 0.3) {
                ctx.fillStyle = '#FF4500';
                ctx.beginPath();
                ctx.arc(0, -30, 3, 0, 2 * Math.PI);
                ctx.fill();
            }
        }
        
        ctx.restore();
    }
}

// 三线射手类
class Threepeater extends Plant {
    constructor(row, col, game) {
        super(row, col, game);
        this.actionCooldown = 1800;
        this.health = 75;
        this.maxHealth = 75;
    }
    
    update(deltaTime) {
        const currentTime = this.game.gameTime;
        if (this.canAct(currentTime) && this.hasTargetInRange()) {
            this.shoot();
            this.lastActionTime = currentTime;
        }
    }
    
    hasTargetInRange() {
        // 检查当前行和相邻行是否有僵尸
        for (let checkRow = Math.max(0, this.row - 1); 
             checkRow <= Math.min(this.game.gridRows - 1, this.row + 1); 
             checkRow++) {
            if (this.game.zombies.some(zombie => 
                zombie.row === checkRow && zombie.x > this.getX())) {
                return true;
            }
        }
        return false;
    }
    
    shoot() {
        const x = this.getX() + 25;
        
        // 射击三行
        for (let shootRow = Math.max(0, this.row - 1); 
             shootRow <= Math.min(this.game.gridRows - 1, this.row + 1); 
             shootRow++) {
            const y = this.game.gridStartY + shootRow * this.game.cellHeight + this.game.cellHeight / 2;
            const projectile = new Pea(x, y, shootRow);
            this.game.addProjectile(projectile);
        }
    }
    
    render(ctx) {
        super.render(ctx);
        
        const x = this.getX();
        const y = this.getY();
        
        ctx.save();
        ctx.translate(x, y);
        
        // 主体
        ctx.fillStyle = '#228B22';
        ctx.beginPath();
        ctx.arc(0, 0, 25, 0, 2 * Math.PI);
        ctx.fill();
        
        // 三个射击口
        ctx.fillStyle = '#006400';
        ctx.fillRect(20, -15, 18, 8);
        ctx.fillRect(20, -4, 18, 8);
        ctx.fillRect(20, 7, 18, 8);
        
        // 叶子
        ctx.fillStyle = '#32CD32';
        for (let i = 0; i < 3; i++) {
            ctx.save();
            ctx.rotate((i * 2 * Math.PI) / 3);
            ctx.beginPath();
            ctx.ellipse(-15, -20, 8, 15, -0.3, 0, 2 * Math.PI);
            ctx.fill();
            ctx.restore();
        }
        
        ctx.restore();
    }
}

// 高坚果类
class TallNut extends Plant {
    constructor(row, col, game) {
        super(row, col, game);
        this.health = 400;
        this.maxHealth = 400;
        this.size = 40;
    }
    
    render(ctx) {
        super.render(ctx);
        
        const x = this.getX();
        const y = this.getY();
        
        ctx.save();
        ctx.translate(x, y);
        
        // 根据健康值改变颜色
        let color = '#8B4513';
        if (this.health < this.maxHealth * 0.3) {
            color = '#654321';
        } else if (this.health < this.maxHealth * 0.6) {
            color = '#A0522D';
        }
        
        // 高坚果主体
        ctx.fillStyle = color;
        ctx.fillRect(-25, -40, 50, 80);
        
        // 纹理线条
        ctx.strokeStyle = '#654321';
        ctx.lineWidth = 3;
        for (let i = -20; i <= 20; i += 8) {
            ctx.beginPath();
            ctx.moveTo(i, -40);
            ctx.lineTo(i, 40);
            ctx.stroke();
        }
        
        // 水平纹理
        for (let i = -30; i <= 30; i += 15) {
            ctx.beginPath();
            ctx.moveTo(-25, i);
            ctx.lineTo(25, i);
            ctx.stroke();
        }
        
        // 眼睛
        ctx.fillStyle = '#000000';
        ctx.beginPath();
        ctx.arc(-10, -10, 4, 0, 2 * Math.PI);
        ctx.arc(10, -10, 4, 0, 2 * Math.PI);
        ctx.fill();
        
        // 嘴巴
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(0, 5, 8, 0, Math.PI);
        ctx.stroke();
        
        ctx.restore();
    }
}

// 南瓜头类（保护套）
class Pumpkin extends Plant {
    constructor(row, col, game) {
        super(row, col, game);
        this.health = 150;
        this.maxHealth = 150;
        this.isProtective = true; // 标记为保护性植物
    }
    
    render(ctx) {
        super.render(ctx);
        
        const x = this.getX();
        const y = this.getY();
        
        ctx.save();
        ctx.translate(x, y);
        
        // 南瓜主体
        ctx.fillStyle = '#FF8C00';
        ctx.beginPath();
        ctx.arc(0, 0, 30, 0, 2 * Math.PI);
        ctx.fill();
        
        // 竖纹
        ctx.strokeStyle = '#FF6347';
        ctx.lineWidth = 2;
        for (let i = 0; i < 6; i++) {
            ctx.save();
            ctx.rotate((i * Math.PI) / 3);
            ctx.beginPath();
            ctx.moveTo(0, -30);
            ctx.lineTo(0, 30);
            ctx.stroke();
            ctx.restore();
        }
        
        // 眼睛和嘴巴
        ctx.fillStyle = '#000000';
        // 三角形眼睛
        ctx.beginPath();
        ctx.moveTo(-10, -10);
        ctx.lineTo(-5, -5);
        ctx.lineTo(-15, -5);
        ctx.closePath();
        ctx.fill();
        
        ctx.beginPath();
        ctx.moveTo(10, -10);
        ctx.lineTo(15, -5);
        ctx.lineTo(5, -5);
        ctx.closePath();
        ctx.fill();
        
        // 锯齿状嘴巴
        ctx.beginPath();
        ctx.moveTo(-12, 8);
        ctx.lineTo(-8, 12);
        ctx.lineTo(-4, 8);
        ctx.lineTo(0, 12);
        ctx.lineTo(4, 8);
        ctx.lineTo(8, 12);
        ctx.lineTo(12, 8);
        ctx.stroke();
        
        ctx.restore();
    }
}

// 爆炸效果粒子（增强版）
class ExplosionEffect extends Particle {
    constructor(x, y, color = '#FF4500') {
        super(x, y, 1500);
        this.particles = [];
        this.shockwaveRadius = 0;
        this.maxShockwaveRadius = 80;
        this.baseColor = color;
        
        // 创建爆炸粒子
        for (let i = 0; i < 20; i++) {
            this.particles.push({
                x: 0,
                y: 0,
                vx: (Math.random() - 0.5) * 300,
                vy: (Math.random() - 0.5) * 300,
                size: Math.random() * 8 + 4,
                color: this.getRandomExplosionColor(),
                life: 1.0
            });
        }
    }
    
    getRandomExplosionColor() {
        const colors = ['#FF4500', '#FF6347', '#FFD700', '#FF8C00', '#DC143C'];
        return colors[Math.floor(Math.random() * colors.length)];
    }
    
    update(deltaTime) {
        super.update(deltaTime);
        
        // 更新冲击波
        this.shockwaveRadius = (this.age / this.lifetime) * this.maxShockwaveRadius;
        
        // 更新粒子
        for (const particle of this.particles) {
            particle.x += (particle.vx * deltaTime) / 1000;
            particle.y += (particle.vy * deltaTime) / 1000;
            particle.vy += 100 * deltaTime / 1000; // 重力
            particle.vx *= 0.995; // 空气阻力
            particle.life = Math.max(0, particle.life - deltaTime / 1000);
        }
    }
    
    render(ctx) {
        ctx.save();
        ctx.translate(this.x, this.y);
        
        // 绘制冲击波
        if (this.shockwaveRadius < this.maxShockwaveRadius) {
            ctx.strokeStyle = `rgba(255, 69, 0, ${this.alpha * 0.8})`;
            ctx.lineWidth = 4;
            ctx.beginPath();
            ctx.arc(0, 0, this.shockwaveRadius, 0, 2 * Math.PI);
            ctx.stroke();
        }
        
        // 绘制爆炸粒子
        for (const particle of this.particles) {
            if (particle.life > 0) {
                ctx.save();
                ctx.globalAlpha = particle.life * this.alpha;
                ctx.fillStyle = particle.color;
                ctx.beginPath();
                ctx.arc(particle.x, particle.y, particle.size, 0, 2 * Math.PI);
                ctx.fill();
                ctx.restore();
            }
        }
        
        // 绘制闪光
        if (this.age < 200) {
            ctx.save();
            ctx.globalAlpha = (200 - this.age) / 200;
            ctx.fillStyle = '#FFFFFF';
            ctx.beginPath();
            ctx.arc(0, 0, 40, 0, 2 * Math.PI);
            ctx.fill();
            ctx.restore();
        }
        
        ctx.restore();
    }
}

// 疯狂戴夫僵尸（特殊BOSS僵尸）
class CrazyDaveZombie extends Zombie {
    constructor(row, game) {
        super(row, game);
        this.health = 500;
        this.maxHealth = 500;
        this.speed = 15;
        this.damage = 50;
        this.specialAttackCooldown = 5000;
        this.lastSpecialAttack = 0;
        this.size = 40;
    }
    
    update(deltaTime) {
        super.update(deltaTime);
        
        // 特殊攻击
        const currentTime = this.game.gameTime;
        if (currentTime - this.lastSpecialAttack >= this.specialAttackCooldown) {
            this.specialAttack();
            this.lastSpecialAttack = currentTime;
        }
    }
    
    specialAttack() {
        // 发射多个僵尸手
        for (let i = 0; i < 3; i++) {
            setTimeout(() => {
                const projectile = new ZombieHand(this.x - 20, this.getY(), this.row);
                this.game.addProjectile(projectile);
            }, i * 300);
        }
        
        if (this.game.audioManager) {
            this.game.audioManager.play('bossAttack');
        }
    }
    
    render(ctx) {
        super.render(ctx);
        
        const x = this.x;
        const y = this.getY();
        
        ctx.save();
        ctx.translate(x, y);
        
        // 身体（更大）
        ctx.fillStyle = this.isEating ? '#90EE90' : '#6B8E23';
        ctx.fillRect(-20, -15, 40, 60);
        
        // 头部
        ctx.fillStyle = '#90EE90';
        ctx.beginPath();
        ctx.arc(0, -25, 20, 0, 2 * Math.PI);
        ctx.fill();
        
        // 疯狂戴夫的锅子帽
        ctx.fillStyle = '#C0C0C0';
        ctx.beginPath();
        ctx.arc(0, -35, 22, Math.PI, 2 * Math.PI);
        ctx.fill();
        ctx.fillRect(-22, -35, 44, 5);
        
        // 眼睛（发红光）
        ctx.fillStyle = '#FF0000';
        ctx.beginPath();
        ctx.arc(-8, -30, 4, 0, 2 * Math.PI);
        ctx.arc(8, -30, 4, 0, 2 * Math.PI);
        ctx.fill();
        
        // 胡子
        ctx.fillStyle = '#8B4513';
        ctx.fillRect(-15, -15, 30, 8);
        
        // 手臂（更粗壮）
        ctx.fillStyle = '#6B8E23';
        ctx.fillRect(-30, -10, 15, 30);
        ctx.fillRect(15, -10, 15, 30);
        
        // 腿部
        ctx.fillRect(-15, 35, 12, 20);
        ctx.fillRect(3, 35, 12, 20);
        
        // Boss光环
        ctx.strokeStyle = '#FF4500';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(0, 0, 45 + 5 * Math.sin(this.game.gameTime / 200), 0, 2 * Math.PI);
        ctx.stroke();
        
        ctx.restore();
    }
}

// 僵尸手投射物
class ZombieHand extends Projectile {
    constructor(x, y, row) {
        super(x, y, row);
        this.speed = -150; // 向左飞行
        this.damage = 30;
        this.rotation = 0;
    }
    
    update(deltaTime) {
        super.update(deltaTime);
        this.rotation += (deltaTime / 100);
        
        // 检查是否击中植物
        const gridPos = this.game.getGridPosition(this.x, this.y);
        if (gridPos && this.game.grid[gridPos.row][gridPos.col]) {
            const plant = this.game.grid[gridPos.row][gridPos.col];
            plant.takeDamage(this.damage);
            this.destroyed = true;
            this.game.addParticle(new HitEffect(this.x, this.y));
        }
    }
    
    render(ctx) {
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate(this.rotation);
        
        // 僵尸手
        ctx.fillStyle = '#90EE90';
        ctx.fillRect(-8, -4, 16, 8);
        
        // 手指
        for (let i = 0; i < 4; i++) {
            ctx.fillRect(8, -6 + i * 3, 6, 2);
        }
        
        // 拇指
        ctx.fillRect(-2, -10, 4, 6);
        
        ctx.restore();
    }
}

// 扩展植物工厂
PlantFactory.costs.cherrybomb = 150;
PlantFactory.costs.potatomine = 25;
PlantFactory.costs.threepeater = 325;
PlantFactory.costs.tallnut = 125;
PlantFactory.costs.pumpkin = 100;

const originalCreatePlant = PlantFactory.createPlant;
PlantFactory.createPlant = function(type, row, col, game) {
    switch (type) {
        case 'cherrybomb':
            return new CherryBomb(row, col, game);
        case 'potatomine':
            return new PotatoMine(row, col, game);
        case 'threepeater':
            return new Threepeater(row, col, game);
        case 'tallnut':
            return new TallNut(row, col, game);
        case 'pumpkin':
            return new Pumpkin(row, col, game);
        default:
            return originalCreatePlant.call(this, type, row, col, game);
    }
};

// 扩展僵尸工厂
const originalCreateZombie = ZombieFactory.createZombie;
ZombieFactory.createZombie = function(type, row, game) {
    if (type === 'boss' || (game.wave % 10 === 0 && Math.random() < 0.3)) {
        return new CrazyDaveZombie(row, game);
    }
    return originalCreateZombie.call(this, type, row, game);
};

// 添加更多音效
AudioManager.prototype.createSounds = function() {
    this.sounds.shoot = this.createTone(300, 0.1, 'square');
    this.sounds.plant = this.createTone(400, 0.2, 'sine');
    this.sounds.collect = this.createTone(600, 0.15, 'triangle');
    this.sounds.hit = this.createTone(200, 0.1, 'sawtooth');
    this.sounds.zombieDeath = this.createTone(150, 0.3, 'square');
    this.sounds.plantDamage = this.createTone(250, 0.2, 'sawtooth');
    this.sounds.explosion = this.createMultiTone([100, 200, 300], 0.5, 'square');
    this.sounds.bossAttack = this.createMultiTone([150, 300, 450], 0.4, 'sawtooth');
    this.sounds.powerUp = this.createTone(800, 0.3, 'triangle');
};

AudioManager.prototype.createMultiTone = function(frequencies, duration, waveType = 'sine') {
    if (!this.audioContext) return null;
    
    return () => {
        if (!this.enabled) return;
        
        const gainNode = this.audioContext.createGain();
        gainNode.connect(this.audioContext.destination);
        
        frequencies.forEach((freq, index) => {
            const oscillator = this.audioContext.createOscillator();
            const oscGain = this.audioContext.createGain();
            
            oscillator.connect(oscGain);
            oscGain.connect(gainNode);
            
            oscillator.frequency.setValueAtTime(freq, this.audioContext.currentTime);
            oscillator.type = waveType;
            
            oscGain.gain.setValueAtTime(0, this.audioContext.currentTime);
            oscGain.gain.linearRampToValueAtTime(this.volume / frequencies.length, this.audioContext.currentTime + 0.01);
            oscGain.gain.exponentialRampToValueAtTime(0.001, this.audioContext.currentTime + duration);
            
            oscillator.start(this.audioContext.currentTime + index * 0.05);
            oscillator.stop(this.audioContext.currentTime + duration);
        });
    };
};

// 天气系统
class WeatherSystem {
    constructor(game) {
        this.game = game;
        this.currentWeather = 'sunny';
        this.weatherTimer = 0;
        this.weatherDuration = 60000; // 1分钟一个天气周期
        this.raindrops = [];
        this.snowflakes = [];
    }
    
    update(deltaTime) {
        this.weatherTimer += deltaTime;
        
        if (this.weatherTimer >= this.weatherDuration) {
            this.changeWeather();
            this.weatherTimer = 0;
        }
        
        // 更新天气效果
        if (this.currentWeather === 'rain') {
            this.updateRain(deltaTime);
        } else if (this.currentWeather === 'snow') {
            this.updateSnow(deltaTime);
        }
    }
    
    changeWeather() {
        const weathers = ['sunny', 'rain', 'snow', 'windy'];
        this.currentWeather = weathers[Math.floor(Math.random() * weathers.length)];
        
        // 清空之前的天气效果
        this.raindrops = [];
        this.snowflakes = [];
        
        // 应用天气效果到游戏
        this.applyWeatherEffects();
    }
    
    applyWeatherEffects() {
        switch (this.currentWeather) {
            case 'rain':
                // 雨天：阳光生成减少，植物生长更快
                break;
            case 'snow':
                // 雪天：僵尸移动更慢
                for (const zombie of this.game.zombies) {
                    zombie.speed *= 0.8;
                }
                break;
            case 'windy':
                // 大风：子弹速度增加
                break;
        }
    }
    
    updateRain(deltaTime) {
        // 生成雨滴
        if (Math.random() < 0.3) {
            this.raindrops.push({
                x: Math.random() * this.game.width,
                y: -10,
                speed: 200 + Math.random() * 100
            });
        }
        
        // 更新雨滴
        for (let i = this.raindrops.length - 1; i >= 0; i--) {
            const drop = this.raindrops[i];
            drop.y += (drop.speed * deltaTime) / 1000;
            
            if (drop.y > this.game.height) {
                this.raindrops.splice(i, 1);
            }
        }
    }
    
    updateSnow(deltaTime) {
        // 生成雪花
        if (Math.random() < 0.1) {
            this.snowflakes.push({
                x: Math.random() * this.game.width,
                y: -10,
                speed: 50 + Math.random() * 30,
                size: Math.random() * 4 + 2,
                drift: (Math.random() - 0.5) * 20
            });
        }
        
        // 更新雪花
        for (let i = this.snowflakes.length - 1; i >= 0; i--) {
            const flake = this.snowflakes[i];
            flake.y += (flake.speed * deltaTime) / 1000;
            flake.x += (flake.drift * deltaTime) / 1000;
            
            if (flake.y > this.game.height || flake.x < -10 || flake.x > this.game.width + 10) {
                this.snowflakes.splice(i, 1);
            }
        }
    }
    
    render(ctx) {
        if (this.currentWeather === 'rain') {
            ctx.strokeStyle = 'rgba(173, 216, 230, 0.8)';
            ctx.lineWidth = 1;
            for (const drop of this.raindrops) {
                ctx.beginPath();
                ctx.moveTo(drop.x, drop.y);
                ctx.lineTo(drop.x - 2, drop.y - 15);
                ctx.stroke();
            }
        } else if (this.currentWeather === 'snow') {
            ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
            for (const flake of this.snowflakes) {
                ctx.beginPath();
                ctx.arc(flake.x, flake.y, flake.size, 0, 2 * Math.PI);
                ctx.fill();
            }
        }
    }
}

// 道具系统
class PowerUpSystem {
    constructor(game) {
        this.game = game;
        this.powerUps = [];
        this.spawnTimer = 0;
        this.spawnInterval = 30000; // 30秒生成一个道具
    }
    
    update(deltaTime) {
        this.spawnTimer += deltaTime;
        
        if (this.spawnTimer >= this.spawnInterval) {
            this.spawnPowerUp();
            this.spawnTimer = 0;
        }
        
        // 更新道具
        for (let i = this.powerUps.length - 1; i >= 0; i--) {
            const powerUp = this.powerUps[i];
            powerUp.update(deltaTime);
            
            if (powerUp.expired) {
                this.powerUps.splice(i, 1);
            }
        }
    }
    
    spawnPowerUp() {
        const types = ['sunBoost', 'freeze', 'nuke', 'shield'];
        const type = types[Math.floor(Math.random() * types.length)];
        const x = Math.random() * (this.game.width - 100) + 50;
        const y = Math.random() * (this.game.height - 200) + 100;
        
        this.powerUps.push(new PowerUp(x, y, type, this.game));
    }
    
    render(ctx) {
        for (const powerUp of this.powerUps) {
            powerUp.render(ctx);
        }
    }
}

// 道具类
class PowerUp {
    constructor(x, y, type, game) {
        this.x = x;
        this.y = y;
        this.type = type;
        this.game = game;
        this.size = 25;
        this.lifetime = 15000; // 15秒消失
        this.age = 0;
        this.expired = false;
        this.pulseTimer = 0;
    }
    
    update(deltaTime) {
        this.age += deltaTime;
        this.pulseTimer += deltaTime;
        
        if (this.age >= this.lifetime) {
            this.expired = true;
        }
    }
    
    contains(x, y) {
        const dx = x - this.x;
        const dy = y - this.y;
        return dx * dx + dy * dy <= this.size * this.size;
    }
    
    activate() {
        switch (this.type) {
            case 'sunBoost':
                this.game.sun += 100;
                break;
            case 'freeze':
                for (const zombie of this.game.zombies) {
                    zombie.applySlowEffect(5000);
                }
                break;
            case 'nuke':
                for (const zombie of this.game.zombies) {
                    zombie.takeDamage(999);
                }
                this.game.effectManager.addScreenShake(10, 500);
                break;
            case 'shield':
                for (const plant of this.game.plants) {
                    plant.health = plant.maxHealth;
                }
                break;
        }
        
        if (this.game.audioManager) {
            this.game.audioManager.play('powerUp');
        }
        
        this.expired = true;
    }
    
    render(ctx) {
        ctx.save();
        ctx.translate(this.x, this.y);
        
        // 脉动效果
        const pulse = 1 + 0.2 * Math.sin(this.pulseTimer / 300);
        ctx.scale(pulse, pulse);
        
        // 道具背景
        ctx.fillStyle = 'rgba(255, 215, 0, 0.8)';
        ctx.beginPath();
        ctx.arc(0, 0, this.size, 0, 2 * Math.PI);
        ctx.fill();
        
        // 道具图标
        ctx.fillStyle = '#000000';
        ctx.font = '20px Arial';
        ctx.textAlign = 'center';
        
        let symbol = '';
        switch (this.type) {
            case 'sunBoost': symbol = '☀'; break;
            case 'freeze': symbol = '❄'; break;
            case 'nuke': symbol = '💥'; break;
            case 'shield': symbol = '🛡'; break;
        }
        
        ctx.fillText(symbol, 0, 8);
        
        // 边框
        ctx.strokeStyle = '#FFD700';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(0, 0, this.size, 0, 2 * Math.PI);
        ctx.stroke();
        
        ctx.restore();
    }
}

// 扩展Game类以包含新系统
Game.prototype.initManagers = function() {
    this.audioManager = new AudioManager();
    this.backgroundManager = new BackgroundManager(this);
    this.effectManager = new EffectManager(this);
    this.stats = new GameStats();
    this.weatherSystem = new WeatherSystem(this);
    this.powerUpSystem = new PowerUpSystem(this);
};

// 更新原始的update方法
const originalUpdate2 = Game.prototype.update;
Game.prototype.update = function(deltaTime) {
    originalUpdate2.call(this, deltaTime);
    
    if (this.weatherSystem) {
        this.weatherSystem.update(deltaTime);
    }
    if (this.powerUpSystem) {
        this.powerUpSystem.update(deltaTime);
    }
};

// 扩展点击处理以包含道具
const originalHandleCanvasClick = Game.prototype.handleCanvasClick;
Game.prototype.handleCanvasClick = function(e) {
    const rect = this.canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    // 检查道具点击
    if (this.powerUpSystem) {
        for (let i = this.powerUpSystem.powerUps.length - 1; i >= 0; i--) {
            const powerUp = this.powerUpSystem.powerUps[i];
            if (powerUp.contains(x, y)) {
                powerUp.activate();
                this.powerUpSystem.powerUps.splice(i, 1);
                return;
            }
        }
    }
    
    originalHandleCanvasClick.call(this, e);
};

// 扩展渲染方法
const originalRender2 = Game.prototype.render;
Game.prototype.render = function() {
    // 清空画布
    this.ctx.clearRect(0, 0, this.width, this.height);
    
    // 应用特效
    this.ctx.save();
    if (this.effectManager) {
        this.effectManager.applyEffects(this.ctx);
    }
    
    // 绘制背景
    if (this.backgroundManager) {
        this.backgroundManager.render(this.ctx);
    }
    
    // 绘制天气效果
    if (this.weatherSystem) {
        this.weatherSystem.render(this.ctx);
    }
    
    // 绘制网格
    this.drawGrid();
    
    // 绘制游戏对象
    this.plants.forEach(plant => plant.render(this.ctx));
    this.zombies.forEach(zombie => zombie.render(this.ctx));
    this.projectiles.forEach(projectile => projectile.render(this.ctx));
    this.suns.forEach(sun => sun.render(this.ctx));
    this.particles.forEach(particle => particle.render(this.ctx));
    
    // 绘制道具
    if (this.powerUpSystem) {
        this.powerUpSystem.render(this.ctx);
    }
    
    // 绘制选择的植物预览
    if (this.selectedPlant) {
        this.drawPlantPreview();
    }
    
    // 重置特效
    if (this.effectManager) {
        this.effectManager.resetEffects(this.ctx);
    }
    this.ctx.restore();
};

// 启动游戏
window.addEventListener('load', () => {
    window.game = new Game();
});