// ── Main — game loop + action routing ────────────────────────────

let state;
let animState  = 'idle';
let animUntil  = 0;
let lastTick   = 0;
let lastForm   = null;
const TICK_MS  = 5000;

function getState() { return state; }

function onAction(action, payload) {
  let result;

  // Fake cry: any action except discipline responds to it (incorrectly)
  if (state.events.isFakeCrying && action !== 'discipline' && action !== 'hatch' && action !== 'lights' && action !== 'play') {
    actionRespondToFakeCry(state);
  }

  switch (action) {
    case 'hatch':
      if (state.status.isEgg) {
        hatchEgg(state);
        setAnim('happy', 3000);
        showEvolutionFlash('Baby Blob');
      }
      break;

    case 'feed':
      result = actionFeed(state, payload);
      if (result.ok) setAnim('eating', 2500);
      flashMessage(result.msg);
      break;

    case 'clean':
      result = actionClean(state);
      if (result.ok) setAnim('happy', 2000);
      flashMessage(result.msg);
      break;

    case 'medicine':
      result = actionMedicine(state);
      if (result.ok) setAnim('happy', 2000);
      flashMessage(result.msg);
      break;

    case 'discipline':
      result = actionDiscipline(state);
      if (result.ok) flashMessage(result.msg);
      else { flashMessage(result.msg); setAnim('sad', 1500); }
      break;

    case 'lights':
      result = actionLights(state);
      flashMessage(result.msg);
      break;

    case 'play':
      if (!canAct(state)) return;
      launchMinigame(payload, (res) => {
        const reward = res.perfect ? 2 : res.won ? 1 : 0;
        if (reward > 0) {
          awardMinigame(state, 'happiness', reward);
          if (payload === 'memory') awardMinigame(state, 'discipline', reward);
          setAnim('playing', 2500);
          flashMessage(res.perfect ? '✨ Perfect!' : '🎉 Great job!');
        } else {
          flashMessage('Good try!');
        }
        saveState(state);
        renderUI(state);
      });
      return;

    case 'saveCard':
      flashMessage('Card saved to collection!');
      break;

    case 'nextGen':
      state = startNextGeneration(state);
      setAnim('idle', 0);
      break;

    case 'openCollection':
      showCollection(state);
      return;
  }

  saveState(state);
  renderUI(state);
}

function setAnim(name, duration) {
  animState = name;
  animUntil = duration > 0 ? Date.now() + duration : 0;
}

// ── Tick: apply time elapsed ──────────────────────────────────────
function tick(now) {
  if (now - lastTick < TICK_MS) return;
  lastTick = now;

  if (!state.status.isEgg && !state.status.isDead) {
    const prevForm = state.creature.form;
    state = applyTimeElapsed(state);

    // Evolution flash
    if (state.creature.form !== prevForm && state.creature.formName) {
      lastForm = state.creature.form;
      setAnim('happy', 4000);
      showEvolutionFlash(state.creature.formName);
    }

    // Check if creature just died
    if (state.status.isDead) {
      setAnim('sad', 0);
      saveState(state);
      renderUI(state);
      setTimeout(() => showCard(state), 2000);
      return;
    }
    saveState(state);
    renderUI(state);
  }
}

// ── Animation state manager ───────────────────────────────────────
function currentAnimState() {
  if (animUntil > 0 && Date.now() > animUntil) {
    animState = 'idle';
    animUntil = 0;
  }
  if (state.status.isSleeping) return 'sleeping';
  if (state.events.isSick)     return 'sick';
  if (state.events.hasPoop)    return 'pooping';
  if (animState !== 'idle')    return animState;
  if (state.stats.hunger <= 1) return 'sad';
  if (state.stats.happiness <= 1) return 'sad';
  return 'idle';
}

// ── Render loop ───────────────────────────────────────────────────
function renderLoop(now) {
  tick(now);

  const canvas = document.getElementById('creature-canvas');
  if (canvas) {
    const ctx = canvas.getContext('2d');
    const as = state.status.isEgg ? 'idle' : currentAnimState();
    drawCreature(ctx, state.creature.form, as, now, canvas.width, canvas.height);
  }

  requestAnimationFrame(renderLoop);
}

// ── Boot ──────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  state = loadState() || defaultState();

  // Apply time elapsed since last save
  if (!state.status.isEgg && !state.status.isDead) {
    state = applyTimeElapsed(state);
  }

  // Auto-sleep if night
  if (!state.status.isEgg) {
    state.status.isSleeping = isNightTime();
    if (isNightTime() && !state.status.lightsOff) state.status.lightsOff = true;
    if (!isNightTime() && state.status.lightsOff) {
      state.status.lightsOff = false;
      state.status.isSleeping = false;
    }
  }

  initUI(getState, onAction);
  renderUI(state);
  saveState(state);

  // Show pending card if creature died last session
  if (state.status.isDead && state.status.pendingCard) {
    setTimeout(() => showCard(state), 1000);
  }

  lastTick = Date.now();
  requestAnimationFrame(renderLoop);
});
