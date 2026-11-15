# best-game-01

[![make.fun · best-game-01](https://make.fun/badge/best-game-01.svg)](https://make.fun/bounty/best-game-01?utm_source=github&utm_medium=readme&utm_campaign=best-game-01)
[![rank](https://make.fun/badge/best-game-01/fauzinfau4/best-game-01/rank.svg)](https://make.fun/bounty/best-game-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=best-game-01)
[![reward](https://make.fun/badge/best-game-01/fauzinfau4/best-game-01/reward.svg)](https://make.fun/bounty/best-game-01?utm_source=github&utm_medium=readme&utm_campaign=best-game-01)

**Lantern Keeper** — a top-down arena game: you are the keeper of a little lantern in a dark garden. Collect glowing fireflies to feed your lantern and ignite the Great Lantern at the top of the garden — reach **60 light to win**. Shadow moths hunt you in the dark. Once your lantern burns bright (55+ light), moths **burn** when they touch you; below that, a touch costs a life. You have 3 lives, and your light slowly fades, so keep collecting.

Dash through a moth to scatter it. Moonpetals freeze the whole swarm for 5 seconds; hearts restore a life. Fireflies collected close together build a combo multiplier (up to x3). Every 18 seconds the garden deepens a level: moths spawn faster and chase harder.

## Run it

```sh
node serve.ts        # serves game/ on http://localhost:8080
```

No build step, no network: serve `game/` with any static server and open `index.html` in a desktop browser. Or: `npx serve game`, `python3 -m http.server --directory game`, etc.

## How to play

- **Goal:** reach 60 light on the lantern meter to light the Great Lantern.
- **Lose:** a moth touches you while your lantern is dim — 3 hits and the light goes out.
- **Score:** fireflies (+10 each, combo-multiplied), moths burned (+25) or scattered by a dash (+15), moonpetals (+30), hearts (+20).

## Controls

- **WASD / arrow keys** — move
- **Hold mouse button** — steer toward the pointer
- **Space / Shift / click** — dash (1.1s cooldown, scatters moths)
- **P / Esc** — pause, **R** — restart, **M** — mute, **Enter** — start

## Files

- `game/index.html` — the page and its styles
- `game/src/main.js` — game loop and state machine (title / playing / paused / won / lost)
- `game/src/world.js` — entities, rules, collisions, difficulty ramp
- `game/src/render.js` — all canvas drawing, HUD, menus and end screens
- `game/src/config.js` — every tuning number in one place
- `game/src/input.js` — keyboard and mouse input
- `game/src/audio.js` — synthesized Web Audio effects and music (no files)
- `game/src/random.js` — seeded RNG for reproducible demo shots
- `game/src/shots.js` — `?shot=start|play|action|end` staging for screenshots
- `main.ts` — the make.fun entrypoint: copies `game/` + `screenshots/` to `/output` and writes `dossier.json`
- `serve.ts` — tiny static server for local playtesting

Screenshots live in `screenshots/` (1-start, 2-play, 3-end, 4-action). Sound is synthesized live with the Web Audio API; there are no audio files and the game makes no network requests.

---

<sub>Entered on [make.fun](https://make.fun/?ref=7tgjyx9m&utm_source=github&utm_medium=readme&utm_campaign=best-game-01) · AI agents build software for cash rewards</sub>
