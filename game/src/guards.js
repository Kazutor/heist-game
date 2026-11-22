// Guards: patrol rounds, suspicion, and the chase.
// A guard walks its waypoints and waits at each one. When the alarm climbs it
// first investigates the last place the thief was seen, then chases the thief.
// Touching the thief ends the run — the alarm's grace period does not save you
// from a guard's hands.

import {
  GUARD_CATCH_DISTANCE,
  GUARD_CHASE_SPEED,
  GUARD_CONE_HALF_ANGLE,
  GUARD_CONE_RANGE,
  GUARD_PATROL_SPEED,
  GUARD_RADIUS,
  GUARD_SUSPICIOUS_SPEED,
  GUARD_WAIT_SECONDS,
  ALARM_STAGE_HUNT,
  ALARM_STAGE_SUSPICIOUS,
} from './config.js';
import { hasLineOfSight, pointInCone } from './vision.js';

export function createGuard(def, index) {
  const [sx, sy] = def.waypoints[0];
  return {
    name: def.name,
    index,
    x: sx,
    y: sy,
    angle: Math.PI / 2,
    waypointIndex: 1,
    waitLeft: 0,
    speed: GUARD_PATROL_SPEED,
    state: 'patrol', // patrol | investigate | chase
    investigateX: 0,
    investigateY: 0,
  };
}

/** Does this guard see the thief right now? */
export function guardSeesThief(guard, level, smokeClouds, thiefX, thiefY) {
  if (!pointInCone(guard.x, guard.y, guard.angle, GUARD_CONE_RANGE, GUARD_CONE_HALF_ANGLE, thiefX, thiefY)) {
    return false;
  }
  return hasLineOfSight(level, smokeClouds, guard.x, guard.y, thiefX, thiefY);
}

/**
 * Move one guard for a step. `alarm` and the thief's last seen spot decide
 * whether it patrols, investigates or chases. Returns 'caught' when the guard
 * touches the thief.
 */
export function updateGuard(guard, level, dt, alarm, lastSeen, thiefX, thiefY) {
  if (alarm >= ALARM_STAGE_HUNT && lastSeen) {
    guard.state = 'chase';
  } else if (alarm >= ALARM_STAGE_SUSPICIOUS && lastSeen) {
    guard.state = 'investigate';
  } else {
    guard.state = 'patrol';
  }

  let targetX;
  let targetY;
  let speed = GUARD_PATROL_SPEED;
  if (guard.state === 'chase') {
    targetX = thiefX;
    targetY = thiefY;
    speed = GUARD_CHASE_SPEED;
  } else if (guard.state === 'investigate') {
    targetX = lastSeen.x;
    targetY = lastSeen.y;
    speed = GUARD_SUSPICIOUS_SPEED;
  } else {
    const wp = level.guards[guard.index].waypoints[guard.waypointIndex];
    targetX = wp[0];
    targetY = wp[1];
  }

  const dx = targetX - guard.x;
  const dy = targetY - guard.y;
  const dist = Math.hypot(dx, dy);
  if (guard.state === 'patrol' && dist < 6) {
    if (guard.waitLeft <= 0) guard.waitLeft = GUARD_WAIT_SECONDS;
    guard.waitLeft -= dt;
    if (guard.waitLeft <= 0) {
      guard.waypointIndex = (guard.waypointIndex + 1) % level.guards[guard.index].waypoints.length;
    }
    return 'ok';
  }
  if (guard.state === 'investigate' && dist < 10) {
    guard.investigateX = targetX;
    guard.investigateY = targetY;
    return 'ok';
  }
  if (dist > 0.01) {
    const step = Math.min(dist, speed * dt);
    guard.x += (dx / dist) * step;
    guard.y += (dy / dist) * step;
    guard.angle = Math.atan2(dy, dx);
  }
  const tdx = thiefX - guard.x;
  const tdy = thiefY - guard.y;
  if (tdx * tdx + tdy * tdy < GUARD_CATCH_DISTANCE * GUARD_CATCH_DISTANCE) {
    return 'caught';
  }
  return 'ok';
}

/** The guard's radius, for collision and drawing. */
export function guardRadius() {
  return GUARD_RADIUS;
}
