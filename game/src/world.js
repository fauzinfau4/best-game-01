// Lantern Keeper — the world: every entity, rule and number that changes
// while playing. Rendering lives in render.js; this file only simulates.
// The keeper gathers fireflies to feed the lantern, dodges shadow moths,
// and wins by reaching GOAL.lightToWin light before losing all lives.

import { ARENA, PLAYER, GOAL, FIREFLY, MOTH, PICKUP, COMBO, LEVEL, PARTICLES, COLORS } from './config.js';
import { makeRng, range, rangeInt, pick, randomPointInArena } from './random.js';

const TAU = Math.PI * 2;

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function distance(a, b) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

export class World {
  constructor(seed = 20261116) {
    this.rng = makeRng(seed);
    this.seed = seed;
    this.time = 0;
    this.reset();
  }

  reset() {
    this.rng = makeRng(this.seed);
    this.time = 0;
    this.score = 0;
    this.light = 30; // the lantern starts a third full
    this.lives = GOAL.livesStart;
    this.level = 1;
    this.combo = 0;
    this.comboTimer = 0;
    this.comboBest = 0;
    this.collected = 0;
    this.mothsBurned = 0;
    this.mothsScattered = 0;
    this.dashes = 0;
    this.mothTimer = MOTH.baseInterval;
    this.pickupTimer = PICKUP.interval;
    this.freezeTimer = 0;
    this.invulnerableTimer = 0;
    this.banner = null; // { text, sub, timer }
    this.player = {
      x: ARENA.width / 2,
      y: ARENA.height / 2,
      vx: 0,
      vy: 0,
      angle: -Math.PI / 2,
      dashTimer: 0,
      dashCooldown: 0,
      trail: [],
    };
    this.fireflies = [];
    this.moths = [];
    this.pickups = [];
    this.particles = [];
    this.floaters = []; // floating "+10" score texts
    this.stars = this._makeStars();
    for (let i = 0; i < FIREFLY.baseCount; i++) this._spawnFirefly();
    this._spawnMoth(true);
  }

  _makeStars() {
    const stars = [];
    for (let i = 0; i < 90; i++) {
      stars.push({
        x: this.rng() * ARENA.width,
        y: this.rng() * ARENA.height,
        r: range(this.rng, 0.6, 2.2),
        twinkle: range(this.rng, 0, TAU),
        speed: range(this.rng, 0.4, 1.4),
      });
    }
    return stars;
  }

  _spawnFirefly() {
    const p = randomPointInArena(this.rng, ARENA.width, ARENA.height, ARENA.margin);
    this.fireflies.push({
      x: p.x,
      y: p.y,
      phase: range(this.rng, 0, TAU),
      driftAngle: range(this.rng, 0, TAU),
      driftSpeed: range(this.rng, FIREFLY.drift * 0.4, FIREFLY.drift),
      pulse: range(this.rng, 0.8, 1.4),
      kind: this.rng() < 0.12 ? 'ember' : 'gold', // embers are worth double light
    });
  }

  _spawnMoth(edge = false) {
    const margin = ARENA.margin;
    let x;
    let y;
    if (edge) {
      const side = rangeInt(this.rng, 0, 3);
      if (side === 0) { x = range(this.rng, margin, ARENA.width - margin); y = margin + 10; }
      else if (side === 1) { x = range(this.rng, margin, ARENA.width - margin); y = ARENA.height - margin - 10; }
      else if (side === 2) { x = margin + 10; y = range(this.rng, margin, ARENA.height - margin); }
      else { x = ARENA.width - margin - 10; y = range(this.rng, margin, ARENA.height - margin); }
    } else {
      const p = randomPointInArena(this.rng, ARENA.width, ARENA.height, margin);
      x = p.x;
      y = p.y;
    }
    this.moths.push({
      x,
      y,
      phase: range(this.rng, 0, TAU),
      wobble: range(this.rng, 0.6, 1.6),
      speed: Math.min(MOTH.baseSpeed + (this.level - 1) * MOTH.perLevel, MOTH.maxSpeed),
      wing: range(this.rng, 0, TAU),
    });
  }

  _spawnPickup() {
    const p = randomPointInArena(this.rng, ARENA.width, ARENA.height, ARENA.margin);
    const kind = this.lives < GOAL.livesMax && this.rng() < 0.35 ? 'heart' : 'moonpetal';
    this.pickups.push({ x: p.x, y: p.y, kind, phase: range(this.rng, 0, TAU), life: 12 });
  }

  _burst(x, y, color, count, speed) {
    for (let i = 0; i < count; i++) {
      if (this.particles.length >= PARTICLES.max) return;
      const angle = this.rng() * TAU;
      const v = range(this.rng, speed * 0.3, speed);
      this.particles.push({
        x, y,
        vx: Math.cos(angle) * v,
        vy: Math.sin(angle) * v,
        life: range(this.rng, 0.35, 0.8),
        maxLife: 0.8,
        size: range(this.rng, 2, 5),
        color,
      });
    }
  }

  _floater(x, y, text, color) {
    this.floaters.push({ x, y, text, color, life: 1.1, maxLife: 1.1 });
  }

  _showBanner(text, sub) {
    this.banner = { text, sub, timer: 2.4 };
  }

  // The lantern's brightness right now: 0 (dark) to 1 (blazing).
  lightFraction() {
    return clamp(this.light / GOAL.lightToWin, 0, 1);
  }

  isBright() {
    return this.light >= PLAYER.brightThreshold;
  }

  comboMultiplier() {
    return 1 + Math.min(this.combo, 8) * COMBO.step;
  }

  fireflyTarget() {
    return Math.min(FIREFLY.baseCount + (this.level - 1) * FIREFLY.perLevel, FIREFLY.maxCount);
  }

  mothInterval() {
    return Math.max(MOTH.baseInterval - (this.level - 1) * MOTH.perLevel, MOTH.minInterval);
  }

  // One simulation step. `move` is {x, y} normalized, `dash` a boolean,
  // `sounds` the SoundBank. Returns 'win' | 'lose' | null.
  update(dt, move, dash, sounds) {
    this.time += dt;
    const p = this.player;

    // --- level ramp: the garden deepens every LEVEL.secondsPerLevel ---
    const newLevel = Math.min(Math.floor(this.time / LEVEL.secondsPerLevel) + 1, LEVEL.maxLevel);
    if (newLevel > this.level) {
      this.level = newLevel;
      this._showBanner(`LEVEL ${this.level}`, 'The garden grows darker…');
      sounds.levelUp();
    }

    // --- timers ---
    if (this.freezeTimer > 0) this.freezeTimer -= dt;
    if (this.invulnerableTimer > 0) this.invulnerableTimer -= dt;
    if (this.comboTimer > 0) {
      this.comboTimer -= dt;
      if (this.comboTimer <= 0) this.combo = 0;
    }
    if (this.banner) {
      this.banner.timer -= dt;
      if (this.banner.timer <= 0) this.banner = null;
    }

    // --- the lantern slowly dims; collecting is the only way to feed it ---
    this.light = Math.max(0, this.light - PLAYER.lightDrainPerSecond * dt);

    // --- dash ---
    if (p.dashCooldown > 0) p.dashCooldown -= dt;
    if (dash && p.dashCooldown <= 0 && p.dashTimer <= 0) {
      p.dashTimer = PLAYER.dashTime;
      p.dashCooldown = PLAYER.dashCooldown;
      this.dashes += 1;
      sounds.dash();
      this._burst(p.x, p.y, COLORS.gold, 10, 160);
    }

    // --- movement: keyboard vector, or steer toward the held pointer ---
    let speed = PLAYER.speed;
    if (p.dashTimer > 0) {
      p.dashTimer -= dt;
      speed = PLAYER.dashSpeed;
    }
    const vx = move.x * speed;
    const vy = move.y * speed;
    // Smooth acceleration so the keeper feels weighty, not teleporty.
    const accel = p.dashTimer > 0 ? 18 : 11;
    p.vx += (vx - p.vx) * Math.min(1, accel * dt);
    p.vy += (vy - p.vy) * Math.min(1, accel * dt);
    p.x = clamp(p.x + p.vx * dt, ARENA.margin + PLAYER.radius, ARENA.width - ARENA.margin - PLAYER.radius);
    p.y = clamp(p.y + p.vy * dt, ARENA.margin + PLAYER.radius, ARENA.height - ARENA.margin - PLAYER.radius);
    if (Math.hypot(p.vx, p.vy) > 20) p.angle = Math.atan2(p.vy, p.vx);
    p.trail.unshift({ x: p.x, y: p.y });
    if (p.trail.length > 14) p.trail.pop();

    // --- fireflies drift and pulse ---
    for (const f of this.fireflies) {
      f.phase += dt * 2;
      f.driftAngle += (this.rng() - 0.5) * dt * 1.4;
      f.x = clamp(f.x + Math.cos(f.driftAngle) * f.driftSpeed * dt, ARENA.margin + 12, ARENA.width - ARENA.margin - 12);
      f.y = clamp(f.y + Math.sin(f.driftAngle) * f.driftSpeed * dt, ARENA.margin + 12, ARENA.height - ARENA.margin - 12);
    }
    while (this.fireflies.length < this.fireflyTarget()) this._spawnFirefly();

    // --- moths spawn and hunt ---
    this.mothTimer -= dt;
    if (this.mothTimer <= 0) {
      this.mothTimer = this.mothInterval();
      this._spawnMoth(true);
    }
    const frozen = this.freezeTimer > 0;
    for (const m of this.moths) {
      m.phase += dt * 3;
      m.wing += dt * (frozen ? 1 : 14);
      if (frozen) continue;
      const dx = p.x - m.x;
      const dy = p.y - m.y;
      const d = Math.hypot(dx, dy) || 1;
      // A bright lantern pushes moths back; a dim one draws them in faster.
      const repel = this.isBright() ? -0.55 : 0;
      const chase = this.light <= 0 ? 1.25 : 1;
      const wobble = Math.sin(m.phase * m.wobble) * 0.35;
      const ax = dx / d + -dy / d * wobble + (dx / d) * repel;
      const ay = dy / d + dx / d * wobble + (dy / d) * repel;
      const alen = Math.hypot(ax, ay) || 1;
      m.x += (ax / alen) * m.speed * chase * dt;
      m.y += (ay / alen) * m.speed * chase * dt;
    }

    // --- bonus pickups ---
    this.pickupTimer -= dt;
    if (this.pickupTimer <= 0) {
      this.pickupTimer = PICKUP.interval;
      this._spawnPickup();
    }
    for (const pk of this.pickups) {
      pk.phase += dt * 2;
      pk.life -= dt;
    }
    this.pickups = this.pickups.filter((pk) => pk.life > 0);

    // --- collect fireflies ---
    for (let i = this.fireflies.length - 1; i >= 0; i--) {
      const f = this.fireflies[i];
      if (distance(p, f) < PLAYER.radius + FIREFLY.radius + 6) {
        this.fireflies.splice(i, 1);
        this.collected += 1;
        this.combo += 1;
        this.comboTimer = COMBO.windowSeconds;
        this.comboBest = Math.max(this.comboBest, this.combo);
        const mult = this.comboMultiplier();
        const lightGain = f.kind === 'ember' ? FIREFLY.lightValue * 2 : FIREFLY.lightValue;
        const gained = Math.round(FIREFLY.scoreValue * mult);
        this.score += gained;
        this.light = Math.min(GOAL.lightToWin, this.light + lightGain);
        this._burst(f.x, f.y, f.kind === 'ember' ? COLORS.ember : COLORS.gold, 12, 180);
        this._floater(f.x, f.y - 14, `+${gained}`, COLORS.gold);
        if (this.combo >= 3) this._floater(f.x, f.y - 34, `COMBO x${mult.toFixed(2)}`, COLORS.moon);
        sounds.pickup(this.combo);
        this._spawnFirefly();
      }
    }

    // --- collect pickups ---
    for (let i = this.pickups.length - 1; i >= 0; i--) {
      const pk = this.pickups[i];
      if (distance(p, pk) < PLAYER.radius + 18) {
        this.pickups.splice(i, 1);
        if (pk.kind === 'moonpetal') {
          this.freezeTimer = PICKUP.freezeSeconds;
          this.score += 30;
          this._floater(pk.x, pk.y - 16, 'FROZEN!', COLORS.moon);
          this._burst(pk.x, pk.y, COLORS.moon, 18, 200);
          sounds.freeze();
        } else {
          this.lives = Math.min(GOAL.livesMax, this.lives + 1);
          this.score += 20;
          this._floater(pk.x, pk.y - 16, '+1 LIFE', COLORS.heart);
          this._burst(pk.x, pk.y, COLORS.heart, 18, 200);
          sounds.pickup(4);
        }
      }
    }

    // --- moths: bright lantern burns them, a dash scatters them, else they bite ---
    for (let i = this.moths.length - 1; i >= 0; i--) {
      const m = this.moths[i];
      const d = distance(p, m);
      if (d < PLAYER.radius + MOTH.radius) {
        if (p.dashTimer > 0) {
          this.moths.splice(i, 1);
          this.mothsScattered += 1;
          this.score += MOTH.scatterScore;
          this._burst(m.x, m.y, COLORS.mothEye, 16, 220);
          this._floater(m.x, m.y - 16, `+${MOTH.scatterScore} SCATTERED`, COLORS.mothEye);
          sounds.mothBurn();
          continue;
        }
        if (this.isBright()) {
          this.moths.splice(i, 1);
          this.mothsBurned += 1;
          this.score += MOTH.burnScore;
          this._burst(m.x, m.y, COLORS.gold, 20, 240);
          this._floater(m.x, m.y - 16, `+${MOTH.burnScore} BURNED`, COLORS.gold);
          sounds.mothBurn();
          continue;
        }
        if (this.invulnerableTimer <= 0) {
          this.lives -= 1;
          this.invulnerableTimer = 2;
          this.combo = 0;
          this._burst(p.x, p.y, COLORS.mothEye, 24, 260);
          sounds.hurt();
          if (this.lives <= 0) {
            this._burst(p.x, p.y, COLORS.gold, 40, 320);
            return 'lose';
          }
          this._showBanner('OUCH!', 'A shadow moth bit your lantern');
        }
      }
    }

    // --- particles and floaters age out ---
    for (const pt of this.particles) {
      pt.life -= dt;
      pt.x += pt.vx * dt;
      pt.y += pt.vy * dt;
      pt.vx *= 0.96;
      pt.vy *= 0.96;
    }
    this.particles = this.particles.filter((pt) => pt.life > 0);
    for (const fl of this.floaters) {
      fl.life -= dt;
      fl.y -= 34 * dt;
    }
    this.floaters = this.floaters.filter((fl) => fl.life > 0);

    // --- win: the Great Lantern ignites ---
    if (this.light >= GOAL.lightToWin) {
      this._burst(ARENA.width / 2, 120, COLORS.gold, 60, 380);
      return 'win';
    }
    return null;
  }
}
