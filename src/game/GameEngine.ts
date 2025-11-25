
export type GameState = 'MENU' | 'PLAYING' | 'GAME_OVER';

export interface GameStats {
  score: number;
  energy: number;
  maxEnergy: number;
  level: number;
}

class Entity {
  x: number;
  y: number;
  radius: number;
  vx: number;
  vy: number;
  color: string;
  markedForDeletion: boolean = false;

  constructor(x: number, y: number, radius: number, color: string) {
    this.x = x;
    this.y = y;
    this.radius = radius;
    this.vx = 0;
    this.vy = 0;
    this.color = color;
  }

  update(dt: number) {
    this.x += this.vx * dt;
    this.y += this.vy * dt;
  }

  draw(ctx: CanvasRenderingContext2D) {
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
    ctx.fillStyle = this.color;
    ctx.fill();
    ctx.closePath();
  }
}

class Player extends Entity {
  angle: number = 0;

  constructor(x: number, y: number) {
    super(x, y, 15, '#fff');
  }

  draw(ctx: CanvasRenderingContext2D) {
    // Core
    ctx.shadowBlur = 20;
    ctx.shadowColor = '#00ffff';
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
    ctx.fillStyle = '#fff';
    ctx.fill();
    ctx.closePath();
    ctx.shadowBlur = 0;

    // Orbiting shield/indicator
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius + 10, this.angle, this.angle + Math.PI / 2);
    ctx.strokeStyle = '#00ffff';
    ctx.lineWidth = 3;
    ctx.stroke();
    ctx.closePath();
  }
}

class Particle extends Entity {
  life: number = 1.0;
  decay: number;

  constructor(x: number, y: number, color: string, speed: number, size: number) {
    super(x, y, size, color);
    const angle = Math.random() * Math.PI * 2;
    this.vx = Math.cos(angle) * speed;
    this.vy = Math.sin(angle) * speed;
    this.decay = Math.random() * 0.02 + 0.01;
  }

  update(dt: number) {
    super.update(dt);
    this.life -= this.decay;
    if (this.life <= 0) this.markedForDeletion = true;
  }

  draw(ctx: CanvasRenderingContext2D) {
    ctx.globalAlpha = this.life;
    super.draw(ctx);
    ctx.globalAlpha = 1.0;
  }
}

class Enemy extends Entity {
  constructor(w: number, h: number, player: Player) {
    super(0, 0, Math.random() * 10 + 10, '#ff0055');

    // Spawn at edge
    if (Math.random() < 0.5) {
      this.x = Math.random() < 0.5 ? -50 : w + 50;
      this.y = Math.random() * h;
    } else {
      this.x = Math.random() * w;
      this.y = Math.random() < 0.5 ? -50 : h + 50;
    }

    // Move towards player
    const angle = Math.atan2(player.y - this.y, player.x - this.x);
    const speed = Math.random() * 100 + 50;
    this.vx = Math.cos(angle) * speed;
    this.vy = Math.sin(angle) * speed;
  }

  draw(ctx: CanvasRenderingContext2D) {
    ctx.shadowBlur = 15;
    ctx.shadowColor = '#ff0055';
    super.draw(ctx);
    ctx.shadowBlur = 0;
  }
}

class Orb extends Entity {
  constructor(w: number, h: number) {
    super(Math.random() * w, Math.random() * h, 5, '#00ffaa');
  }

  draw(ctx: CanvasRenderingContext2D) {
    ctx.shadowBlur = 10;
    ctx.shadowColor = '#00ffaa';
    super.draw(ctx);
    ctx.shadowBlur = 0;
  }
}

export class GameEngine {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  width: number = 0;
  height: number = 0;

  state: GameState = 'MENU';
  stats: GameStats = {
    score: 0,
    energy: 100,
    maxEnergy: 100,
    level: 1
  };

  player: Player | null = null;
  entities: Entity[] = [];
  particles: Particle[] = [];

  lastTime: number = 0;
  spawnTimer: number = 0;

  onStatsUpdate: (stats: GameStats) => void;
  onGameOver: (score: number) => void;

  private animationId: number = 0;
  private handleResize: () => void;
  private handleMouseMove: (e: MouseEvent) => void;
  private handleMouseDown: () => void;

  constructor(canvas: HTMLCanvasElement, onStatsUpdate: (stats: GameStats) => void, onGameOver: (score: number) => void) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;
    this.onStatsUpdate = onStatsUpdate;
    this.onGameOver = onGameOver;

    this.resize();

    // Bind handlers
    this.handleResize = () => this.resize();
    this.handleMouseMove = (e: MouseEvent) => {
      if (this.state === 'PLAYING' && this.player) {
        this.player.x = e.clientX;
        this.player.y = e.clientY;
      }
    };
    this.handleMouseDown = () => {
      if (this.state === 'PLAYING') {
        this.triggerHypernova();
      }
    };

    window.addEventListener('resize', this.handleResize);
    window.addEventListener('mousemove', this.handleMouseMove);
    window.addEventListener('mousedown', this.handleMouseDown);
  }

  destroy() {
    window.removeEventListener('resize', this.handleResize);
    window.removeEventListener('mousemove', this.handleMouseMove);
    window.removeEventListener('mousedown', this.handleMouseDown);
    cancelAnimationFrame(this.animationId);
  }

  resize() {
    this.width = window.innerWidth;
    this.height = window.innerHeight;
    this.canvas.width = this.width;
    this.canvas.height = this.height;
  }

  start() {
    this.state = 'PLAYING';
    this.stats = { score: 0, energy: 100, maxEnergy: 100, level: 1 };
    this.player = new Player(this.width / 2, this.height / 2);
    this.entities = [];
    this.particles = [];
    this.lastTime = performance.now();
    this.loop(this.lastTime);
  }

  triggerHypernova() {
    if (this.stats.energy >= 50) {
      this.stats.energy -= 50;

      // Create massive explosion
      for (let i = 0; i < 50; i++) {
        this.particles.push(new Particle(this.player!.x, this.player!.y, '#00ffff', Math.random() * 500 + 200, Math.random() * 5 + 2));
      }

      // Clear enemies in radius
      this.entities.forEach(e => {
        if (e instanceof Enemy) {
          const dist = Math.hypot(e.x - this.player!.x, e.y - this.player!.y);
          if (dist < 400) {
            e.markedForDeletion = true;
            this.createExplosion(e.x, e.y, '#ff0055', 10);
            this.stats.score += 50;
          }
        }
      });
    }
  }

  createExplosion(x: number, y: number, color: string, count: number) {
    for (let i = 0; i < count; i++) {
      this.particles.push(new Particle(x, y, color, Math.random() * 200 + 50, Math.random() * 3 + 1));
    }
  }

  loop(timestamp: number) {
    if (this.state !== 'PLAYING') return;

    const dt = (timestamp - this.lastTime) / 1000;
    this.lastTime = timestamp;

    this.update(dt);
    this.draw();

    this.animationId = requestAnimationFrame((t) => this.loop(t));
  }

  update(dt: number) {
    if (!this.player) return;

    // Player animation
    this.player.angle += 5 * dt;

    // Spawning
    this.spawnTimer += dt;
    if (this.spawnTimer > 1.0 / (1 + this.stats.level * 0.2)) {
      this.spawnTimer = 0;
      if (Math.random() < 0.7) {
        this.entities.push(new Enemy(this.width, this.height, this.player));
      } else {
        this.entities.push(new Orb(this.width, this.height));
      }
    }

    // Update Entities
    this.entities.forEach(e => {
      e.update(dt);

      // Collision with Player
      const dist = Math.hypot(e.x - this.player!.x, e.y - this.player!.y);
      if (dist < e.radius + this.player!.radius) {
        if (e instanceof Enemy) {
          this.state = 'GAME_OVER';
          this.onGameOver(this.stats.score);
        } else if (e instanceof Orb) {
          e.markedForDeletion = true;
          this.stats.score += 10;
          this.stats.energy = Math.min(this.stats.energy + 10, this.stats.maxEnergy);
          this.createExplosion(e.x, e.y, '#00ffaa', 5);
        }
      }
    });

    // Update Particles
    this.particles.forEach(p => p.update(dt));

    // Cleanup
    this.entities = this.entities.filter(e => !e.markedForDeletion &&
      e.x > -100 && e.x < this.width + 100 && e.y > -100 && e.y < this.height + 100);
    this.particles = this.particles.filter(p => !p.markedForDeletion);

    // Energy decay
    this.stats.energy = Math.max(0, this.stats.energy - 2 * dt);

    // Level up
    this.stats.level = 1 + Math.floor(this.stats.score / 500);

    this.onStatsUpdate({ ...this.stats });
  }

  draw() {
    // Clear with trail effect
    this.ctx.fillStyle = 'rgba(10, 10, 20, 0.3)';
    this.ctx.fillRect(0, 0, this.width, this.height);

    this.particles.forEach(p => p.draw(this.ctx));
    this.entities.forEach(e => e.draw(this.ctx));
    if (this.player) this.player.draw(this.ctx);
  }
}
