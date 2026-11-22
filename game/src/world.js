// The world: one heist, step by step.
// Holds the thief, the guards, the cameras, the alarm meter and the loot, and
// advances them all by a fixed step. Win: crack the vault, then reach the exit.
// Caught: the alarm hits 100 and the thief is still seen when the grace runs out,
// or a guard lays a hand on the thief.

import {
  ALARM_DECAY,
  ALARM_GRACE_SECONDS,
  ALARM_RISE_CLOSE,
  ALARM_RISE_FAR,
  ALARM_RISE_MID,
  ALARM_SHADOW_FACTOR,
  ALARM_SNEAK_FACTOR,
  ALARM_STAGE_HUNT,
  ALARM_STAGE_SUSPICIOUS,
  EMP_RANGE,
  GEM_VALUE,
  GUARD_CONE_RANGE,
  PLAYER_RADIUS,
  PLAYER_SNEAK_SPEED,
  PLAYER_WALK_SPEED,
  STEP,
  TILE,
  TIME_BONUS_PER_SECOND,
  TIME_BONUS_WINDOW,
  VAULT_CHANNEL_SECONDS,
  VAULT_VALUE,
} from './config.js';
import { buildMeridianVaultLevel } from './levels.js';
import { createGuard, guardSeesThief, updateGuard } from './guards.js';
import { cameraSeesThief, createCamera, updateCamera } from './cameras.js';
import { createTools, updateTools, useEmp, useSmokePellet } from './tools.js';
import { pointInShadow } from './vision.js';
import { mulberry32 } from './random.js';

export const EVENT_NONE = 'none';
export const EVENT_GEM = 'gem';
export const EVENT_VAULT = 'vault';
export const EVENT_SMOKE = 'smoke';
export const EVENT_EMP = 'emp';
export const EVENT_ALARM = 'alarm';
export const EVENT_CAUGHT = 'caught';
export const EVENT_WIN = 'win';

export function createWorld(seed) {
  const level = buildMeridianVaultLevel();
  const random = mulberry32(seed || 1);
  return {
    level,
    random,
    seed: seed || 1,
    time: 0,
    screen: 'title', // title | play | pause | caught | win
    player: {
      x: level.playerStart.x,
      y: level.playerStart.y,
      angle: -Math.PI / 2,
      sneaking: false,
      moveTarget: null,
      stepTimer: 0,
    },
    guards: level.guards.map((def, i) => createGuard(def, i)),
    cameras: level.cameras.map((def) => createCamera(def)),
    tools: createTools(),
    alarm: 0,
    alarmStage: 'calm', // calm | suspicious | hunt | spotted
    lastSeen: null,
    graceLeft: 0,
    loot: 0,
    gemsTaken: 0,
    vaultTaken: false,
    vaultChannel: 0,
    exitOpen: false,
    score: 0,
    message: '',
    messageLeft: 0,
  };
}

/** Move a circle through the room, sliding along walls, cases and pillars. */
export function moveCircle(level, x, y, radius, dx, dy) {
  let nx = x + dx;
  let ny = y + dy;
  const solids = [...level.walls, ...level.cases, level.vault];
  for (const rect of solids) {
    const cx = Math.max(rect.x, Math.min(nx, rect.x + rect.w));
    const cy = Math.max(rect.y, Math.min(ny, rect.y + rect.h));
    const ox = nx - cx;
    const oy = ny - cy;
    const distSq = ox * ox + oy * oy;
    if (distSq < radius * radius) {
      if (distSq < 0.0001) {
        ny = rect.y - radius;
      } else {
        const dist = Math.sqrt(distSq);
        nx = cx + (ox / dist) * radius;
        ny = cy + (oy / dist) * radius;
      }
    }
  }
  for (const pillar of level.pillars) {
    const ox = nx - pillar.x;
    const oy = ny - pillar.y;
    const dist = Math.hypot(ox, oy);
    const min = radius + pillar.r;
    if (dist < min && dist > 0.0001) {
      nx = pillar.x + (ox / dist) * min;
      ny = pillar.y + (oy / dist) * min;
    }
  }
  return { x: nx, y: ny };
}

/** True when the thief stands in the vault's cracking zone. */
export function thiefAtVault(world) {
  const v = world.level.vault;
  return world.player.x > v.x - 26 && world.player.x < v.x + v.w + 26
    && world.player.y > v.y - 26 && world.player.y < v.y + v.h + 26;
}

/** True when the thief stands in the exit doorway. */
export function thiefAtExit(world) {
  const e = world.level.exit;
  return world.player.x > e.x - 6 && world.player.x < e.x + e.w + 6
    && world.player.y > e.y - 10 && world.player.y < e.y + e.h + 10;
}

function alarmStageOf(alarm, graceLeft) {
  if (graceLeft > 0) return 'spotted';
  if (alarm >= ALARM_STAGE_HUNT) return 'hunt';
  if (alarm >= ALARM_STAGE_SUSPICIOUS) return 'suspicious';
  return 'calm';
}

function showMessage(world, text, seconds) {
  world.message = text;
  world.messageLeft = seconds;
}

/**
 * Advance the world one fixed step. `move` is {x, y} or null, `sneak` a boolean,
 * `useSmoke`/`useEmp` one-shot tool requests. Returns an event name.
 */
export function stepWorld(world, dt, move, sneak, useSmoke, useEmp) {
  if (world.screen !== 'play') return EVENT_NONE;
  world.time += dt;
  let event = EVENT_NONE;

  if (useSmoke) {
    if (useSmokePellet(world.tools, world.player.x, world.player.y)) {
      showMessage(world, 'SMOKE OUT — cones cannot see through it', 2.5);
      event = EVENT_SMOKE;
    } else {
      showMessage(world, 'NO SMOKE LEFT', 1.5);
    }
  }
  if (useEmp) {
    const hit = useEmp(world.tools, world.player.x, world.player.y, world.cameras);
    if (hit) {
      showMessage(world, `${hit.label} DISABLED for 6s`, 2.5);
      event = EVENT_EMP;
    } else {
      showMessage(world, 'NO CAMERA IN EMP RANGE — or no EMP left', 1.5);
    }
  }
  updateTools(world.tools, dt);

  // Move the thief.
  const player = world.player;
  player.sneaking = sneak;
  const speed = sneak ? PLAYER_SNEAK_SPEED : PLAYER_WALK_SPEED;
  let mx = 0;
  let my = 0;
  if (move) {
    mx = move.x;
    my = move.y;
  } else if (player.moveTarget) {
    const dx = player.moveTarget.x - player.x;
    const dy = player.moveTarget.y - player.y;
    const dist = Math.hypot(dx, dy);
    if (dist < 8) {
      player.moveTarget = null;
    } else {
      mx = dx / dist;
      my = dy / dist;
    }
  }
  if (mx !== 0 || my !== 0) {
    const moved = moveCircle(world.level, player.x, player.y, PLAYER_RADIUS, mx * speed * dt, my * speed * dt);
    player.x = moved.x;
    player.y = moved.y;
    player.angle = Math.atan2(my, mx);
    player.stepTimer -= dt;
    if (player.stepTimer <= 0) {
      player.stepTimer = sneak ? 0.55 : 0.34;
    }
  }

  // Cameras sweep; guards patrol, investigate or chase.
  for (const camera of world.cameras) updateCamera(camera, dt, world.time);
  let caught = false;
  for (const guard of world.guards) {
    const result = updateGuard(guard, world.level, dt, world.alarm, world.lastSeen, player.x, player.y);
    if (result === 'caught') caught = true;
  }

  // Who sees the thief?
  let seen = false;
  let closestDist = Infinity;
  for (const guard of world.guards) {
    if (guardSeesThief(guard, world.level, world.tools.clouds, player.x, player.y)) {
      seen = true;
      closestDist = Math.min(closestDist, Math.hypot(guard.x - player.x, guard.y - player.y));
    }
  }
  for (const camera of world.cameras) {
    if (cameraSeesThief(camera, world.level, world.tools.clouds, player.x, player.y)) {
      seen = true;
      closestDist = Math.min(closestDist, Math.hypot(camera.x - player.x, camera.y - player.y));
    }
  }

  // The alarm meter: rises on sight, falls in the dark.
  const inShadow = pointInShadow(world.level, player.x, player.y);
  if (seen) {
    let rate = closestDist < 110 ? ALARM_RISE_CLOSE : closestDist < 180 ? ALARM_RISE_MID : ALARM_RISE_FAR;
    if (inShadow) rate *= ALARM_SHADOW_FACTOR;
    if (sneak) rate *= ALARM_SNEAK_FACTOR;
    world.alarm = Math.min(100, world.alarm + rate * dt);
    world.lastSeen = { x: player.x, y: player.y };
    if (world.alarm >= 100 && world.graceLeft <= 0) {
      world.graceLeft = ALARM_GRACE_SECONDS;
      event = EVENT_ALARM;
    }
  } else {
    world.alarm = Math.max(0, world.alarm - ALARM_DECAY * dt);
  }
  world.alarmStage = alarmStageOf(world.alarm, world.graceLeft);

  // The grace period: break line of sight before it runs out, or it is over.
  if (world.graceLeft > 0) {
    world.graceLeft -= dt;
    if (!seen && world.alarm < 100) {
      world.graceLeft = 0;
      showMessage(world, 'LOST THEM — stay in the dark', 2);
    } else if (world.graceLeft <= 0) {
      caught = true;
    }
  }

  // Gems: walk over a case to pocket it.
  for (const gem of world.level.gems) {
    if (gem.taken) continue;
    const dx = gem.x - player.x;
    const dy = gem.y - player.y;
    if (dx * dx + dy * dy < 30 * 30) {
      gem.taken = true;
      world.gemsTaken += 1;
      world.loot += GEM_VALUE;
      showMessage(world, `${gem.label} POCKETED — +$${GEM_VALUE.toLocaleString('en-US')}`, 2);
      event = EVENT_GEM;
    }
  }

  // The vault: hold still beside it to crack it open.
  if (!world.vaultTaken && thiefAtVault(world)) {
    world.vaultChannel += dt;
    if (world.vaultChannel >= VAULT_CHANNEL_SECONDS) {
      world.vaultTaken = true;
      world.exitOpen = true;
      world.loot += VAULT_VALUE;
      showMessage(world, 'VAULT CRACKED — $50,000! GET TO THE EXIT!', 3.5);
      event = EVENT_VAULT;
    }
  } else {
    world.vaultChannel = Math.max(0, world.vaultChannel - dt * 2);
  }

  // The getaway: vault loot in hand, reach the exit door.
  if (world.exitOpen && thiefAtExit(world)) {
    world.screen = 'win';
    const timeBonus = Math.max(0, TIME_BONUS_WINDOW - Math.floor(world.time)) * TIME_BONUS_PER_SECOND;
    world.score = world.loot + timeBonus;
    return EVENT_WIN;
  }

  if (caught) {
    world.screen = 'caught';
    return EVENT_CAUGHT;
  }

  if (world.messageLeft > 0) world.messageLeft -= dt;
  return event;
}

/** Start a fresh run from the title screen. */
export function resetWorld(world) {
  const fresh = createWorld(world.seed);
  Object.assign(world, fresh);
  world.screen = 'play';
}

/** True when a tile is blocked for walking: outside the room or inside a solid. */
export function isTileBlocked(level, tx, ty) {
  const cx = tx * TILE + TILE / 2;
  const cy = ty * TILE + TILE / 2;
  if (cx < 32 || cx > 1248 || cy < 80 || cy > 688) return true;
  for (const rect of [...level.walls, ...level.cases, level.vault]) {
    if (cx > rect.x - 14 && cx < rect.x + rect.w + 14 && cy > rect.y - 14 && cy < rect.y + rect.h + 14) return true;
  }
  for (const pillar of level.pillars) {
    if (Math.hypot(cx - pillar.x, cy - pillar.y) < pillar.r + 16) return true;
  }
  return false;
}

/** Breadth-first path over the tile grid, avoiding walls, cases and pillars. */
export function findTilePath(level, from, to) {
  const cols = Math.ceil(1280 / TILE);
  const rows = Math.ceil(720 / TILE);
  const blocked = (tx, ty) => isTileBlocked(level, tx, ty);
  const key = (tx, ty) => `${tx},${ty}`;
  const prev = new Map();
  const queue = [[from.x, from.y]];
  prev.set(key(from.x, from.y), null);
  while (queue.length > 0) {
    const [cx, cy] = queue.shift();
    if (cx === to.x && cy === to.y) {
      const path = [];
      let node = [cx, cy];
      while (node) {
        path.unshift({ x: node[0], y: node[1] });
        node = prev.get(key(node[0], node[1]));
      }
      return path;
    }
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nx = cx + dx;
      const ny = cy + dy;
      if (nx < 0 || ny < 0 || nx >= cols || ny >= rows) continue;
      if (prev.has(key(nx, ny)) || blocked(nx, ny)) continue;
      prev.set(key(nx, ny), [cx, cy]);
      queue.push([nx, ny]);
    }
  }
  return null;
}

/** The fixed step, re-exported for the autopilot. */
export function fixedStep() {
  return STEP;
}

/** Is the thief standing in the EMP's reach of any live camera? */
export function empInRange(world) {
  for (const camera of world.cameras) {
    if (camera.disabledLeft > 0) continue;
    if (Math.hypot(camera.x - world.player.x, camera.y - world.player.y) < EMP_RANGE) return true;
  }
  return false;
}
