// Lantern Keeper — demo shots: a query param (?shot=start|play|action|end)
// stages a deterministic scene so screenshots can be taken in a headless
// browser without playing by hand. The same states are reachable by
// playing: start is the title, play/action are mid-game, end is the win
// screen. Harmless in the shipped game: it only reads the URL.

import { ARENA, GOAL } from './config.js';

export function applyShotMode(game, params) {
  const shot = params.get('shot');
  if (!shot) return false;
  const seed = Number(params.get('seed') ?? 7) || 7;

  if (shot === 'start') {
    game.state = 'title';
    game.world.seed = seed;
    game.world.reset();
    game.world.time = 6.2; // let fireflies drift into place first
    return true;
  }

  if (shot === 'play' || shot === 'action') {
    game.state = 'playing';
    game.world.seed = seed;
    game.world.reset();
    // Fast-forward a believable mid-game: a few seconds of play with a
    // fixed seed, so the shot is the same every run.
    const silent = { pickup: () => {}, dash: () => {}, mothBurn: () => {}, hurt: () => {}, levelUp: () => {}, freeze: () => {}, win: () => {}, lose: () => {}, updateMusic: () => {} };
    const steps = shot === 'action' ? 260 : 200;
    for (let i = 0; i < steps; i++) {
      // Steer the keeper in a slow circle so it gathers a few fireflies.
      const angle = (i / steps) * Math.PI * 2;
      game.world.update(1 / 60, { x: Math.cos(angle), y: Math.sin(angle) * 0.6 }, i === 120, silent);
      if (game.world.light >= GOAL.lightToWin) break;
    }
    // Stage the scene the screenshot wants. Times sit safely mid-level so
    // no level-up banner fires while the screenshot is being taken, and any
    // banner or hurt-blink left over from the fast-forward is cleared.
    game.world.score = shot === 'action' ? 1240 : 640;
    game.world.collected = shot === 'action' ? 38 : 21;
    game.world.combo = shot === 'action' ? 7 : 4;
    game.world.comboTimer = 3;
    game.world.light = shot === 'action' ? 47 : 38;
    game.world.lives = 3;
    game.world.level = shot === 'action' ? 3 : 2;
    game.world.time = shot === 'action' ? 48.0 : 30.0;
    game.world.banner = null;
    game.world.invulnerableTimer = 0;
    game.world.floaters = [];
    game.world.comboTimer = 10; // survive the wait before the screenshot
    // Moths from the fast-forward may be right on top of the keeper; clear
    // them and put fresh ones far away so nothing bites before the shot.
    game.world.moths = [];
    for (const [mx, my] of [[170, 160], [1110, 640]]) {
      game.world.moths.push({
        x: mx, y: my, phase: 1, wobble: 1,
        speed: 130, wing: 0,
      });
    }
    // Bring the keeper to the middle of the garden with fireflies around,
    // so the shot reads at a glance.
    game.world.player.x = ARENA.width / 2 - 40;
    game.world.player.y = ARENA.height / 2 + 60;
    game.world.player.vx = 120;
    game.world.player.vy = -40;
    game.world.player.angle = -0.4;
    game.world.player.trail = [];
    for (let i = 0; i < 4; i++) {
      const a = (i / 4) * Math.PI * 2 + 0.5;
      game.world.fireflies.push({
        x: game.world.player.x + Math.cos(a) * 150,
        y: game.world.player.y + Math.sin(a) * 110,
        phase: i * 1.3,
        driftAngle: a,
        driftSpeed: 20,
        pulse: 1,
        kind: i === 0 ? 'ember' : 'gold',
      });
    }
    if (shot === 'action') {
      // A busy moment: moths closing in, a moonpetal on the field, and a
      // fresh dash trail behind the keeper.
      game.world.freezeTimer = 8; // frozen long enough for the screenshot
      game.world.player.dashCooldown = 0.4;
      for (let i = 0; i < 14; i++) {
        game.world.player.trail.push({
          x: game.world.player.x - i * 14,
          y: game.world.player.y + i * 5,
        });
      }
      for (let i = 0; i < 3; i++) game.world._spawnMoth(true);
      game.world.pickups.push({ x: ARENA.width * 0.72, y: ARENA.height * 0.3, kind: 'moonpetal', phase: 1, life: 10 });
    }
    return true;
  }

  if (shot === 'end') {
    game.state = 'won';
    game.world.seed = seed;
    game.world.reset();
    game.world.score = 1890;
    game.world.collected = 46;
    game.world.mothsBurned = 9;
    game.world.mothsScattered = 5;
    game.world.comboBest = 8;
    game.world.dashes = 14;
    game.world.time = 96.3;
    game.world.level = 5;
    game.world.light = GOAL.lightToWin;
    game.world.lives = 2;
    game.world.isBest = true;
    game.world.best = 1890;
    return true;
  }

  return false;
}
