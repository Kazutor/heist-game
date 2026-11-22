// Rendering: the whole look of the heist, drawn on one canvas.
// A museum at night — navy marble, gold loot, teal shadow — with the HUD on top:
// the alarm meter, the loot, the timer and the tools, all readable at a glance.

import {
  CANVAS_H,
  CANVAS_W,
  COLORS,
  CAMERA_CONE_HALF_ANGLE,
  CAMERA_RANGE,
  GUARD_CONE_HALF_ANGLE,
  GUARD_CONE_RANGE,
  GUARD_RADIUS,
  PLAYER_RADIUS,
  VAULT_CHANNEL_SECONDS,
} from './config.js';
import { thiefAtVault } from './world.js';

const SCREEN_TITLE = 'title';
const SCREEN_PLAY = 'play';
const SCREEN_PAUSE = 'pause';
const SCREEN_CAUGHT = 'caught';
const SCREEN_WIN = 'win';

export { SCREEN_TITLE, SCREEN_PLAY, SCREEN_PAUSE, SCREEN_CAUGHT, SCREEN_WIN };

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function drawCone(ctx, x, y, angle, range, halfAngle, fill) {
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.arc(x, y, range, angle - halfAngle, angle + halfAngle);
  ctx.closePath();
  ctx.fillStyle = fill;
  ctx.fill();
}

function drawLabel(ctx, text, x, y, size, color) {
  ctx.font = `700 ${size}px system-ui, sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = color;
  ctx.fillText(text, x, y);
}

function alarmColor(alarm) {
  if (alarm >= 75) return COLORS.alarmRed;
  if (alarm >= 40) return COLORS.alarmAmber;
  return COLORS.alarmGreen;
}

function alarmStageLabel(world) {
  if (world.alarmStage === 'spotted') return 'SPOTTED!';
  if (world.alarmStage === 'hunt') return 'HUNTED';
  if (world.alarmStage === 'suspicious') return 'SUSPICIOUS';
  return 'CALM';
}

function drawFloor(ctx, level) {
  ctx.fillStyle = COLORS.floorA;
  ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
  // Marble checker.
  const tile = 64;
  ctx.fillStyle = COLORS.floorB;
  for (let ty = 0; ty < Math.ceil(CANVAS_H / tile); ty += 1) {
    for (let tx = 0; tx < Math.ceil(CANVAS_W / tile); tx += 1) {
      if ((tx + ty) % 2 === 0) ctx.fillRect(tx * tile, ty * tile, tile, tile);
    }
  }
  // Shadow zones: dark rugs and the vent strip.
  for (const s of level.shadows) {
    ctx.fillStyle = s.label === 'VENT' ? COLORS.vent : COLORS.rug;
    ctx.fillRect(s.x, s.y, s.w, s.h);
    ctx.strokeStyle = 'rgba(232, 236, 247, 0.14)';
    ctx.lineWidth = 1;
    ctx.strokeRect(s.x + 0.5, s.y + 0.5, s.w, s.h);
    drawLabel(ctx, s.label, s.x + s.w / 2, s.y + s.h / 2, 11, 'rgba(232, 236, 247, 0.35)');
  }
}

function drawWalls(ctx, level) {
  for (const wall of level.walls) {
    ctx.fillStyle = COLORS.wall;
    ctx.fillRect(wall.x, wall.y, wall.w, wall.h);
    ctx.fillStyle = COLORS.wallTop;
    if (wall.h <= 16) ctx.fillRect(wall.x, wall.y, wall.w, 4);
    else ctx.fillRect(wall.x, wall.y, 4, wall.h);
  }
}

function drawCases(ctx, level) {
  for (const c of level.cases) {
    ctx.fillStyle = COLORS.caseFrame;
    ctx.fillRect(c.x, c.y, c.w, c.h);
    ctx.fillStyle = COLORS.caseGlass;
    ctx.fillRect(c.x + 4, c.y + 4, c.w - 8, c.h - 8);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.10)';
    ctx.fillRect(c.x + 4, c.y + 4, c.w - 8, 10);
    drawLabel(ctx, c.label, c.x + c.w / 2, c.y + c.h / 2 + 8, 10, 'rgba(232, 236, 247, 0.55)');
  }
  for (const pillar of level.pillars) {
    ctx.beginPath();
    ctx.arc(pillar.x, pillar.y, pillar.r, 0, Math.PI * 2);
    ctx.fillStyle = COLORS.pillar;
    ctx.fill();
    ctx.beginPath();
    ctx.arc(pillar.x, pillar.y, pillar.r - 6, 0, Math.PI * 2);
    ctx.fillStyle = COLORS.wallTop;
    ctx.fill();
  }
}

function drawVaultAndExit(ctx, world) {
  const v = world.level.vault;
  ctx.fillStyle = world.vaultTaken ? '#5a4a1a' : COLORS.goldDim;
  ctx.fillRect(v.x, v.y, v.w, v.h);
  // Vault door.
  ctx.beginPath();
  ctx.arc(v.cx, v.cy, 34, 0, Math.PI * 2);
  ctx.fillStyle = world.vaultTaken ? '#4a3d18' : COLORS.gold;
  ctx.fill();
  ctx.beginPath();
  ctx.arc(v.cx, v.cy, 26, 0, Math.PI * 2);
  ctx.fillStyle = '#1b2340';
  ctx.fill();
  ctx.beginPath();
  ctx.arc(v.cx, v.cy, 10, 0, Math.PI * 2);
  ctx.fillStyle = world.vaultTaken ? '#4a3d18' : COLORS.gold;
  ctx.fill();
  // Vault label, on a dark plate so it stays readable when a guard stands on it.
  const vaultLabel = world.vaultTaken ? 'VAULT — EMPTIED' : 'VAULT — $50,000';
  ctx.font = '700 11px system-ui, sans-serif';
  const vaultLabelW = ctx.measureText(vaultLabel).width + 16;
  ctx.fillStyle = 'rgba(8, 11, 24, 0.8)';
  roundRect(ctx, v.cx - vaultLabelW / 2, v.y + v.h + 4, vaultLabelW, 17, 4);
  ctx.fill();
  drawLabel(ctx, vaultLabel, v.cx, v.y + v.h + 13, 11, COLORS.gold);
  if (!world.vaultTaken && thiefAtVault(world)) {
    const pct = Math.min(1, world.vaultChannel / VAULT_CHANNEL_SECONDS);
    ctx.fillStyle = 'rgba(8, 11, 24, 0.85)';
    ctx.fillRect(v.cx - 60, v.y - 26, 120, 12);
    ctx.fillStyle = COLORS.gold;
    ctx.fillRect(v.cx - 58, v.y - 24, 116 * pct, 8);
    drawLabel(ctx, 'CRACKING…', v.cx, v.y - 36, 11, COLORS.gold);
  }

  // The getaway door.
  const e = world.level.exit;
  const open = world.exitOpen;
  ctx.fillStyle = open ? COLORS.exitGreen : '#2c4a3a';
  ctx.fillRect(e.x, e.y, e.w, e.h);
  drawLabel(ctx, open ? 'EXIT — GO!' : 'EXIT — LOCKED', e.cx, e.cy, 12, open ? '#08131b' : '#9aa5c4');
  if (open) {
    ctx.strokeStyle = COLORS.exitGreen;
    ctx.lineWidth = 2;
    ctx.strokeRect(e.x - 4, e.y - 4, e.w + 8, e.h + 8);
  }
}

function drawGems(ctx, world, time) {
  for (const gem of world.level.gems) {
    if (gem.taken) continue;
    const pulse = 1 + 0.12 * Math.sin(time * 4 + gem.x);
    ctx.beginPath();
    ctx.arc(gem.x, gem.y, 10 * pulse, 0, Math.PI * 2);
    ctx.fillStyle = COLORS.gem;
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(gem.x, gem.y - 7);
    ctx.lineTo(gem.x + 6, gem.y);
    ctx.lineTo(gem.x, gem.y + 7);
    ctx.lineTo(gem.x - 6, gem.y);
    ctx.closePath();
    ctx.fillStyle = '#e8fffb';
    ctx.fill();
  }
}

function drawCones(ctx, world) {
  // Camera cones first (under the guard cones).
  for (const camera of world.cameras) {
    if (camera.disabledLeft > 0) continue;
    drawCone(ctx, camera.x, camera.y, camera.angle, CAMERA_RANGE, CAMERA_CONE_HALF_ANGLE, COLORS.cameraCone);
  }
  for (const guard of world.guards) {
    let fill = COLORS.coneCalm;
    if (guard.state === 'chase') fill = COLORS.coneHunt;
    else if (guard.state === 'investigate') fill = COLORS.coneSuspicious;
    drawCone(ctx, guard.x, guard.y, guard.angle, GUARD_CONE_RANGE, GUARD_CONE_HALF_ANGLE, fill);
  }
}

function drawCameras(ctx, world) {
  for (const camera of world.cameras) {
    const off = camera.disabledLeft > 0;
    ctx.beginPath();
    ctx.arc(camera.x, camera.y, 11, 0, Math.PI * 2);
    ctx.fillStyle = off ? COLORS.cameraOff : '#123a3f';
    ctx.fill();
    ctx.strokeStyle = off ? '#5a6a8a' : COLORS.gem;
    ctx.lineWidth = 2;
    ctx.stroke();
    // Lens direction tick.
    ctx.beginPath();
    ctx.moveTo(camera.x, camera.y);
    ctx.lineTo(camera.x + Math.cos(camera.angle) * 16, camera.y + Math.sin(camera.angle) * 16);
    ctx.strokeStyle = off ? '#5a6a8a' : COLORS.gem;
    ctx.lineWidth = 3;
    ctx.stroke();
    // Label on the room side of the camera, never clipped by the HUD or walls.
    const labelY = camera.y < 200 ? camera.y + 24 : camera.y - 22;
    drawLabel(ctx, off ? `${camera.label} OFF` : camera.label, camera.x, labelY, 10, off ? '#5a6a8a' : COLORS.gem);
  }
}

function drawGuards(ctx, world) {
  for (const guard of world.guards) {
    ctx.beginPath();
    ctx.arc(guard.x, guard.y, GUARD_RADIUS, 0, Math.PI * 2);
    ctx.fillStyle = COLORS.guard;
    ctx.fill();
    ctx.strokeStyle = guard.state === 'chase' ? COLORS.alarmRed : COLORS.guardTrim;
    ctx.lineWidth = 2;
    ctx.stroke();
    // Facing tick + name.
    ctx.beginPath();
    ctx.moveTo(guard.x, guard.y);
    ctx.lineTo(guard.x + Math.cos(guard.angle) * (GUARD_RADIUS + 7), guard.y + Math.sin(guard.angle) * (GUARD_RADIUS + 7));
    ctx.strokeStyle = COLORS.guardTrim;
    ctx.lineWidth = 3;
    ctx.stroke();
    drawLabel(ctx, guard.name.toUpperCase(), guard.x, guard.y - GUARD_RADIUS - 12, 10, COLORS.hudMuted);
  }
}

function drawThief(ctx, world) {
  const p = world.player;
  // Sneak ring when sneaking.
  if (p.sneaking) {
    ctx.beginPath();
    ctx.arc(p.x, p.y, PLAYER_RADIUS + 7, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(176, 79, 227, 0.7)';
    ctx.lineWidth = 2;
    ctx.stroke();
  }
  ctx.beginPath();
  ctx.arc(p.x, p.y, PLAYER_RADIUS, 0, Math.PI * 2);
  ctx.fillStyle = COLORS.thief;
  ctx.fill();
  ctx.strokeStyle = COLORS.thiefScarf;
  ctx.lineWidth = 3;
  ctx.stroke();
  // Hat brim + facing tick.
  ctx.beginPath();
  ctx.arc(p.x, p.y, 5, 0, Math.PI * 2);
  ctx.fillStyle = COLORS.thiefScarf;
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(p.x, p.y);
  ctx.lineTo(p.x + Math.cos(p.angle) * (PLAYER_RADIUS + 6), p.y + Math.sin(p.angle) * (PLAYER_RADIUS + 6));
  ctx.strokeStyle = '#e8ecf7';
  ctx.lineWidth = 2;
  ctx.stroke();
  drawLabel(ctx, 'YOU', p.x, p.y - PLAYER_RADIUS - 12, 10, '#e8ecf7');
  // Click-to-move target marker.
  if (p.moveTarget) {
    ctx.beginPath();
    ctx.arc(p.moveTarget.x, p.moveTarget.y, 8, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(232, 236, 247, 0.6)';
    ctx.lineWidth = 2;
    ctx.stroke();
  }
}

function drawSmoke(ctx, world) {
  for (const cloud of world.tools.clouds) {
    const alpha = Math.min(0.75, (cloud.left / 4) * 0.75 + 0.2);
    ctx.beginPath();
    ctx.arc(cloud.x, cloud.y, cloud.r, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(190, 200, 220, ${alpha})`;
    ctx.fill();
    ctx.beginPath();
    ctx.arc(cloud.x - 30, cloud.y + 14, cloud.r * 0.55, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(190, 200, 220, ${alpha * 0.8})`;
    ctx.fill();
    drawLabel(ctx, 'SMOKE', cloud.x, cloud.y, 11, 'rgba(20, 26, 46, 0.8)');
  }
}

function drawHud(ctx, world) {
  ctx.fillStyle = COLORS.hudBg;
  ctx.fillRect(0, 0, CANVAS_W, 56);
  ctx.fillStyle = COLORS.gold;
  ctx.fillRect(0, 54, CANVAS_W, 2);

  // Title.
  ctx.font = '800 19px system-ui, sans-serif';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = COLORS.hudText;
  ctx.fillText('THE MERIDIAN VAULT', 18, 20);
  ctx.font = '600 11px system-ui, sans-serif';
  ctx.fillStyle = COLORS.hudMuted;
  ctx.fillText('one room · four guards · three cameras · one vault', 18, 40);

  // Alarm meter — the big one, centre-left. The SPOTTED grace countdown rides
  // in the label itself so it never collides with the loot line.
  const meterX = 330;
  const meterW = 300;
  ctx.font = '800 13px system-ui, sans-serif';
  ctx.textAlign = 'left';
  ctx.fillStyle = alarmColor(world.alarm);
  const graceText = world.graceLeft > 0 ? ` — BREAK SIGHT ${world.graceLeft.toFixed(1)}s` : '';
  ctx.fillText(`ALARM  ${Math.round(world.alarm)}% — ${alarmStageLabel(world)}${graceText}`, meterX, 18);
  ctx.fillStyle = '#232c4a';
  roundRect(ctx, meterX, 30, meterW, 14, 7);
  ctx.fill();
  ctx.fillStyle = alarmColor(world.alarm);
  if (world.alarm > 0) {
    roundRect(ctx, meterX, 30, Math.max(14, (meterW * world.alarm) / 100), 14, 7);
    ctx.fill();
  }
  // Stage ticks.
  ctx.fillStyle = 'rgba(232, 236, 247, 0.5)';
  ctx.fillRect(meterX + (meterW * 40) / 100, 28, 1, 18);
  ctx.fillRect(meterX + (meterW * 75) / 100, 28, 1, 18);

  // Loot.
  const lootX = 700;
  ctx.font = '800 15px system-ui, sans-serif';
  ctx.fillStyle = COLORS.gold;
  ctx.fillText(`LOOT  $${world.loot.toLocaleString('en-US')}`, lootX, 20);
  ctx.font = '600 11px system-ui, sans-serif';
  ctx.fillStyle = COLORS.hudMuted;
  ctx.fillText(world.vaultTaken ? 'vault cracked — reach the EXIT' : 'crack the vault, then reach the EXIT', lootX, 40);

  // Timer.
  const minutes = Math.floor(world.time / 60);
  const seconds = Math.floor(world.time % 60);
  ctx.font = '800 15px system-ui, sans-serif';
  ctx.textAlign = 'right';
  ctx.fillStyle = COLORS.hudText;
  ctx.fillText(`TIME  ${minutes}:${String(seconds).padStart(2, '0')}`, 1060, 20);
  ctx.font = '600 11px system-ui, sans-serif';
  ctx.fillStyle = COLORS.hudMuted;
  ctx.fillText(`gems ${world.gemsTaken}/3`, 1060, 40);

  // Tools.
  ctx.textAlign = 'left';
  ctx.font = '800 13px system-ui, sans-serif';
  ctx.fillStyle = COLORS.hudText;
  ctx.fillText(`[1] SMOKE ×${world.tools.smoke}    [2] EMP ×${world.tools.emp}`, 1100, 20);
  ctx.font = '600 11px system-ui, sans-serif';
  ctx.fillStyle = COLORS.hudMuted;
  ctx.fillText('Shift sneak · P pause · R restart', 1100, 40);
}

function drawMessage(ctx, world) {
  if (world.messageLeft <= 0 || !world.message) return;
  ctx.font = '800 17px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const w = ctx.measureText(world.message).width + 36;
  ctx.fillStyle = 'rgba(8, 11, 24, 0.85)';
  roundRect(ctx, CANVAS_W / 2 - w / 2, 66, w, 34, 8);
  ctx.fill();
  ctx.fillStyle = COLORS.gold;
  ctx.fillText(world.message, CANVAS_W / 2, 84);
}

function drawOverlay(ctx, title, lines, accent) {
  ctx.fillStyle = 'rgba(6, 9, 20, 0.78)';
  ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = '800 46px system-ui, sans-serif';
  ctx.fillStyle = accent;
  ctx.fillText(title, CANVAS_W / 2, 250);
  ctx.font = '600 18px system-ui, sans-serif';
  ctx.fillStyle = COLORS.hudText;
  let y = 310;
  for (const line of lines) {
    ctx.fillText(line, CANVAS_W / 2, y);
    y += 30;
  }
}

/** Draw the whole game for the world's current screen. */
export function renderWorld(ctx, world) {
  const level = world.level;
  drawFloor(ctx, level);
  drawCones(ctx, world);
  drawVaultAndExit(ctx, world);
  drawCases(ctx, level);
  drawGems(ctx, world, world.time);
  drawCameras(ctx, world);
  drawGuards(ctx, world);
  drawSmoke(ctx, world);
  drawThief(ctx, world);
  drawWalls(ctx, level);
  drawHud(ctx, world);
  drawMessage(ctx, world);

  // Alarm vignette: the room turns red as the meter climbs.
  if (world.alarm >= 40 && world.screen === SCREEN_PLAY) {
    const strength = world.alarm >= 75 ? 0.16 : 0.08;
    const grad = ctx.createRadialGradient(
      CANVAS_W / 2, CANVAS_H / 2, CANVAS_H * 0.35,
      CANVAS_W / 2, CANVAS_H / 2, CANVAS_H * 0.75,
    );
    grad.addColorStop(0, 'rgba(232, 64, 64, 0)');
    grad.addColorStop(1, `rgba(232, 64, 64, ${strength})`);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
  }

  if (world.screen === SCREEN_TITLE) {
    drawOverlay(ctx, 'THE MERIDIAN VAULT', [
      'One room. Four guards. Three cameras. One vault.',
      'Slip past the vision cones — rugs and the vent run hide you.',
      'Crack the vault ($50,000), pocket the gems, reach the EXIT.',
      'WASD / arrows to walk · Shift to sneak · click to move',
      '[1] smoke pellet (×2) · [2] EMP a camera (×1) · P pause',
      '',
      'Press ENTER or click to start the heist',
    ], COLORS.gold);
  } else if (world.screen === SCREEN_PAUSE) {
    drawOverlay(ctx, 'PAUSED', [
      'The guards wait. The cameras keep sweeping.',
      'Press P or Escape to keep sneaking · R to restart',
    ], COLORS.hudText);
  } else if (world.screen === SCREEN_CAUGHT) {
    drawOverlay(ctx, 'CAUGHT!', [
      'A guard got a hand on you — or the alarm hit 100 with nowhere to hide.',
      `Loot kept: $${world.loot.toLocaleString('en-US')} · time ${Math.floor(world.time)}s`,
      'Press R to try the heist again',
    ], COLORS.alarmRed);
  } else if (world.screen === SCREEN_WIN) {
    drawOverlay(ctx, 'GETAWAY!', [
      `You slipped out with $${world.loot.toLocaleString('en-US')} in loot.`,
      `Time bonus $${Math.max(0, world.score - world.loot).toLocaleString('en-US')} · total score $${world.score.toLocaleString('en-US')}`,
      `Finished in ${Math.floor(world.time)}s with the alarm at ${Math.round(world.alarm)}%.`,
      'Press R to run the heist again',
    ], COLORS.exitGreen);
  }
}
