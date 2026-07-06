# Blobby

A browser-based virtual pet (Tamagotchi-style). You raise a pixel "blob" from an
egg through baby → child → teen → adult by checking in over real-world days, feeding,
cleaning, curing sickness, disciplining, toggling day/night lights, and playing
mini-games. Care quality (a `careScore`) plus elapsed days decide which of a branching
tree of forms the creature evolves into. Neglect drains stats and can kill it; on death
you get a collectible "creature card" (saved to a Collection) and can hatch the next
generation, which inherits a random flaw. All state lives in `localStorage`
(`blobby_state`); there is no backend or account. `.jarvis.json` lane: category `games`,
status `in_progress` (both prod and dev).

## Tech
- Vanilla JS, **no modules** — five plain `<script>` tags in `index.html`, all functions
  share the global scope (despite `.jarvis.json` saying "ES modules"). No `import`/`export`.
- Canvas 2D for all creature/mini-game/card rendering; sprites are drawn procedurally on a
  32×32 offscreen canvas and scaled 5× with `imageSmoothingEnabled = false` (pixel-art look).
- Plain CSS (`style.css`), "Press Start 2P" web font from Google Fonts.
- `localStorage` for persistence. **No build step, no dependencies, no package.json.**

## Files
- `index.html` — DOM shell: device frame, screen/canvas, stat panel, action buttons, and
  hidden overlays (feed, play, mini-game, creature card, collection). Loads the 5 JS files in
  order: engine → sprites → minigames → ui → main.
- `style.css` — all styling; the purple "device" shell, hearts, bars, overlays, evo flash.
- `js/engine.js` — pure game logic + state: `defaultState`, save/load/clear (localStorage),
  `applyTimeElapsed` (offline decay, poop/sickness/health/weight/discipline, fake-cry),
  `EVOLUTION_TREE` + `checkEvolution`/`evolve`, `triggerDeath`, all `action*` handlers,
  `hatchEgg`, `startNextGeneration`. No DOM access.
- `js/sprites.js` — procedural pixel renderer: per-form `PALETTES`, `drawCreature`,
  `drawBlobForm`, eyes/mouth/appendages, `drawCreatureCard`, `drawThumb`.
- `js/minigames.js` — five self-contained mini-games (Star Tap, Memory Match, RPS, Rhythm Tap,
  Number Guess), each returning `{ won, perfect }` via callback. `launchMinigame` dispatches.
- `js/ui.js` — DOM layer: `renderUI`, hearts/bars, overlays, button bindings. `initUI(getState,
  onAction)` wires everything; UI never mutates state directly, it calls `onAction`.
- `js/main.js` — glue/boot: holds the single `state`, `onAction` router, `tick` (`TICK_MS`
  5s decay), animation state machine, `requestAnimationFrame` render loop, DOMContentLoaded boot.

## Run locally
Static site — open `index.html` directly, or serve the folder:
`python3 -m http.server` then visit `http://localhost:8000`. No build.

## Deploy
GitHub Pages via `.github/workflows/pages.yml` (triggers on push to `main` and `dev`):
- `main` → published at site root.
- `dev` → published under `/dev/`, with a root `index.html` meta-redirect to `/dev/`.
- Workflow writes `CNAME` = `blobby.dabrewer.dev`. Prod URL `https://blobby.dabrewer.dev/`,
  dev `https://blobby.dabrewer.dev/dev/`.
- Note: both branches deploy to the *same* Pages environment (concurrency group `pages`),
  so the last push wins the root — dev pushes replace root with the redirect stub.
- Prod HTTPS is **live** at `https://blobby.dabrewer.dev/` with a valid Let's Encrypt cert.

## Git workflow
- Work on `dev`. Push to `dev` freely.
- Promote to `main` **only** via a user-approved PR. Never fast-forward, reset-push, or
  force-push `main`.

## Conventions & gotchas
- **README.md is currently empty** — populating it would help; keep it and this file updated
  after meaningful changes.
- All game constants (drain rates, stage days, evolution thresholds, mini-game win bars) are
  top-of-file constants in `engine.js` — tune there.
- State schema is versioned: `defaultState().version = 1`; `loadState` discards any state whose
  `version !== 1`. Bump the version and handle migration if you change the shape, or existing
  players lose their pet.
- Because there are no modules, function/const names are global — watch for collisions when
  adding code, and mind script load order (engine/sprites/minigames must load before ui/main).
- Time is real-world wall-clock: decay is computed from `Date.now()` deltas, and forms gate on
  `daysBorn` (real days: child@3, teen@7, adult@14) — to test evolution you must fake elapsed
  time (e.g. edit `time.birthday`/`lastDecayApplied` in localStorage).
- To reset a stuck game, clear `localStorage` key `blobby_state` (or call `clearState()`).
