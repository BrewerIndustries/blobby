// ── Constants ────────────────────────────────────────────────────
const STAGE_DAYS = { baby: 0, child: 3, teen: 7, adult: 14 };
const MAX_HUNGER = 4, MAX_HAPPY = 4, MAX_HEALTH = 4;
const SLEEP_HOUR = 21, WAKE_HOUR = 7; // 9pm – 7am

// Hours of offline time before hunger/happy drop 1 heart
const HUNGER_DRAIN_HOURS = 10;
const HAPPY_DRAIN_HOURS  = 14;
// Miss window before a care mistake is logged (hours)
const CARE_MISTAKE_HOURS = 28;

const EVOLUTION_TREE = {
  child: [
    { minCare: 60, form: 'child_a', name: 'Blobster' },
    { minCare:  0, form: 'child_b', name: 'Blump'    },
  ],
  teen: {
    child_a: [
      { minCare: 70, form: 'teen_a1', name: 'Glimmer' },
      { minCare:  0, form: 'teen_a2', name: 'Wobble'  },
    ],
    child_b: [
      { minCare: 45, form: 'teen_b1', name: 'Grump' },
      { minCare:  0, form: 'teen_b2', name: 'Moop'  },
    ],
  },
  adult: {
    teen_a1: [
      { minCare: 80, form: 'adult_luminos',  name: 'Luminos'  },
      { minCare:  0, form: 'adult_shimmer',  name: 'Shimmer'  },
    ],
    teen_a2: [
      { minCare: 55, form: 'adult_bounce',   name: 'Bounce'   },
      { minCare:  0, form: 'adult_squat',    name: 'Squat'    },
    ],
    teen_b1: [
      { minCare: 45, form: 'adult_grumble',  name: 'Grumble'  },
      { minCare:  0, form: 'adult_slog',     name: 'Slog'     },
    ],
    teen_b2: [
      { minCare: 25, form: 'adult_gloop',    name: 'Gloop'    },
      { minCare:  0, form: 'adult_sludge',   name: 'Sludge'   },
    ],
  },
};

// ── Default state ────────────────────────────────────────────────
function defaultState() {
  return {
    version: 1,
    creature: {
      form: 'egg',
      stage: 'egg',
      name: 'Blobby',
      formName: '',
      generation: 1,
      inheritedFlaw: null,   // 'hungry_fast' | 'unhappy_fast' | 'weak_immune'
      careScore: 100,
      careMistakes: 0,
    },
    stats: {
      hunger: 4,
      happiness: 4,
      discipline: 75,
      weight: 5,
      health: 4,
    },
    events: {
      hasPoop: false,
      isSick: false,
      isFakeCrying: false,
      fakeCryStart: null,
    },
    time: {
      created: Date.now(),
      lastSave: Date.now(),
      lastDecayApplied: Date.now(),
      birthday: null,
      daysBorn: 0,
      lastVisitDay: todayStr(),
      visitsToday: 1,
      nextPoopIn: randomPoopDelay(),
      nextSickCheck: Date.now() + hoursMs(24),
    },
    status: {
      isAlive: true,
      isEgg: true,
      isSleeping: false,
      lightsOff: false,
      isDead: false,
      pendingCard: null,   // card data waiting to be shown
    },
    meta: {
      totalGenerations: 1,
      cards: [],
    },
  };
}

// ── Helpers ──────────────────────────────────────────────────────
function hoursMs(h)      { return h * 3600 * 1000; }
function todayStr()      { return new Date().toISOString().slice(0, 10); }
function currentHour()   { return new Date().getHours(); }
function isNightTime()   { const h = currentHour(); return h >= SLEEP_HOUR || h < WAKE_HOUR; }
function randomPoopDelay() { return hoursMs(2 + Math.random() * 4); } // 2–6 hours

// ── Persistence ──────────────────────────────────────────────────
function saveState(state) {
  state.time.lastSave = Date.now();
  localStorage.setItem('blobby_state', JSON.stringify(state));
}

function loadState() {
  try {
    const raw = localStorage.getItem('blobby_state');
    if (!raw) return null;
    const s = JSON.parse(raw);
    if (!s || s.version !== 1) return null;
    return s;
  } catch { return null; }
}

function clearState() {
  localStorage.removeItem('blobby_state');
}

// ── Time & decay ────────────────────────────────────────────────
function applyTimeElapsed(state) {
  if (state.status.isEgg || state.status.isDead) return state;

  const now      = Date.now();
  const elapsed  = now - state.time.lastDecayApplied;
  const hours    = elapsed / 3600000;

  // No decay while sleeping (lightsOff)
  const decayMult = state.status.lightsOff ? 0.05 : 1;

  const flawHungry = state.creature.inheritedFlaw === 'hungry_fast' ? 1.6 : 1;
  const flawHappy  = state.creature.inheritedFlaw === 'unhappy_fast' ? 1.6 : 1;
  const flawImmune = state.creature.inheritedFlaw === 'weak_immune';

  state.stats.hunger    = Math.max(0, state.stats.hunger    - (hours / HUNGER_DRAIN_HOURS) * decayMult * flawHungry);
  state.stats.happiness = Math.max(0, state.stats.happiness - (hours / HAPPY_DRAIN_HOURS)  * decayMult * flawHappy);

  // Care mistakes: if severely neglected (over threshold)
  if (hours > CARE_MISTAKE_HOURS) {
    const mistakes = Math.floor(hours / CARE_MISTAKE_HOURS);
    state.creature.careMistakes += mistakes;
    state.creature.careScore = Math.max(0, state.creature.careScore - mistakes * 8);
  }

  // Poop event
  if (!state.events.hasPoop && now - state.time.created >= state.time.nextPoopIn) {
    state.events.hasPoop = true;
  }
  // If poop ignored > 6h, get sick
  if (state.events.hasPoop && !state.events.isSick && hours > 6) {
    state.events.isSick = true;
  }

  // Random sickness (weak_immune creatures more prone)
  if (!state.events.isSick && now >= state.time.nextSickCheck) {
    const chance = flawImmune ? 0.35 : 0.15;
    if (Math.random() < chance) state.events.isSick = true;
    state.time.nextSickCheck = now + hoursMs(20 + Math.random() * 8);
  }

  // Health damage from zero hunger or sickness
  if (state.stats.hunger <= 0 || (state.events.isSick && hours > 8)) {
    state.stats.health = Math.max(0, state.stats.health - 0.5 * hours);
  }

  // Weight normalizes slowly over time
  if (state.stats.weight > 10) state.stats.weight = Math.max(10, state.stats.weight - hours * 0.2);
  if (state.stats.weight < 3)  state.stats.weight = Math.min(3,  state.stats.weight + hours * 0.1);
  state.stats.weight = +state.stats.weight.toFixed(1);

  // Discipline decays slowly
  if (!state.status.lightsOff) {
    state.stats.discipline = Math.max(0, state.stats.discipline - hours * 0.5);
  }

  // Night / sleep
  state.status.isSleeping = isNightTime();

  // Days born
  if (state.time.birthday) {
    state.time.daysBorn = Math.floor((now - state.time.birthday) / (24 * 3600000));
  }

  // Check evolution
  checkEvolution(state);

  // Death check
  if (state.stats.health <= 0 && state.status.isAlive) {
    triggerDeath(state);
  }

  // Fake cry: after 10 minutes of silence (all stats full) creature may fake-cry
  if (!state.events.isFakeCrying && !state.events.isSick && !state.events.hasPoop) {
    const allGood = state.stats.hunger >= 3.5 && state.stats.happiness >= 3.5 && state.stats.health >= 3.5;
    if (allGood && Math.random() < 0.08) {
      state.events.isFakeCrying = true;
      state.events.fakeCryStart = now;
    }
  }

  state.time.lastDecayApplied = now;
  return state;
}

// ── Evolution ───────────────────────────────────────────────────
function checkEvolution(state) {
  const days = state.time.daysBorn;
  const stage = state.creature.stage;
  if (stage === 'egg') return;

  if (stage === 'baby' && days >= STAGE_DAYS.child) {
    evolve(state, 'child');
  } else if (stage === 'child' && days >= STAGE_DAYS.teen) {
    evolve(state, 'teen');
  } else if (stage === 'teen' && days >= STAGE_DAYS.adult) {
    evolve(state, 'adult');
  }
}

function evolve(state, toStage) {
  const score = state.creature.careScore;
  let options;

  if (toStage === 'child') {
    options = EVOLUTION_TREE.child;
  } else if (toStage === 'teen') {
    options = EVOLUTION_TREE.teen[state.creature.form];
  } else if (toStage === 'adult') {
    options = EVOLUTION_TREE.adult[state.creature.form];
  }

  if (!options) return;
  const chosen = options.find(o => score >= o.minCare) || options[options.length - 1];

  state.creature.stage = toStage;
  state.creature.form  = chosen.form;
  state.creature.formName = chosen.name;

  // Boost stats on evolution
  state.stats.hunger    = Math.min(MAX_HUNGER, state.stats.hunger + 1);
  state.stats.happiness = Math.min(MAX_HAPPY, state.stats.happiness + 1);
  state.stats.health    = Math.min(MAX_HEALTH, state.stats.health + 1);
  // Reset care mistake counter per stage
  state.creature.careMistakes = 0;
}

// ── Death / migration ────────────────────────────────────────────
function triggerDeath(state) {
  state.status.isAlive = false;
  state.status.isDead  = true;

  // Pick flaw to pass to next gen
  const flaws = ['hungry_fast', 'unhappy_fast', 'weak_immune'];
  const flaw = flaws[Math.floor(Math.random() * flaws.length)];

  // Build creature card
  const card = {
    id: Date.now(),
    form: state.creature.form,
    formName: state.creature.formName || state.creature.name,
    generation: state.creature.generation,
    daysSurvived: state.time.daysBorn,
    careScore: Math.round(state.creature.careScore),
    date: todayStr(),
  };
  state.status.pendingCard = card;
  state.meta.cards.push(card);

  // Prepare next generation (stored, activated on "hatch egg")
  state._nextGen = {
    generation: state.creature.generation + 1,
    inheritedFlaw: flaw,
  };
}

// ── Actions ──────────────────────────────────────────────────────
function actionFeed(state, foodType) {
  if (!canAct(state)) return { ok: false, msg: 'Cannot act right now.' };
  if (state.stats.hunger >= MAX_HUNGER) return { ok: false, msg: 'Not hungry!' };

  if (foodType === 'meal') {
    state.stats.hunger = Math.min(MAX_HUNGER, state.stats.hunger + 2);
    state.stats.weight = Math.max(1, state.stats.weight - 0.5);
  } else {
    state.stats.hunger    = Math.min(MAX_HUNGER, state.stats.hunger + 1);
    state.stats.happiness = Math.min(MAX_HAPPY, state.stats.happiness + 0.5);
    state.stats.weight    = Math.min(30, state.stats.weight + 1.5);
  }
  recordVisit(state);
  return { ok: true, msg: foodType === 'meal' ? 'Yum! A good meal.' : 'Mmm, snacks!' };
}

function actionClean(state) {
  if (!canAct(state)) return { ok: false, msg: 'Cannot act right now.' };
  if (!state.events.hasPoop) return { ok: false, msg: 'Nothing to clean!' };
  state.events.hasPoop = false;
  state.time.nextPoopIn = Date.now() + randomPoopDelay();
  state.stats.happiness = Math.min(MAX_HAPPY, state.stats.happiness + 0.5);
  recordVisit(state);
  return { ok: true, msg: 'All clean!' };
}

function actionMedicine(state) {
  if (!canAct(state)) return { ok: false, msg: 'Cannot act right now.' };
  if (!state.events.isSick) return { ok: false, msg: 'Not sick!' };
  state.events.isSick = false;
  state.stats.health = Math.min(MAX_HEALTH, state.stats.health + 1.5);
  recordVisit(state);
  return { ok: true, msg: 'Feeling better!' };
}

function actionDiscipline(state) {
  if (!canAct(state)) return { ok: false, msg: 'Cannot act right now.' };

  if (state.events.isFakeCrying) {
    // Correct! Ignore the fake cry = raise discipline
    state.stats.discipline = Math.min(100, state.stats.discipline + 15);
    state.events.isFakeCrying = false;
    state.events.fakeCryStart = null;
    recordVisit(state);
    return { ok: true, msg: 'Good call ignoring the drama!' };
  }

  // Disciplining when not fake-crying = mistake
  state.stats.happiness = Math.max(0, state.stats.happiness - 0.5);
  state.creature.careScore = Math.max(0, state.creature.careScore - 3);
  return { ok: false, msg: 'Blobby didn\'t deserve that!' };
}

function actionRespondToFakeCry(state) {
  // Called when player hits ANY button while fake-crying (except discipline)
  if (!state.events.isFakeCrying) return;
  state.stats.discipline = Math.max(0, state.stats.discipline - 10);
  state.events.isFakeCrying = false;
  state.events.fakeCryStart = null;
  state.creature.careScore = Math.max(0, state.creature.careScore - 2);
}

function actionLights(state) {
  if (state.status.isEgg) return { ok: false, msg: '' };
  state.status.lightsOff = !state.status.lightsOff;
  state.status.isSleeping = state.status.lightsOff;

  if (state.status.lightsOff && !isNightTime()) {
    // Forced sleep during day — slight happiness hit
    state.stats.happiness = Math.max(0, state.stats.happiness - 0.5);
    return { ok: true, msg: 'Blobby is confused... it\'s daytime!' };
  }
  if (!state.status.lightsOff && isNightTime()) {
    // Woken at night — grumpy
    state.stats.happiness = Math.max(0, state.stats.happiness - 1);
    state.creature.careScore = Math.max(0, state.creature.careScore - 3);
    return { ok: true, msg: 'Blobby is grumpy... it\'s nighttime!' };
  }
  return { ok: true, msg: state.status.lightsOff ? 'Sweet dreams, Blobby.' : 'Good morning!' };
}

function awardMinigame(state, statKey, amount) {
  if (statKey === 'happiness') {
    state.stats.happiness = Math.min(MAX_HAPPY, state.stats.happiness + amount);
  } else if (statKey === 'discipline') {
    state.stats.discipline = Math.min(100, state.stats.discipline + amount * 10);
  } else if (statKey === 'health') {
    state.stats.health = Math.min(MAX_HEALTH, state.stats.health + amount);
  }
  state.creature.careScore = Math.min(100, state.creature.careScore + amount * 2);
  recordVisit(state);
}

function hatchEgg(state) {
  if (!state.status.isEgg) return;
  state.status.isEgg = false;
  state.creature.stage = 'baby';
  state.creature.form  = 'baby';
  state.creature.formName = 'Baby Blob';
  state.time.birthday = Date.now();
  state.time.daysBorn = 0;
  state.time.lastDecayApplied = Date.now();
  state.status.isAlive = true;
}

function startNextGeneration(state) {
  const ng = state._nextGen || { generation: 2, inheritedFlaw: null };
  const cards = state.meta.cards;
  const newState = defaultState();
  newState.creature.generation = ng.generation;
  newState.creature.inheritedFlaw = ng.inheritedFlaw;
  newState.meta.cards = cards;
  newState.meta.totalGenerations = ng.generation;
  return newState;
}

// ── Daily visit bonus ─────────────────────────────────────────────
function recordVisit(state) {
  const today = todayStr();
  if (state.time.lastVisitDay !== today) {
    state.time.lastVisitDay = today;
    state.time.visitsToday = 1;
  } else {
    state.time.visitsToday++;
  }
  // Bonus for extra visits (capped at 5 per day)
  if (state.time.visitsToday <= 5) {
    state.stats.happiness = Math.min(MAX_HAPPY, state.stats.happiness + 0.1);
    state.creature.careScore = Math.min(100, state.creature.careScore + 0.5);
  }
}

function canAct(state) {
  return state.status.isAlive && !state.status.isEgg && !state.status.isDead && !state.status.isSleeping;
}
