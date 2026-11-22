// Tools: the thief's bag. Two smoke pellets and one EMP, each spent once.
// Smoke hides the thief from every cone for a few seconds; the EMP switches off
// the nearest camera for a few seconds. Both are costs — once spent, they are gone.

import { CAMERA_EMP_SECONDS, EMP_RANGE, SMOKE_RADIUS, SMOKE_SECONDS } from './config.js';

export function createTools() {
  return {
    smoke: 2,
    emp: 1,
    clouds: [], // { x, y, r, left }
  };
}

/** Drop a smoke pellet at the thief. Returns true when one was spent. */
export function useSmokePellet(tools, x, y) {
  if (tools.smoke <= 0) return false;
  tools.smoke -= 1;
  tools.clouds.push({ x, y, r: SMOKE_RADIUS, left: SMOKE_SECONDS });
  return true;
}

/**
 * Fire the EMP at the nearest live camera within range.
 * Returns the camera it switched off, or null.
 */
export function useEmp(tools, x, y, cameras) {
  if (tools.emp <= 0) return null;
  let best = null;
  let bestDist = EMP_RANGE;
  for (const camera of cameras) {
    if (camera.disabledLeft > 0) continue;
    const dist = Math.hypot(camera.x - x, camera.y - y);
    if (dist < bestDist) {
      best = camera;
      bestDist = dist;
    }
  }
  if (!best) return null;
  tools.emp -= 1;
  best.disabledLeft = CAMERA_EMP_SECONDS;
  return best;
}

/** Age the smoke clouds for a step. */
export function updateTools(tools, dt) {
  for (let i = tools.clouds.length - 1; i >= 0; i -= 1) {
    tools.clouds[i].left -= dt;
    if (tools.clouds[i].left <= 0) tools.clouds.splice(i, 1);
  }
}
