// ── Mini-games ────────────────────────────────────────────────────
// Each game returns a promise that resolves to { won: bool, perfect: bool }

let activeMG = null;

function launchMinigame(gameId, onComplete) {
  const overlay = document.getElementById('minigame-overlay');
  const title   = document.getElementById('mg-title');
  const canvas  = document.getElementById('mg-canvas');
  const ui      = document.getElementById('mg-ui');
  const result  = document.getElementById('mg-result');

  overlay.classList.remove('hidden');
  result.classList.add('hidden');
  ui.innerHTML = '';

  const games = {
    startap:  { name: 'STAR TAP',           fn: gameStarTap  },
    memory:   { name: 'MEMORY MATCH',        fn: gameMemory   },
    rps:      { name: 'ROCK PAPER SCISSORS', fn: gameRPS      },
    rhythm:   { name: 'RHYTHM TAP',          fn: gameRhythm   },
    numguess: { name: 'NUMBER GUESS',        fn: gameNumGuess },
  };

  const g = games[gameId];
  if (!g) return;
  title.textContent = g.name;

  activeMG = g.fn(canvas, ui, (res) => {
    activeMG = null;
    showMGResult(result, res, onComplete);
  });
}

function showMGResult(el, res, onComplete) {
  el.classList.remove('hidden', 'win', 'lose');
  if (res.won) {
    el.classList.add('win');
    el.textContent = res.perfect ? '✨ PERFECT! +2 BONUS!' : '🎉 YOU WIN!';
  } else {
    el.classList.add('lose');
    el.textContent = '😅 BETTER LUCK NEXT TIME!';
  }
  setTimeout(() => {
    document.getElementById('minigame-overlay').classList.add('hidden');
    onComplete(res);
  }, 1800);
}

function closeMG() {
  if (activeMG && activeMG.cleanup) activeMG.cleanup();
  activeMG = null;
  document.getElementById('minigame-overlay').classList.add('hidden');
}

// ══════════════════════════════════════════════════════
// Game 1: STAR TAP
// Stars appear on canvas; click them before they fade.
// ══════════════════════════════════════════════════════
function gameStarTap(canvas, ui, done) {
  const ctx    = canvas.getContext('2d');
  const W = canvas.width, H = canvas.height;
  let stars    = [];
  let score    = 0;
  let missed   = 0;
  let total    = 8;
  let spawned  = 0;
  let raf;
  let lastSpawn = 0;

  function spawnStar() {
    if (spawned >= total) return;
    stars.push({
      x: 20 + Math.random() * (W - 40),
      y: 20 + Math.random() * (H - 40),
      r: 12,
      life: 1,
      decay: 0.008 + Math.random() * 0.004,
      color: `hsl(${Math.random() * 360},100%,65%)`,
    });
    spawned++;
  }

  function draw(now) {
    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = '#0a0a1e';
    ctx.fillRect(0, 0, W, H);

    // Spawn interval
    if (spawned < total && now - lastSpawn > 600) {
      spawnStar();
      lastSpawn = now;
    }

    // Update + draw stars
    stars = stars.filter(s => {
      s.life -= s.decay;
      if (s.life <= 0) { missed++; return false; }
      drawStar(ctx, s.x, s.y, s.r, s.color, s.life);
      return true;
    });

    // HUD
    ctx.fillStyle = '#ff6bff';
    ctx.font = '8px "Press Start 2P", monospace';
    ctx.textAlign = 'left';
    ctx.fillText(`TAPPED: ${score}`, 8, 16);
    ctx.fillStyle = '#ff4444';
    ctx.textAlign = 'right';
    ctx.fillText(`MISSED: ${missed}`, W - 8, 16);

    if (spawned >= total && stars.length === 0) {
      const won = score >= 6;
      cleanup();
      done({ won, perfect: score === total });
      return;
    }
    raf = requestAnimationFrame(draw);
  }

  function drawStar(ctx, x, y, r, color, alpha) {
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.fillStyle = color;
    ctx.beginPath();
    for (let i = 0; i < 5; i++) {
      const angle = (i * 4 * Math.PI) / 5 - Math.PI / 2;
      const ix    = x + Math.cos(angle) * r;
      const iy    = y + Math.sin(angle) * r;
      i === 0 ? ctx.moveTo(ix, iy) : ctx.lineTo(ix, iy);
    }
    ctx.closePath();
    ctx.fill();
    // Glow
    ctx.shadowColor = color;
    ctx.shadowBlur  = 8;
    ctx.fill();
    ctx.restore();
  }

  canvas.onclick = (e) => {
    const rect = canvas.getBoundingClientRect();
    const mx   = (e.clientX - rect.left) * (W / rect.width);
    const my   = (e.clientY - rect.top)  * (H / rect.height);
    for (let i = stars.length - 1; i >= 0; i--) {
      const s  = stars[i];
      const dx = mx - s.x, dy = my - s.y;
      if (dx * dx + dy * dy < (s.r + 8) * (s.r + 8)) {
        stars.splice(i, 1);
        score++;
        break;
      }
    }
  };

  function cleanup() {
    cancelAnimationFrame(raf);
    canvas.onclick = null;
    ctx.clearRect(0, 0, W, H);
  }

  raf = requestAnimationFrame(draw);
  return { cleanup };
}

// ══════════════════════════════════════════════════════
// Game 2: MEMORY MATCH
// 8 tiles (4 pairs), flip to find all matches.
// ══════════════════════════════════════════════════════
function gameMemory(canvas, ui, done) {
  const ctx   = canvas.getContext('2d');
  const W = canvas.width, H = canvas.height;
  const ICONS = ['⭐', '🌙', '💎', '🔥'];
  const COLORS = ['#ff6bff', '#88ffcc', '#ffdd00', '#ff8844'];
  let cards = [];
  let flipped = [], matched = [], revealed = null;
  let canClick = true;
  let raf;

  // Build deck
  const deck = [...ICONS, ...ICONS].sort(() => Math.random() - 0.5);
  const cols = 4, rows = 2;
  const cw = 56, ch = 70, gx = 12, gy = 20;

  deck.forEach((icon, i) => {
    const col = i % cols, row = Math.floor(i / cols);
    cards.push({
      icon, idx: ICONS.indexOf(icon),
      x: gx + col * (cw + 6),
      y: gy + row * (ch + 8),
      w: cw, h: ch,
      faceUp: false,
      matched: false,
    });
  });

  function draw() {
    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = '#0a0a1e';
    ctx.fillRect(0, 0, W, H);

    cards.forEach(c => {
      const isUp = c.faceUp || c.matched;
      // Card bg
      ctx.fillStyle = c.matched ? '#004400' : isUp ? '#2a1a4a' : '#1a0a3a';
      ctx.strokeStyle = c.matched ? '#44ff44' : COLORS[c.idx] + '88';
      ctx.lineWidth = 2;
      roundRect(ctx, c.x, c.y, c.w, c.h, 6);
      ctx.fill();
      ctx.stroke();

      if (isUp) {
        ctx.font = '28px monospace';
        ctx.textAlign = 'center';
        ctx.fillText(c.icon, c.x + c.w / 2, c.y + c.h / 2 + 10);
      } else {
        // Back: pattern
        ctx.fillStyle = COLORS[0] + '33';
        roundRect(ctx, c.x + 4, c.y + 4, c.w - 8, c.h - 8, 4);
        ctx.fill();
        ctx.fillStyle = '#7b2fff66';
        ctx.font = '20px monospace';
        ctx.textAlign = 'center';
        ctx.fillText('?', c.x + c.w / 2, c.y + c.h / 2 + 7);
      }
    });

    // HUD
    ctx.fillStyle = '#aaaacc';
    ctx.font = '7px "Press Start 2P", monospace';
    ctx.textAlign = 'center';
    ctx.fillText(`MATCHED: ${matched.length / 2} / ${ICONS.length}`, W / 2, H - 6);

    raf = requestAnimationFrame(draw);
  }

  function roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.arcTo(x + w, y, x + w, y + r, r);
    ctx.lineTo(x + w, y + h - r);
    ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
    ctx.lineTo(x + r, y + h);
    ctx.arcTo(x, y + h, x, y + h - r, r);
    ctx.lineTo(x, y + r);
    ctx.arcTo(x, y, x + r, y, r);
    ctx.closePath();
  }

  canvas.onclick = (e) => {
    if (!canClick) return;
    const rect = canvas.getBoundingClientRect();
    const mx   = (e.clientX - rect.left) * (W / rect.width);
    const my   = (e.clientY - rect.top)  * (H / rect.height);

    for (const c of cards) {
      if (c.matched || c.faceUp) continue;
      if (mx >= c.x && mx <= c.x + c.w && my >= c.y && my <= c.y + c.h) {
        c.faceUp = true;
        flipped.push(c);

        if (flipped.length === 2) {
          canClick = false;
          const [a, b] = flipped;
          setTimeout(() => {
            if (a.icon === b.icon) {
              a.matched = b.matched = true;
              matched.push(a, b);
            } else {
              a.faceUp = b.faceUp = false;
            }
            flipped = [];
            canClick = true;

            if (matched.length === deck.length) {
              cancelAnimationFrame(raf);
              canvas.onclick = null;
              done({ won: true, perfect: false });
            }
          }, 800);
        }
        break;
      }
    }
  };

  raf = requestAnimationFrame(draw);

  // Time limit: 90 seconds
  const timer = setTimeout(() => {
    cancelAnimationFrame(raf);
    canvas.onclick = null;
    done({ won: matched.length >= 4, perfect: false });
  }, 90000);

  return { cleanup: () => { cancelAnimationFrame(raf); clearTimeout(timer); canvas.onclick = null; } };
}

// ══════════════════════════════════════════════════════
// Game 3: ROCK PAPER SCISSORS — best of 3
// ══════════════════════════════════════════════════════
function gameRPS(canvas, ui, done) {
  const ctx    = canvas.getContext('2d');
  const W = canvas.width, H = canvas.height;
  const choices = ['✊', '✋', '✌️'];
  const names   = ['ROCK', 'PAPER', 'SCISSORS'];
  let wins = 0, losses = 0, rounds = 0;

  function draw(playerChoice = null, enemyChoice = null, msg = '') {
    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = '#0a0a1e';
    ctx.fillRect(0, 0, W, H);

    ctx.fillStyle = '#888888';
    ctx.font = '7px "Press Start 2P", monospace';
    ctx.textAlign = 'left';
    ctx.fillText('YOU', 40, 28);
    ctx.textAlign = 'right';
    ctx.fillText('BLOBBY', W - 40, 28);

    ctx.font = '48px monospace';
    ctx.textAlign = 'center';
    if (playerChoice !== null) {
      ctx.fillText(choices[playerChoice], 56, 110);
      ctx.fillText(choices[enemyChoice],  W - 56, 110);
    } else {
      ctx.fillText('?', 56, 110);
      ctx.fillText('?', W - 56, 110);
    }

    if (msg) {
      ctx.fillStyle = msg.includes('WIN') ? '#88ff88' : msg.includes('LOSE') ? '#ff8888' : '#ffff88';
      ctx.font = '9px "Press Start 2P", monospace';
      ctx.textAlign = 'center';
      ctx.fillText(msg, W / 2, H - 28);
    }

    ctx.fillStyle = '#aaaacc';
    ctx.font = '7px "Press Start 2P", monospace';
    ctx.textAlign = 'center';
    ctx.fillText(`${wins} - ${losses}`, W / 2, H - 10);
  }

  draw();

  // Buttons
  choices.forEach((ch, i) => {
    const btn = document.createElement('button');
    btn.className = 'mg-btn';
    btn.textContent = `${ch} ${names[i]}`;
    btn.onclick = () => {
      const enemy = Math.floor(Math.random() * 3);
      const result = (i - enemy + 3) % 3;
      let msg;
      if      (result === 0) msg = 'DRAW!';
      else if (result === 1) { wins++;   msg = 'YOU WIN!'; }
      else                   { losses++; msg = 'BLOBBY WINS!'; }
      rounds++;
      draw(i, enemy, msg);

      if (rounds === 3) {
        ui.querySelectorAll('.mg-btn').forEach(b => b.disabled = true);
        setTimeout(() => {
          done({ won: wins > losses, perfect: wins === 3 && losses === 0 });
        }, 1200);
      }
    };
    ui.appendChild(btn);
  });

  return { cleanup: () => { ctx.clearRect(0, 0, W, H); } };
}

// ══════════════════════════════════════════════════════
// Game 4: RHYTHM TAP — Simon Says style
// ══════════════════════════════════════════════════════
function gameRhythm(canvas, ui, done) {
  const ctx  = canvas.getContext('2d');
  const W = canvas.width, H = canvas.height;
  const COLS  = ['#ff4488', '#44aaff', '#ffdd00', '#44ff88'];
  const NAMES = ['RED', 'BLUE', 'YELLOW', 'GREEN'];
  let sequence  = [];
  let playerSeq = [];
  let showing   = false;
  let active    = -1;
  let lives     = 3;
  let raf;

  function draw() {
    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = '#0a0a1e';
    ctx.fillRect(0, 0, W, H);

    const bw = 56, bh = 70, gap = 8;
    const startX = (W - (4 * bw + 3 * gap)) / 2;
    const startY = 40;

    COLS.forEach((c, i) => {
      const x = startX + i * (bw + gap);
      const lit = active === i;
      ctx.fillStyle = lit ? c : c + '44';
      ctx.strokeStyle = c;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.roundRect(x, startY, bw, bh, 6);
      ctx.fill();
      ctx.stroke();
      if (lit) {
        ctx.shadowColor = c;
        ctx.shadowBlur  = 16;
        ctx.fill();
        ctx.shadowBlur  = 0;
      }
      ctx.fillStyle = lit ? '#000' : c + 'aa';
      ctx.font = '20px monospace';
      ctx.textAlign = 'center';
      ctx.fillText(['🔴','🔵','🟡','🟢'][i], x + bw / 2, startY + bh / 2 + 8);
    });

    ctx.fillStyle = '#aaaacc';
    ctx.font = '7px "Press Start 2P", monospace';
    ctx.textAlign = 'center';
    ctx.fillText(`LEN: ${sequence.length}  LIVES: ${'❤️'.repeat(lives)}`, W / 2, H - 8);

    raf = requestAnimationFrame(draw);
  }

  async function showSequence() {
    showing = true;
    for (const idx of sequence) {
      await delay(300);
      active = idx;
      await delay(400);
      active = -1;
    }
    await delay(200);
    showing = false;
  }

  function delay(ms) { return new Promise(r => setTimeout(r, ms)); }

  function addStep() { sequence.push(Math.floor(Math.random() * 4)); }

  async function nextRound() {
    addStep();
    playerSeq = [];
    await showSequence();
    enableButtons();
  }

  function enableButtons() {
    ui.querySelectorAll('.mg-btn').forEach((btn, i) => {
      btn.disabled = false;
      btn.onclick = () => {
        playerSeq.push(i);
        const ok = sequence[playerSeq.length - 1] === i;

        if (!ok) {
          lives--;
          active = -1;
          if (lives <= 0) {
            disableButtons();
            setTimeout(() => done({ won: sequence.length > 3, perfect: false }), 600);
          } else {
            playerSeq = [];
            setTimeout(() => showSequence().then(enableButtons), 500);
          }
          return;
        }

        if (playerSeq.length === sequence.length) {
          disableButtons();
          if (sequence.length >= 5) {
            setTimeout(() => done({ won: true, perfect: sequence.length >= 7 }), 600);
          } else {
            setTimeout(nextRound, 600);
          }
        }
      };
    });
  }

  function disableButtons() {
    ui.querySelectorAll('.mg-btn').forEach(b => b.disabled = true);
  }

  COLS.forEach((c, i) => {
    const btn = document.createElement('button');
    btn.className = 'mg-btn';
    btn.textContent = ['🔴','🔵','🟡','🟢'][i];
    btn.style.cssText = `border-color: ${c}; font-size: 20px;`;
    btn.disabled = true;
    ui.appendChild(btn);
  });

  raf = requestAnimationFrame(draw);
  setTimeout(nextRound, 500);

  return { cleanup: () => { cancelAnimationFrame(raf); } };
}

// ══════════════════════════════════════════════════════
// Game 5: NUMBER GUESS — 1-20, 5 tries
// ══════════════════════════════════════════════════════
function gameNumGuess(canvas, ui, done) {
  const ctx   = canvas.getContext('2d');
  const W = canvas.width, H = canvas.height;
  const secret = 1 + Math.floor(Math.random() * 20);
  let tries   = 5;
  let message = 'I\'m thinking of a number 1-20...';
  let guess   = null;

  function draw() {
    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = '#0a0a1e';
    ctx.fillRect(0, 0, W, H);

    // Blobby sprite thinking
    ctx.font = '48px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('🤔', W / 2, 80);

    ctx.fillStyle = '#ff6bff';
    ctx.font = '7px "Press Start 2P", monospace';
    ctx.textAlign = 'center';
    wrapText(ctx, message, W / 2, 110, W - 20, 14);

    ctx.fillStyle = '#aaaacc';
    ctx.font = '7px "Press Start 2P", monospace';
    ctx.fillText(`TRIES LEFT: ${tries}`, W / 2, H - 8);
  }

  function wrapText(ctx, text, x, y, maxW, lineH) {
    const words = text.split(' ');
    let line = '';
    for (const w of words) {
      const test = line + w + ' ';
      if (ctx.measureText(test).width > maxW && line) {
        ctx.fillText(line.trim(), x, y);
        line = w + ' ';
        y += lineH;
      } else {
        line = test;
      }
    }
    if (line) ctx.fillText(line.trim(), x, y);
  }

  // Number grid
  for (let i = 1; i <= 20; i++) {
    const btn = document.createElement('button');
    btn.className = 'mg-btn';
    btn.textContent = String(i).padStart(2, '0');
    btn.style.cssText = 'font-size:8px; padding:6px 8px; min-width:44px;';
    btn.onclick = () => {
      guess = i;
      tries--;
      btn.disabled = true;

      if (i === secret) {
        message = '🎉 YES! That\'s it!';
        draw();
        disableAll();
        setTimeout(() => done({ won: true, perfect: tries >= 3 }), 800);
        return;
      }

      const diff = Math.abs(i - secret);
      if (tries === 0) {
        message = `❌ It was ${secret}! Better luck next time.`;
        draw();
        disableAll();
        setTimeout(() => done({ won: false, perfect: false }), 800);
        return;
      }

      if      (diff <= 2) message = '🔥 SO CLOSE! Very warm!';
      else if (diff <= 5) message = '😅 Getting warmer...';
      else if (diff <= 9) message = '🌡️ A bit cool...';
      else                message = '🥶 Ice cold!';

      if (i < secret) message += ' (too low)';
      else            message += ' (too high)';

      draw();
    };
    ui.appendChild(btn);
  }

  function disableAll() { ui.querySelectorAll('.mg-btn').forEach(b => b.disabled = true); }

  draw();
  return { cleanup: () => { ctx.clearRect(0, 0, W, H); } };
}
