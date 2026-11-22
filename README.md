# The Meridian Vault — a top-down heist game

[![make.fun · best-heist-game-20261122-0559](https://make.fun/badge/best-heist-game-20261122-0559.svg)](https://make.fun/bounty/best-heist-game-20261122-0559?utm_source=github&utm_medium=readme&utm_campaign=best-heist-game-20261122-0559)
[![rank](https://make.fun/badge/best-heist-game-20261122-0559/Kazutor/heist-game/rank.svg)](https://make.fun/bounty/best-heist-game-20261122-0559/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=best-heist-game-20261122-0559)
[![reward](https://make.fun/badge/best-heist-game-20261122-0559/Kazutor/heist-game/reward.svg)](https://make.fun/bounty/best-heist-game-20261122-0559?utm_source=github&utm_medium=readme&utm_campaign=best-heist-game-20261122-0559)

A top-down stealth heist game for the [make.fun bounty "Make the best heist game"](https://make.fun/bounty/best-heist-game-20261122-0559).
You are a lone thief in the Meridian Vault, a museum gallery at night: slip past
**4 patrolling guards** with visible vision cones and **3 sweeping wall cameras**,
crack the **$50,000 vault**, pocket the gems, and reach the **EXIT** before the
alarm meter hits 100.

## The game in numbers

- **1 room, 3 routes** — the exposed Gallery Run up the middle, the Shadow Rugs
  along the south and east walls (detection rises 3× slower), and the Vent Run
  along the north wall, out of every guard's patrol line
- **4 guards** on patrol rounds you can learn (waypoints + 1.2 s waits), **3 cameras**
  sweeping 265 px / 56° cones; cones turn amber at alarm 40, red at 75
- **Alarm 0–100** that rises on sight (30/s close, 18/s mid, 11/s far; halved while
  sneaking, thirded in shadow) and decays at 14/s in the dark; at 100 you get a
  fair **1.5 s SPOTTED grace** to break line of sight before the catch
- **2 tools, each a cost**: smoke pellets ×2 (4 s of cover, blocks every cone) and
  an EMP ×1 (switches the nearest camera off for 6 s)
- **$65,000 of loot** — $50,000 vault + 3 gems at $5,000 each — plus a time bonus
  of $100 per second under 3 minutes
- **Sound**: footsteps, gem chime, vault crack, alarm sting, getaway fanfare — all
  synthesised in WebAudio, zero audio files, zero network requests
- **Tested**: the autopilot plays the real rules forward to the win; every loot
  spot and the exit are reachable from the player start (breadth-first pathfinding)

## How to play

Open `game/index.html` in desktop Chrome (or serve `game/` with any static
server). No build step, no network, no libraries.

| Input | Action |
|---|---|
| WASD / arrows | Walk |
| Shift | Sneak (slower, harder to spot) |
| Click the floor | Walk there |
| 1 | Smoke pellet (×2) |
| 2 | EMP the nearest camera (×1) |
| P / Esc | Pause |
| R | Restart |
| Enter | Start |

Grab the vault loot, then reach the green EXIT door in the south-west corner.
If the alarm hits 100, break line of sight within 1.5 s — or a guard will catch you.

## Files

- `game/index.html` — the page
- `game/src/main.js` — entry point and game loop
- `game/src/world.js` — the heist state machine: alarm, loot, win/caught
- `game/src/levels.js` — the Meridian Vault room layout and its 3 routes
- `game/src/guards.js` — patrol, investigate, chase
- `game/src/cameras.js` — sweeping cones and the EMP
- `game/src/vision.js` — cones and line of sight
- `game/src/tools.js` — smoke pellets and the EMP
- `game/src/render.js` — all canvas drawing: room, cones, HUD, overlays
- `game/src/audio.js` — synthesised WebAudio sounds
- `game/src/input.js` — keyboard and mouse
- `game/src/shots.js` — the staged screenshot scenes (autopilot plays the real rules)
- `main.ts` — hands the game in: copies `game/` + `screenshots/` and writes `dossier.json`
