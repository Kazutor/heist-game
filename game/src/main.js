// The Meridian Vault — entry point and game loop.
// Wires input, the world and the renderer together, runs the fixed-step loop,
// and stages a frozen screenshot scene when the page opens with ?shot=<name>.

import { CANVAS_H, CANVAS_W, STEP } from './config.js';
import { createWorld, resetWorld, stepWorld } from './world.js';
import { renderWorld } from './render.js';
import { createInput, keyDirection, keyHeld, keyPressed, takeMoveTarget } from './input.js';
import {
  playAlarmSting,
  playCaughtSting,
  playEmpZap,
  playGemChime,
  playSmokeHiss,
  playVaultCrack,
  playWinFanfare,
  unlockAudio,
} from './audio.js';
import { stageShot } from './shots.js';
import { EVENT_ALARM, EVENT_CAUGHT, EVENT_EMP, EVENT_GEM, EVENT_SMOKE, EVENT_VAULT, EVENT_WIN } from './world.js';

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
canvas.width = CANVAS_W;
canvas.height = CANVAS_H;

const params = new URLSearchParams(window.location.search);
const shotName = params.get('shot');

let world;
if (shotName) {
  // Screenshot mode: stage the scene once, then hold the frame still.
  world = stageShot(shotName);
} else {
  world = createWorld(1);
}

// Debug handle for the headless play-test (?debug=1): lets the harness read
// the live world state. Harmless in normal play.
if (params.get('debug') === '1') {
  window.__world = world;
}

const input = createInput(canvas);
let accumulator = 0;
let lastTime = performance.now();
let shotReady = false;

function handleEvent(event) {
  if (event === EVENT_GEM) playGemChime();
  else if (event === EVENT_VAULT) playVaultCrack();
  else if (event === EVENT_SMOKE) playSmokeHiss();
  else if (event === EVENT_EMP) playEmpZap();
  else if (event === EVENT_ALARM) playAlarmSting();
  else if (event === EVENT_CAUGHT) playCaughtSting();
  else if (event === EVENT_WIN) playWinFanfare();
}

function frame(now) {
  const dt = Math.min(0.1, (now - lastTime) / 1000);
  lastTime = now;

  if (!shotName) {
    // Title screen.
    if (world.screen === 'title' && (keyPressed(input, 'enter') || keyPressed(input, ' '))) {
      unlockAudio();
      world.screen = 'play';
    }
    if (world.screen === 'title') {
      const target = takeMoveTarget(input);
      if (target) {
        unlockAudio();
        world.screen = 'play';
      }
    }
    // Pause.
    if (world.screen === 'play' && (keyPressed(input, 'p') || keyPressed(input, 'escape'))) {
      world.screen = 'pause';
    } else if (world.screen === 'pause' && (keyPressed(input, 'p') || keyPressed(input, 'escape'))) {
      world.screen = 'play';
    }
    // Restart.
    if ((world.screen === 'caught' || world.screen === 'win' || world.screen === 'pause')
      && keyPressed(input, 'r')) {
      resetWorld(world);
    }

    if (world.screen === 'play') {
      accumulator += dt;
      while (accumulator >= STEP) {
        accumulator -= STEP;
        const move = keyDirection(input);
        if (move) world.player.moveTarget = null;
        else {
          const target = takeMoveTarget(input);
          if (target) world.player.moveTarget = target;
        }
        const sneak = keyHeld(input, 'shift');
        const useSmoke = keyPressed(input, '1');
        const useEmp = keyPressed(input, '2');
        const event = stepWorld(world, STEP, move, sneak, useSmoke, useEmp);
        handleEvent(event);
      }
    }
  }

  renderWorld(ctx, world);

  if (shotName && !shotReady) {
    shotReady = true;
    window.__shotReady = true;
    document.title = `shot:${shotName}:${world.screen}`;
  }
  requestAnimationFrame(frame);
}

// Surface any runtime error for the headless play-test.
window.addEventListener('error', (event) => {
  document.title = `error:${event.message}`;
  const status = document.getElementById('status');
  if (status) status.textContent = `error: ${event.message}`;
});

requestAnimationFrame(frame);
