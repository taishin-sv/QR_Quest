// お祝いの演出（紙吹雪・キラキラ）。画面全体にかぶせる透明canvasに描く。依存ライブラリなし。
const COLORS = ['#C1502E', '#E8A33D', '#3F7350', '#F2B45B', '#E56B8F', '#4C9BD6', '#8E6BC9'];
const EMOJIS = ['⭐', '🎉', '✨', '🌟', '🎊'];

let canvas = null;
let ctx = null;
let particles = [];
let raf = null;
let last = 0;
const timers = new Set();

const reduced = () => window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;

function ensureCanvas() {
  if (!canvas) {
    canvas = document.createElement('canvas');
    canvas.setAttribute('aria-hidden', 'true');
    canvas.style.cssText = 'position:fixed;inset:0;width:100%;height:100%;pointer-events:none;z-index:100;';
    document.body.appendChild(canvas);
    ctx = canvas.getContext('2d');
  }
  const dpr = window.devicePixelRatio || 1;
  const w = Math.round(innerWidth * dpr);
  const h = Math.round(innerHeight * dpr);
  if (canvas.width !== w || canvas.height !== h) {
    canvas.width = w;
    canvas.height = h;
  }
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}

function rand(a, b) {
  return a + Math.random() * (b - a);
}

// x,y は画面に対する割合(0〜1)。angle は放出の中心方向(度、上=-90)
function burst({ x = 0.5, y = 0.5, count = 80, angle = -90, spread = 360, speed = 9, emoji = 0.15, life = 2.4 } = {}) {
  ensureCanvas();
  const n = reduced() ? Math.ceil(count / 4) : count;
  for (let i = 0; i < n; i++) {
    const a = ((angle + rand(-spread / 2, spread / 2)) * Math.PI) / 180;
    const v = rand(speed * 0.4, speed);
    particles.push({
      x: x * innerWidth,
      y: y * innerHeight,
      vx: Math.cos(a) * v,
      vy: Math.sin(a) * v,
      rot: rand(0, Math.PI * 2),
      vr: rand(-0.3, 0.3),
      size: rand(8, 15),
      color: COLORS[(Math.random() * COLORS.length) | 0],
      emoji: Math.random() < emoji ? EMOJIS[(Math.random() * EMOJIS.length) | 0] : null,
      shape: Math.random() < 0.35 ? 'circle' : 'rect',
      age: 0,
      life: rand(life * 0.6, life),
    });
  }
  start();
}

function start() {
  if (raf) return;
  last = performance.now();
  raf = requestAnimationFrame(tick);
}

function tick(now) {
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  const k = dt * 60; // 60fps基準の係数
  ctx.clearRect(0, 0, innerWidth, innerHeight);
  particles = particles.filter((p) => p.age < p.life && p.y < innerHeight + 40);
  for (const p of particles) {
    p.age += dt;
    p.vy += 0.28 * k;
    p.vx *= Math.pow(0.985, k);
    p.vy *= Math.pow(0.99, k);
    p.x += p.vx * k;
    p.y += p.vy * k;
    p.rot += p.vr * k;
    const fade = Math.min(1, (p.life - p.age) / 0.6);
    ctx.globalAlpha = Math.max(0, fade);
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.rotate(p.rot);
    if (p.emoji) {
      ctx.font = p.size * 2 + 'px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(p.emoji, 0, 0);
    } else if (p.shape === 'circle') {
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(0, 0, p.size / 2.2, 0, Math.PI * 2);
      ctx.fill();
    } else {
      ctx.fillStyle = p.color;
      ctx.fillRect(-p.size / 2, -p.size / 4, p.size, p.size / 2);
    }
    ctx.restore();
  }
  ctx.globalAlpha = 1;
  if (particles.length) {
    raf = requestAnimationFrame(tick);
  } else {
    raf = null;
    ctx.clearRect(0, 0, innerWidth, innerHeight);
  }
}

function later(ms, fn) {
  const t = setTimeout(() => {
    timers.delete(t);
    fn();
  }, ms);
  timers.add(t);
}

export const fx = {
  // 1枚みつけた: 上のほうでキラッと小さく
  sparkle() {
    burst({ x: 0.5, y: 0.3, count: 22, spread: 360, speed: 5, emoji: 0.5, life: 1.2 });
  },
  // ヒントが出る: 画面の下から紙吹雪
  clear() {
    burst({ x: 0.5, y: 0.95, count: 90, angle: -90, spread: 70, speed: 17, emoji: 0.12 });
    burst({ x: 0.1, y: 0.9, count: 40, angle: -60, spread: 40, speed: 14, emoji: 0.1 });
    burst({ x: 0.9, y: 0.9, count: 40, angle: -120, spread: 40, speed: 14, emoji: 0.1 });
  },
  // ゴール: 左右から何度も打ち上げ＋星の雨
  goal() {
    const shots = [0, 350, 800, 1300, 1900, 2600, 3300];
    shots.forEach((ms, i) => {
      later(ms, () => {
        burst({ x: 0.08, y: 0.95, count: 70, angle: -60, spread: 40, speed: 19, emoji: 0.15, life: 3 });
        burst({ x: 0.92, y: 0.95, count: 70, angle: -120, spread: 40, speed: 19, emoji: 0.15, life: 3 });
        if (i % 2 === 0) burst({ x: 0.5, y: 0.45, count: 60, spread: 360, speed: 10, emoji: 0.2, life: 2.6 });
      });
    });
    for (let i = 0; i < 24; i++) {
      later(rand(0, 3800), () => burst({ x: rand(0.05, 0.95), y: -0.03, count: 3, angle: 90, spread: 30, speed: 3, emoji: 1, life: 4 }));
    }
  },
  stop() {
    timers.forEach(clearTimeout);
    timers.clear();
    particles = [];
  },
};
