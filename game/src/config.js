// Lantern Keeper — tuning constants. One place for every number that shapes
// how the game feels: arena size, speeds, scoring, difficulty ramp, timers.
export const ARENA = {
  width: 1280,
  height: 800,
  // Playfield margin: the garden hedge the keeper cannot cross.
  margin: 46,
};

export const PLAYER = {
  radius: 20,
  // Base cruise speed in pixels per second.
  speed: 330,
  // Dash burst speed and how long the burst lasts.
  dashSpeed: 780,
  dashTime: 0.16,
  dashCooldown: 1.1,
  // How fast the keeper turns toward the mouse while steering.
  mouseSteer: 9,
  // Lantern light drains slowly so the player must keep collecting.
  lightDrainPerSecond: 1.6,
  // Above this light the lantern burns bright enough to repel moths.
  brightThreshold: 55,
};

export const GOAL = {
  // Light needed to ignite the Great Lantern and win.
  lightToWin: 60,
  livesStart: 3,
  livesMax: 4,
};

export const FIREFLY = {
  radius: 11,
  lightValue: 4,
  scoreValue: 10,
  // Drift speed of a wandering firefly.
  drift: 26,
  // How many fireflies the garden holds at once (grows with level).
  baseCount: 9,
  perLevel: 1,
  maxCount: 18,
};

export const MOTH = {
  radius: 17,
  // Chase speed at level 1; grows with level.
  baseSpeed: 118,
  perLevel: 9,
  maxSpeed: 235,
  // Seconds between moth spawns at level 1; shrinks with level.
  baseInterval: 4.2,
  perLevel: 0.28,
  minInterval: 1.7,
  // A moth destroyed while the lantern is bright is worth this score.
  burnScore: 25,
  // A moth scattered by a dash is worth this score.
  scatterScore: 15,
};

export const PICKUP = {
  // Seconds between bonus spawns (moonpetal freezes moths, heart adds a life).
  interval: 16,
  freezeSeconds: 5,
};

export const COMBO = {
  // Collecting fireflies within this many seconds of each other raises the combo.
  windowSeconds: 3.5,
  // Each combo step adds this much score multiplier, capped here.
  step: 0.25,
  maxMultiplier: 3,
};

export const LEVEL = {
  // Seconds of play before the garden deepens a level.
  secondsPerLevel: 18,
  maxLevel: 10,
};

export const PARTICLES = {
  max: 420,
};

export const COLORS = {
  night: '#0b1026',
  nightDeep: '#05070f',
  hedge: '#1d3a2a',
  hedgeLight: '#2c5a3d',
  gold: '#ffd76a',
  goldDeep: '#f5a623',
  ember: '#ff9d4d',
  moth: '#2a2438',
  mothEye: '#ff4d6d',
  moon: '#bfe3ff',
  heart: '#ff6b81',
  ink: '#f4efe4',
  dim: '#9aa3c0',
};
