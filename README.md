# Blobby

A Tamagotchi-style **virtual pet** in your browser. Raise a procedurally-drawn pixel
"blob" from an **egg** all the way to a fully-grown **adult** through daily check-ins —
feed it, clean up after it, cure its sickness, discipline it, put it to bed, and play
mini-games to keep it happy. Care well and it blossoms into a radiant creature; neglect
it and things go... sludgy.

Part of the [Jarvis constellation](https://jarvis.dabrewer.dev/). A self-contained
standalone app — no build, no backend, no login.

- **Prod:** https://blobby.dabrewer.dev/
- **Dev:** https://blobby.dabrewer.dev/dev/

## The core loop

- **Hatch** the egg, then care for the baby blob over real-world days.
- **Stats** — Hunger, Happiness and Health (4 hearts each), plus Discipline (a bar) and
  Weight. They drain over real time — even while the tab is closed — and you top them up
  with the action buttons.
- **Actions** — 🍖 Feed (meal keeps weight down, snack fattens), 🎮 Play (mini-games),
  🚿 Clean (poop), 💊 Medicine (sickness), ⚡ Discipline (ignore fake-crying, don't over-do
  it), 💡 Lights (sleep / day-night).
- **careScore** — a hidden 0–100 score tracks how well you've raised your blob. Good care,
  daily visits, and mini-game wins raise it; neglect and mistakes lower it.
- **Branching evolution** — the blob evolves at fixed ages (**child @ day 3, teen @ day 7,
  adult @ day 14**). Which of the branching forms it becomes depends on your careScore at
  each stage — 14 possible forms in total, from luminous `Luminos`/`Shimmer` down to grumpy
  `Slog`/`Sludge`.
- **Death & legacy** — let Health hit zero (starvation or untreated sickness) and the blob
  dies. You get a collectible **creature card** (form, generation, days survived, care %,
  star rating) saved to your **Collection**. Hatch a new egg to start the next
  **generation**, which inherits a random flaw (`hungry_fast`, `unhappy_fast`, or
  `weak_immune`).

## Mini-games

Five quick games award happiness (and sometimes discipline/health), with a bonus for a
perfect run:

- ⭐ **Star Tap** — tap stars before they fade.
- 🃏 **Memory Match** — flip 8 tiles to find 4 pairs.
- ✊ **Rock Paper Scissors** — best of 3 against Blobby.
- 🎵 **Rhythm Tap** — Simon-Says colour sequence.
- 🔢 **Number Guess** — guess 1–20 in 5 tries with warmer/colder hints.

## Tech

- **Vanilla JS + Canvas 2D**, no framework and **no build step**. Five plain `<script>`
  tags loaded in order — all functions share the global scope (no modules/bundler).
- Creatures, cards and mini-games are drawn **procedurally** on a 32×32 offscreen canvas
  and scaled up 5× with smoothing off for a crisp pixel-art look.
- Plain CSS with the "Press Start 2P" web font.
- **No backend** — the entire game state (creature, stats, collection, timers) persists to
  `localStorage` under the key `blobby_state`.

## File map

| File | What it does |
| --- | --- |
| `index.html` | DOM shell — device frame, screen/canvas, stat panel, action buttons, and the feed/play/mini-game/card/collection overlays. Loads the five JS files. |
| `style.css` | All styling — the purple "device" shell, hearts, bars, overlays, evolution flash. |
| `js/engine.js` | Pure game logic + state: defaults, save/load, offline decay, the evolution tree, death/next-generation, and every action handler. No DOM access. |
| `js/sprites.js` | Procedural pixel renderer — per-form colour palettes, the creature/eyes/mouth/appendages, creature cards, and collection thumbnails. |
| `js/minigames.js` | The five self-contained mini-games; each reports `{ won, perfect }` back to the game. |
| `js/ui.js` | DOM layer — renders state into the UI and wires up all the buttons. Never mutates state directly. |
| `js/main.js` | Glue/boot — holds the single game state, routes actions, runs the 5-second decay tick and the requestAnimationFrame render loop. |

## Run locally

It's a static site — just open `index.html` in a browser, or serve the folder:

```bash
python3 -m http.server
# then visit http://localhost:8000
```

No install, no dependencies, no build.

## Deploy

Hosted on **GitHub Pages** via `.github/workflows/pages.yml` (runs on every push to `main`
or `dev`):

- `main` → published at the site **root**.
- `dev` → published under **`/dev/`** (with a root redirect to it).
- The workflow writes the `CNAME` (`blobby.dabrewer.dev`). Prod runs over HTTPS with a
  valid Let's Encrypt certificate.

## Workflow

Work on `dev`. Push freely — it deploys automatically. Promote to `main` **only** via an
approved PR (never force-push or reset `main`).

```bash
git push origin dev   # triggers the Pages deploy
```

## Tips

- Time is real wall-clock: stats drain and the blob ages based on actual elapsed time, so
  check in across real days.
- To reset a stuck game, clear the `blobby_state` key from `localStorage`.
