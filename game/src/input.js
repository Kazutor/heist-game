// Input: keyboard and mouse, both.
// WASD or arrows to walk, Shift to sneak, 1 for a smoke pellet, 2 for the EMP,
// P or Escape to pause, R to restart, Enter to start. Clicking the floor sets a
// move target the thief walks to — the mouse plays too.

export function createInput(canvas) {
  const input = {
    keys: new Set(),
    moveTarget: null, // { x, y } in canvas coordinates, or null
    pressed: new Set(), // keys pressed since the last consume
  };

  window.addEventListener('keydown', (event) => {
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '].includes(event.key)) {
      event.preventDefault();
    }
    if (!event.repeat) input.pressed.add(event.key.toLowerCase());
    input.keys.add(event.key.toLowerCase());
  });
  window.addEventListener('keyup', (event) => {
    input.keys.delete(event.key.toLowerCase());
  });
  window.addEventListener('blur', () => {
    input.keys.clear();
    input.moveTarget = null;
  });

  canvas.addEventListener('pointerdown', (event) => {
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    input.moveTarget = {
      x: (event.clientX - rect.left) * scaleX,
      y: (event.clientY - rect.top) * scaleY,
    };
  });

  return input;
}

/** True while a key is held. */
export function keyHeld(input, key) {
  return input.keys.has(key);
}

/** True once for a key pressed since the last check (then it is consumed). */
export function keyPressed(input, key) {
  if (input.pressed.has(key)) {
    input.pressed.delete(key);
    return true;
  }
  return false;
}

/** Consume the click-to-move target, if any. */
export function takeMoveTarget(input) {
  const target = input.moveTarget;
  input.moveTarget = null;
  return target;
}

/** The walk direction from the held keys, normalised, or null. */
export function keyDirection(input) {
  let dx = 0;
  let dy = 0;
  if (input.keys.has('a') || input.keys.has('arrowleft')) dx -= 1;
  if (input.keys.has('d') || input.keys.has('arrowright')) dx += 1;
  if (input.keys.has('w') || input.keys.has('arrowup')) dy -= 1;
  if (input.keys.has('s') || input.keys.has('arrowdown')) dy += 1;
  if (dx === 0 && dy === 0) return null;
  const len = Math.hypot(dx, dy);
  return { x: dx / len, y: dy / len };
}
