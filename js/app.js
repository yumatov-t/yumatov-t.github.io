(function () {
  'use strict';

  /* ---------- Scroll Reveal ---------- */
  const revealTargets = document.querySelectorAll(
    '.feature-row, .stat-card, .meter-card, .section-header, .quotes'
  );

  const revealObserver = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
          revealObserver.unobserve(entry.target);
        }
      }
    },
    { threshold: 0.15, rootMargin: '0px 0px -60px 0px' }
  );

  for (const el of revealTargets) {
    revealObserver.observe(el);
  }

  /* ---------- Counters ---------- */
  const counters = document.querySelectorAll('.count-up');

  const counterObserver = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting) {
          const el = entry.target;
          const target = parseInt(el.dataset.target, 10);
          animateNumber(el, target);
          counterObserver.unobserve(el);
        }
      }
    },
    { threshold: 0.5 }
  );

  for (const c of counters) {
    counterObserver.observe(c);
  }

  function animateNumber(el, target) {
    const duration = 2000;
    const start = performance.now();

    function tick(now) {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      const current = Math.floor(eased * target);
      el.textContent = current.toLocaleString();
      if (progress < 1) {
        requestAnimationFrame(tick);
      } else {
        el.textContent = target.toLocaleString();
      }
    }

    requestAnimationFrame(tick);
  }

  /* ---------- Meter ---------- */
  const slider = document.getElementById('meterSlider');
  const arc = document.getElementById('meterArc');
  const val = document.getElementById('meterValue');
  const status = document.getElementById('meterStatus');

  const levels = [
    { max: 15, text: 'С Наташей всё в порядке. День чудес.' },
    { max: 30, text: 'Лёгкая рассеянность. Бывает.' },
    { max: 45, text: 'Уже забыла, что делала 5 минут назад.' },
    { max: 60, text: 'Средний уровень глупости по паспорту.' },
    { max: 75, text: 'Наташа в своей стихии.' },
    { max: 90, text: 'Критический уровень. Вызовите маму.' },
    { max: 100, text: 'Глупость зашкаливает. Опасность!' },
  ];

  function updateMeter(percent) {
    const p = parseInt(percent, 10);
    val.textContent = p + '%';

    const circumference = 515;
    const offset = circumference - (p / 100) * circumference;
    arc.setAttribute('stroke-dashoffset', offset);

    const level = levels.find((l) => p <= l.max) || levels[levels.length - 1];
    status.innerHTML = '<span class="meter-dot"></span> ' + level.text;

    const hue = 280 - p * 2.8;
    status.style.borderColor = 'hsla(' + hue + ', 70%, 50%, ' + (0.04 + p / 100 * 0.2) + ')';
    status.style.background = 'rgba(196,77,255,' + (p / 100 * 0.03) + ')';
  }

  slider.addEventListener('input', function () {
    updateMeter(this.value);
  });

  updateMeter(slider.value);

  /* ---------- Quotes ---------- */
  const quotes = [
    { text: 'Где мой телефон?', context: '— разговаривая по телефону с мамой' },
    { text: 'Я не глупая, я просто творческая', context: '— после того как уронила телефон в суп' },
    { text: 'Ой, а почему холодильник гудит?', context: '— потому что он включён в розетку' },
    { text: 'Я сегодня очень продуктивная', context: '— проведя 4 часа в TikTok' },
    { text: 'Где мои ключи? А, неважно', context: '— ключи в замке зажигания. Машина заведена.' },
    { text: 'Я сделала уроки!', context: '— глядя на дневник с двойкой' },
    { text: 'Это не я, это они сами', context: '— стандартная защита Наташи' },
    { text: 'Я просто хотела как лучше', context: '— эпиграф к биографии' },
  ];

  let quoteIndex = 0;
  const quoteText = document.getElementById('quoteText');
  const quoteContext = document.getElementById('quoteContext');
  const quoteDots = document.getElementById('quoteDots');
  const quotePrev = document.getElementById('quotePrev');
  const quoteNext = document.getElementById('quoteNext');

  for (let i = 0; i < quotes.length; i++) {
    const dot = document.createElement('span');
    dot.className = 'quote-dot' + (i === 0 ? ' active' : '');
    dot.addEventListener('click', function () {
      showQuote(i);
    });
    quoteDots.appendChild(dot);
  }

  function showQuote(index) {
    quoteIndex = index;
    const q = quotes[index];

    quoteText.style.opacity = '0';
    quoteText.style.transform = 'translateY(8px)';

    setTimeout(function () {
      quoteText.textContent = q.text;
      quoteContext.textContent = q.context;
      quoteText.style.opacity = '1';
      quoteText.style.transform = 'translateY(0)';
    }, 200);

    const dots = document.querySelectorAll('.quote-dot');
    for (let i = 0; i < dots.length; i++) {
      dots[i].classList.toggle('active', i === index);
    }
  }

  quotePrev.addEventListener('click', function () {
    showQuote((quoteIndex - 1 + quotes.length) % quotes.length);
  });

  quoteNext.addEventListener('click', function () {
    showQuote((quoteIndex + 1) % quotes.length);
  });

  showQuote(0);

  /* ---------- Confetti ---------- */
  const confettiCanvas = document.getElementById('confetti');
  const cctx = confettiCanvas.getContext('2d');
  let pieces = [];
  let confettiRunning = false;

  function resizeConfetti() {
    confettiCanvas.width = window.innerWidth;
    confettiCanvas.height = window.innerHeight;
  }

  resizeConfetti();
  window.addEventListener('resize', resizeConfetti);

  function launchConfetti() {
    if (confettiRunning) return;
    confettiRunning = true;

    pieces = [];
    for (let i = 0; i < 200; i++) {
      pieces.push({
        x: Math.random() * confettiCanvas.width,
        y: -20 - Math.random() * 100,
        w: 5 + Math.random() * 7,
        h: 3 + Math.random() * 5,
        sx: (Math.random() - 0.5) * 3,
        sy: 2 + Math.random() * 3,
        r: Math.random() * 360,
        rs: (Math.random() - 0.5) * 10,
        hue: Math.random() * 360,
        sat: 70 + Math.random() * 30,
        lit: 50 + Math.random() * 30,
        op: 0.7 + Math.random() * 0.3,
        grav: 0.03 + Math.random() * 0.05,
        drift: (Math.random() - 0.5) * 0.02,
      });
    }

    animateConfetti();
  }

  function animateConfetti() {
    cctx.clearRect(0, 0, confettiCanvas.width, confettiCanvas.height);

    for (let i = pieces.length - 1; i >= 0; i--) {
      const p = pieces[i];
      p.sy += p.grav;
      p.x += p.sx + p.drift;
      p.y += p.sy;
      p.r += p.rs;

      cctx.save();
      cctx.translate(p.x, p.y);
      cctx.rotate((p.r * Math.PI) / 180);
      cctx.globalAlpha = p.op;
      cctx.fillStyle = 'hsl(' + p.hue + ',' + p.sat + '%,' + p.lit + '%)';
      cctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
      cctx.restore();

      if (p.y > confettiCanvas.height + 50) {
        pieces.splice(i, 1);
      }
    }

    if (pieces.length > 0) {
      requestAnimationFrame(animateConfetti);
    } else {
      confettiRunning = false;
    }
  }

  document.getElementById('confettiBtn').addEventListener('click', launchConfetti);

  /* ---------- Audio ---------- */
  let audioCtx = null;

  function getAudio() {
    if (!audioCtx) {
      audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
    return audioCtx;
  }

  function playTick() {
    try {
      const ctx = getAudio();
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.connect(g);
      g.connect(ctx.destination);
      o.type = 'sine';
      o.frequency.setValueAtTime(800, ctx.currentTime);
      o.frequency.exponentialRampToValueAtTime(300, ctx.currentTime + 0.1);
      g.gain.setValueAtTime(0.03, ctx.currentTime);
      g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.12);
      o.start(ctx.currentTime);
      o.stop(ctx.currentTime + 0.12);
    } catch (e) {}
  }

  function playCelebrate() {
    try {
      const ctx = getAudio();
      const notes = [523, 659, 784, 1047];
      for (let i = 0; i < notes.length; i++) {
        const o = ctx.createOscillator();
        const g = ctx.createGain();
        o.connect(g);
        g.connect(ctx.destination);
        o.type = 'sine';
        o.frequency.setValueAtTime(notes[i], ctx.currentTime + i * 0.1);
        g.gain.setValueAtTime(0.03, ctx.currentTime + i * 0.1);
        g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + i * 0.1 + 0.25);
        o.start(ctx.currentTime + i * 0.1);
        o.stop(ctx.currentTime + i * 0.1 + 0.25);
      }
    } catch (e) {}
  }

  slider.addEventListener('input', playTick);
  document.getElementById('confettiBtn').addEventListener('click', playCelebrate);

  document.addEventListener('click', getAudio, { once: true });
  document.addEventListener('touchstart', getAudio, { once: true });

  /* ---------- Nav links smooth scroll ---------- */
  const navLinks = document.querySelectorAll('.nav-links a, .hero-btn, .hero-link');

  for (const link of navLinks) {
    link.addEventListener('click', function (e) {
      const href = this.getAttribute('href');
      if (href && href.startsWith('#')) {
        e.preventDefault();
        const target = document.querySelector(href);
        if (target) {
          target.scrollIntoView({ behavior: 'smooth' });
        }
      }
    });
  }
})();
