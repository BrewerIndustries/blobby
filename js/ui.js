// ── UI layer ─────────────────────────────────────────────────────
// Reads game state and updates DOM. Handles button events.

let _state = null;
let _onStateChange = null;

function initUI(getState, onAction) {
  _state = getState;
  _onStateChange = onAction;
  bindButtons();
}

// ── DOM updaters ─────────────────────────────────────────────────
function renderUI(state) {
  // Header
  setTxt('creature-name', state.creature.name);
  setTxt('creature-form-name', state.creature.formName || '');
  setTxt('day-counter', `DAY ${state.time.daysBorn}`);
  setTxt('gen-counter', `GEN ${state.creature.generation}`);

  // Status icons
  tog('icon-poop',  state.events.hasPoop);
  tog('icon-sick',  state.events.isSick);
  tog('icon-attn',  state.events.isFakeCrying || (state.stats.hunger <= 1) || (state.stats.happiness <= 1));
  tog('icon-sleep', state.status.isSleeping);

  // Stats
  renderHearts('hunger-hearts', Math.round(state.stats.hunger), 4);
  renderHearts('happy-hearts',  Math.round(state.stats.happiness), 4);
  renderHearts('health-hearts', Math.round(state.stats.health), 4);

  const disc = Math.round(state.stats.discipline);
  el('disc-bar').style.width = disc + '%';

  const w = Math.round(state.stats.weight);
  setTxt('weight-val', w);
  const badge = el('weight-badge');
  if (badge) {
    if      (w <= 3)  { badge.textContent = 'SLIM';    badge.className = 'slim'; }
    else if (w <= 10) { badge.textContent = 'HEALTHY'; badge.className = 'healthy'; }
    else if (w <= 18) { badge.textContent = 'CHUBBY';  badge.className = 'chubby'; }
    else              { badge.textContent = 'HEAVY';   badge.className = 'heavy'; }
  }

  // Night dim
  el('screen')?.classList.toggle('lights-off', !!state.status.lightsOff);

  // Button states
  const alive = state.status.isAlive && !state.status.isEgg && !state.status.isDead;
  const awake = alive && !state.status.isSleeping;
  btn('btn-feed',       awake && state.stats.hunger < 4);
  btn('btn-play',       awake);
  btn('btn-clean',      awake && state.events.hasPoop);
  btn('btn-medicine',   awake && state.events.isSick);
  btn('btn-discipline', alive);
  btn('btn-lights',     alive);

  // Message
  setMsg(state);
}

function renderHearts(id, filled, max) {
  const container = el(id);
  container.innerHTML = '';
  for (let i = 0; i < max; i++) {
    const span = document.createElement('span');
    span.className = 'heart ' + (i < filled ? 'full' : 'empty');
    span.textContent = '♥';
    container.appendChild(span);
  }
}

function setMsg(state) {
  let msg = '';
  if (state.status.isEgg)             msg = 'Tap the egg to hatch!';
  else if (state.status.isDead)        msg = '...';
  else if (state.status.isSleeping)    msg = 'Shh... Blobby is sleeping.';
  else if (state.events.isSick)        msg = 'Blobby is sick! Give medicine!';
  else if (state.events.isFakeCrying)  msg = 'Blobby wants attention... (fake?)';
  else if (state.events.hasPoop)       msg = 'Ew! Clean it up!';
  else if (state.stats.hunger <= 1)    msg = 'Blobby is hungry!';
  else if (state.stats.happiness <= 1) msg = 'Blobby is bored!';
  else if (state.stats.health <= 1)    msg = 'Blobby needs help!';
  else {
    const happy = ['Blobby is happy!', 'Living the blob life.', '✨ All good!', 'Feelin\' blobby.'];
    msg = happy[Math.floor(Date.now() / 10000) % happy.length];
  }
  setTxt('screen-message', msg);
}

function showEvolutionFlash(formName) {
  const flash = el('evo-flash');
  const name  = el('evo-name');
  if (!flash || !name) return;
  name.textContent = formName.toUpperCase();
  flash.classList.add('show');
  setTimeout(() => flash.classList.remove('show'), 3000);
}

function flashMessage(text, duration = 2000) {
  const el2 = el('screen-message');
  el2.textContent = text;
  el2.style.color = '#ffdd00';
  setTimeout(() => {
    el2.style.color = '';
    setMsg(_state());
  }, duration);
}

// ── Overlays ──────────────────────────────────────────────────────
function showFeedMenu()  { el('feed-overlay').classList.remove('hidden'); }
function hideFeedMenu()  { el('feed-overlay').classList.add('hidden'); }
function showPlayMenu()  { el('play-overlay').classList.remove('hidden'); }
function hidePlayMenu()  { el('play-overlay').classList.add('hidden'); }

function showCard(state) {
  const card = state.status.pendingCard;
  if (!card) return;
  const cv = el('card-canvas');
  drawCreatureCard(cv, card);
  setTxt('card-info', `${card.formName} · Gen ${card.generation} · Day ${card.daysSurvived} · Care ${card.careScore}%`);
  el('card-overlay').classList.remove('hidden');
}
function hideCard() { el('card-overlay').classList.add('hidden'); }

function showCollection(state) {
  const grid = el('cards-grid');
  grid.innerHTML = '';
  if (!state.meta.cards.length) {
    const e = document.createElement('div');
    e.className = 'empty-collection';
    e.textContent = 'No cards yet. Raise a Blobby to completion!';
    grid.appendChild(e);
  } else {
    state.meta.cards.forEach(card => {
      const thumb = document.createElement('div');
      thumb.className = 'card-thumb';
      const cv = document.createElement('canvas');
      cv.width = 48; cv.height = 48;
      drawThumb(cv, card.form);
      const lbl = document.createElement('div');
      lbl.className = 'card-label';
      lbl.textContent = card.formName;
      thumb.appendChild(cv);
      thumb.appendChild(lbl);
      grid.appendChild(thumb);
    });
  }
  el('collection-overlay').classList.remove('hidden');
}
function hideCollection() { el('collection-overlay').classList.add('hidden'); }

// ── Button bindings ───────────────────────────────────────────────
function bindButtons() {
  // Egg click
  el('creature-canvas').addEventListener('click', () => {
    _onStateChange('hatch');
  });

  // Feed
  el('btn-feed').addEventListener('click', () => showFeedMenu());
  el('feed-cancel').addEventListener('click', hideFeedMenu);
  el('feed-overlay').addEventListener('click', e => {
    const food = e.target.closest('[data-food]');
    if (food) { hideFeedMenu(); _onStateChange('feed', food.dataset.food); }
  });

  // Play
  el('btn-play').addEventListener('click', () => showPlayMenu());
  el('play-cancel').addEventListener('click', hidePlayMenu);
  el('play-overlay').addEventListener('click', e => {
    const g = e.target.closest('[data-game]');
    if (g) { hidePlayMenu(); _onStateChange('play', g.dataset.game); }
  });

  // Clean
  el('btn-clean').addEventListener('click', () => _onStateChange('clean'));

  // Medicine
  el('btn-medicine').addEventListener('click', () => _onStateChange('medicine'));

  // Discipline
  el('btn-discipline').addEventListener('click', () => _onStateChange('discipline'));

  // Lights
  el('btn-lights').addEventListener('click', () => _onStateChange('lights'));

  // Close minigame
  el('mg-close').addEventListener('click', closeMG);

  // Card overlay
  el('card-save').addEventListener('click', () => _onStateChange('saveCard'));
  el('card-hatch').addEventListener('click', () => { hideCard(); _onStateChange('nextGen'); });

  // Collection
  el('collection-btn').addEventListener('click', () => _onStateChange('openCollection'));
  el('collection-close').addEventListener('click', hideCollection);
}

// ── Helpers ───────────────────────────────────────────────────────
function el(id)              { return document.getElementById(id); }
function setTxt(id, text)    { const e = el(id); if (e) e.textContent = text; }
function tog(id, visible)    { el(id)?.classList.toggle('hidden', !visible); }
function btn(id, enabled)    { const e = el(id); if (e) e.disabled = !enabled; }
