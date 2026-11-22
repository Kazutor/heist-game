// Vision geometry: cones and line of sight.
// Every watcher (guard or camera) sees a cone; walls, cases and pillars block it.
// The thief is seen only when inside a cone AND the segment to the watcher is clear.

/** True when (x, y) lies inside a cone from (ox, oy) facing `angle`. */
export function pointInCone(ox, oy, angle, range, halfAngle, x, y) {
  const dx = x - ox;
  const dy = y - oy;
  const distSq = dx * dx + dy * dy;
  if (distSq > range * range) return false;
  if (distSq < 1) return true;
  const target = Math.atan2(dy, dx);
  let diff = target - angle;
  while (diff > Math.PI) diff -= 2 * Math.PI;
  while (diff < -Math.PI) diff += 2 * Math.PI;
  return Math.abs(diff) <= halfAngle;
}

/** True when the segment (x1,y1)-(x2,y2) hits a rectangle. */
export function segmentHitsRect(x1, y1, x2, y2, rect) {
  // Quick reject: segment entirely on one side of the rect.
  const minX = Math.min(x1, x2);
  const maxX = Math.max(x1, x2);
  const minY = Math.min(y1, y2);
  const maxY = Math.max(y1, y2);
  if (maxX < rect.x || minX > rect.x + rect.w) return false;
  if (maxY < rect.y || minY > rect.y + rect.h) return false;
  if (pointInRect(x1, y1, rect) || pointInRect(x2, y2, rect)) return true;
  const edges = [
    [rect.x, rect.y, rect.x + rect.w, rect.y],
    [rect.x + rect.w, rect.y, rect.x + rect.w, rect.y + rect.h],
    [rect.x + rect.w, rect.y + rect.h, rect.x, rect.y + rect.h],
    [rect.x, rect.y + rect.h, rect.x, rect.y],
  ];
  for (const [ax, ay, bx, by] of edges) {
    if (segmentsCross(x1, y1, x2, y2, ax, ay, bx, by)) return true;
  }
  return false;
}

/** True when the segment (x1,y1)-(x2,y2) hits a circle. */
export function segmentHitsCircle(x1, y1, x2, y2, circle) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const lenSq = dx * dx + dy * dy;
  if (lenSq === 0) {
    const ox = x1 - circle.x;
    const oy = y1 - circle.y;
    return ox * ox + oy * oy <= circle.r * circle.r;
  }
  let t = ((circle.x - x1) * dx + (circle.y - y1) * dy) / lenSq;
  t = Math.max(0, Math.min(1, t));
  const cx = x1 + t * dx - circle.x;
  const cy = y1 + t * dy - circle.y;
  return cx * cx + cy * cy <= circle.r * circle.r;
}

function pointInRect(x, y, rect) {
  return x >= rect.x && x <= rect.x + rect.w && y >= rect.y && y <= rect.y + rect.h;
}

function segmentsCross(x1, y1, x2, y2, x3, y3, x4, y4) {
  const d1 = cross(x3, y3, x4, y4, x1, y1);
  const d2 = cross(x3, y3, x4, y4, x2, y2);
  const d3 = cross(x1, y1, x2, y2, x3, y3);
  const d4 = cross(x1, y1, x2, y2, x4, y4);
  return ((d1 > 0 && d2 < 0) || (d1 < 0 && d2 > 0)) && ((d3 > 0 && d4 < 0) || (d3 < 0 && d4 > 0));
}

function cross(ax, ay, bx, by, px, py) {
  return (bx - ax) * (py - ay) - (by - ay) * (px - ax);
}

/**
 * True when nothing blocks the view between two points: no wall, case or pillar
 * in the way, and neither point sits inside smoke.
 */
export function hasLineOfSight(level, smokeClouds, x1, y1, x2, y2) {
  for (const cloud of smokeClouds) {
    const dx = x1 - cloud.x;
    const dy = y1 - cloud.y;
    if (dx * dx + dy * dy < cloud.r * cloud.r) return false;
    const ex = x2 - cloud.x;
    const ey = y2 - cloud.y;
    if (ex * ex + ey * ey < cloud.r * cloud.r) return false;
  }
  for (const wall of level.walls) {
    if (segmentHitsRect(x1, y1, x2, y2, wall)) return false;
  }
  for (const c of level.cases) {
    if (segmentHitsRect(x1, y1, x2, y2, c)) return false;
  }
  for (const pillar of level.pillars) {
    if (segmentHitsCircle(x1, y1, x2, y2, pillar)) return false;
  }
  return true;
}

/** True when (x, y) is inside any shadow zone of the level. */
export function pointInShadow(level, x, y) {
  for (const s of level.shadows) {
    if (x >= s.x && x <= s.x + s.w && y >= s.y && y <= s.y + s.h) return true;
  }
  return false;
}
