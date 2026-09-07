/**
 * Baiba Clock — "Since We Met"
 * Relativistic Chronometer anchored to August 26, 2026.
 * 
 * Math & Philosophy:
 * - Origin: August 26, 2026 00:00:00 Local
 * - Dilation Anchors:
 *     1.0× (Real Time)
 *     2.6× (Perceptual Drift)
 *     7.0× (Our Time: 1 Day = 1 Week)
 * - Reverse Dilated Arrival: September 11, 2026 20:36:00 Local
 * - Visual Minimalism: Showing abstract concepts of reality through graphics,
 *   symbols, and numerals without explanatory text.
 */

(function() {
  'use strict';

  // --- Constants & Config ---
  const ORIGIN_DATE = new Date(2026, 7, 26, 0, 0, 0); // Month 7 is August (0-indexed)
  const ARRIVAL_DATE = new Date(2026, 8, 11, 20, 36, 0); // Month 8 is September
  const DEPARTURE_DATE = new Date(2026, 8, 11, 15, 47, 0);
  const SECONDS_PER_DAY = 86400;
  const DAYS_PER_YEAR = 365.2425;
  const SECONDS_PER_YEAR = DAYS_PER_YEAR * SECONDS_PER_DAY;

  // Anchor Ratios
  const RATIO_REAL = 1.0;
  const RATIO_MID = Math.sqrt(7.0); // ~2.64575
  const RATIO_MAX = 7.0; // 1 real day = 1 subjective week

  // State
  const state = {
    sliderValue: 0.0,
    isPaused: false,
    viewMode: 'chrono',
    simulatedDays: null,
    timeWarpActive: false,
    pausedTimeMicros: 0,
    pauseStartedAt: 0,
    lastFramePerf: performance.now(),
  };

  // Section 1 DOM Elements ("Since We Met")
  const slider = document.getElementById('distortionSlider');
  const sliderProgress = document.getElementById('sliderProgress');
  const sliderBadge = document.getElementById('sliderValueBadge');

  // Digit Elements (Clock 1)
  const valYears = document.getElementById('valYears');
  const valDays = document.getElementById('valDays');
  const valHours = document.getElementById('valHours');
  const valMinutes = document.getElementById('valMinutes');
  const valSeconds = document.getElementById('valSeconds');
  const valMillis = document.getElementById('valMillis');
  const valMicros = document.getElementById('valMicros');

  // Views & Controls
  const chronoView = document.getElementById('chronoView');
  const binsView = document.getElementById('binsView');
  const binsGrid = document.getElementById('binsGrid');
  const btnToggleView = document.getElementById('btnToggleView');
  const btnPauseResume = document.getElementById('btnPauseResume');
  const btnTimeWarpModal = document.getElementById('btnTimeWarpModal');
  const btnCloseWarp = document.getElementById('btnCloseWarp');
  const warpModal = document.getElementById('warpModal');
  const warpDaysSlider = document.getElementById('warpDaysSlider');
  const warpDaysVal = document.getElementById('warpDaysVal');
  const btnResetToLive = document.getElementById('btnResetToLive');

  // Presets
  const btnPresetReal = document.getElementById('btnPresetReal');
  const btnPresetWeek = document.getElementById('btnPresetWeek');
  const btnPresetOur = document.getElementById('btnPresetOur');

  // Section 2 DOM Elements (Reverse Countdown: "Nearness")
  const countYears = document.getElementById('countYears');
  const countDays = document.getElementById('countDays');
  const countHours = document.getElementById('countHours');
  const countMinutes = document.getElementById('countMinutes');
  const countSeconds = document.getElementById('countSeconds');
  const countMillis = document.getElementById('countMillis');
  const countMicros = document.getElementById('countMicros');
  const arrivalBanner = document.getElementById('arrivalBanner');
  const countdownView = document.getElementById('countdownView');

  // Section 2 Controls (Nearness Slider & Presets)
  const sliderCountdown = document.getElementById('distortionSliderCountdown');
  const sliderProgressCountdown = document.getElementById('sliderProgressCountdown');
  const sliderBadgeCountdown = document.getElementById('sliderValueBadgeCountdown');
  const btnPresetRealCountdown = document.getElementById('btnPresetRealCountdown');
  const btnPresetWeekCountdown = document.getElementById('btnPresetWeekCountdown');
  const btnPresetOurCountdown = document.getElementById('btnPresetOurCountdown');

  // Canvases
  const farmCanvas = document.getElementById('farmCanvas');
  const ctx = farmCanvas.getContext('2d');
  const trainTrackCanvas = document.getElementById('trainTrackCanvas');
  const trackCtx = trainTrackCanvas ? trainTrackCanvas.getContext('2d') : null;

  // =========================================================================
  // Math: Calculate Subjective Perceived Time
  // =========================================================================

  function getEffectiveRatio(alpha) {
    if (alpha <= 0.0001) return 1.0;
    if (alpha >= 0.9999) return RATIO_MAX;
    return Math.pow(RATIO_MAX, alpha);
  }

  function calculatePerceivedMicros(realMicros, alpha) {
    if (realMicros <= 0) return 0;
    if (alpha <= 0.0001) return realMicros;
    const effectiveRatio = getEffectiveRatio(alpha);
    return realMicros * effectiveRatio;
  }

  function decomposeMicros(totalMicros) {
    const totalSeconds = totalMicros / 1e6;
    const years = Math.floor(totalSeconds / SECONDS_PER_YEAR);
    const remSecondsAfterYears = totalSeconds - (years * SECONDS_PER_YEAR);

    const days = Math.floor(remSecondsAfterYears / SECONDS_PER_DAY);
    const remSecondsAfterDays = remSecondsAfterYears - (days * SECONDS_PER_DAY);

    const hours = Math.floor(remSecondsAfterDays / 3600);
    const remSecondsAfterHours = remSecondsAfterDays - (hours * 3600);

    const minutes = Math.floor(remSecondsAfterHours / 60);
    const seconds = Math.floor(remSecondsAfterHours - (minutes * 60));

    const subSecondMicros = Math.floor(totalMicros % 1e6);
    const millis = Math.floor(subSecondMicros / 1000);
    const micros = Math.floor(subSecondMicros % 1000);

    return { years, days, hours, minutes, seconds, millis, micros };
  }

  // =========================================================================
  // Base-10 Decadic Bins (Powers of 10)
  // =========================================================================

  const DECADE_LABELS = [
    { power: 0,  name: '1 µs' },
    { power: 1,  name: '10 µs' },
    { power: 2,  name: '100 µs' },
    { power: 3,  name: '1 ms' },
    { power: 4,  name: '10 ms' },
    { power: 5,  name: '100 ms' },
    { power: 6,  name: '1 s' },
    { power: 7,  name: '10 s' },
    { power: 8,  name: '100 s' },
    { power: 9,  name: '1 ks' },
    { power: 10, name: '10 ks' },
    { power: 11, name: '100 ks' },
    { power: 12, name: '1 Ms' },
    { power: 13, name: '10 Ms' },
  ];

  const binElements = {};

  function initBinsGrid() {
    binsGrid.innerHTML = '';
    for (let i = DECADE_LABELS.length - 1; i >= 0; i--) {
      const item = DECADE_LABELS[i];
      const cell = document.createElement('div');
      cell.className = 'bin-cell';
      cell.id = `bin-${item.power}`;

      const digitSpan = document.createElement('div');
      digitSpan.className = 'bin-digit';
      digitSpan.textContent = '0';

      const powerSpan = document.createElement('div');
      powerSpan.className = 'bin-power';
      powerSpan.textContent = `10^${item.power}`;

      const nameSpan = document.createElement('div');
      nameSpan.className = 'bin-unit-name';
      nameSpan.textContent = item.name;

      cell.appendChild(digitSpan);
      cell.appendChild(powerSpan);
      cell.appendChild(nameSpan);
      binsGrid.appendChild(cell);

      binElements[item.power] = { cell, digitSpan };
    }
  }

  function updateBinsGrid(totalMicros) {
    let significantSeen = false;
    for (let p = DECADE_LABELS.length - 1; p >= 0; p--) {
      const divisor = Math.pow(10, p);
      const digit = Math.floor(totalMicros / divisor) % 10;
      
      const el = binElements[p];
      if (el) {
        el.digitSpan.textContent = digit;
        if (digit > 0 || significantSeen || p <= 6) {
          significantSeen = true;
          el.cell.classList.add('active-decade');
        } else {
          el.cell.classList.remove('active-decade');
        }
      }
    }
  }

  // =========================================================================
  // UI & Formatting
  // =========================================================================

  function pad(num, size) {
    let s = num + '';
    while (s.length < size) s = '0' + s;
    return s;
  }

  function updateHeaderAndLabels(alpha, realDays, effectiveRatio) {
    const badgeText = `${effectiveRatio.toFixed(1)}×`;
    if (sliderBadge) sliderBadge.textContent = badgeText;
    if (sliderBadgeCountdown) sliderBadgeCountdown.textContent = badgeText;

    // Presets Active State (both top and bottom cards stay in sync)
    const isReal = alpha < 0.25;
    const isWeek = alpha >= 0.25 && alpha < 0.75;
    const isOur = alpha >= 0.75;

    if (btnPresetReal) btnPresetReal.classList.toggle('active', isReal);
    if (btnPresetWeek) btnPresetWeek.classList.toggle('active', isWeek);
    if (btnPresetOur) btnPresetOur.classList.toggle('active', isOur);

    if (btnPresetRealCountdown) btnPresetRealCountdown.classList.toggle('active', isReal);
    if (btnPresetWeekCountdown) btnPresetWeekCountdown.classList.toggle('active', isWeek);
    if (btnPresetOurCountdown) btnPresetOurCountdown.classList.toggle('active', isOur);
  }

  // =========================================================================
  // Canvas Particle & Pastoral Farm Engine (Bright Theme)
  // =========================================================================

  let width = 0;
  let height = 0;

  let trackCanvasWidth = 600;
  let trackCanvasHeight = 48;

  function resizeCanvases() {
    width = window.innerWidth;
    height = window.innerHeight;

    farmCanvas.width = width * window.devicePixelRatio;
    farmCanvas.height = height * window.devicePixelRatio;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.scale(window.devicePixelRatio, window.devicePixelRatio);

    if (trainTrackCanvas && trainTrackCanvas.parentElement) {
      const rect = trainTrackCanvas.parentElement.getBoundingClientRect();
      trackCanvasWidth = Math.max(200, rect.width);
      trackCanvasHeight = 48;
      trainTrackCanvas.width = trackCanvasWidth * window.devicePixelRatio;
      trainTrackCanvas.height = trackCanvasHeight * window.devicePixelRatio;
      if (trackCtx) {
        trackCtx.setTransform(1, 0, 0, 1, 0, 0);
        trackCtx.scale(window.devicePixelRatio, window.devicePixelRatio);
      }
    }
  }
  window.addEventListener('resize', resizeCanvases);

  let horizonPhase = 0;
  let animTime = 0;

  // 1. Subtle Nature Flecks (Rye chaff & soft particles)
  const FLECKS_COUNT = 45;
  const flecks = [];

  for (let i = 0; i < FLECKS_COUNT; i++) {
    flecks.push({
      x: Math.random() * 2000,
      y: Math.random() * 1200,
      length: 3 + Math.random() * 5,
      width: 0.8 + Math.random() * 1.2,
      angle: Math.random() * Math.PI * 2,
      rotationSpeed: (Math.random() - 0.5) * 0.02,
      vx: 0.2 + Math.random() * 0.35,
      vy: 0.1 + Math.random() * 0.25,
      opacity: 0.08 + Math.random() * 0.12,
      hue: Math.random() > 0.4 ? 'ink' : 'rye',
    });
  }

  // 2. Surreal Farm Animals (2 Goats, 3 Dogs including 1 Golden, 4 Cats)
  class SurrealAnimal {
    constructor(type, index, totalOfKind, colorScheme = 'ink', customBaseY = null) {
      this.type = type;
      this.index = index;
      this.colorScheme = colorScheme;
      this.x = (index / totalOfKind) * 1200 + Math.random() * 200;
      this.baseY = customBaseY !== null ? customBaseY : (colorScheme === 'golden' ? 0.85 : (0.60 + (index % 3) * 0.10));
      this.phase = Math.random() * Math.PI * 2;
      this.size = type === 'goat' ? 22 : (type === 'dog' ? (colorScheme === 'golden' ? 21 : 18) : 13);
      this.baseSpeed = type === 'dog' ? (colorScheme === 'golden' ? 1.48 : 1.52) : (type === 'cat' ? 1.1 : 0.9);
      this.stride = Math.random() * Math.PI * 2;
      this.trail = [];
    }

    update(speedMultiplier, canvasWidth, canvasHeight) {
      const effectiveSpeed = this.baseSpeed * speedMultiplier;
      this.x += effectiveSpeed;
      this.stride += 0.12 * speedMultiplier;

      if (this.x > canvasWidth + 80) {
        this.x = -80;
        this.trail = [];
      }

      const currentY = canvasHeight * this.baseY + Math.sin(this.x * 0.004 + this.phase) * 16;

      this.trail.push({ x: this.x, y: currentY });
      if (this.trail.length > Math.min(18, Math.floor(4 + speedMultiplier * 2.5))) {
        this.trail.shift();
      }

      return currentY;
    }

    draw(ctx, y, speedMultiplier, distortionAlpha) {
      // Relativistic motion trail
      if (distortionAlpha > 0.15 && this.trail.length > 1) {
        ctx.save();
        for (let i = 0; i < this.trail.length - 1; i++) {
          const pt = this.trail[i];
          const trailFade = (i / this.trail.length) * (distortionAlpha * 0.35);
          ctx.strokeStyle = this.colorScheme === 'golden'
            ? `rgba(217, 119, 6, ${trailFade * 0.85})`
            : `rgba(15, 23, 42, ${trailFade * 0.45})`;
          ctx.lineWidth = 1.0;
          ctx.beginPath();
          ctx.arc(pt.x, pt.y, this.size * 0.45, 0, Math.PI * 2);
          ctx.stroke();
        }
        ctx.restore();
      }

      // Relativistic Stretch
      ctx.save();
      ctx.translate(this.x, y);

      const stretchX = 1.0 + distortionAlpha * 0.35;
      ctx.scale(stretchX, 1.0);

      // Calligraphic ink silhouettes for Bright Theme
      let bodyColor, limbColor;
      if (this.colorScheme === 'golden') {
        bodyColor = `rgba(217, 119, 6, ${0.82 + distortionAlpha * 0.15})`;
        limbColor = `rgba(180, 83, 9, ${0.75 + distortionAlpha * 0.15})`;
      } else {
        bodyColor = `rgba(30, 41, 59, ${0.68 + distortionAlpha * 0.25})`;
        limbColor = `rgba(15, 23, 42, ${0.58 + distortionAlpha * 0.25})`;
      }

      ctx.fillStyle = bodyColor;
      ctx.strokeStyle = limbColor;
      ctx.lineWidth = 1.5;

      const legCycle = Math.sin(this.stride);
      const legCycle2 = Math.cos(this.stride);

      if (this.type === 'goat') {
        this.drawGoat(ctx, legCycle, legCycle2);
      } else if (this.type === 'dog') {
        this.drawDog(ctx, legCycle, legCycle2);
      } else if (this.type === 'cat') {
        this.drawCat(ctx, legCycle, legCycle2);
      }

      ctx.restore();
    }

    drawGoat(ctx, c1, c2) {
      ctx.beginPath();
      ctx.ellipse(0, 0, this.size, this.size * 0.55, 0.1, 0, Math.PI * 2);
      ctx.fill();

      ctx.beginPath();
      ctx.moveTo(this.size * 0.6, -this.size * 0.2);
      ctx.lineTo(this.size * 1.1, -this.size * 0.85);
      ctx.lineTo(this.size * 1.35, -this.size * 0.7);
      ctx.lineTo(this.size * 0.8, -this.size * 0.1);
      ctx.closePath();
      ctx.fill();

      // Curved Horns
      ctx.beginPath();
      ctx.moveTo(this.size * 1.1, -this.size * 0.85);
      ctx.quadraticCurveTo(this.size * 0.8, -this.size * 1.4, this.size * 0.6, -this.size * 1.1);
      ctx.stroke();

      // Beard
      ctx.beginPath();
      ctx.moveTo(this.size * 1.3, -this.size * 0.6);
      ctx.lineTo(this.size * 1.25, -this.size * 0.35);
      ctx.stroke();

      // Legs
      ctx.beginPath();
      ctx.moveTo(this.size * 0.5, this.size * 0.3);
      ctx.lineTo(this.size * 0.7 + c1 * 8, this.size * 1.2);
      ctx.moveTo(this.size * 0.3, this.size * 0.3);
      ctx.lineTo(this.size * 0.4 - c1 * 8, this.size * 1.2);

      ctx.moveTo(-this.size * 0.6, this.size * 0.3);
      ctx.lineTo(-this.size * 0.8 + c2 * 8, this.size * 1.2);
      ctx.moveTo(-this.size * 0.4, this.size * 0.3);
      ctx.lineTo(-this.size * 0.4 - c2 * 8, this.size * 1.2);
      ctx.stroke();
    }

    drawDog(ctx, c1, c2) {
      ctx.beginPath();
      ctx.ellipse(0, 0, this.size * 1.1, this.size * 0.5, -0.05, 0, Math.PI * 2);
      ctx.fill();

      ctx.beginPath();
      ctx.arc(this.size * 0.9, -this.size * 0.45, this.size * 0.42, 0, Math.PI * 2);
      ctx.fill();

      // Snout
      ctx.beginPath();
      ctx.moveTo(this.size * 1.1, -this.size * 0.5);
      ctx.lineTo(this.size * 1.5, -this.size * 0.3);
      ctx.lineTo(this.size * 1.1, -this.size * 0.2);
      ctx.closePath();
      ctx.fill();

      // Wagging Tail
      ctx.beginPath();
      ctx.moveTo(-this.size * 0.9, 0);
      ctx.quadraticCurveTo(-this.size * 1.4, -this.size * 0.6 + c1 * 4, -this.size * 1.2, -this.size * 0.9);
      ctx.stroke();

      // Legs
      ctx.beginPath();
      ctx.moveTo(this.size * 0.7, this.size * 0.2);
      ctx.lineTo(this.size * 0.9 + c1 * 9, this.size * 0.95);
      ctx.moveTo(this.size * 0.5, this.size * 0.2);
      ctx.lineTo(this.size * 0.7 - c1 * 8, this.size * 0.95);

      ctx.moveTo(-this.size * 0.7, this.size * 0.1);
      ctx.lineTo(-this.size * 0.9 + c2 * 9, this.size * 0.95);
      ctx.moveTo(-this.size * 0.5, this.size * 0.1);
      ctx.lineTo(-this.size * 0.5 - c2 * 9, this.size * 0.95);
      ctx.stroke();
    }

    drawCat(ctx, c1, c2) {
      ctx.beginPath();
      ctx.ellipse(0, 0, this.size * 0.9, this.size * 0.48, 0, 0, Math.PI * 2);
      ctx.fill();

      ctx.beginPath();
      ctx.arc(this.size * 1.0, -this.size * 0.35, this.size * 0.38, 0, Math.PI * 2);
      ctx.fill();

      ctx.beginPath();
      ctx.moveTo(this.size * 0.9, -this.size * 0.65);
      ctx.lineTo(this.size * 0.98, -this.size * 0.95);
      ctx.lineTo(this.size * 1.15, -this.size * 0.65);
      ctx.fill();

      ctx.beginPath();
      ctx.moveTo(-this.size * 0.85, 0);
      ctx.bezierCurveTo(-this.size * 1.4, -this.size * 0.5, -this.size * 1.2, -this.size * 1.1 + c1 * 3, -this.size * 1.5, -this.size * 1.1);
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(this.size * 0.5, this.size * 0.25);
      ctx.lineTo(this.size * 0.6 + c1 * 6, this.size * 0.85);
      ctx.moveTo(this.size * 0.35, this.size * 0.25);
      ctx.lineTo(this.size * 0.45 - c1 * 6, this.size * 0.85);

      ctx.moveTo(-this.size * 0.5, this.size * 0.2);
      ctx.lineTo(-this.size * 0.6 + c2 * 6, this.size * 0.85);
      ctx.moveTo(-this.size * 0.35, this.size * 0.2);
      ctx.lineTo(-this.size * 0.35 - c2 * 6, this.size * 0.85);
      ctx.stroke();
    }
  }

  // Soaring Birds in Upper Sky
  class SurrealBird {
    constructor(index) {
      this.x = Math.random() * 1200;
      this.yRatio = 0.08 + (index * 0.04) + Math.random() * 0.03;
      this.speed = 1.2 + Math.random() * 0.6;
      this.size = 5.5 + Math.random() * 2.5;
      this.wingPhase = Math.random() * Math.PI * 2;
    }

    update(dt, speedMult, canvasWidth) {
      this.x += this.speed * speedMult * 1.5;
      this.wingPhase += 0.15 * speedMult;
      if (this.x > canvasWidth + 50) {
        this.x = -50;
      }
    }

    draw(ctx, canvasHeight) {
      const birdY = canvasHeight * this.yRatio + Math.sin(this.x * 0.005) * 8;
      const wingY = Math.sin(this.wingPhase) * (this.size * 0.65);
      ctx.save();
      ctx.strokeStyle = 'rgba(15, 23, 42, 0.72)';
      ctx.lineWidth = 1.4;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(this.x - this.size, birdY - wingY);
      ctx.quadraticCurveTo(this.x - this.size * 0.35, birdY + wingY * 0.3, this.x, birdY);
      ctx.quadraticCurveTo(this.x + this.size * 0.35, birdY + wingY * 0.3, this.x + this.size, birdY - wingY);
      ctx.stroke();
      ctx.restore();
    }
  }

  const surrealBirds = [
    new SurrealBird(0),
    new SurrealBird(1),
    new SurrealBird(2),
    new SurrealBird(3),
    new SurrealBird(4),
  ];

  const surrealAnimals = [
    new SurrealAnimal('goat', 0, 2, 'ink', 0.44),
    new SurrealAnimal('goat', 1, 2, 'ink', 0.76),
    new SurrealAnimal('dog', 0, 3, 'ink', 0.48),
    new SurrealAnimal('dog', 1, 3, 'ink', 0.88),
    new SurrealAnimal('dog', 2, 3, 'golden', 0.85),
    new SurrealAnimal('cat', 0, 4, 'ink', 0.42),
    new SurrealAnimal('cat', 1, 4, 'ink', 0.62),
    new SurrealAnimal('cat', 2, 4, 'ink', 0.80),
    new SurrealAnimal('cat', 3, 4, 'ink', 0.92),
  ];

  // 3. Seasonal Birch Trees & Rye Flora
  const fallingLeaves = [];

  function spawnFallingLeaf(x, y, color) {
    if (fallingLeaves.length > 80) return;
    fallingLeaves.push({
      x: x,
      y: y,
      vx: 0.4 + Math.random() * 0.8,
      vy: 0.3 + Math.random() * 0.7,
      angle: Math.random() * Math.PI * 2,
      vAngle: (Math.random() - 0.5) * 0.05,
      size: 1.8 + Math.random() * 2.2,
      life: 1.0,
      decay: 0.003 + Math.random() * 0.005,
      color: color,
    });
  }

  class SurrealTree {
    constructor(xRatio, maxHeight, phaseOffset = 0) {
      this.xRatio = xRatio;
      this.maxHeight = maxHeight;
      this.phaseOffset = phaseOffset;
      this.swayPhase = Math.random() * Math.PI * 2;
      this.branches = [
        { heightRatio: 0.38, lengthRatio: 0.32, angle: -0.55, subRatio: 0.5 },
        { heightRatio: 0.52, lengthRatio: 0.38, angle: 0.50, subRatio: 0.55 },
        { heightRatio: 0.68, lengthRatio: 0.34, angle: -0.45, subRatio: 0.45 },
        { heightRatio: 0.82, lengthRatio: 0.28, angle: 0.40, subRatio: 0.4 },
      ];
    }

    update(dt, seasonalSpeed) {
      this.phaseOffset = (this.phaseOffset + dt * 0.008 * seasonalSpeed) % 1.0;
    }

    draw(ctx, groundX, groundY, distortionAlpha, animTime) {
      const s = this.phaseOffset;
      let growthProgress, leafDensity, leafColor, treeAlpha;

      if (s < 0.25) {
        // Spring
        const sprP = s / 0.25;
        growthProgress = 0.4 + sprP * 0.6;
        leafDensity = sprP;
        leafColor = `rgba(16, 185, 129, ${0.6 + sprP * 0.3})`;
        treeAlpha = 0.85;
      } else if (s < 0.52) {
        // Summer
        growthProgress = 1.0;
        leafDensity = 1.0;
        leafColor = 'rgba(5, 150, 105, 0.85)';
        treeAlpha = 0.90;
      } else if (s < 0.78) {
        // Autumn
        growthProgress = 1.0;
        const autP = (s - 0.52) / 0.26;
        leafDensity = Math.max(0, 1.0 - autP * 1.1);
        const r = Math.round(217 + autP * 30);
        const g = Math.round(119 - autP * 40);
        const b = 6;
        leafColor = `rgba(${r}, ${g}, ${b}, ${0.85 - autP * 0.2})`;
        treeAlpha = 0.85;

        if (Math.random() < (0.20 + distortionAlpha * 0.25) && leafDensity > 0.04) {
          spawnFallingLeaf(groundX + (Math.random() - 0.5) * 50, groundY - this.maxHeight * (0.5 + Math.random() * 0.4), leafColor);
        }
      } else {
        // Winter
        growthProgress = 1.0;
        leafDensity = 0.0;
        treeAlpha = 0.75;
      }

      const currentHeight = this.maxHeight * Math.max(0.05, growthProgress);
      const sway = Math.sin(animTime * 1.8 + this.swayPhase) * (5 + distortionAlpha * 5);

      ctx.save();
      ctx.translate(groundX, groundY);

      // Ink Birch Trunk for Bright Theme
      ctx.beginPath();
      ctx.moveTo(0, 0);
      const ctrlX = sway * 0.4;
      const ctrlY = -currentHeight * 0.5;
      const topX = sway;
      const topY = -currentHeight;
      ctx.quadraticCurveTo(ctrlX, ctrlY, topX, topY);
      ctx.strokeStyle = `rgba(51, 65, 85, ${treeAlpha})`;
      ctx.lineWidth = Math.max(1.2, 2.6 * growthProgress);
      ctx.lineCap = 'round';
      ctx.stroke();

      // Lenticels
      if (growthProgress > 0.35) {
        ctx.strokeStyle = `rgba(148, 163, 184, ${0.6 * treeAlpha})`;
        ctx.lineWidth = 1.0;
        const lenticelCount = Math.floor(currentHeight / 18);
        for (let k = 1; k < lenticelCount; k++) {
          const tFrac = k / lenticelCount;
          const lx = 2 * (1 - tFrac) * tFrac * ctrlX + tFrac * tFrac * topX;
          const ly = 2 * (1 - tFrac) * tFrac * ctrlY + tFrac * tFrac * topY;
          ctx.beginPath();
          ctx.moveTo(lx - 2.5, ly);
          ctx.lineTo(lx + 2.5, ly);
          ctx.stroke();
        }
      }

      // Branches & Leaves
      for (let i = 0; i < this.branches.length; i++) {
        const br = this.branches[i];
        if (growthProgress < br.heightRatio * 0.9) continue;

        const tFrac = br.heightRatio;
        const bx = 2 * (1 - tFrac) * tFrac * ctrlX + tFrac * tFrac * topX;
        const by = 2 * (1 - tFrac) * tFrac * ctrlY + tFrac * tFrac * topY;

        const branchLen = br.lengthRatio * currentHeight;
        const bSway = Math.sin(animTime * 2.2 + this.swayPhase + i) * 3;
        const endX = bx + Math.sin(br.angle) * branchLen + bSway;
        const endY = by - Math.cos(br.angle) * branchLen;

        ctx.strokeStyle = `rgba(71, 85, 105, ${treeAlpha * 0.85})`;
        ctx.lineWidth = Math.max(0.8, 1.4 * growthProgress);
        ctx.beginPath();
        ctx.moveTo(bx, by);
        ctx.quadraticCurveTo((bx + endX) / 2 + bSway, (by + endY) / 2, endX, endY);
        ctx.stroke();

        const subEndX = bx + (endX - bx) * br.subRatio + Math.sin(br.angle + 0.3) * (branchLen * 0.45);
        const subEndY = by + (endY - by) * br.subRatio - Math.cos(br.angle + 0.3) * (branchLen * 0.45);
        ctx.beginPath();
        ctx.moveTo(bx + (endX - bx) * br.subRatio, by + (endY - by) * br.subRatio);
        ctx.lineTo(subEndX, subEndY);
        ctx.stroke();

        if (leafDensity > 0.02) {
          ctx.fillStyle = leafColor;
          const leafScale = leafDensity * (0.85 + Math.sin(animTime * 3.0 + i) * 0.15);

          ctx.beginPath();
          ctx.arc(endX, endY, 3.8 * leafScale, 0, Math.PI * 2);
          ctx.fill();

          ctx.beginPath();
          ctx.arc(bx + (endX - bx) * 0.65, by + (endY - by) * 0.65 - 2, 3.0 * leafScale, 0, Math.PI * 2);
          ctx.fill();

          ctx.beginPath();
          ctx.arc(subEndX, subEndY, 3.2 * leafScale, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      ctx.restore();
    }
  }

  class SurrealPlant {
    constructor(xRatio, maxHeight, phaseOffset = 0, type = 'rye') {
      this.xRatio = xRatio;
      this.maxHeight = maxHeight;
      this.phaseOffset = phaseOffset;
      this.type = type;
      this.swayPhase = Math.random() * Math.PI * 2;
      this.archDirection = Math.random() > 0.5 ? 1 : -1;
    }

    update(dt, seasonalSpeed) {
      this.phaseOffset = (this.phaseOffset + dt * 0.008 * seasonalSpeed) % 1.0;
    }

    draw(ctx, groundX, groundY, distortionAlpha, animTime) {
      const s = this.phaseOffset;
      let growth, plantColor, headColor;

      if (s < 0.25) {
        growth = s / 0.25;
        plantColor = 'rgba(5, 150, 105, 0.7)';
        headColor = 'rgba(16, 185, 129, 0.75)';
      } else if (s < 0.52) {
        growth = 1.0;
        plantColor = 'rgba(4, 120, 87, 0.85)';
        headColor = 'rgba(5, 150, 105, 0.9)';
      } else if (s < 0.78) {
        growth = 1.0;
        const autP = (s - 0.52) / 0.26;
        plantColor = `rgba(217, 119, 6, ${0.85 - autP * 0.2})`;
        headColor = `rgba(245, 158, 11, ${0.9 - autP * 0.2})`;
      } else {
        growth = 1.0;
        const winP = (s - 0.78) / 0.22;
        plantColor = `rgba(148, 163, 184, ${Math.max(0.05, 0.5 - winP * 0.4)})`;
        headColor = `rgba(148, 163, 184, ${Math.max(0.05, 0.45 - winP * 0.4)})`;
      }

      const h = this.maxHeight * Math.max(0.08, growth);
      const sway = Math.sin(animTime * 2.5 + this.swayPhase) * (this.archDirection * 8 + distortionAlpha * 6);

      ctx.save();
      ctx.translate(groundX, groundY);
      ctx.strokeStyle = plantColor;
      ctx.lineWidth = 1.2;
      ctx.lineCap = 'round';

      const tipX = sway + this.archDirection * 12 * growth;
      const tipY = -h;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.quadraticCurveTo(this.archDirection * 8, -h * 0.55, tipX, tipY);
      ctx.stroke();

      if (growth > 0.4) {
        ctx.strokeStyle = headColor;
        ctx.fillStyle = headColor;
        ctx.lineWidth = 0.9;

        const awnCount = 5;
        for (let k = 0; k < awnCount; k++) {
          const awnP = k / (awnCount - 1);
          const ax = tipX * (0.7 + awnP * 0.3);
          const ay = -h * (0.7 + awnP * 0.3);
          const awnSide = (k % 2 === 0 ? 1 : -1);

          ctx.beginPath();
          ctx.moveTo(ax, ay);
          ctx.lineTo(ax + awnSide * 5, ay - 4);
          ctx.stroke();

          ctx.beginPath();
          ctx.arc(ax, ay, 1.2, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      ctx.restore();
    }
  }

  const surrealTrees = [
    new SurrealTree(0.12, 160, 0.10),
    new SurrealTree(0.36, 130, 0.38),
    new SurrealTree(0.66, 175, 0.62),
    new SurrealTree(0.88, 145, 0.86),
  ];

  const surrealPlants = [
    new SurrealPlant(0.06, 45, 0.05, 'rye'),
    new SurrealPlant(0.22, 58, 0.28, 'rye'),
    new SurrealPlant(0.44, 40, 0.45, 'meadow'),
    new SurrealPlant(0.55, 62, 0.65, 'rye'),
    new SurrealPlant(0.74, 48, 0.78, 'meadow'),
    new SurrealPlant(0.82, 54, 0.88, 'rye'),
    new SurrealPlant(0.94, 42, 0.95, 'rye'),
  ];

  function renderAtmosphere(distortionAlpha, dt = 0.016) {
    // 1. Luminous Daylight Sky Gradient
    const skyGrad = ctx.createLinearGradient(0, 0, 0, height);
    skyGrad.addColorStop(0, '#f8fafc');
    skyGrad.addColorStop(0.35, '#f0f9ff');
    skyGrad.addColorStop(0.68, '#fefce8');
    skyGrad.addColorStop(1, '#f1f5f9');
    ctx.fillStyle = skyGrad;
    ctx.fillRect(0, 0, width, height);

    const animalSpeed = 1.0 + Math.pow(distortionAlpha, 1.3) * 1.4;
    const seasonalSpeed = 1.0 + Math.pow(distortionAlpha, 1.3) * 6.0;

    animTime += dt;
    horizonPhase += dt * 0.5 * animalSpeed;

    const horizonY = height * 0.70;

    // 2. Rolling Horizon Hills (Watercolor wash)
    ctx.save();
    // Distant hill
    ctx.fillStyle = 'rgba(226, 232, 240, 0.45)';
    ctx.beginPath();
    ctx.moveTo(0, height);
    ctx.lineTo(0, horizonY - 26);
    for (let x = 0; x <= width; x += 40) {
      const dy = Math.sin(x * 0.002 + horizonPhase * 0.5) * 20;
      ctx.lineTo(x, horizonY - 26 + dy);
    }
    ctx.lineTo(width, height);
    ctx.closePath();
    ctx.fill();

    // Pasture foreground hill
    ctx.fillStyle = 'rgba(241, 245, 249, 0.65)';
    ctx.strokeStyle = `rgba(15, 23, 42, ${0.10 + distortionAlpha * 0.06})`;
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(0, height);
    ctx.lineTo(0, horizonY);
    for (let x = 0; x <= width; x += 35) {
      const dy = Math.sin(x * 0.003 + horizonPhase) * 12;
      ctx.lineTo(x, horizonY + dy);
    }
    ctx.lineTo(width, height);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.restore();

    // 3. Soaring Birds across the upper sky
    for (let i = 0; i < surrealBirds.length; i++) {
      const bird = surrealBirds[i];
      bird.update(dt, animalSpeed, width);
      bird.draw(ctx, height);
    }

    // Trees
    for (let i = 0; i < surrealTrees.length; i++) {
      const tree = surrealTrees[i];
      tree.update(dt, seasonalSpeed);
      const treeX = width * tree.xRatio;
      const dy = Math.sin(treeX * 0.003 + horizonPhase) * 12;
      tree.draw(ctx, treeX, horizonY + dy, distortionAlpha, animTime);
    }

    // Plants
    for (let i = 0; i < surrealPlants.length; i++) {
      const plant = surrealPlants[i];
      plant.update(dt, seasonalSpeed);
      const plantX = width * plant.xRatio;
      const dy = Math.sin(plantX * 0.003 + horizonPhase) * 12;
      plant.draw(ctx, plantX, horizonY + dy + 4, distortionAlpha, animTime);
    }

    // Falling Leaves
    for (let i = fallingLeaves.length - 1; i >= 0; i--) {
      const leaf = fallingLeaves[i];
      leaf.x += leaf.vx * (1.0 + distortionAlpha * 2.0);
      leaf.y += leaf.vy + Math.sin(animTime * 4.0 + leaf.angle) * 0.6;
      leaf.angle += leaf.vAngle;
      leaf.life -= leaf.decay * (1.0 + distortionAlpha * 1.5);

      if (leaf.life <= 0 || leaf.y > height + 20 || leaf.x > width + 40) {
        fallingLeaves.splice(i, 1);
        continue;
      }

      ctx.save();
      ctx.translate(leaf.x, leaf.y);
      ctx.rotate(leaf.angle);
      ctx.fillStyle = leaf.color;
      ctx.globalAlpha = Math.max(0, leaf.life);
      ctx.beginPath();
      ctx.ellipse(0, 0, leaf.size * 1.6, leaf.size * 0.7, 0.2, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
    // Animals
    for (let i = 0; i < surrealAnimals.length; i++) {
      const animal = surrealAnimals[i];
      const y = animal.update(animalSpeed, width, height);
      animal.draw(ctx, y, animalSpeed, distortionAlpha);
    }
  }

  // =========================================================================
  // Section 2: Looping Train Journey Track & Countdown ("Nearness")
  // =========================================================================

  const trainState = {
    progress: 0.15, // 0 = at gondola (left), 1 = at alpine mountains (right)
    direction: 1,   // 1 = moving right to mountains, -1 = moving left to gondola
    pauseTimer: 0,
    wheelAngle: 0,
    smokeParticles: [],
  };

  function renderTrainTrack(alpha, dt, effectiveRatio) {
    if (!trainTrackCanvas || !trackCtx) return;

    const w = trackCanvasWidth;
    const h = trackCanvasHeight;

    trackCtx.clearRect(0, 0, w, h);

    // Speed: starts fast at 1.0x (~2.2s crossing), slows down as slider moves towards 7.0x (~15.5s crossing)
    const tripRate = 0.45 / effectiveRatio;

    if (trainState.pauseTimer > 0) {
      trainState.pauseTimer -= dt;
    } else {
      trainState.progress += trainState.direction * tripRate * dt;
      trainState.wheelAngle += trainState.direction * tripRate * dt * 32;

      if (trainState.progress >= 0.96) {
        trainState.progress = 0.96;
        trainState.direction = -1;
        trainState.pauseTimer = 0.25 + 0.03 * (effectiveRatio - 1.0); // brief turnaround at mountains
      } else if (trainState.progress <= 0.04) {
        trainState.progress = 0.04;
        trainState.direction = 1;
        trainState.pauseTimer = 0.25 + 0.03 * (effectiveRatio - 1.0); // brief turnaround at gondola
      }
    }

    const railY = h * 0.64;

    // 1. Ballast Bed
    trackCtx.fillStyle = 'rgba(226, 232, 240, 0.75)';
    trackCtx.beginPath();
    if (trackCtx.roundRect) {
      trackCtx.roundRect(8, railY - 7, w - 16, 14, 4);
    } else {
      trackCtx.rect(8, railY - 7, w - 16, 14);
    }
    trackCtx.fill();

    // 2. Wooden Sleepers (Ties)
    trackCtx.fillStyle = 'rgba(100, 116, 139, 0.35)';
    for (let x = 14; x <= w - 14; x += 11) {
      trackCtx.fillRect(x, railY - 6, 2.5, 12);
    }

    // 3. Double Steel Rails
    trackCtx.strokeStyle = 'rgba(71, 85, 105, 0.85)';
    trackCtx.lineWidth = 1.4;
    trackCtx.beginPath();
    trackCtx.moveTo(10, railY - 3.5);
    trackCtx.lineTo(w - 10, railY - 3.5);
    trackCtx.moveTo(10, railY + 3.5);
    trackCtx.lineTo(w - 10, railY + 3.5);
    trackCtx.stroke();

    // Metallic highlight
    trackCtx.strokeStyle = 'rgba(255, 255, 255, 0.9)';
    trackCtx.lineWidth = 0.6;
    trackCtx.beginPath();
    trackCtx.moveTo(10, railY - 4);
    trackCtx.lineTo(w - 10, railY - 4);
    trackCtx.stroke();

    // 4. Update & Draw Train Smoke/Puff Particles (scales with train speed)
    const smokeRate = Math.min(0.35, 0.08 + 0.24 * (tripRate / 0.45));
    if (Math.random() < smokeRate && trainState.pauseTimer <= 0) {
      const emitX = 20 + trainState.progress * (w - 40) + (trainState.direction === 1 ? 12 : -12);
      trainState.smokeParticles.push({
        x: emitX,
        y: railY - 14,
        vx: -trainState.direction * (0.2 + 0.25 * (tripRate / 0.45)),
        vy: -0.25 - Math.random() * 0.25,
        r: 1.5 + Math.random() * 1.5,
        life: 1.0,
      });
    }

    for (let i = trainState.smokeParticles.length - 1; i >= 0; i--) {
      const p = trainState.smokeParticles[i];
      p.x += p.vx;
      p.y += p.vy;
      p.r += 0.08;
      p.life -= dt * 1.8;
      if (p.life <= 0) {
        trainState.smokeParticles.splice(i, 1);
        continue;
      }
      trackCtx.fillStyle = `rgba(148, 163, 184, ${p.life * 0.4})`;
      trackCtx.beginPath();
      trackCtx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      trackCtx.fill();
    }

    // 5. Draw Articulated Cartoon Train
    const trainCenterX = 20 + trainState.progress * (w - 40);
    const dir = trainState.direction; // 1 = right, -1 = left

    trackCtx.save();
    trackCtx.translate(trainCenterX, railY);
    if (dir === -1) {
      trackCtx.scale(-1, 1);
    }

    // --- Coach 2 (Rear) ---
    trackCtx.fillStyle = '#ffffff';
    trackCtx.strokeStyle = 'rgba(203, 213, 225, 0.9)';
    trackCtx.lineWidth = 1;
    trackCtx.beginPath();
    if (trackCtx.roundRect) {
      trackCtx.roundRect(-38, -12, 19, 10, 2);
    } else {
      trackCtx.rect(-38, -12, 19, 10);
    }
    trackCtx.fill();
    trackCtx.stroke();
    // Red accent stripe
    trackCtx.fillStyle = '#dc2626';
    trackCtx.fillRect(-38, -5, 19, 2);
    // Coach 2 Windows
    trackCtx.fillStyle = 'rgba(254, 240, 138, 0.95)';
    trackCtx.fillRect(-35, -10, 3.5, 3.5);
    trackCtx.fillRect(-30, -10, 3.5, 3.5);
    trackCtx.fillRect(-25, -10, 3.5, 3.5);
    // Wheels
    trackCtx.fillStyle = '#334155';
    trackCtx.beginPath();
    trackCtx.arc(-34, -1, 1.8, 0, Math.PI * 2);
    trackCtx.arc(-23, -1, 1.8, 0, Math.PI * 2);
    trackCtx.fill();

    // Coupler 1-2
    trackCtx.strokeStyle = '#475569';
    trackCtx.lineWidth = 1.5;
    trackCtx.beginPath();
    trackCtx.moveTo(-19, -6);
    trackCtx.lineTo(-16, -6);
    trackCtx.stroke();

    // --- Coach 1 (Middle) ---
    trackCtx.fillStyle = '#ffffff';
    trackCtx.strokeStyle = 'rgba(203, 213, 225, 0.9)';
    trackCtx.lineWidth = 1;
    trackCtx.beginPath();
    if (trackCtx.roundRect) {
      trackCtx.roundRect(-16, -12, 22, 10, 2);
    } else {
      trackCtx.rect(-16, -12, 22, 10);
    }
    trackCtx.fill();
    trackCtx.stroke();
    // Red accent stripe
    trackCtx.fillStyle = '#dc2626';
    trackCtx.fillRect(-16, -5, 22, 2);
    // Coach 1 Windows
    trackCtx.fillStyle = 'rgba(254, 240, 138, 0.95)';
    trackCtx.fillRect(-13, -10, 4, 3.5);
    trackCtx.fillRect(-7, -10, 4, 3.5);
    trackCtx.fillRect(-1, -10, 4, 3.5);
    // Wheels
    trackCtx.fillStyle = '#334155';
    trackCtx.beginPath();
    trackCtx.arc(-12, -1, 1.8, 0, Math.PI * 2);
    trackCtx.arc(2, -1, 1.8, 0, Math.PI * 2);
    trackCtx.fill();

    // Coupler 2-Locomotive
    trackCtx.strokeStyle = '#475569';
    trackCtx.lineWidth = 1.5;
    trackCtx.beginPath();
    trackCtx.moveTo(6, -6);
    trackCtx.lineTo(9, -6);
    trackCtx.stroke();

    // --- Locomotive (Front Red Bullet) ---
    trackCtx.fillStyle = '#dc2626';
    trackCtx.beginPath();
    trackCtx.moveTo(9, -2);
    trackCtx.lineTo(9, -13);
    trackCtx.lineTo(26, -13);
    trackCtx.quadraticCurveTo(34, -13, 34, -4);
    trackCtx.lineTo(34, -2);
    trackCtx.closePath();
    trackCtx.fill();
    // Roof & white stripe
    trackCtx.fillStyle = '#f8fafc';
    trackCtx.fillRect(9, -14, 18, 1.5);
    trackCtx.fillRect(9, -6, 24, 1.5);
    // Windshield
    trackCtx.fillStyle = '#38bdf8';
    trackCtx.beginPath();
    trackCtx.moveTo(25, -11.5);
    trackCtx.lineTo(31, -11.5);
    trackCtx.lineTo(32, -7.5);
    trackCtx.lineTo(25, -7.5);
    trackCtx.closePath();
    trackCtx.fill();
    // Roof Pantograph
    trackCtx.strokeStyle = '#64748b';
    trackCtx.lineWidth = 1;
    trackCtx.beginPath();
    trackCtx.moveTo(14, -14);
    trackCtx.lineTo(17, -17);
    trackCtx.lineTo(20, -14);
    trackCtx.stroke();
    // Locomotive Wheels
    trackCtx.fillStyle = '#1e293b';
    trackCtx.beginPath();
    trackCtx.arc(14, -1, 2.0, 0, Math.PI * 2);
    trackCtx.arc(24, -1, 2.0, 0, Math.PI * 2);
    trackCtx.arc(30, -1, 2.0, 0, Math.PI * 2);
    trackCtx.fill();

    // Headlight cone & beam
    trackCtx.save();
    const beamGrad = trackCtx.createLinearGradient(34, -6, 58, -6);
    beamGrad.addColorStop(0, 'rgba(254, 240, 138, 0.85)');
    beamGrad.addColorStop(1, 'rgba(254, 240, 138, 0)');
    trackCtx.fillStyle = beamGrad;
    trackCtx.beginPath();
    trackCtx.moveTo(34, -7);
    trackCtx.lineTo(58, -13);
    trackCtx.lineTo(58, 2);
    trackCtx.closePath();
    trackCtx.fill();

    // Headlight bulb
    trackCtx.fillStyle = '#ffffff';
    trackCtx.beginPath();
    trackCtx.arc(34, -6, 1.8, 0, Math.PI * 2);
    trackCtx.fill();
    trackCtx.restore();

    // Rear marker light on Coach 2
    trackCtx.fillStyle = '#ef4444';
    trackCtx.beginPath();
    trackCtx.arc(-38, -8, 1.2, 0, Math.PI * 2);
    trackCtx.fill();

    trackCtx.restore();
  }

  // =========================================================================
  // Section 2: Countdown Chronometer ("Nearness")
  // =========================================================================

  function updateCountdown(alpha, dt) {
    let refNowMs;
    if (state.simulatedDays !== null) {
      refNowMs = ORIGIN_DATE.getTime() + (state.simulatedDays * SECONDS_PER_DAY * 1000);
    } else if (state.isPaused) {
      refNowMs = ORIGIN_DATE.getTime() + (state.pausedTimeMicros / 1000);
    } else {
      refNowMs = Date.now();
    }

    const realRemainingMs = ARRIVAL_DATE.getTime() - refNowMs;
    const effectiveRatio = getEffectiveRatio(alpha);

    if (realRemainingMs <= 0) {
      if (arrivalBanner) arrivalBanner.classList.remove('hidden');
      if (countdownView) countdownView.style.opacity = '0.35';

      if (countYears) countYears.textContent = '00';
      if (countDays) countDays.textContent = '000';
      if (countHours) countHours.textContent = '00';
      if (countMinutes) countMinutes.textContent = '00';
      if (countSeconds) countSeconds.textContent = '00';
      if (countMillis) countMillis.textContent = '000';
      if (countMicros) countMicros.textContent = '000';
      return;
    }

    if (arrivalBanner) arrivalBanner.classList.add('hidden');
    if (countdownView) countdownView.style.opacity = '1.0';

    const subMsFraction = (performance.now() % 1);
    const perceivedRemainingMicros = Math.max(0, ((realRemainingMs + subMsFraction) * 1000) * effectiveRatio);

    const parts = decomposeMicros(perceivedRemainingMicros);

    if (countYears) countYears.textContent = pad(parts.years, 2);
    if (countDays) countDays.textContent = pad(parts.days, 3);
    if (countHours) countHours.textContent = pad(parts.hours, 2);
    if (countMinutes) countMinutes.textContent = pad(parts.minutes, 2);
    if (countSeconds) countSeconds.textContent = pad(parts.seconds, 2);
    if (countMillis) countMillis.textContent = pad(parts.millis, 3);
    if (countMicros) countMicros.textContent = pad(parts.micros, 3);
  }

  // =========================================================================
  // Main Animation & Chronometer Loop
  // =========================================================================

  function mainLoop(now) {
    const dt = (now - state.lastFramePerf) / 1000;
    state.lastFramePerf = now;

    let realElapsedMicros;

    if (state.simulatedDays !== null) {
      realElapsedMicros = state.simulatedDays * SECONDS_PER_DAY * 1e6;
    } else {
      if (state.isPaused) {
        realElapsedMicros = state.pausedTimeMicros;
      } else {
        const liveNowMs = Date.now();
        const originMs = ORIGIN_DATE.getTime();
        const elapsedMs = Math.max(0, liveNowMs - originMs);
        const subMsFraction = (performance.now() % 1);
        realElapsedMicros = (elapsedMs + subMsFraction) * 1000;
      }
    }

    const realDays = realElapsedMicros / (SECONDS_PER_DAY * 1e6);

    const alpha = state.sliderValue;
    const perceivedMicros = calculatePerceivedMicros(realElapsedMicros, alpha);
    const effectiveRatio = realElapsedMicros > 0 ? (perceivedMicros / realElapsedMicros) : 1.0;

    const parts = decomposeMicros(perceivedMicros);

    valYears.textContent = pad(parts.years, 2);
    valDays.textContent = pad(parts.days, 3);
    valHours.textContent = pad(parts.hours, 2);
    valMinutes.textContent = pad(parts.minutes, 2);
    valSeconds.textContent = pad(parts.seconds, 2);
    valMillis.textContent = pad(parts.millis, 3);
    valMicros.textContent = pad(parts.micros, 3);

    if (state.viewMode === 'bins') {
      updateBinsGrid(perceivedMicros);
    }

    updateHeaderAndLabels(alpha, realDays, effectiveRatio);

    renderAtmosphere(alpha, dt);
    updateCountdown(alpha, dt);
    renderTrainTrack(alpha, dt, effectiveRatio);

    requestAnimationFrame(mainLoop);
  }

  // =========================================================================
  // Event Handlers & User Interaction
  function setSliderValue(val) {
    const clamped = Math.max(0, Math.min(1, parseFloat(val)));
    state.sliderValue = clamped;

    if (slider) {
      slider.value = clamped;
      if (sliderProgress) sliderProgress.style.width = `${clamped * 100}%`;
    }
    if (sliderCountdown) {
      sliderCountdown.value = clamped;
      if (sliderProgressCountdown) sliderProgressCountdown.style.width = `${clamped * 100}%`;
    }
  }

  if (slider) {
    slider.addEventListener('input', (e) => {
      setSliderValue(e.target.value);
    });
  }

  if (sliderCountdown) {
    sliderCountdown.addEventListener('input', (e) => {
      setSliderValue(e.target.value);
    });
  }

  // Presets (Pure Numerical Factors) - Section 1
  if (btnPresetReal) btnPresetReal.addEventListener('click', () => setSliderValue(0));
  if (btnPresetWeek) btnPresetWeek.addEventListener('click', () => setSliderValue(0.5));
  if (btnPresetOur) btnPresetOur.addEventListener('click', () => setSliderValue(1.0));

  // Presets (Pure Numerical Factors) - Section 2
  if (btnPresetRealCountdown) btnPresetRealCountdown.addEventListener('click', () => setSliderValue(0));
  if (btnPresetWeekCountdown) btnPresetWeekCountdown.addEventListener('click', () => setSliderValue(0.5));
  if (btnPresetOurCountdown) btnPresetOurCountdown.addEventListener('click', () => setSliderValue(1.0));

  // Toggle View Mode (Chronological vs Base-10 Bins)
  btnToggleView.addEventListener('click', () => {
    if (state.viewMode === 'chrono') {
      state.viewMode = 'bins';
      chronoView.classList.add('hidden');
      binsView.classList.remove('hidden');
      btnToggleView.innerHTML = '<span class="btn-icon">⏱</span>';
    } else {
      state.viewMode = 'chrono';
      binsView.classList.add('hidden');
      chronoView.classList.remove('hidden');
      btnToggleView.innerHTML = '<span class="btn-icon">❖</span>';
    }
  });

  // Pause / Resume
  btnPauseResume.addEventListener('click', () => {
    state.isPaused = !state.isPaused;
    if (state.isPaused) {
      const liveNowMs = Date.now();
      const originMs = ORIGIN_DATE.getTime();
      state.pausedTimeMicros = (liveNowMs - originMs) * 1000;
      btnPauseResume.innerHTML = '<span class="btn-icon">▶</span>';
    } else {
      btnPauseResume.innerHTML = '<span class="btn-icon">⏸</span>';
    }
  });

  // Time Warp Modal
  btnTimeWarpModal.addEventListener('click', () => {
    warpModal.classList.remove('hidden');
  });

  btnCloseWarp.addEventListener('click', () => {
    warpModal.classList.add('hidden');
  });

  warpModal.addEventListener('click', (e) => {
    if (e.target === warpModal) warpModal.classList.add('hidden');
  });

  warpDaysSlider.addEventListener('input', (e) => {
    const d = parseFloat(e.target.value);
    warpDaysVal.textContent = d.toFixed(2);
    state.simulatedDays = d;
  });

  document.querySelectorAll('.warp-chip').forEach(btn => {
    btn.addEventListener('click', () => {
      const days = parseFloat(btn.dataset.days);
      warpDaysSlider.value = days;
      warpDaysVal.textContent = days.toFixed(2);
      state.simulatedDays = days;
    });
  });

  btnResetToLive.addEventListener('click', () => {
    state.simulatedDays = null;
    warpModal.classList.add('hidden');
  });

  // =========================================================================
  // Initialize
  // =========================================================================
  resizeCanvases();
  initBinsGrid();
  setSliderValue(0);

  const initialDays = (Date.now() - ORIGIN_DATE.getTime()) / (SECONDS_PER_DAY * 1000);
  if (initialDays > 0) {
    warpDaysSlider.value = initialDays.toFixed(2);
    warpDaysVal.textContent = initialDays.toFixed(2);
  }

  requestAnimationFrame(mainLoop);

})();
