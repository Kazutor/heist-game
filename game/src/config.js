// The Meridian Vault — shared constants for the whole heist.
// One room, one night, one vault: every number the other modules use lives here
// so the balance (speeds, cone sizes, alarm rates) can be tuned in one place.

export const CANVAS_W = 1280;
export const CANVAS_H = 720;
export const HUD_H = 56;

// Playfield: the room the thief crosses, inside the outer walls.
export const FIELD = { x: 16, y: 64, w: 1248, h: 624 };

// Player.
export const PLAYER_RADIUS = 13;
export const PLAYER_WALK_SPEED = 165;
export const PLAYER_SNEAK_SPEED = 95;
export const PLAYER_CLICK_SPEED = 165;

// Guards.
export const GUARD_RADIUS = 14;
export const GUARD_PATROL_SPEED = 72;
export const GUARD_SUSPICIOUS_SPEED = 105;
export const GUARD_CHASE_SPEED = 138;
export const GUARD_WAIT_SECONDS = 1.2;
export const GUARD_CONE_RANGE = 235;
export const GUARD_CONE_HALF_ANGLE = (71 / 2) * (Math.PI / 180);
export const GUARD_CATCH_DISTANCE = 26;

// Wall cameras.
export const CAMERA_RANGE = 265;
export const CAMERA_CONE_HALF_ANGLE = (56 / 2) * (Math.PI / 180);
export const CAMERA_EMP_SECONDS = 6;

// Vision and the alarm meter (0–100).
export const ALARM_STAGE_SUSPICIOUS = 40;
export const ALARM_STAGE_HUNT = 75;
export const ALARM_RISE_CLOSE = 30; // per second, thief near the watcher
export const ALARM_RISE_MID = 18;
export const ALARM_RISE_FAR = 11;
export const ALARM_DECAY = 14; // per second, while nobody sees the thief
export const ALARM_SHADOW_FACTOR = 1 / 3; // hiding in shadow slows the rise
export const ALARM_SNEAK_FACTOR = 1 / 2; // sneaking slows the rise
export const ALARM_GRACE_SECONDS = 1.5; // "SPOTTED!" warning before the catch

// Tools.
export const SMOKE_START_COUNT = 2;
export const SMOKE_RADIUS = 92;
export const SMOKE_SECONDS = 4;
export const EMP_START_COUNT = 1;
export const EMP_RANGE = 270;

// Loot and score.
export const VAULT_VALUE = 50000;
export const GEM_VALUE = 5000;
export const VAULT_CHANNEL_SECONDS = 0.9; // hold still at the vault to crack it
export const TIME_BONUS_PER_SECOND = 100;
export const TIME_BONUS_WINDOW = 180;

// Fixed simulation step, so staged screenshots are deterministic.
export const STEP = 1 / 60;
export const TILE = 32;

// Palette: a museum at night — deep navy marble, gold loot, teal shadow.
export const COLORS = {
  floorA: '#1b2340',
  floorB: '#161d35',
  wall: '#3a466e',
  wallTop: '#4d5a8a',
  caseGlass: '#2c6f7e',
  caseFrame: '#8a6d2f',
  pillar: '#46538a',
  rug: '#141a2e',
  vent: '#0f2e33',
  gold: '#f2c14e',
  goldDim: '#a8842c',
  gem: '#4fe3d0',
  thief: '#14101f',
  thiefScarf: '#b04fe3',
  guard: '#31407a',
  guardTrim: '#e8ecf7',
  coneCalm: 'rgba(242, 193, 78, 0.20)',
  coneSuspicious: 'rgba(242, 140, 46, 0.30)',
  coneHunt: 'rgba(232, 64, 64, 0.38)',
  cameraCone: 'rgba(79, 227, 208, 0.18)',
  cameraOff: '#5a6a8a',
  exitGreen: '#3ddc84',
  alarmGreen: '#3ddc84',
  alarmAmber: '#f28c2e',
  alarmRed: '#e84040',
  hudBg: 'rgba(8, 11, 24, 0.88)',
  hudText: '#e8ecf7',
  hudMuted: '#9aa5c4',
};
