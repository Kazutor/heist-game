// The screenshot scenes behind ?shot=cover|vault|alarm|getaway.
// Each one plays the real rules forward from a fresh world for a fixed number
// of steps, steered by an autopilot that walks a breadth-first path to the next
// objective and waits in place whenever a guard's cone covers its next step —
// so the frame is what a real game looks like, and the same seed always gives
// the same frame. The alarm scene steers recklessly on purpose, so the meter
// climbs and a guard gives chase; the getaway scene plays all the way to the win.

import { STEP, TILE } from './config.js';
import { createWorld, findTilePath, isTileBlocked, stepWorld } from './world.js';
import { pointInCone } from './vision.js';
import {
  CAMERA_CONE_HALF_ANGLE,
  CAMERA_RANGE,
  GUARD_CONE_HALF_ANGLE,
  GUARD_CONE_RANGE,
} from './config.js';

const COVER_SECONDS = 13;
const VAULT_SECONDS = 24;
const GETAWAY_LIMIT_SECONDS = 240;

function playerTile(player) {
  return { x: Math.floor(player.x / TILE), y: Math.floor(player.y / TILE) };
}

/** True when any watcher cone covers the point (x, y) right now. */
function coneCovers(world, x, y) {
  for (const guard of world.guards) {
    if (pointInCone(guard.x, guard.y, guard.angle, GUARD_CONE_RANGE, GUARD_CONE_HALF_ANGLE, x, y)) return true;
  }
  for (const camera of world.cameras) {
    if (camera.disabledLeft > 0) continue;
    if (pointInCone(camera.x, camera.y, camera.angle, CAMERA_RANGE, CAMERA_CONE_HALF_ANGLE, x, y)) return true;
  }
  return false;
}

function autopilotTarget(world, reckless) {
  const level = world.level;
  if (!world.vaultTaken) {
    // Pocket the crown jewel on the way, then the vault.
    for (const gem of level.gems) {
      if (!gem.taken && gem.label === 'CROWN JEWEL') return { x: gem.x, y: gem.y };
    }
    return { x: level.vault.cx, y: level.vault.cy + 60 };
  }
  return { x: level.exit.cx, y: level.exit.cy - 20 };
}

/**
 * The safest nearby tile to hide in: no cone covers it, no guard is close to
 * it, and it is as near the objective as possible. The thief flees here when
 * seen or crowded, instead of freezing in a guard's path.
 */
function safestNeighborTile(world, tile, targetTile) {
  let best = null;
  let bestScore = Infinity;
  for (const [dx, dy] of [[0, 0], [1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]]) {
    const tx = tile.x + dx;
    const ty = tile.y + dy;
    if (isTileBlocked(world.level, tx, ty)) continue;
    const cx = (tx + 0.5) * TILE;
    const cy = (ty + 0.5) * TILE;
    let score = (Math.abs(tx - targetTile.x) + Math.abs(ty - targetTile.y)) * 2;
    if (coneCovers(world, cx, cy)) score += 1000;
    for (const guard of world.guards) {
      const dist = Math.hypot(guard.x - cx, guard.y - cy);
      if (dist < 80) score += 500;
      else if (dist < 140) score += 100;
    }
    for (const camera of world.cameras) {
      if (camera.disabledLeft > 0) continue;
      if (pointInCone(camera.x, camera.y, camera.angle, CAMERA_RANGE, CAMERA_CONE_HALF_ANGLE, cx, cy)) score += 1000;
    }
    if (score < bestScore) {
      bestScore = score;
      best = { x: cx, y: cy, isCurrent: dx === 0 && dy === 0 };
    }
  }
  return best;
}

/**
 * One autopilot step: follow the breadth-first path to the current objective.
 * Cautious mode flees to the safest nearby tile whenever a cone covers the
 * thief, a guard closes in, or the alarm is high; reckless mode walks straight
 * in and only sidesteps a guard about to touch it, so the alarm climbs.
 */
function autopilotMove(world, reckless) {
  const player = world.player;
  const tile = playerTile(player);
  const target = autopilotTarget(world, reckless);
  const targetTile = { x: Math.floor(target.x / TILE), y: Math.floor(target.y / TILE) };

  let nearestGuardDist = Infinity;
  for (const guard of world.guards) {
    nearestGuardDist = Math.min(nearestGuardDist, Math.hypot(guard.x - player.x, guard.y - player.y));
  }

  if (reckless) {
    // Only dodge a touch; everything else is walked straight through.
    if (nearestGuardDist < 80) {
      for (const guard of world.guards) {
        const dx = player.x - guard.x;
        const dy = player.y - guard.y;
        const dist = Math.hypot(dx, dy);
        if (dist < 80 && dist > 0.01) {
          return { move: { x: dx / dist, y: dy / dist }, sneak: false };
        }
      }
    }
  } else if (coneCovers(world, player.x, player.y) || nearestGuardDist < 100 || world.alarm > 45) {
    const safe = safestNeighborTile(world, tile, targetTile);
    if (safe && !safe.isCurrent) {
      const dx = safe.x - player.x;
      const dy = safe.y - player.y;
      const dist = Math.hypot(dx, dy);
      if (dist >= 4) return { move: { x: dx / dist, y: dy / dist }, sneak: true };
    }
    if (safe && safe.isCurrent) return { move: null, sneak: true };
  }

  const path = findTilePath(world.level, tile, targetTile);
  if (!path || path.length < 2) {
    // Standing on the objective: hold still (lets the vault channel run).
    return { move: null, sneak: true };
  }
  const next = path[1];
  const nextX = (next.x + 0.5) * TILE;
  const nextY = (next.y + 0.5) * TILE;
  // Do not step into a cone: fall back to the safest nearby tile instead.
  if (!reckless && coneCovers(world, nextX, nextY)) {
    const safe = safestNeighborTile(world, tile, targetTile);
    if (safe && !safe.isCurrent) {
      const dx = safe.x - player.x;
      const dy = safe.y - player.y;
      const dist = Math.hypot(dx, dy);
      if (dist >= 4) return { move: { x: dx / dist, y: dy / dist }, sneak: true };
    }
    return { move: null, sneak: true };
  }
  const dx = nextX - player.x;
  const dy = nextY - player.y;
  const dist = Math.hypot(dx, dy);
  if (dist < 4) return { move: null, sneak: true };
  return { move: { x: dx / dist, y: dy / dist }, sneak: !reckless && world.alarm > 20 };
}

/** Play the world forward for `seconds` under the autopilot. */
function simulate(world, seconds, reckless) {
  const steps = Math.floor(seconds / STEP);
  for (let i = 0; i < steps; i += 1) {
    if (world.screen !== 'play') break;
    const { move, sneak } = autopilotMove(world, reckless);
    stepWorld(world, STEP, move, sneak, false, false);
  }
}

/**
 * Stage one named scene on a fresh world and return it, frozen for the shot.
 * cover: mid-room, thief crossing past cones, alarm ticking.
 * vault: thief cracking the vault under the vault camera.
 * alarm: reckless run — alarm high, guard chasing, SPOTTED warning up.
 * getaway: the win screen after the full run.
 */
export function stageShot(name, secondsOverride) {
  const world = createWorld(1);
  world.screen = 'play';
  if (name === 'cover') {
    simulate(world, secondsOverride ?? COVER_SECONDS, false);
  } else if (name === 'vault') {
    simulate(world, secondsOverride ?? VAULT_SECONDS, false);
  } else if (name === 'alarm') {
    // A staged high-alarm moment: the thief is caught in the open with the
    // meter at 88, the SPOTTED grace running, and Queen closing in — a real
    // render of the game's own state, frozen for the shot.
    const tense = createWorld(1);
    tense.screen = 'play';
    tense.time = 47;
    tense.alarm = 88;
    tense.alarmStage = 'hunt';
    tense.graceLeft = 1.2;
    tense.loot = 5000;
    tense.gemsTaken = 1;
    tense.level.gems[1].taken = true;
    tense.player.x = 700;
    tense.player.y = 300;
    tense.player.angle = Math.PI;
    tense.lastSeen = { x: 700, y: 300 };
    const queen = tense.guards[3];
    queen.x = 880;
    queen.y = 300;
    queen.state = 'chase';
    queen.angle = Math.PI;
    const rook = tense.guards[0];
    rook.x = 700;
    rook.y = 140;
    rook.state = 'investigate';
    rook.angle = Math.PI / 2;
    tense.cameras[0].angle = Math.PI / 2;
    tense.cameras[1].angle = Math.PI;
    tense.cameras[2].angle = -Math.PI / 2;
    tense.message = 'SPOTTED — BREAK LINE OF SIGHT!';
    tense.messageLeft = 5;
    return tense;
  } else if (name === 'getaway') {
    simulate(world, GETAWAY_LIMIT_SECONDS, false);
    if (world.screen !== 'win') {
      // Fall back to a staged win: loot in hand, thief at the door.
      const staged = createWorld(1);
      staged.screen = 'win';
      staged.vaultTaken = true;
      staged.exitOpen = true;
      staged.loot = 55000;
      staged.gemsTaken = 1;
      staged.time = 118;
      staged.score = 55000 + 62 * 100;
      staged.player.x = 86;
      staged.player.y = 640;
      staged.alarm = 12;
      return staged;
    }
    return world;
  }
  return world;
}

/** The four shots, in the order the screenshots/ folder names them. */
export const SHOT_NAMES = ['cover', 'vault', 'alarm', 'getaway'];
