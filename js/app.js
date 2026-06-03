(() => {

'use strict';

// ============================================
// PRELOADER
// ============================================
const preloader = document.getElementById('preloader');
window.addEventListener('load', () => {
  setTimeout(() => preloader.classList.add('hidden'), 600);
});

// ============================================
// HERO PARTICLE CANVAS
// ============================================
const canvas = document.getElementById('particle-canvas');
const ctx = canvas.getContext('2d');
let W, H;
let mouse = { x: 0, y: 0 };
let particles = [];
const PARTICLE_COUNT = 180;
let animId;

function resizeParticleCanvas() {
  W = canvas.width = window.innerWidth;
  H = canvas.height = window.innerHeight;
}
resizeParticleCanvas();
window.addEventListener('resize', resizeParticleCanvas);

document.addEventListener('mousemove', e => {
  mouse.x = e.clientX;
  mouse.y = e.clientY;
});

class Particle {
  constructor() {
    this.reset(true);
  }
  reset(init = false) {
    this.x = Math.random() * W;
    this.y = init ? Math.random() * H : -10;
    this.z = Math.random() * 300;
    this.size = 1.2 + Math.random() * 2.5;
    this.speedX = (Math.random() - 0.5) * 0.4;
    this.speedY = 0.2 + Math.random() * 0.6;
    this.speedZ = 0.2 + Math.random() * 0.5;
    this.opacity = 0.2 + Math.random() * 0.5;
    this.hue = 280 + Math.random() * 140;
    this.pulseSpeed = 0.5 + Math.random() * 2;
    this.pulseOffset = Math.random() * Math.PI * 2;
  }
  update(time) {
    this.x += this.speedX;
    this.y += this.speedY;
    this.z += this.speedZ * 0.3;
    if (this.z > 300) this.z = 0;
    if (this.y > H + 20) this.reset();
    if (this.x < -20) this.x = W + 20;
    if (this.x > W + 20) this.x = -20;

    const dx = mouse.x - this.x;
    const dy = mouse.y - this.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist < 200) {
      const force = (200 - dist) / 200 * 0.02;
      this.x -= dx * force;
      this.y -= dy * force;
    }
  }
  draw(time) {
    const scale = 1 + this.z / 600;
    const alpha = this.opacity * (0.5 + (this.z / 300) * 0.5);
    const pulse = Math.sin(time * this.pulseSpeed + this.pulseOffset) * 0.2 + 0.8;
    const size = this.size * scale * pulse;
    const x = this.x;
    const y = this.y;

    ctx.beginPath();
    ctx.arc(x, y, size, 0, Math.PI * 2);
    ctx.fillStyle = `hsla(${this.hue}, 100%, 70%, ${alpha * 0.6})`;
    ctx.fill();

    ctx.beginPath();
    ctx.arc(x, y, size * 2.5, 0, Math.PI * 2);
    ctx.fillStyle = `hsla(${this.hue}, 100%, 70%, ${alpha * 0.1})`;
    ctx.fill();
  }
}

for (let i = 0; i < PARTICLE_COUNT; i++) {
  particles.push(new Particle());
}

function drawLines() {
  for (let i = 0; i < particles.length; i++) {
    for (let j = i + 1; j < particles.length; j++) {
      const dx = particles[i].x - particles[j].x;
      const dy = particles[i].y - particles[j].y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < 120) {
        const alpha = (1 - dist / 120) * 0.08;
        ctx.beginPath();
        ctx.moveTo(particles[i].x, particles[i].y);
        ctx.lineTo(particles[j].x, particles[j].y);
        ctx.strokeStyle = `hsla(${(particles[i].hue + particles[j].hue) / 2}, 100%, 70%, ${alpha})`;
        ctx.lineWidth = 0.6;
        ctx.stroke();
      }
    }
  }
}

let particleTime = 0;

function drawParticles() {
  ctx.clearRect(0, 0, W, H);
  particleTime += 0.01;

  for (const p of particles) {
    p.update(particleTime);
    p.draw(particleTime);
  }
  drawLines();

  animId = requestAnimationFrame(drawParticles);
}
drawParticles();

// ============================================
// MOUSE PARALLAX ORBS
// ============================================
const orbs = [document.getElementById('orb1'), document.getElementById('orb2'), document.getElementById('orb3')];
let orbRatios = [
  { x: 0.02, y: 0.02 },
  { x: -0.025, y: -0.015 },
  { x: 0.01, y: -0.02 }
];

document.addEventListener('mousemove', e => {
  const cx = e.clientX / window.innerWidth - 0.5;
  const cy = e.clientY / window.innerHeight - 0.5;
  orbs.forEach((orb, i) => {
    if (orb) {
      orb.style.transform = `translate(${cx * orbRatios[i].x * 100}px, ${cy * orbRatios[i].y * 100}px)`;
    }
  });
});

// ============================================
// SCROLL REVEAL (Intersection Observer)
// ============================================
const revealEls = document.querySelectorAll(
  '.stat-card, .card-reveal, .section-header, .meter-card, .quote-display, .quote-nav, .footer-title, .footer-text, .footer-sub, .footer-badges'
);

const observer = new IntersectionObserver((entries) => {
  for (const entry of entries) {
    if (entry.isIntersecting) {
      const delay = parseInt(entry.target.dataset.delay) || 0;
      setTimeout(() => entry.target.classList.add('visible'), delay);
      observer.unobserve(entry.target);
    }
  }
}, { threshold: 0.15, rootMargin: '0px 0px -50px 0px' });

for (const el of revealEls) {
  observer.observe(el);
}

// ============================================
// COUNTER ANIMATION
// ============================================
const counters = document.querySelectorAll('.count-up');
const counterObserver = new IntersectionObserver((entries) => {
  for (const entry of entries) {
    if (entry.isIntersecting) {
      const el = entry.target;
      const target = parseInt(el.dataset.target);
      animateCounter(el, target);
      counterObserver.unobserve(el);
    }
  }
}, { threshold: 0.5 });

for (const c of counters) {
  counterObserver.observe(c);
}

function animateCounter(el, target) {
  const duration = 2000;
  const start = performance.now();
  function tick(now) {
    const elapsed = now - start;
    const progress = Math.min(elapsed / duration, 1);
    const eased = 1 - Math.pow(1 - progress, 3);
    const current = Math.floor(eased * target);
    el.textContent = current.toLocaleString();
    if (progress < 1) requestAnimationFrame(tick);
    else el.textContent = target.toLocaleString();
  }
  requestAnimationFrame(tick);
}

// ============================================
// EVIDENCE CARDS FLIP
// ============================================
const cards = document.querySelectorAll('.evidence-card');
for (const card of cards) {
  card.addEventListener('click', () => {
    card.classList.toggle('flipped');
  });
}

// ============================================
// STUPIDITY METER
// ============================================
const slider = document.getElementById('stupiditySlider');
const gaugeValue = document.getElementById('gaugeValue');
const gaugeArc = document.getElementById('gauge-arc');
const gaugePin = document.getElementById('gauge-pin');
const meterResult = document.getElementById('meterResult');

const results = [
  { min: 0, max: 15, text: '🧠 Сегодня всё в порядке... подозрительно', emoji: '🧠' },
  { min: 15, max: 30, text: '🤔 Лёгкая рассеянность, бывает', emoji: '🤔' },
  { min: 30, max: 45, text: '😅 Уже забыла, что делала 5 минут назад', emoji: '😅' },
  { min: 45, max: 60, text: '🙈 Средний уровень глупости по паспорту', emoji: '🙈' },
  { min: 60, max: 75, text: '🤡 Наташа в своей стихии', emoji: '🤡' },
  { min: 75, max: 90, text: '💀 Критический уровень. Вызовите маму', emoji: '💀' },
  { min: 90, max: 100, text: '🔥 ГЛУПОСТЬ ЗАШКАЛИВАЕТ. ОПАСНОСТЬ!', emoji: '🔥' },
];

function updateMeter(val) {
  const percent = parseInt(val);
  gaugeValue.textContent = percent + '%';

  const offset = 230 - (percent / 100) * 230;
  gaugeArc.setAttribute('stroke-dashoffset', offset);

  const angle = (percent / 100) * 180;
  const rad = (angle - 90) * Math.PI / 180;
  const cx = 100, cy = 100, r = 80;
  const px = cx + r * Math.cos(rad);
  const py = cy + r * Math.sin(rad);
  gaugePin.setAttribute('cx', px);
  gaugePin.setAttribute('cy', py);

  const result = results.find(r => percent >= r.min && percent < r.max) || results[results.length - 1];
  meterResult.textContent = result.text;
  meterResult.style.borderColor = `hsla(${280 - percent * 2.8}, 100%, 60%, 0.3)`;
  meterResult.style.background = `rgba(196,77,255,${percent / 100 * 0.08})`;
}

slider.addEventListener('input', () => updateMeter(slider.value));
updateMeter(slider.value);

// ============================================
// QUOTES CAROUSEL
// ============================================
const quotes = [
  { text: 'Где мой телефон?', context: '— разговаривая по телефону', source: 'Очевидец' },
  { text: 'Я не глупая, я просто... творческая', context: '— после того как уронила телефон в суп', source: 'Сама Наташа' },
  { text: 'Ой, а почему холодильник гудит?', context: '— потому что он включён в розетку', source: 'Бабушка' },
  { text: 'Я сегодня очень продуктивная!', context: '— провела 4 часа в TikTok', source: 'Статистика экрана' },
  { text: 'Где мои ключи? А, неважно', context: '— ключи были в замке зажигания. В машине. Которая заведена.', source: 'МЧС' },
  { text: 'Я сделала уроки!', context: '— сказала Наташа, глядя на закрытый дневник с двойкой', source: 'Дневник' },
  { text: 'Это не я, это они сами...', context: '— стандартная защита', source: 'Адвокат' },
  { text: 'Я просто хотела как лучше', context: '— эпиграф к биографии', source: 'Народная мудрость' },
];

let currentQuote = 0;
const quoteText = document.getElementById('quoteText');
const quoteContext = document.getElementById('quoteContext');
const quoteDots = document.getElementById('quoteDots');
const quotePrev = document.getElementById('quotePrev');
const quoteNext = document.getElementById('quoteNext');

for (let i = 0; i < quotes.length; i++) {
  const dot = document.createElement('div');
  dot.className = 'quote-dot' + (i === 0 ? ' active' : '');
  dot.addEventListener('click', () => showQuote(i));
  quoteDots.appendChild(dot);
}

function showQuote(idx) {
  currentQuote = idx;
  const q = quotes[idx];
  quoteText.style.opacity = '0';
  quoteText.style.transform = 'translateY(10px)';
  setTimeout(() => {
    quoteText.textContent = q.text;
    quoteContext.textContent = q.context;
    quoteText.style.opacity = '1';
    quoteText.style.transform = 'translateY(0)';
  }, 200);

  document.querySelectorAll('.quote-dot').forEach((dot, i) => {
    dot.classList.toggle('active', i === idx);
  });
}

quotePrev.addEventListener('click', () => {
  showQuote((currentQuote - 1 + quotes.length) % quotes.length);
});

quoteNext.addEventListener('click', () => {
  showQuote((currentQuote + 1) % quotes.length);
});

showQuote(0);

// ============================================
// CONFETTI
// ============================================
const confettiCanvas = document.getElementById('confetti-canvas');
const cctx = confettiCanvas.getContext('2d');
let confettiPieces = [];
let confettiActive = false;
let confettiAnimId;

function resizeConfetti() {
  confettiCanvas.width = window.innerWidth;
  confettiCanvas.height = window.innerHeight;
}
resizeConfetti();
window.addEventListener('resize', resizeConfetti);

class ConfettiPiece {
  constructor() {
    this.reset();
  }
  reset() {
    this.x = Math.random() * confettiCanvas.width;
    this.y = -20 - Math.random() * 100;
    this.w = 6 + Math.random() * 8;
    this.h = 4 + Math.random() * 6;
    this.speedY = 2 + Math.random() * 4;
    this.speedX = (Math.random() - 0.5) * 3;
    this.rotation = Math.random() * 360;
    this.rotSpeed = (Math.random() - 0.5) * 10;
    this.hue = Math.random() * 360;
    this.sat = 80 + Math.random() * 20;
    this.light = 55 + Math.random() * 25;
    this.opacity = 0.8 + Math.random() * 0.2;
    this.gravity = 0.04 + Math.random() * 0.06;
    this.drift = (Math.random() - 0.5) * 0.03;
  }
  update() {
    this.speedY += this.gravity;
    this.x += this.speedX + this.drift;
    this.y += this.speedY;
    this.rotation += this.rotSpeed;
  }
  draw() {
    cctx.save();
    cctx.translate(this.x, this.y);
    cctx.rotate(this.rotation * Math.PI / 180);
    cctx.globalAlpha = this.opacity;
    cctx.fillStyle = `hsl(${this.hue}, ${this.sat}%, ${this.light}%)`;
    cctx.fillRect(-this.w / 2, -this.h / 2, this.w, this.h);
    cctx.restore();
  }
}

function launchConfetti() {
  if (!confettiActive) {
    confettiActive = true;
    for (let i = 0; i < 200; i++) {
      const p = new ConfettiPiece();
      p.y = Math.random() * confettiCanvas.height * 0.5;
      confettiPieces.push(p);
    }
    animateConfetti();
  }
}

function animateConfetti() {
  cctx.clearRect(0, 0, confettiCanvas.width, confettiCanvas.height);

  confettiPieces = confettiPieces.filter(p => {
    p.update();
    p.draw();
    return p.y < confettiCanvas.height + 50;
  });

  if (confettiPieces.length > 0) {
    confettiAnimId = requestAnimationFrame(animateConfetti);
  } else {
    confettiActive = false;
    cctx.clearRect(0, 0, confettiCanvas.width, confettiCanvas.height);
  }
}

document.getElementById('confettiBtn').addEventListener('click', launchConfetti);

// ============================================
// SCROLL TO EVIDENCE
// ============================================
document.getElementById('scrollBtn').addEventListener('click', () => {
  document.getElementById('evidence').scrollIntoView({ behavior: 'smooth' });
});

// ============================================
// SOUND EFFECTS (Web Audio API)
// ============================================
let audioCtx = null;

function initAudio() {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  }
}

function playBoop() {
  try {
    initAudio();
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.type = 'sine';
    osc.frequency.setValueAtTime(600, audioCtx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(200, audioCtx.currentTime + 0.15);
    gain.gain.setValueAtTime(0.08, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.15);
    osc.start(audioCtx.currentTime);
    osc.stop(audioCtx.currentTime + 0.15);
  } catch (e) {}
}

function playSuccess() {
  try {
    initAudio();
    const notes = [523, 659, 784, 1047];
    notes.forEach((freq, i) => {
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, audioCtx.currentTime + i * 0.12);
      gain.gain.setValueAtTime(0.06, audioCtx.currentTime + i * 0.12);
      gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + i * 0.12 + 0.3);
      osc.start(audioCtx.currentTime + i * 0.12);
      osc.stop(audioCtx.currentTime + i * 0.12 + 0.3);
    });
  } catch (e) {}
}

for (const card of cards) {
  card.addEventListener('click', playBoop);
}

document.getElementById('confettiBtn').addEventListener('click', playSuccess);
slider.addEventListener('input', playBoop);
quotePrev.addEventListener('click', playBoop);
quoteNext.addEventListener('click', playBoop);

// Init audio on first user interaction
document.addEventListener('click', initAudio, { once: true });
document.addEventListener('touchstart', initAudio, { once: true });

// ============================================
// DYNAMIC CANVAS RESIZE
// ============================================
window.addEventListener('resize', () => {
  resizeParticleCanvas();
  resizeConfetti();
});

})();
