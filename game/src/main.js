// Lantern Keeper — entry point: the game loop, the state machine
// (title -> playing -> paused -> won/lost), and the wiring between input,
// world, renderer and sound. Loaded as a module from index.html.

import { World } from './world.js';
import { Renderer } from './render.js';
import { Input } from './input.js';
import { SoundBank } from './audio.js';
import { applyShotMode } from './shots.js';

const BEST_KEY = 'lantern-keeper-best';

class Game {
  constructor(canvas) {
    this.canvas = canvas;
    this.renderer = new Renderer(canvas);
    this.input = new Input(canvas);
    this.sounds = new SoundBank();
    this.world = new World(20261116);
    this.state = 'title'; // title | playing | paused | won | lost
    this.best = 0;
    try {
      this.best = Number(window.localStorage.getItem(BEST_KEY) ?? 0) || 0;
    } catch {
      this.best = 0;
    }
    this.lastTime = 0;
    this._announce('Lantern Keeper loaded. Press Enter or click to start.');
    this._attachButtons();
  }

  _attachButtons() {
    // Clicking anywhere on a menu screen starts / restarts the game.
    this.canvas.addEventListener('pointerdown', () => {
      this.sounds.unlock();
      if (this.state === 'title') this.start();
      else if (this.state === 'won' || this.state === 'lost') this.start();
      else if (this.state === 'paused') this.state = 'playing';
    });
  }

  _announce(message) {
    const status = document.getElementById('status');
    if (status) status.textContent = message;
  }

  _saveBest() {
    if (this.world.score > this.best) {
      this.best = this.world.score;
      try {
        window.localStorage.setItem(BEST_KEY, String(this.best));
      } catch {
        // Private browsing or blocked storage: best score is session-only.
      }
      return true;
    }
    return false;
  }

  start() {
    this.world.reset();
    this.state = 'playing';
    this._announce('Playing. Collect fireflies, reach 60 light, avoid the moths.');
  }

  _end(won) {
    this.state = won ? 'won' : 'lost';
    const isBest = this._saveBest();
    this.world.isBest = isBest;
    this.world.best = this.best;
    if (won) this.sounds.win();
    else this.sounds.lose();
    this._announce(won
      ? `You win! The Great Lantern is lit. Final score ${this.world.score}.`
      : `Game over. Final score ${this.world.score}. Press R to play again.`);
  }

  // Movement for this frame: keyboard wins; otherwise, while the mouse
  // button is held, steer toward the pointer.
  _moveVector() {
    if (this.input.hasKeyboardMove()) return this.input.moveVector();
    if (this.input.pointerDown && this.input.pointerInside) {
      const p = this.world.player;
      // Pointer is in canvas pixels; the world is in arena pixels, so
      // convert with the render scale.
      const scale = this.renderer.scale || 1;
      const tx = this.input.pointerX / scale;
      const ty = this.input.pointerY / scale;
      const dx = tx - p.x;
      const dy = ty - p.y;
      const d = Math.hypot(dx, dy);
      if (d > 12) return { x: dx / d, y: dy / d };
    }
    return { x: 0, y: 0 };
  }

  update(dt) {
    const input = this.input;

    if (input.wasPressed('KeyM')) {
      const muted = this.sounds.toggleMute();
      this._announce(muted ? 'Sound muted.' : 'Sound on.');
    }

    if (this.state === 'title') {
      this.world.time += dt; // keep the title's fireflies drifting
      if (input.wasPressed('Enter', 'NumpadEnter')) {
        this.sounds.unlock();
        this.start();
      }
    } else if (this.state === 'playing') {
      if (input.wasPressed('KeyP', 'Escape')) {
        this.state = 'paused';
        this._announce('Paused.');
      } else if (input.wasPressed('KeyR')) {
        this.start();
      } else {
        const move = this._moveVector();
        const dash = input.dashRequested();
        const result = this.world.update(dt, move, dash, this.sounds);
        if (result === 'win') this._end(true);
        else if (result === 'lose') this._end(false);
      }
      this.sounds.updateMusic(dt, this.state === 'playing');
    } else if (this.state === 'paused') {
      if (input.wasPressed('KeyP', 'Escape', 'Enter', 'NumpadEnter')) this.state = 'playing';
      else if (input.wasPressed('KeyR')) this.start();
    } else if (this.state === 'won' || this.state === 'lost') {
      this.world.time += dt; // keep the end screen's blink alive
      if (input.wasPressed('KeyR', 'Enter', 'NumpadEnter')) this.start();
    }

    input.consume();
  }

  draw() {
    const r = this.renderer;
    const w = this.world;
    r.clear();
    if (this.state === 'title') {
      r.drawTitle(w, this.best);
    } else if (this.state === 'paused') {
      r.drawBackground(w);
      this._drawWorld(r, w);
      r.drawHud(w, this.sounds.muted);
      r.drawPause(w);
    } else if (this.state === 'won' || this.state === 'lost') {
      r.drawBackground(w);
      this._drawWorld(r, w);
      r.drawHud(w, this.sounds.muted);
      r.drawEnd(w, this.state === 'won', this.best, Boolean(w.isBest));
    } else {
      r.drawBackground(w);
      this._drawWorld(r, w);
      r.drawHud(w, this.sounds.muted);
    }
  }

  _drawWorld(r, w) {
    for (const f of w.fireflies) r.drawFirefly(f);
    for (const pk of w.pickups) r.drawPickup(pk);
    for (const m of w.moths) r.drawMoth(m, w.freezeTimer > 0);
    r.drawPlayer(w);
    r.drawParticles(w);
    r.drawFloaters(w);
  }

  loop = (timestamp) => {
    const dt = Math.min(0.05, (timestamp - this.lastTime) / 1000 || 0.016);
    this.lastTime = timestamp;
    this.update(dt);
    this.draw();
    window.requestAnimationFrame(this.loop);
  };

  run() {
    this.renderer.resize();
    window.addEventListener('resize', () => this.renderer.resize());
    const shot = applyShotMode(this, new URLSearchParams(window.location.search));
    if (!shot) this.world.time = 0;
    window.requestAnimationFrame(this.loop);
  }
}

// Boot: expose the game for playtesting (window.__game) and start the loop.
const canvas = document.getElementById('game');
const game = new Game(canvas);
window.__game = game;
game.run();
