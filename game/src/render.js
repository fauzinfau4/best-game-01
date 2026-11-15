// Lantern Keeper — everything the player sees, drawn on one 2D canvas.
// The garden is procedural: twinkling stars, a hedge border, glowing
// fireflies, winged shadow moths, and a big readable HUD. No image files.

import { ARENA, PLAYER, GOAL, FIREFLY, MOTH, COLORS } from './config.js';

const TAU = Math.PI * 2;

// A soft radial glow, drawn with a gradient so nothing needs an image.
function glowCircle(ctx, x, y, radius, color, alpha) {
  const g = ctx.createRadialGradient(x, y, 0, x, y, radius);
  g.addColorStop(0, color);
  g.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.globalAlpha = alpha;
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, TAU);
  ctx.fill();
  ctx.globalAlpha = 1;
}

function text(ctx, str, x, y, size, color, align = 'center', weight = 800) {
  ctx.font = `${weight} ${size}px "Trebuchet MS", Verdana, sans-serif`;
  ctx.textAlign = align;
  ctx.textBaseline = 'middle';
  ctx.fillStyle = color;
  ctx.fillText(str, x, y);
}

function outlinedText(ctx, str, x, y, size, color, align = 'center', weight = 900) {
  ctx.font = `${weight} ${size}px "Trebuchet MS", Verdana, sans-serif`;
  ctx.textAlign = align;
  ctx.textBaseline = 'middle';
  ctx.lineWidth = Math.max(3, size / 9);
  ctx.strokeStyle = 'rgba(5,7,15,0.9)';
  ctx.strokeText(str, x, y);
  ctx.fillStyle = color;
  ctx.fillText(str, x, y);
}

export class Renderer {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
  }

  // Fit the 1280x800 arena into the window while keeping its shape.
  resize() {
    const scale = Math.min(window.innerWidth / ARENA.width, window.innerHeight / ARENA.height);
    this.canvas.width = Math.floor(ARENA.width * scale);
    this.canvas.height = Math.floor(ARENA.height * scale);
    this.scale = scale;
  }

  // Arena coordinates -> canvas pixels (the canvas is exactly the arena,
  // scaled, so this is one multiply).
  toCanvas(x, y) {
    return { x: x * this.scale, y: y * this.scale };
  }

  clear() {
    const ctx = this.ctx;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = COLORS.nightDeep;
    ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    ctx.scale(this.scale, this.scale);
  }

  drawBackground(world) {
    const ctx = this.ctx;
    // Night gradient.
    const g = ctx.createLinearGradient(0, 0, 0, ARENA.height);
    g.addColorStop(0, COLORS.night);
    g.addColorStop(1, COLORS.nightDeep);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, ARENA.width, ARENA.height);

    // Twinkling stars.
    for (const s of world.stars) {
      const tw = 0.35 + 0.65 * Math.abs(Math.sin(world.time * s.speed + s.twinkle));
      ctx.globalAlpha = tw * 0.8;
      ctx.fillStyle = '#dfe8ff';
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.r, 0, TAU);
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    // Faint grass tufts for texture.
    ctx.strokeStyle = 'rgba(60,110,80,0.35)';
    ctx.lineWidth = 2;
    for (let i = 0; i < 40; i++) {
      const x = ((i * 173) % ARENA.width) + 20;
      const y = ((i * 311) % ARENA.height) + 20;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x - 4, y - 9);
      ctx.moveTo(x + 4, y);
      ctx.lineTo(x + 8, y - 10);
      ctx.stroke();
    }

    // The Great Lantern: a tall stone lantern at the top centre, waiting
    // to be lit. Its glow grows with the light meter.
    const lx = ARENA.width / 2;
    const ly = 118;
    const lit = world.lightFraction();
    glowCircle(ctx, lx, ly, 60 + lit * 150, COLORS.gold, 0.12 + lit * 0.5);
    ctx.fillStyle = '#3a3f52';
    ctx.fillRect(lx - 26, ly + 18, 52, 14);
    ctx.fillRect(lx - 18, ly - 34, 36, 52);
    ctx.fillStyle = lit > 0.05 ? COLORS.gold : '#2c3145';
    ctx.beginPath();
    ctx.arc(lx, ly - 8, 11, 0, TAU);
    ctx.fill();
    ctx.fillStyle = '#4a5068';
    ctx.beginPath();
    ctx.moveTo(lx - 30, ly - 34);
    ctx.lineTo(lx, ly - 58);
    ctx.lineTo(lx + 30, ly - 34);
    ctx.closePath();
    ctx.fill();
    text(ctx, 'THE GREAT LANTERN', lx, ly + 52, 13, COLORS.dim, 'center', 700);
    // Progress ring around it.
    ctx.strokeStyle = 'rgba(255,215,106,0.25)';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(lx, ly - 8, 26, -Math.PI / 2, -Math.PI / 2 + TAU * lit);
    ctx.stroke();

    // Hedge border: the garden wall.
    ctx.fillStyle = COLORS.hedge;
    ctx.fillRect(0, 0, ARENA.width, ARENA.margin);
    ctx.fillRect(0, ARENA.height - ARENA.margin, ARENA.width, ARENA.margin);
    ctx.fillRect(0, 0, ARENA.margin, ARENA.height);
    ctx.fillRect(ARENA.width - ARENA.margin, 0, ARENA.margin, ARENA.height);
    ctx.fillStyle = COLORS.hedgeLight;
    for (let x = 8; x < ARENA.width; x += 46) {
      ctx.beginPath();
      ctx.arc(x, 18, 12, 0, TAU);
      ctx.arc(x, ARENA.height - 18, 12, 0, TAU);
      ctx.fill();
    }
    for (let y = 8; y < ARENA.height; y += 46) {
      ctx.beginPath();
      ctx.arc(18, y, 12, 0, TAU);
      ctx.arc(ARENA.width - 18, y, 12, 0, TAU);
      ctx.fill();
    }
  }

  drawFirefly(f) {
    const ctx = this.ctx;
    const pulse = 0.75 + 0.25 * Math.sin(f.phase);
    const color = f.kind === 'ember' ? COLORS.ember : COLORS.gold;
    glowCircle(ctx, f.x, f.y, 26 * pulse, color, 0.5);
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(f.x, f.y, FIREFLY.radius * 0.62 * pulse, 0, TAU);
    ctx.fill();
    ctx.fillStyle = '#fff8dd';
    ctx.beginPath();
    ctx.arc(f.x - 2, f.y - 2, 3.4, 0, TAU);
    ctx.fill();
    if (f.kind === 'ember') {
      ctx.strokeStyle = COLORS.ember;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(f.x, f.y, FIREFLY.radius + 3, 0, TAU);
      ctx.stroke();
    }
  }

  drawMoth(m, frozen) {
    const ctx = this.ctx;
    const flap = Math.sin(m.wing) * 0.55;
    const body = frozen ? '#7fa8c9' : COLORS.moth;
    // Wings.
    ctx.fillStyle = frozen ? '#5d7f9e' : '#3a324e';
    ctx.save();
    ctx.translate(m.x, m.y);
    ctx.rotate(Math.sin(m.phase * 0.7) * 0.2);
    ctx.beginPath();
    ctx.ellipse(-13, -6 * flap - 4, 15, 9, -0.5, 0, TAU);
    ctx.ellipse(13, -6 * flap - 4, 15, 9, 0.5, 0, TAU);
    ctx.ellipse(-12, 8, 12, 7, 0.4, 0, TAU);
    ctx.ellipse(12, 8, 12, 7, -0.4, 0, TAU);
    ctx.fill();
    ctx.restore();
    // Body.
    ctx.fillStyle = body;
    ctx.beginPath();
    ctx.ellipse(m.x, m.y, 8, MOTH.radius * 0.72, 0, 0, TAU);
    ctx.fill();
    // Glowing eyes.
    ctx.fillStyle = frozen ? '#bfe3ff' : COLORS.mothEye;
    ctx.beginPath();
    ctx.arc(m.x - 4, m.y - 8, 2.6, 0, TAU);
    ctx.arc(m.x + 4, m.y - 8, 2.6, 0, TAU);
    ctx.fill();
    // Antennae.
    ctx.strokeStyle = body;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(m.x - 3, m.y - 12);
    ctx.quadraticCurveTo(m.x - 10, m.y - 22, m.x - 14, m.y - 24);
    ctx.moveTo(m.x + 3, m.y - 12);
    ctx.quadraticCurveTo(m.x + 10, m.y - 22, m.x + 14, m.y - 24);
    ctx.stroke();
  }

  drawPickup(pk) {
    const ctx = this.ctx;
    const bob = Math.sin(pk.phase) * 4;
    const y = pk.y + bob;
    if (pk.kind === 'moonpetal') {
      glowCircle(ctx, pk.x, y, 34, COLORS.moon, 0.55);
      ctx.fillStyle = COLORS.moon;
      for (let i = 0; i < 5; i++) {
        const a = (i / 5) * TAU - Math.PI / 2;
        ctx.beginPath();
        ctx.ellipse(pk.x + Math.cos(a) * 9, y + Math.sin(a) * 9, 7, 10, a, 0, TAU);
        ctx.fill();
      }
      ctx.fillStyle = '#fff';
      ctx.beginPath();
      ctx.arc(pk.x, y, 5, 0, TAU);
      ctx.fill();
      text(ctx, 'FREEZE', pk.x, y + 30, 12, COLORS.moon, 'center', 800);
    } else {
      glowCircle(ctx, pk.x, y, 34, COLORS.heart, 0.55);
      ctx.fillStyle = COLORS.heart;
      ctx.beginPath();
      ctx.moveTo(pk.x, y + 10);
      ctx.bezierCurveTo(pk.x - 16, y - 4, pk.x - 10, y - 16, pk.x, y - 7);
      ctx.bezierCurveTo(pk.x + 10, y - 16, pk.x + 16, y - 4, pk.x, y + 10);
      ctx.fill();
      text(ctx, '+1 LIFE', pk.x, y + 30, 12, COLORS.heart, 'center', 800);
    }
  }

  drawPlayer(world) {
    const ctx = this.ctx;
    const p = world.player;
    const bright = world.isBright();
    const blink = world.invulnerableTimer > 0 && Math.floor(world.time * 12) % 2 === 0;
    if (blink) ctx.globalAlpha = 0.35;

    // Dash trail.
    for (let i = 0; i < p.trail.length; i++) {
      const t = p.trail[i];
      ctx.globalAlpha = (1 - i / p.trail.length) * 0.35;
      ctx.fillStyle = COLORS.gold;
      ctx.beginPath();
      ctx.arc(t.x, t.y, PLAYER.radius * (1 - i / p.trail.length) * 0.7, 0, TAU);
      ctx.fill();
    }
    ctx.globalAlpha = blink ? 0.35 : 1;

    // Lantern glow: the keeper's light, brighter as the meter fills.
    const glowR = 70 + world.lightFraction() * 130;
    glowCircle(ctx, p.x, p.y, glowR, COLORS.gold, 0.28 + world.lightFraction() * 0.35);

    // Body: a little hooded keeper.
    ctx.fillStyle = '#7a5c3e';
    ctx.beginPath();
    ctx.arc(p.x, p.y, PLAYER.radius, 0, TAU);
    ctx.fill();
    // Hood.
    ctx.fillStyle = '#4d6b4f';
    ctx.beginPath();
    ctx.arc(p.x, p.y - 4, 14, Math.PI, 0);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(p.x - 14, p.y - 4);
    ctx.lineTo(p.x, p.y - 24);
    ctx.lineTo(p.x + 14, p.y - 4);
    ctx.closePath();
    ctx.fill();
    // Face.
    ctx.fillStyle = '#f4d7b0';
    ctx.beginPath();
    ctx.arc(p.x, p.y - 2, 8, 0, TAU);
    ctx.fill();
    ctx.fillStyle = '#222';
    ctx.beginPath();
    ctx.arc(p.x - 3, p.y - 3, 1.4, 0, TAU);
    ctx.arc(p.x + 3, p.y - 3, 1.4, 0, TAU);
    ctx.fill();
    // The lantern, swinging in the facing direction.
    const lx = p.x + Math.cos(p.angle) * 24;
    const ly = p.y + Math.sin(p.angle) * 24;
    ctx.strokeStyle = '#8a6d3b';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(p.x, p.y + 4);
    ctx.lineTo(lx, ly);
    ctx.stroke();
    glowCircle(ctx, lx, ly, 22, COLORS.gold, 0.9);
    ctx.fillStyle = '#3a3f52';
    ctx.fillRect(lx - 7, ly - 9, 14, 18);
    ctx.fillStyle = bright ? '#fff3b0' : COLORS.gold;
    ctx.fillRect(lx - 4, ly - 5, 8, 10);

    // Dash cooldown ring.
    if (p.dashCooldown > 0) {
      const frac = 1 - p.dashCooldown / 1.1;
      ctx.strokeStyle = 'rgba(255,215,106,0.7)';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(p.x, p.y, PLAYER.radius + 9, -Math.PI / 2, -Math.PI / 2 + TAU * frac);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
  }

  drawParticles(world) {
    const ctx = this.ctx;
    for (const pt of world.particles) {
      ctx.globalAlpha = Math.max(0, pt.life / pt.maxLife);
      ctx.fillStyle = pt.color;
      ctx.beginPath();
      ctx.arc(pt.x, pt.y, pt.size, 0, TAU);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  drawFloaters(world) {
    const ctx = this.ctx;
    for (const fl of world.floaters) {
      ctx.globalAlpha = Math.max(0, fl.life / fl.maxLife);
      outlinedText(ctx, fl.text, fl.x, fl.y, 20, fl.color);
    }
    ctx.globalAlpha = 1;
  }

  drawHud(world, muted) {
    const ctx = this.ctx;
    const top = 14;
    // Score, left.
    text(ctx, 'SCORE', 70, top + 8, 13, COLORS.dim, 'left', 700);
    outlinedText(ctx, String(world.score), 70, top + 32, 30, COLORS.ink, 'left');
    // Light meter, centre: the goal bar.
    const barW = 420;
    const barX = ARENA.width / 2 - barW / 2;
    const barY = top + 6;
    text(ctx, 'LANTERN LIGHT', ARENA.width / 2, barY - 2, 13, COLORS.dim, 'center', 700);
    ctx.fillStyle = 'rgba(5,7,15,0.75)';
    ctx.fillRect(barX - 4, barY + 10, barW + 8, 26);
    ctx.strokeStyle = '#3a3f52';
    ctx.lineWidth = 2;
    ctx.strokeRect(barX - 4, barY + 10, barW + 8, 26);
    const fillW = barW * world.lightFraction();
    const grad = ctx.createLinearGradient(barX, 0, barX + barW, 0);
    grad.addColorStop(0, COLORS.goldDeep);
    grad.addColorStop(1, COLORS.gold);
    ctx.fillStyle = grad;
    ctx.fillRect(barX, barY + 10, fillW, 26);
    // Bright threshold tick.
    const tickX = barX + barW * (55 / GOAL.lightToWin);
    ctx.strokeStyle = COLORS.moon;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(tickX, barY + 8);
    ctx.lineTo(tickX, barY + 38);
    ctx.stroke();
    text(ctx, `${Math.floor(world.light)} / ${GOAL.lightToWin}`, ARENA.width / 2, barY + 23, 16, '#1a1405', 'center', 900);
    if (world.isBright()) {
      text(ctx, '✦ BRIGHT — moths burn on touch ✦', ARENA.width / 2, barY + 52, 14, COLORS.gold, 'center', 800);
    }
    // Lives, right.
    text(ctx, 'LIVES', ARENA.width - 70, top + 8, 13, COLORS.dim, 'right', 700);
    for (let i = 0; i < GOAL.livesMax; i++) {
      const x = ARENA.width - 70 - (GOAL.livesMax - 1 - i) * 34;
      const y = top + 32;
      ctx.fillStyle = i < world.lives ? COLORS.heart : 'rgba(255,107,129,0.18)';
      ctx.beginPath();
      ctx.moveTo(x, y + 8);
      ctx.bezierCurveTo(x - 13, y - 3, x - 8, y - 13, x, y - 6);
      ctx.bezierCurveTo(x + 8, y - 13, x + 13, y - 3, x, y + 8);
      ctx.fill();
    }
    // Second row: level, combo, time, freeze.
    const rowY = top + 66;
    text(ctx, `LEVEL ${world.level}`, 70, rowY, 17, COLORS.moon, 'left', 800);
    if (world.combo >= 2) {
      text(ctx, `COMBO x${world.comboMultiplier().toFixed(2)}  (${world.combo})`, 70, rowY + 24, 16, COLORS.gold, 'left', 800);
    }
    const mins = Math.floor(world.time / 60);
    const secs = Math.floor(world.time % 60);
    text(ctx, `${mins}:${String(secs).padStart(2, '0')}`, ARENA.width - 70, rowY, 17, COLORS.ink, 'right', 800);
    if (world.freezeTimer > 0) {
      text(ctx, `❄ MOTHS FROZEN ${world.freezeTimer.toFixed(1)}s`, ARENA.width - 70, rowY + 24, 16, COLORS.moon, 'right', 800);
    }
    if (muted) text(ctx, '🔇 MUTED (M)', ARENA.width - 70, rowY + 48, 14, COLORS.dim, 'right', 700);
    // Controls reminder, bottom.
    text(ctx, 'WASD / arrows move  •  hold mouse to steer  •  SPACE / click to dash  •  P pause  •  M mute', ARENA.width / 2, ARENA.height - 18, 14, COLORS.dim, 'center', 600);
    // Level banner.
    if (world.banner) {
      const a = Math.min(1, world.banner.timer);
      ctx.globalAlpha = a;
      outlinedText(ctx, world.banner.text, ARENA.width / 2, ARENA.height / 2 - 120, 52, COLORS.gold);
      outlinedText(ctx, world.banner.sub, ARENA.width / 2, ARENA.height / 2 - 78, 22, COLORS.ink);
      ctx.globalAlpha = 1;
    }
  }

  // A dim veil behind menu screens so text stays readable.
  veil(alpha) {
    const ctx = this.ctx;
    ctx.fillStyle = `rgba(5,7,15,${alpha})`;
    ctx.fillRect(0, 0, ARENA.width, ARENA.height);
  }

  drawTitle(world, best) {
    const ctx = this.ctx;
    this.drawBackground(world);
    // A few decorative fireflies drift behind the title.
    for (const f of world.fireflies.slice(0, 6)) this.drawFirefly(f);
    this.veil(0.55);
    const cx = ARENA.width / 2;
    glowCircle(ctx, cx, 190, 220, COLORS.gold, 0.35);
    outlinedText(ctx, 'LANTERN', cx, 150, 84, COLORS.gold);
    outlinedText(ctx, 'KEEPER', cx, 232, 84, COLORS.gold);
    text(ctx, 'Light the Great Lantern before the shadows take you', cx, 296, 22, COLORS.ink, 'center', 700);
    // How to play, in a readable panel.
    ctx.fillStyle = 'rgba(5,7,15,0.72)';
    ctx.fillRect(cx - 330, 330, 660, 190);
    ctx.strokeStyle = '#3a3f52';
    ctx.lineWidth = 2;
    ctx.strokeRect(cx - 330, 330, 660, 190);
    text(ctx, 'HOW TO PLAY', cx, 356, 20, COLORS.gold, 'center', 800);
    const lines = [
      '✦  Collect fireflies to feed your lantern — reach 60 light to WIN.',
      '✦  Shadow moths hunt you. At 55+ light your lantern BURNS them.',
      '✦  Dash through a moth to scatter it. Moonpetals freeze the swarm.',
      '✦  Your light slowly fades — keep collecting! 3 lives. Good luck.',
    ];
    lines.forEach((line, i) => text(ctx, line, cx, 388 + i * 28, 18, COLORS.ink, 'center', 600));
    text(ctx, 'WASD / ARROWS move   •   HOLD MOUSE to steer   •   SPACE / CLICK to dash', cx, 556, 19, COLORS.moon, 'center', 800);
    text(ctx, 'P pause    •    M mute    •    R restart', cx, 586, 17, COLORS.dim, 'center', 700);
    // Start prompt, gently pulsing so it is always visible in screenshots.
    this.ctx.globalAlpha = 0.7 + 0.3 * Math.sin(world.time * 3);
    outlinedText(ctx, '▶  PRESS ENTER OR CLICK TO START  ◀', cx, 648, 28, '#ffffff');
    this.ctx.globalAlpha = 1;
    if (best > 0) text(ctx, `BEST SCORE: ${best}`, cx, 700, 20, COLORS.gold, 'center', 800);
  }

  drawPause(world) {
    this.veil(0.6);
    outlinedText(this.ctx, 'PAUSED', ARENA.width / 2, ARENA.height / 2 - 30, 64, COLORS.ink);
    text(this.ctx, 'Press P or click to resume  •  R to restart', ARENA.width / 2, ARENA.height / 2 + 36, 22, COLORS.moon, 'center', 700);
  }

  drawEnd(world, won, best, isBest) {
    const ctx = this.ctx;
    this.veil(0.62);
    const cx = ARENA.width / 2;
    if (won) {
      glowCircle(ctx, cx, 190, 260, COLORS.gold, 0.5);
      outlinedText(ctx, 'THE LANTERN', cx, 150, 64, COLORS.gold);
      outlinedText(ctx, 'IS LIT!', cx, 222, 64, COLORS.gold);
      text(ctx, 'The Great Lantern blazes — the garden is safe tonight.', cx, 282, 22, COLORS.ink, 'center', 700);
    } else {
      outlinedText(ctx, 'THE LIGHT', cx, 150, 64, COLORS.mothEye);
      outlinedText(ctx, 'WENT OUT', cx, 222, 64, COLORS.mothEye);
      text(ctx, 'The shadow moths close in… the garden waits for another keeper.', cx, 282, 22, COLORS.ink, 'center', 700);
    }
    // Results panel.
    ctx.fillStyle = 'rgba(5,7,15,0.78)';
    ctx.fillRect(cx - 300, 320, 600, 230);
    ctx.strokeStyle = '#3a3f52';
    ctx.lineWidth = 2;
    ctx.strokeRect(cx - 300, 320, 600, 230);
    text(ctx, 'FINAL SCORE', cx, 350, 18, COLORS.dim, 'center', 700);
    outlinedText(ctx, String(world.score), cx, 398, 56, COLORS.gold);
    const rows = [
      ['Fireflies gathered', String(world.collected)],
      ['Moths burned / scattered', `${world.mothsBurned} / ${world.mothsScattered}`],
      ['Best combo', `x${(1 + Math.min(world.comboBest, 8) * 0.25).toFixed(2)} (${world.comboBest})`],
      ['Dashes', String(world.dashes)],
      ['Time survived', `${Math.floor(world.time / 60)}:${String(Math.floor(world.time % 60)).padStart(2, '0')}`],
      ['Level reached', String(world.level)],
    ];
    // Two-column stat grid.
    const left = rows.slice(0, 3);
    const right = rows.slice(3);
    left.forEach(([label, value], i) => {
      text(ctx, label, cx - 280, 452 + i * 26, 15, COLORS.dim, 'left', 600);
      text(ctx, value, cx - 20, 452 + i * 26, 15, COLORS.ink, 'right', 800);
    });
    right.forEach(([label, value], i) => {
      text(ctx, label, cx + 20, 452 + i * 26, 15, COLORS.dim, 'left', 600);
      text(ctx, value, cx + 280, 452 + i * 26, 15, COLORS.ink, 'right', 800);
    });
    if (isBest) text(ctx, '★ NEW BEST SCORE! ★', cx, 576, 24, COLORS.gold, 'center', 900);
    else text(ctx, `BEST SCORE: ${best}`, cx, 576, 20, COLORS.dim, 'center', 800);
    this.ctx.globalAlpha = 0.7 + 0.3 * Math.sin(world.time * 3);
    outlinedText(ctx, '▶  PRESS R OR ENTER TO PLAY AGAIN  ◀', cx, 640, 26, '#ffffff');
    this.ctx.globalAlpha = 1;
    text(ctx, 'or click anywhere to restart', cx, 682, 17, COLORS.dim, 'center', 700);
  }
}
