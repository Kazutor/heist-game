// The Meridian Vault — the one room of the heist, laid out as data.
// A museum gallery at night: display cases and pillars for cover, dark rugs and a
// vent run for shadow routes, four patrolling guards, three sweeping wall cameras,
// a gold vault in the north-east corner and a getaway door in the south-west.
//
// Routes through the room:
//   1. The Gallery Run — straight up the middle past the cases (fast, exposed).
//   2. The Shadow Rugs — rug to rug along the south wall, then the east wall.
//   3. The Vent Run — the marked vent strip along the north wall, out of every
//      guard's patrol line, but it drops you right under the vault camera.

export function buildMeridianVaultLevel() {
  return {
    name: 'The Meridian Vault',
    // Walls block movement and line of sight. The first four are the room itself.
    walls: [
      { x: 16, y: 64, w: 1248, h: 16 }, // north
      { x: 16, y: 688, w: 1248, h: 16 }, // south
      { x: 16, y: 64, w: 16, h: 640 }, // west
      { x: 1248, y: 64, w: 16, h: 640 }, // east
      { x: 300, y: 240, w: 16, h: 180 }, // west partition
      { x: 964, y: 240, w: 16, h: 180 }, // east partition
      { x: 480, y: 120, w: 300, h: 16 }, // north gallery rail
      { x: 480, y: 560, w: 300, h: 16 }, // south gallery rail
    ],
    // Display cases: solid cover that blocks sight and movement.
    cases: [
      { x: 180, y: 180, w: 120, h: 60, label: 'JADE' },
      { x: 180, y: 480, w: 120, h: 60, label: 'SILK' },
      { x: 980, y: 300, w: 120, h: 60, label: 'PORCELAIN' },
      { x: 980, y: 480, w: 120, h: 60, label: 'IVORY' },
      { x: 590, y: 330, w: 100, h: 60, label: 'CROWN' },
    ],
    // Pillars: round cover.
    pillars: [
      { x: 420, y: 400, r: 22 },
      { x: 840, y: 400, r: 22 },
      { x: 640, y: 200, r: 22 },
      { x: 640, y: 560, r: 22 },
    ],
    // Shadow zones: rugs and the vent strip. Detection rises 3x slower here.
    shadows: [
      { x: 120, y: 300, w: 140, h: 130, label: 'RUG' },
      { x: 1020, y: 130, w: 170, h: 110, label: 'RUG' },
      { x: 560, y: 600, w: 200, h: 80, label: 'RUG' },
      { x: 60, y: 88, w: 330, h: 40, label: 'VENT' },
    ],
    // The vault: a gold strong-room in the north-east corner.
    vault: { x: 1060, y: 96, w: 140, h: 90, cx: 1130, cy: 141 },
    // The getaway door in the south-west corner.
    exit: { x: 40, y: 660, w: 92, h: 28, cx: 86, cy: 674 },
    // Optional side loot: gems beside three of the cases, on open floor.
    gems: [
      { x: 240, y: 260, taken: false, label: 'JADE GEM' },
      { x: 640, y: 430, taken: false, label: 'CROWN JEWEL' },
      { x: 1040, y: 390, taken: false, label: 'PEARL' },
    ],
    playerStart: { x: 86, y: 620 },
    // Four guards on patrol rounds you can learn.
    guards: [
      {
        name: 'Rook',
        waypoints: [[240, 140], [640, 140], [1040, 140], [640, 140]],
      },
      {
        name: 'Bishop',
        waypoints: [[340, 520], [640, 520], [900, 520], [640, 520]],
      },
      {
        name: 'Knight',
        waypoints: [[420, 300], [420, 500], [840, 500], [840, 300]],
      },
      {
        name: 'Queen',
        waypoints: [[940, 200], [940, 480], [1120, 480], [1080, 260]],
      },
    ],
    // Three wall cameras sweeping their cones.
    cameras: [
      { x: 640, y: 80, baseAngle: Math.PI / 2, sweep: 0.9, speed: 0.55, label: 'CAM 1' },
      { x: 1240, y: 300, baseAngle: Math.PI, sweep: 0.7, speed: 0.7, label: 'CAM 2' },
      { x: 500, y: 688, baseAngle: -Math.PI / 2, sweep: 0.8, speed: 0.6, label: 'CAM 3' },
    ],
  };
}
