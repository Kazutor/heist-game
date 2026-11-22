// Wall cameras: sweeping cones and the EMP that silences them.
// A camera pans back and forth across its arc. Its cone is wider and longer than
// a guard's, but it never moves — learn the sweep, slip between passes, or spend
// your one EMP to switch it off for a few seconds.

import { CAMERA_CONE_HALF_ANGLE, CAMERA_RANGE } from './config.js';
import { hasLineOfSight, pointInCone } from './vision.js';

export function createCamera(def) {
  return {
    x: def.x,
    y: def.y,
    baseAngle: def.baseAngle,
    sweep: def.sweep,
    speed: def.speed,
    label: def.label,
    phase: 0,
    angle: def.baseAngle,
    disabledLeft: 0, // seconds of EMP silence remaining
  };
}

/** Sweep the camera's cone for a step; an EMP-fried camera stays dark. */
export function updateCamera(camera, dt, time) {
  if (camera.disabledLeft > 0) {
    camera.disabledLeft = Math.max(0, camera.disabledLeft - dt);
    return;
  }
  camera.phase = time * camera.speed;
  camera.angle = camera.baseAngle + Math.sin(camera.phase) * camera.sweep;
}

/** True when a live camera sees the thief right now. */
export function cameraSeesThief(camera, level, smokeClouds, thiefX, thiefY) {
  if (camera.disabledLeft > 0) return false;
  if (!pointInCone(camera.x, camera.y, camera.angle, CAMERA_RANGE, CAMERA_CONE_HALF_ANGLE, thiefX, thiefY)) {
    return false;
  }
  return hasLineOfSight(level, smokeClouds, camera.x, camera.y, thiefX, thiefY);
}
