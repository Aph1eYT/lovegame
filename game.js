/* ==========================================
   ПУТЬ К СЕРДЦУ — Игровая логика
   game.js
   ========================================== */

'use strict';

/* ========================================
   КОНСТАНТЫ И ДАННЫЕ
======================================== */

// Тайные послания для карточек
const MESSAGES = [
  { icon: '✦', text: 'Ты делаешь каждый день чуть ярче, чем он мог бы быть', sub: 'всегда' },
  { icon: '♥', text: 'В твоей улыбке есть что-то, от чего время замедляется', sub: 'правда' },
  { icon: '✿', text: 'Мир немного добрее, потому что в нём есть ты', sub: 'без сомнений' },
  { icon: '◈', text: 'Рядом с тобой мне никуда не нужно спешить', sub: 'никогда' },
  { icon: '✧', text: 'Ты — это место, куда хочется возвращаться снова и снова', sub: 'всегда' },
  { icon: '❋', text: 'Быть рядом с тобой — это уже счастье', sub: 'просто знай' },
];

// Лабиринт: 0 = путь, 1 = стена, S = старт, E = финиш
// Сетка 11×15
const MAZE_MAP = [
  [1,1,1,1,1,1,1,1,1,1,1],
  [1,0,0,0,1,0,0,0,0,0,1],
  [1,0,1,0,1,0,1,1,1,0,1],
  [1,0,1,0,0,0,0,0,1,0,1],
  [1,0,1,1,1,1,1,0,1,0,1],
  [1,0,0,0,0,0,1,0,0,0,1],
  [1,1,1,0,1,0,1,1,1,0,1],
  [1,0,0,0,1,0,0,0,1,0,1],
  [1,0,1,1,1,1,1,0,1,0,1],
  [1,0,0,0,0,0,0,0,0,0,1],
  [1,1,1,0,1,1,1,0,1,1,1],
  [1,0,0,0,1,0,0,0,0,0,1],
  [1,0,1,1,1,0,1,1,1,0,1],
  [1,0,0,0,0,0,0,0,0,0,1],
  [1,1,1,1,1,1,1,1,1,1,1],
];
const MAZE_ROWS = MAZE_MAP.length;
const MAZE_COLS = MAZE_MAP[0].length;
const PLAYER_START = { row: 1, col: 1 };
const MAZE_EXIT    = { row: 13, col: 9 };

/* ========================================
   УТИЛИТЫ
======================================== */
const qs  = (s) => document.querySelector(s);
const qsa = (s) => document.querySelectorAll(s);

function rand(min, max) { return Math.random() * (max - min) + min; }
function randInt(min, max) { return Math.floor(rand(min, max + 1)); }

// Вибрация (если поддерживается)
function vibrate(pattern) {
  if (navigator.vibrate) navigator.vibrate(pattern);
}

// Звук через Web Audio API
const AudioCtx = window.AudioContext || window.webkitAudioContext;
let audioCtx = null;

function getAudioCtx() {
  if (!audioCtx) audioCtx = new AudioCtx();
  return audioCtx;
}

function playTone(freq, type = 'sine', duration = 0.15, vol = 0.15) {
  try {
    const ctx = getAudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = type;
    osc.frequency.setValueAtTime(freq, ctx.currentTime);
    gain.gain.setValueAtTime(vol, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + duration);
  } catch(e) { /* молчим */ }
}

function playSweep() {
  try {
    const ctx = getAudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain); gain.connect(ctx.destination);
    osc.type = 'sine';
    osc.frequency.setValueAtTime(300, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(800, ctx.currentTime + 0.4);
    gain.gain.setValueAtTime(0.1, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5);
    osc.start(ctx.currentTime); osc.stop(ctx.currentTime + 0.5);
  } catch(e) {}
}

function playWin() {
  [523, 659, 784, 1047].forEach((f, i) => {
    setTimeout(() => playTone(f, 'sine', 0.3, 0.12), i * 80);
  });
}

/* ========================================
   ПЕРЕХОД МЕЖДУ ЭКРАНАМИ
======================================== */
const SCREENS = ['screen-start','screen-hearts','screen-maze','screen-messages','screen-final'];
let currentScreenIdx = 0;

function goToScreen(toIdx) {
  const fromEl = qs(`#${SCREENS[currentScreenIdx]}`);
  const toEl   = qs(`#${SCREENS[toIdx]}`);

  fromEl.classList.add('slide-out');
  setTimeout(() => {
    fromEl.classList.remove('active', 'slide-out');
    toEl.classList.add('active', 'slide-in');
    setTimeout(() => toEl.classList.remove('slide-in'), 500);
    currentScreenIdx = toIdx;
    // Инициализация экрана
    if (toIdx === 1) initHeartsGame();
    if (toIdx === 2) initMaze();
    if (toIdx === 3) initMessages();
    if (toIdx === 4) initFinal();
  }, 400);
}

/* ========================================
   АНИМИРОВАННЫЙ ФОН (звёзды/частицы)
======================================== */
(function initBgCanvas() {
  const canvas = qs('#bg-canvas');
  const ctx = canvas.getContext('2d');
  let W, H, stars = [];

  function resize() {
    W = canvas.width  = window.innerWidth;
    H = canvas.height = window.innerHeight;
    makeStars();
  }

  function makeStars() {
    stars = Array.from({ length: 80 }, () => ({
      x: rand(0, W), y: rand(0, H),
      r: rand(0.3, 1.5),
      speed: rand(0.02, 0.08),
      opacity: rand(0.1, 0.6),
      twinkleSpeed: rand(0.005, 0.02),
      twinkleDir: 1,
    }));
  }

  function tick() {
    ctx.clearRect(0, 0, W, H);
    stars.forEach(s => {
      s.opacity += s.twinkleSpeed * s.twinkleDir;
      if (s.opacity > 0.7 || s.opacity < 0.05) s.twinkleDir *= -1;
      s.y -= s.speed;
      if (s.y < 0) { s.y = H; s.x = rand(0, W); }
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(212,168,255,${s.opacity})`;
      ctx.fill();
    });
    requestAnimationFrame(tick);
  }

  window.addEventListener('resize', resize);
  resize();
  tick();
})();

/* ========================================
   ПЛАВАЮЩИЕ СЕРДЕЧКИ (старт + финал)
======================================== */
function spawnFloatingHearts(containerId, count = 8) {
  const container = qs(`#${containerId}`);
  if (!container) return;
  container.innerHTML = '';

  for (let i = 0; i < count; i++) {
    const h = document.createElement('div');
    h.className = 'f-heart';
    h.textContent = ['♥','❤','♡'][randInt(0,2)];
    const size = rand(12, 28);
    const left = rand(5, 90);
    const delay = rand(0, 6);
    const dur = rand(6, 14);
    const drift = rand(-40, 40);
    const rot = rand(-20, 20);
    h.style.cssText = `
      font-size:${size}px; left:${left}%;
      animation-duration:${dur}s;
      animation-delay:${delay}s;
      --drift:${drift}px; --rot:${rot}deg;
      opacity:0;
    `;
    container.appendChild(h);
  }
}

/* ========================================
   ЭКРАН 2: ИГРА — СБОР СЕРДЕЧЕК
======================================== */
let heartsCollected = 0;
let heartItems = [];
let playerPos = { x: 0, y: 0 };
let heartsCanvas, heartsCtx;
let heartsAnimId;
let HCANVAS_W, HCANVAS_H;

function initHeartsGame() {
  heartsCollected = 0;
  qs('#heartScore').textContent = '0';
  qs('#hearts-complete').classList.add('hidden');

  heartsCanvas = qs('#hearts-canvas');
  heartsCtx = heartsCanvas.getContext('2d');

  // Размер canvas = доступное пространство
  const rect = heartsCanvas.getBoundingClientRect();
  heartsCanvas.width  = HCANVAS_W = rect.width  || window.innerWidth;
  heartsCanvas.height = HCANVAS_H = rect.height || window.innerHeight * 0.6;

  playerPos = { x: HCANVAS_W / 2, y: HCANVAS_H - 60 };

  // Спауним 10 сердечек
  heartItems = Array.from({ length: 10 }, () => ({
    x: rand(24, HCANVAS_W - 24),
    y: rand(40, HCANVAS_H * 0.7),
    r: rand(14, 22),
    opacity: 1,
    collected: false,
    pulse: rand(0, Math.PI * 2),
  }));

  // Управление касанием
  heartsCanvas.removeEventListener('touchmove', onHeartsTouch);
  heartsCanvas.removeEventListener('touchstart', onHeartsTouch);
  heartsCanvas.addEventListener('touchstart', onHeartsTouch, { passive: false });
  heartsCanvas.addEventListener('touchmove',  onHeartsTouch, { passive: false });

  // Управление мышью (для тестирования)
  heartsCanvas.removeEventListener('mousemove', onHeartsMouse);
  heartsCanvas.addEventListener('mousemove', onHeartsMouse);

  cancelAnimationFrame(heartsAnimId);
  heartsLoop();
}

function onHeartsTouch(e) {
  e.preventDefault();
  const rect = heartsCanvas.getBoundingClientRect();
  const touch = e.touches[0];
  playerPos.x = touch.clientX - rect.left;
  playerPos.y = touch.clientY - rect.top;
}
function onHeartsMouse(e) {
  const rect = heartsCanvas.getBoundingClientRect();
  playerPos.x = e.clientX - rect.left;
  playerPos.y = e.clientY - rect.top;
}

function heartsLoop() {
  const ctx = heartsCtx;
  ctx.clearRect(0, 0, HCANVAS_W, HCANVAS_H);

  // Лёгкий фон
  ctx.fillStyle = 'rgba(7,0,15,0.3)';
  ctx.fillRect(0, 0, HCANVAS_W, HCANVAS_H);

  // Рисуем цели
  heartItems.forEach(h => {
    if (h.collected) return;
    h.pulse += 0.05;
    const scale = 1 + Math.sin(h.pulse) * 0.06;

    ctx.save();
    ctx.translate(h.x, h.y);
    ctx.scale(scale, scale);
    ctx.globalAlpha = h.opacity;

    // Свечение
    const grd = ctx.createRadialGradient(0,0,0, 0,0,h.r*2);
    grd.addColorStop(0, 'rgba(255,107,168,0.3)');
    grd.addColorStop(1, 'rgba(255,107,168,0)');
    ctx.fillStyle = grd;
    ctx.beginPath();
    ctx.arc(0, 0, h.r * 2, 0, Math.PI * 2);
    ctx.fill();

    // Сердечко
    drawHeart(ctx, 0, 0, h.r, '#ff6ba8');
    ctx.restore();

    // Проверка сбора
    const dx = playerPos.x - h.x;
    const dy = playerPos.y - h.y;
    const dist = Math.sqrt(dx*dx + dy*dy);
    if (dist < h.r + 24) {
      h.collected = true;
      heartsCollected++;
      qs('#heartScore').textContent = heartsCollected;
      playTone(440 + heartsCollected * 40, 'sine', 0.2, 0.12);
      vibrate([30]);
      if (heartsCollected >= 10) {
        cancelAnimationFrame(heartsAnimId);
        setTimeout(showHeartsComplete, 300);
        return;
      }
    }
  });

  // Рисуем игрока
  drawPlayerHeart(ctx, playerPos.x, playerPos.y);

  heartsAnimId = requestAnimationFrame(heartsLoop);
}

function drawHeart(ctx, x, y, size, color) {
  ctx.save();
  ctx.translate(x, y - size * 0.1);
  ctx.fillStyle = color;
  ctx.shadowColor = color;
  ctx.shadowBlur = 12;
  ctx.beginPath();
  ctx.moveTo(0, size * 0.3);
  ctx.bezierCurveTo(-size, -size * 0.3, -size * 1.5, size * 0.7, 0, size * 1.3);
  ctx.bezierCurveTo(size * 1.5, size * 0.7, size, -size * 0.3, 0, size * 0.3);
  ctx.fill();
  ctx.restore();
}

function drawPlayerHeart(ctx, x, y) {
  ctx.save();
  ctx.shadowColor = '#a855f7';
  ctx.shadowBlur = 20;

  // Ореол игрока
  const grd = ctx.createRadialGradient(x, y, 0, x, y, 36);
  grd.addColorStop(0, 'rgba(168,85,247,0.25)');
  grd.addColorStop(1, 'rgba(168,85,247,0)');
  ctx.fillStyle = grd;
  ctx.beginPath();
  ctx.arc(x, y, 36, 0, Math.PI * 2);
  ctx.fill();

  // Сердечко игрока
  ctx.translate(x, y - 3);
  ctx.fillStyle = '#d4a8ff';
  ctx.shadowBlur = 16;
  ctx.beginPath();
  ctx.moveTo(0, 4);
  ctx.bezierCurveTo(-14, -5, -18, 8, 0, 17);
  ctx.bezierCurveTo(18, 8, 14, -5, 0, 4);
  ctx.fill();
  ctx.restore();
}

function showHeartsComplete() {
  playWin();
  vibrate([50, 50, 100]);
  const overlay = qs('#hearts-complete');
  overlay.classList.remove('hidden');
  setTimeout(() => goToScreen(2), 2000);
}

/* ========================================
   ЭКРАН 3: ЛАБИРИНТ
======================================== */
let mazeCanvas, mazeCtx;
let playerCell = { ...PLAYER_START };
let mazeCompleted = false;
let CELL_SIZE;
let mazeAnimId;
let mazePlayerAngle = 0;

function initMaze() {
  mazeCompleted = false;
  playerCell = { ...PLAYER_START };
  qs('#maze-complete').classList.add('hidden');

  mazeCanvas = qs('#maze-canvas');
  mazeCtx = mazeCanvas.getContext('2d');

  // Подбираем размер клетки под экран
  const availW = Math.min(window.innerWidth - 32, 360);
  const availH = window.innerHeight * 0.42;
  const cellW = Math.floor(availW / MAZE_COLS);
  const cellH = Math.floor(availH / MAZE_ROWS);
  CELL_SIZE = Math.min(cellW, cellH, 30);

  mazeCanvas.width  = CELL_SIZE * MAZE_COLS;
  mazeCanvas.height = CELL_SIZE * MAZE_ROWS;

  // Управление кнопками
  qs('#mUp').onclick    = () => mazeMove(-1,  0);
  qs('#mDown').onclick  = () => mazeMove( 1,  0);
  qs('#mLeft').onclick  = () => mazeMove( 0, -1);
  qs('#mRight').onclick = () => mazeMove( 0,  1);

  // Свайпы
  let touchStartX, touchStartY;
  const mscreen = qs('#screen-maze');
  mscreen.ontouchstart = (e) => {
    touchStartX = e.touches[0].clientX;
    touchStartY = e.touches[0].clientY;
  };
  mscreen.ontouchend = (e) => {
    if (!touchStartX) return;
    const dx = e.changedTouches[0].clientX - touchStartX;
    const dy = e.changedTouches[0].clientY - touchStartY;
    if (Math.abs(dx) > Math.abs(dy)) {
      dx > 0 ? mazeMove(0,1) : mazeMove(0,-1);
    } else {
      dy > 0 ? mazeMove(1,0) : mazeMove(-1,0);
    }
    touchStartX = touchStartY = null;
  };

  cancelAnimationFrame(mazeAnimId);
  mazeDraw();
}

function mazeMove(dr, dc) {
  if (mazeCompleted) return;
  const nr = playerCell.row + dr;
  const nc = playerCell.col + dc;
  if (nr < 0 || nr >= MAZE_ROWS || nc < 0 || nc >= MAZE_COLS) return;
  if (MAZE_MAP[nr][nc] === 1) {
    // Удар об стену
    playTone(180, 'square', 0.08, 0.06);
    vibrate(20);
    return;
  }
  playTone(600, 'sine', 0.08, 0.06);
  playerCell = { row: nr, col: nc };
  mazeDraw();

  if (nr === MAZE_EXIT.row && nc === MAZE_EXIT.col) {
    mazeCompleted = true;
    setTimeout(showMazeComplete, 400);
  }
}

function mazeDraw() {
  const ctx = mazeCtx;
  const C = CELL_SIZE;
  const W = C * MAZE_COLS;
  const H = C * MAZE_ROWS;

  ctx.clearRect(0, 0, W, H);

  // Фон лабиринта
  ctx.fillStyle = '#07000f';
  ctx.fillRect(0, 0, W, H);

  // Клетки
  for (let r = 0; r < MAZE_ROWS; r++) {
    for (let c = 0; c < MAZE_COLS; c++) {
      const x = c * C, y = r * C;

      if (MAZE_MAP[r][c] === 1) {
        // Стена с неоновым эффектом
        ctx.fillStyle = '#0d0018';
        ctx.fillRect(x, y, C, C);

        ctx.strokeStyle = 'rgba(168,85,247,0.5)';
        ctx.lineWidth = 0.5;
        ctx.shadowColor = '#a855f7';
        ctx.shadowBlur = 4;
        ctx.strokeRect(x + 0.5, y + 0.5, C - 1, C - 1);
        ctx.shadowBlur = 0;
      } else {
        // Проход
        ctx.fillStyle = 'rgba(255,107,168,0.02)';
        ctx.fillRect(x, y, C, C);
      }

      // Финиш
      if (r === MAZE_EXIT.row && c === MAZE_EXIT.col) {
        ctx.save();
        ctx.shadowColor = '#f5c518';
        ctx.shadowBlur = 14;
        ctx.fillStyle = 'rgba(245,197,24,0.15)';
        ctx.fillRect(x + 2, y + 2, C - 4, C - 4);
        ctx.fillStyle = '#f5c518';
        ctx.font = `${Math.floor(C * 0.55)}px serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('★', x + C/2, y + C/2);
        ctx.restore();
      }
    }
  }

  // Игрок
  const px = playerCell.col * C + C / 2;
  const py = playerCell.row * C + C / 2;
  const pr = C * 0.3;

  ctx.save();
  ctx.shadowColor = '#d4a8ff';
  ctx.shadowBlur = 18;

  const grd = ctx.createRadialGradient(px, py, 0, px, py, pr * 2);
  grd.addColorStop(0, 'rgba(212,168,255,0.3)');
  grd.addColorStop(1, 'rgba(212,168,255,0)');
  ctx.fillStyle = grd;
  ctx.beginPath();
  ctx.arc(px, py, pr * 2, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#d4a8ff';
  ctx.beginPath();
  ctx.arc(px, py, pr, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function showMazeComplete() {
  playWin();
  vibrate([80, 40, 80]);
  qs('#maze-complete').classList.remove('hidden');
  setTimeout(() => goToScreen(3), 2200);
}

/* ========================================
   ЭКРАН 4: ТАЙНЫЕ ПОСЛАНИЯ
======================================== */
let openedCards = 0;

function initMessages() {
  openedCards = 0;
  const grid = qs('#cardsGrid');
  grid.innerHTML = '';
  qs('#btnToFinal').classList.add('hidden');

  MESSAGES.forEach((msg, i) => {
    const card = document.createElement('div');
    card.className = 'msg-card';
    card.style.animationDelay = `${i * 0.1}s`;
    card.style.animation = 'cardAppear 0.5s both';
    card.innerHTML = `
      <div class="card-front">
        <div class="card-icon-big">${msg.icon}</div>
        <div class="card-lock">🔒</div>
      </div>
      <div class="card-back">
        <p class="card-msg-text">${msg.text}</p>
        <span class="card-msg-sub">${msg.sub}</span>
      </div>
    `;
    card.addEventListener('click', () => {
      if (card.classList.contains('flipped')) return;
      card.classList.add('flipped');
      playTone(660 + i * 30, 'sine', 0.25, 0.1);
      vibrate(25);
      openedCards++;
      if (openedCards >= MESSAGES.length) {
        setTimeout(() => {
          qs('#btnToFinal').classList.remove('hidden');
        }, 500);
      }
    });
    grid.appendChild(card);
  });

  qs('#btnToFinal').onclick = () => goToScreen(4);
}

/* ========================================
   ФИНАЛЬНЫЙ ЭКРАН
======================================== */
function initFinal() {
  spawnFloatingHearts('floatingHeartsFinal', 12);
  playWin();
  vibrate([100, 50, 100, 50, 200]);

  const title = qs('#finalTitle');
  const message = qs('#finalMessage');

  title.textContent = '';
  message.textContent = '';

  const titleText = 'Ты прошла весь путь';
  const msgText = 'Это маленькое путешествие — только для тебя.\nПотому что ты заслуживаешь чего-то особенного\nкаждый день.';

  // Печатаем заголовок
  typeText(title, titleText, 60, () => {
    setTimeout(() => typeText(message, msgText, 30), 300);
  });
}

function typeText(el, text, speed, cb) {
  let i = 0;
  el.textContent = '';
  const interval = setInterval(() => {
    if (i < text.length) {
      el.textContent += text[i] === '\n' ? '\n' : text[i];
      i++;
    } else {
      clearInterval(interval);
      if (cb) cb();
    }
  }, speed);
}

/* ========================================
   ПРЕЛОАДЕР И ИНИЦИАЛИЗАЦИЯ
======================================== */
window.addEventListener('DOMContentLoaded', () => {
  spawnFloatingHearts('floatingHeartsStart', 10);

  // Прелоадер
  setTimeout(() => {
    const pre = qs('#preloader');
    pre.classList.add('hidden');
    pre.addEventListener('transitionend', () => pre.remove(), { once: true });
  }, 1800);

  // Кнопка Начать
  qs('#btnStart').addEventListener('click', () => {
    playTone(440, 'sine', 0.2, 0.1);
    vibrate(40);
    goToScreen(1);
  });

  // Кнопка Заново
  qs('#btnRestart').addEventListener('click', () => {
    playTone(330, 'sine', 0.2, 0.1);
    vibrate(30);
    goToScreen(0);
    spawnFloatingHearts('floatingHeartsStart', 10);
  });
});
