// ── Sprite / renderer ────────────────────────────────────────────
// All creatures drawn procedurally on a 32x32 offscreen canvas
// then scaled up 5x (160x160) with pixelated rendering.

const PIXEL = 1; // draw at 1px, scale up via CSS/drawImage

// ── Color palettes per form ──────────────────────────────────────
const PALETTES = {
  egg:          { body: '#cc88ff', spot: '#ff88cc', shine: '#ffffff', dark: '#884499' },
  baby:         { body: '#9955ee', hi: '#cc88ff', dark: '#6633aa', eye: '#ffffff', pupil: '#220033', cheek: '#ff88cc' },
  child_a:      { body: '#22ddff', hi: '#aaffff', dark: '#0088aa', eye: '#ffffff', pupil: '#002233', cheek: '#88ffcc' },
  child_b:      { body: '#8877bb', hi: '#bbaadd', dark: '#554488', eye: '#ffffff', pupil: '#221133', cheek: '#cc99bb' },
  teen_a1:      { body: '#ffdd00', hi: '#ffffaa', dark: '#aa8800', eye: '#ffffff', pupil: '#332200', cheek: '#ffbb44' },
  teen_a2:      { body: '#44ee88', hi: '#aaffcc', dark: '#118844', eye: '#ffffff', pupil: '#002211', cheek: '#88ffaa' },
  teen_b1:      { body: '#ee88cc', hi: '#ffbbee', dark: '#aa4488', eye: '#ffffff', pupil: '#330022', cheek: '#ffaacc' },
  teen_b2:      { body: '#8899aa', hi: '#bbccdd', dark: '#445566', eye: '#ddddff', pupil: '#112233', cheek: '#99aabb' },
  adult_luminos: { body: '#fffaaa', hi: '#ffffff', dark: '#ccbb44', eye: '#ffffff', pupil: '#443300', cheek: '#ffeeaa', glow: '#ffffcc' },
  adult_shimmer: { body: '#ff55cc', hi: '#ffaaee', dark: '#aa0088', eye: '#ffffff', pupil: '#330022', cheek: '#ff88dd' },
  adult_bounce:  { body: '#00ff88', hi: '#aaffdd', dark: '#00aa55', eye: '#ffffff', pupil: '#001122', cheek: '#88ffcc' },
  adult_squat:   { body: '#44dddd', hi: '#aaffff', dark: '#009999', eye: '#ffffff', pupil: '#002222', cheek: '#88eeee' },
  adult_grumble: { body: '#aa55ee', hi: '#dd99ff', dark: '#6622aa', eye: '#ffddff', pupil: '#220033', cheek: '#cc88ee' },
  adult_slog:    { body: '#778899', hi: '#aabbcc', dark: '#445566', eye: '#cccccc', pupil: '#223344', cheek: '#99aaaa' },
  adult_gloop:   { body: '#557755', hi: '#88aa88', dark: '#334433', eye: '#aaccaa', pupil: '#112211', cheek: '#667766' },
  adult_sludge:  { body: '#444455', hi: '#666677', dark: '#222233', eye: '#888899', pupil: '#111122', cheek: '#555566' },
};

// ── Canvas helpers ───────────────────────────────────────────────
function px(ctx, x, y, color, size = 1) {
  ctx.fillStyle = color;
  ctx.fillRect(x, y, size, size);
}

function circle(ctx, cx, cy, r, color) {
  for (let dy = -r; dy <= r; dy++) {
    for (let dx = -r; dx <= r; dx++) {
      if (dx * dx + dy * dy <= r * r) {
        px(ctx, Math.round(cx + dx), Math.round(cy + dy), color);
      }
    }
  }
}

function ellipse(ctx, cx, cy, rx, ry, color) {
  for (let dy = -ry; dy <= ry; dy++) {
    for (let dx = -rx; dx <= rx; dx++) {
      if ((dx * dx) / (rx * rx) + (dy * dy) / (ry * ry) <= 1) {
        px(ctx, Math.round(cx + dx), Math.round(cy + dy), color);
      }
    }
  }
}

// ── Eye drawing ──────────────────────────────────────────────────
function drawEyes(ctx, lx, ly, rx, ry, style, pal, t) {
  if (style === 'normal') {
    // Blink every ~4s for 100ms
    const blinkCycle = (t || 0) % 4000;
    const blinking = blinkCycle > 3880;
    if (blinking) {
      for (let i = -2; i <= 2; i++) {
        px(ctx, lx + i, ly, pal.pupil);
        px(ctx, rx + i, ry, pal.pupil);
      }
      return;
    }
    circle(ctx, lx, ly, 2, pal.eye);
    circle(ctx, rx, ry, 2, pal.eye);
    px(ctx, lx, ly, pal.pupil);
    px(ctx, rx, ry, pal.pupil);
  } else if (style === 'happy') {
    // ^ ^ eyes
    for (let i = -2; i <= 2; i++) {
      px(ctx, lx + i, ly + (Math.abs(i) === 2 ? 1 : Math.abs(i) === 1 ? 0 : -1), pal.pupil);
      px(ctx, rx + i, ry + (Math.abs(i) === 2 ? 1 : Math.abs(i) === 1 ? 0 : -1), pal.pupil);
    }
  } else if (style === 'sad') {
    circle(ctx, lx, ly, 2, pal.eye);
    circle(ctx, rx, ry, 2, pal.eye);
    px(ctx, lx, ly + 1, pal.pupil);
    px(ctx, rx, ry + 1, pal.pupil);
    // Tears
    px(ctx, lx - 1, ly + 3, '#88ccff');
    px(ctx, rx + 1, ry + 3, '#88ccff');
  } else if (style === 'sick') {
    // X X eyes
    for (let i = -1; i <= 1; i++) {
      px(ctx, lx + i, ly + i, pal.pupil);
      px(ctx, lx + i, ly - i, pal.pupil);
      px(ctx, rx + i, ry + i, pal.pupil);
      px(ctx, rx + i, ry - i, pal.pupil);
    }
  } else if (style === 'sleep') {
    // — — eyes
    for (let i = -2; i <= 2; i++) {
      px(ctx, lx + i, ly, pal.pupil);
      px(ctx, rx + i, ry, pal.pupil);
    }
  } else if (style === 'grumpy') {
    circle(ctx, lx, ly, 2, pal.eye);
    circle(ctx, rx, ry, 2, pal.eye);
    px(ctx, lx, ly, pal.pupil);
    px(ctx, rx, ry, pal.pupil);
    // Angry brows
    for (let i = -2; i <= 2; i++) {
      px(ctx, lx + i, ly - 3 + (i < 0 ? 1 : 0), pal.pupil);
      px(ctx, rx + i, ry - 3 + (i > 0 ? 1 : 0), pal.pupil);
    }
  }
}

// ── Mouth drawing ────────────────────────────────────────────────
function drawMouth(ctx, cx, y, style, pal) {
  const mc = pal.pupil || '#220033';
  if (style === 'smile') {
    for (let i = -3; i <= 3; i++) px(ctx, cx + i, y + (Math.abs(i) > 1 ? 1 : 2), mc);
  } else if (style === 'flat') {
    for (let i = -2; i <= 2; i++) px(ctx, cx + i, y, mc);
  } else if (style === 'frown') {
    for (let i = -3; i <= 3; i++) px(ctx, cx + i, y + (Math.abs(i) > 1 ? 2 : 1), mc);
  } else if (style === 'open') {
    for (let i = -2; i <= 2; i++) px(ctx, cx + i, y, mc);
    for (let i = -1; i <= 1; i++) px(ctx, cx + i, y + 1, '#ff6688');
    for (let i = -2; i <= 2; i++) px(ctx, cx + i, y + 2, mc);
  }
}

// ── Main creature renderer ───────────────────────────────────────
function drawCreature(mainCtx, form, animState, t, canvasW, canvasH) {
  const SIZE   = 32;
  const SCALE  = 5;
  const off    = document.createElement('canvas');
  off.width    = SIZE;
  off.height   = SIZE;
  const ctx    = off.getContext('2d');
  ctx.imageSmoothingEnabled = false;

  const pal = PALETTES[form] || PALETTES.baby;

  // Bob offset
  const bob = Math.round(Math.sin(t * 0.003) * 1.5);

  if (form === 'egg') {
    drawEgg(ctx, SIZE, bob, pal, t);
  } else {
    drawBlobForm(ctx, form, animState, bob, pal, t, SIZE);
  }

  // Scale up onto main canvas
  mainCtx.clearRect(0, 0, canvasW, canvasH);
  mainCtx.imageSmoothingEnabled = false;
  const destX = (canvasW  - SIZE * SCALE) / 2;
  const destY = (canvasH  - SIZE * SCALE) / 2;
  mainCtx.drawImage(off, 0, 0, SIZE, SIZE, destX, destY, SIZE * SCALE, SIZE * SCALE);

  // Glow overlay for luminos
  if (form === 'adult_luminos') {
    mainCtx.save();
    const grd = mainCtx.createRadialGradient(canvasW/2, canvasH/2, 10, canvasW/2, canvasH/2, 70);
    grd.addColorStop(0, 'rgba(255,255,170,0.18)');
    grd.addColorStop(1, 'rgba(255,255,170,0)');
    mainCtx.fillStyle = grd;
    mainCtx.fillRect(0, 0, canvasW, canvasH);
    mainCtx.restore();
  }
}

function drawEgg(ctx, SIZE, bob, pal, t) {
  const cx = SIZE / 2, cy = SIZE / 2 + bob;
  // Egg body
  ellipse(ctx, cx, cy + 1, 8, 10, pal.body);
  // Highlight
  ellipse(ctx, cx - 2, cy - 3, 2, 3, pal.shine);
  // Spots
  const pulse = Math.sin(t * 0.005) > 0;
  if (pulse) {
    circle(ctx, cx + 3, cy + 2, 2, pal.spot);
    circle(ctx, cx - 4, cy + 5, 1, pal.spot);
    circle(ctx, cx + 1, cy - 4, 1, pal.spot);
  }
}

function drawBlobForm(ctx, form, animState, bob, pal, t, SIZE) {
  const cx = SIZE / 2;
  const cy = SIZE / 2 + 2;

  // Size based on stage
  const stageSize = {
    baby: { rx: 7, ry: 7 },
    child_a: { rx: 8, ry: 8 }, child_b: { rx: 8, ry: 8 },
    teen_a1: { rx: 9, ry: 9 }, teen_a2: { rx: 9, ry: 9 },
    teen_b1: { rx: 9, ry: 9 }, teen_b2: { rx: 8, ry: 8 },
    adult_luminos: { rx: 10, ry: 10 }, adult_shimmer: { rx: 10, ry: 9 },
    adult_bounce:  { rx: 10, ry: 10 }, adult_squat:   { rx: 11, ry: 9 },
    adult_grumble: { rx: 10, ry: 10 }, adult_slog:    { rx: 10, ry: 9 },
    adult_gloop:   { rx: 9,  ry: 10 }, adult_sludge:  { rx: 9,  ry: 10 },
  }[form] || { rx: 8, ry: 8 };

  const { rx, ry } = stageSize;

  // Animation offset
  let extraBob = 0;
  if (animState === 'happy')   extraBob = Math.abs(Math.sin(t * 0.008)) * -3;
  if (animState === 'eating')  extraBob = Math.round(Math.sin(t * 0.01) * 1);
  if (animState === 'playing') extraBob = Math.round(Math.sin(t * 0.012) * -4);

  const bodyY = cy + bob + extraBob;

  // Squish/stretch during animation
  let dRx = rx, dRy = ry;
  if (animState === 'happy' || animState === 'playing') {
    const squish = Math.sin(t * 0.008);
    dRx = Math.round(rx + squish * 2);
    dRy = Math.round(ry - squish * 1);
  }

  // Shadow
  ellipse(ctx, cx, bodyY + ry + 1, Math.round(dRx * 0.8), 2, '#00000055');

  // Body
  ellipse(ctx, cx, bodyY, dRx, dRy, pal.body);

  // Highlight (top-left)
  ellipse(ctx, cx - Math.round(dRx * 0.3), bodyY - Math.round(dRy * 0.3), Math.round(dRx * 0.35), Math.round(dRy * 0.35), pal.hi);

  // Dark edge (bottom-right)
  ellipse(ctx, cx + Math.round(dRx * 0.3), bodyY + Math.round(dRy * 0.3), Math.round(dRx * 0.25), Math.round(dRy * 0.25), pal.dark);

  // Form-specific appendages
  drawAppendages(ctx, form, cx, bodyY, dRx, dRy, pal, t);

  // Eyes
  const eyeY   = bodyY - Math.round(dRy * 0.15);
  const eyeOff = Math.round(dRx * 0.35);
  const eyeStyle = getEyeStyle(form, animState);
  drawEyes(ctx, cx - eyeOff, eyeY, cx + eyeOff, eyeY, eyeStyle, pal, t);

  // Cheeks (not for slog/sludge/sick)
  if (!['adult_slog', 'adult_sludge', 'adult_gloop'].includes(form) && animState !== 'sick') {
    px(ctx, cx - eyeOff - 1, eyeY + 2, pal.cheek + '99');
    px(ctx, cx + eyeOff + 1, eyeY + 2, pal.cheek + '99');
  }

  // Mouth
  const mouthY = bodyY + Math.round(dRy * 0.35);
  const mouthStyle = getMouthStyle(form, animState);
  drawMouth(ctx, cx, mouthY, mouthStyle, pal);

  // Poop indicator
  if (animState === 'pooping') {
    // Little squirt below
    ellipse(ctx, cx + dRx - 2, bodyY + dRy + 2, 3, 2, '#885500');
    circle(ctx, cx + dRx - 2, bodyY + dRy, 2, '#885500');
  }

  // Sleep Z's
  if (animState === 'sleeping') {
    const zi = Math.floor(t / 600) % 3;
    const zx = cx + dRx + 1 + zi;
    const zy = bodyY - dRy - 2 - zi * 2;
    ctx.fillStyle = '#aaaaff';
    ctx.font = '3px monospace';
    ctx.fillText('z', zx, zy);
  }
}

function drawAppendages(ctx, form, cx, cy, rx, ry, pal, t) {
  const wave = Math.sin(t * 0.004);

  if (form === 'teen_a1' || form === 'adult_luminos') {
    // Antennae with sparkle
    px(ctx, cx - 3, cy - ry - 1, pal.dark);
    px(ctx, cx - 3, cy - ry - 2, pal.dark);
    circle(ctx, cx - 3, cy - ry - 3, 1, pal.hi);
    px(ctx, cx + 3, cy - ry - 1, pal.dark);
    px(ctx, cx + 3, cy - ry - 2, pal.dark);
    circle(ctx, cx + 3, cy - ry - 3, 1, pal.hi);
  }

  if (form === 'teen_a2' || form === 'adult_bounce') {
    // Spiky bits
    const spike = Math.round(wave);
    px(ctx, cx - rx - 1, cy - 2 + spike, pal.body);
    px(ctx, cx - rx - 2, cy - 3 + spike, pal.hi);
    px(ctx, cx + rx + 1, cy - 2 - spike, pal.body);
    px(ctx, cx + rx + 2, cy - 3 - spike, pal.hi);
  }

  if (form === 'adult_shimmer') {
    // Rainbow shimmer bits - cycle hue
    const hue = (t * 0.1) % 360;
    ctx.fillStyle = `hsl(${hue},100%,70%)`;
    circle(ctx, cx - rx - 1, cy - 1, 2, `hsl(${hue},100%,70%)`);
    circle(ctx, cx + rx + 1, cy + 1, 2, `hsl(${(hue + 120) % 360},100%,70%)`);
    circle(ctx, cx,          cy - ry - 2, 2, `hsl(${(hue + 240) % 360},100%,70%)`);
  }

  if (form === 'adult_squat') {
    // Wide stumpy arms
    ellipse(ctx, cx - rx - 2, cy + 1, 2, 3, pal.body);
    ellipse(ctx, cx + rx + 2, cy + 1, 2, 3, pal.body);
  }

  if (['child_b', 'teen_b2', 'adult_slog', 'adult_gloop', 'adult_sludge'].includes(form)) {
    // Droopy bump on head
    ellipse(ctx, cx + Math.round(wave * 2), cy - ry + 1, 3, 2, pal.dark);
  }
}

function getEyeStyle(form, animState) {
  if (animState === 'sleeping') return 'sleep';
  if (animState === 'sick')     return 'sick';
  if (animState === 'sad')      return 'sad';
  if (animState === 'happy' || animState === 'playing') return 'happy';
  if (['adult_grumble', 'adult_slog', 'adult_gloop', 'adult_sludge', 'child_b', 'teen_b2'].includes(form)) return 'grumpy';
  return 'normal';
}

function getMouthStyle(form, animState) {
  if (animState === 'eating')  return 'open';
  if (animState === 'sad')     return 'frown';
  if (animState === 'happy' || animState === 'playing') return 'smile';
  if (['adult_grumble', 'adult_slog', 'adult_gloop', 'adult_sludge'].includes(form)) return 'frown';
  if (['child_b', 'teen_b2'].includes(form)) return 'flat';
  return 'smile';
}

// ── Creature card renderer ───────────────────────────────────────
function drawCreatureCard(canvas, card) {
  const ctx = canvas.getContext('2d');
  const W = canvas.width, H = canvas.height;
  ctx.imageSmoothingEnabled = false;

  // Background
  ctx.fillStyle = '#12082a';
  ctx.fillRect(0, 0, W, H);

  // Border
  ctx.strokeStyle = '#7b2fff';
  ctx.lineWidth = 3;
  ctx.strokeRect(2, 2, W - 4, H - 4);

  // Inner frame
  ctx.strokeStyle = '#5a1aaa';
  ctx.lineWidth = 1;
  ctx.strokeRect(6, 6, W - 12, H - 12);

  // Draw creature (centered, top portion)
  const offCtx = document.createElement('canvas');
  offCtx.width = 32; offCtx.height = 32;
  const oc = offCtx.getContext('2d');
  oc.imageSmoothingEnabled = false;
  const pal = PALETTES[card.form] || PALETTES.baby;
  drawBlobForm(oc, card.form, 'happy', 0, pal, 0, 32);

  ctx.drawImage(offCtx, 0, 0, 32, 32, W/2 - 64, 20, 128, 128);

  // Text
  ctx.fillStyle = '#ff6bff';
  ctx.font = 'bold 9px "Press Start 2P", monospace';
  ctx.textAlign = 'center';
  ctx.fillText(card.formName.toUpperCase(), W / 2, 165);

  ctx.fillStyle = '#aaaacc';
  ctx.font = '6px "Press Start 2P", monospace';
  ctx.fillText(`GEN ${card.generation}`, W / 2, 182);
  ctx.fillText(`DAY ${card.daysSurvived} · CARE ${card.careScore}%`, W / 2, 198);
  ctx.fillText(card.date, W / 2, 214);

  // Stars for care score
  const stars = Math.round(card.careScore / 20);
  ctx.fillStyle = '#ffdd00';
  ctx.font = '10px monospace';
  const starStr = '★'.repeat(stars) + '☆'.repeat(5 - stars);
  ctx.fillText(starStr, W / 2, 234);
}

// ── Mini thumbnail ───────────────────────────────────────────────
function drawThumb(canvas, form) {
  const ctx = canvas.getContext('2d');
  ctx.imageSmoothingEnabled = false;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  const pal = PALETTES[form] || PALETTES.baby;
  const off = document.createElement('canvas');
  off.width = 16; off.height = 16;
  const oc = off.getContext('2d');
  oc.imageSmoothingEnabled = false;
  drawBlobForm(oc, form, 'normal', 0, pal, 0, 16);
  ctx.drawImage(off, 0, 0, 16, 16, 0, 0, canvas.width, canvas.height);
}
