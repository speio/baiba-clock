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

  // Section 2 DOM Elements (Reverse Countdown)
  const countDays = document.getElementById('countDays');
  const countHours = document.getElementById('countHours');
  const countMinutes = document.getElementById('countMinutes');
  const countSeconds = document.getElementById('countSeconds');
  const countMillis = document.getElementById('countMillis');
  const countMicros = document.getElementById('countMicros');
  const arrivalBanner = document.getElementById('arrivalBanner');
  const countdownView = document.getElementById('countdownView');

  // Background Canvases
  const farmCanvas = document.getElementById('farmCanvas');
  const ctx = farmCanvas.getContext('2d');
  const trainCanvas = document.getElementById('trainCanvas');
  const trainCtx = trainCanvas.getContext('2d');

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
    // Pure numerical factor badge
    sliderBadge.textContent = `${effectiveRatio.toFixed(1)}×`;

    // Presets Active State
    btnPresetReal.classList.toggle('active', alpha < 0.25);
    btnPresetWeek.classList.toggle('active', alpha >= 0.25 && alpha < 0.75);
    btnPresetOur.classList.toggle('active', alpha >= 0.75);
  }

  // =========================================================================
  // Canvas Particle & Pastoral Farm Engine (Bright Theme)
  // =========================================================================

  let width = 0;
  let height = 0;

  function resizeCanvases() {
    width = window.innerWidth;
    height = window.innerHeight;

    farmCanvas.width = width * window.devicePixelRatio;
    farmCanvas.height = height * window.devicePixelRatio;
    ctx.scale(window.devicePixelRatio, window.devicePixelRatio);

    trainCanvas.width = width * window.devicePixelRatio;
    trainCanvas.height = height * window.devicePixelRatio;
    trainCtx.scale(window.devicePixelRatio, window.devicePixelRatio);

    initAlpineRailway();
    updateScrollCanvasBlend();
  }
  window.addEventListener('resize', resizeCanvases);

  function updateScrollCanvasBlend() {
    const scrollY = window.scrollY || window.pageYOffset;
    const vh = window.innerHeight;
    const progress = Math.max(0, Math.min(1, scrollY / (vh * 0.75)));
    farmCanvas.style.opacity = (1 - progress).toFixed(3);
    trainCanvas.style.opacity = progress.toFixed(3);
  }
  window.addEventListener('scroll', updateScrollCanvasBlend, { passive: true });

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
    constructor(type, index, totalOfKind, colorScheme = 'ink') {
      this.type = type;
      this.index = index;
      this.colorScheme = colorScheme;
      this.x = (index / totalOfKind) * 1200 + Math.random() * 200;
      this.baseY = colorScheme === 'golden' ? 0.60 : (0.64 + (index % 3) * 0.08);
      this.phase = Math.random() * Math.PI * 2;
      this.size = type === 'goat' ? 22 : (type === 'dog' ? (colorScheme === 'golden' ? 20 : 18) : 13);
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

      const currentY = canvasHeight * this.baseY + Math.sin(this.x * 0.005 + this.phase) * 35;

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

  const surrealAnimals = [
    new SurrealAnimal('goat', 0, 2),
    new SurrealAnimal('goat', 1, 2),
    new SurrealAnimal('dog', 0, 3, 'ink'),
    new SurrealAnimal('dog', 1, 3, 'ink'),
    new SurrealAnimal('dog', 2, 3, 'golden'),
    new SurrealAnimal('cat', 0, 4),
    new SurrealAnimal('cat', 1, 4),
    new SurrealAnimal('cat', 2, 4),
    new SurrealAnimal('cat', 3, 4),
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
    ctx.clearRect(0, 0, width, height);

    const animalSpeed = 1.0 + Math.pow(distortionAlpha, 1.3) * 1.4;
    const seasonalSpeed = 1.0 + Math.pow(distortionAlpha, 1.3) * 6.0;

    animTime += dt;
    horizonPhase += dt * 0.5 * animalSpeed;

    const horizonY = height * 0.72;

    // Flecks
    for (let i = 0; i < flecks.length; i++) {
      const f = flecks[i];
      f.x += f.vx * (1.0 + distortionAlpha * 1.5);
      f.y += f.vy * (1.0 + distortionAlpha * 1.2);
      f.angle += f.rotationSpeed;

      if (f.x > width + 20) f.x = -20;
      if (f.y > height + 20) f.y = -20;

      ctx.save();
      ctx.translate(f.x, f.y);
      ctx.rotate(f.angle);

      if (f.hue === 'rye') {
        ctx.fillStyle = `rgba(217, 119, 6, ${f.opacity * (1.0 + distortionAlpha * 0.4)})`;
      } else {
        ctx.fillStyle = `rgba(100, 116, 139, ${f.opacity * (1.0 + distortionAlpha * 0.4)})`;
      }

      ctx.fillRect(-f.length / 2, -f.width / 2, f.length, f.width);
      ctx.restore();
    }

    // Pasture horizon line
    ctx.save();
    ctx.strokeStyle = `rgba(15, 23, 42, ${0.08 + distortionAlpha * 0.05})`;
    ctx.lineWidth = 1.0;
    ctx.beginPath();
    ctx.moveTo(0, horizonY);
    for (let x = 0; x <= width; x += 40) {
      const dy = Math.sin(x * 0.003 + horizonPhase) * 12;
      ctx.lineTo(x, horizonY + dy);
    }
    ctx.stroke();
    ctx.restore();

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
  // Section 2: Alpine Canvas Animation (Bright Theme)
  // =========================================================================

  let trackSamples = [];
  let trackTotalLength = 0;
  let trainLeadDistance = 0;
  let alpineStars = [];
  let trainAnimTime = 0;
  let isArrived = false;

  function initAlpineRailway() {
    alpineStars = [];
    const starCount = 65;
    for (let i = 0; i < starCount; i++) {
      alpineStars.push({
        x: Math.random() * width,
        y: Math.random() * (height * 0.58),
        r: 0.5 + Math.random() * 1.2,
        phase: Math.random() * Math.PI * 2,
        speed: 0.6 + Math.random() * 1.8,
      });
    }

    const waypoints = [
      { x: width * 0.04, y: height * 0.88 },
      { x: width * 0.22, y: height * 0.82 },
      { x: width * 0.45, y: height * 0.74 },
      { x: width * 0.72, y: height * 0.65 },
      { x: width * 0.36, y: height * 0.49 },
      { x: width * 0.64, y: height * 0.37 },
      { x: width * 0.82, y: height * 0.27 },
      { x: width * 0.94, y: height * 0.20 },
    ];

    trackSamples = [];
    let cumDist = 0;
    const segments = waypoints.length - 1;
    const stepsPerSegment = 140;
    let prevPoint = null;

    for (let i = 0; i < segments; i++) {
      const p0 = waypoints[Math.max(0, i - 1)];
      const p1 = waypoints[i];
      const p2 = waypoints[i + 1];
      const p3 = waypoints[Math.min(waypoints.length - 1, i + 2)];

      for (let s = 0; s < stepsPerSegment; s++) {
        if (i > 0 && s === 0) continue;
        const t = s / stepsPerSegment;
        const t2 = t * t;
        const t3 = t2 * t;

        const x = 0.5 * (
          (2 * p1.x) +
          (-p0.x + p2.x) * t +
          (2 * p0.x - 5 * p1.x + 4 * p2.x - p3.x) * t2 +
          (-p0.x + 3 * p1.x - 3 * p2.x + p3.x) * t3
        );

        const y = 0.5 * (
          (2 * p1.y) +
          (-p0.y + p2.y) * t +
          (2 * p0.y - 5 * p1.y + 4 * p2.y - p3.y) * t2 +
          (-p0.y + 3 * p1.y - 3 * p2.y + p3.y) * t3
        );

        const dx = 0.5 * (
          (-p0.x + p2.x) +
          (2 * (2 * p0.x - 5 * p1.x + 4 * p2.x - p3.x)) * t +
          (3 * (-p0.x + 3 * p1.x - 3 * p2.x + p3.x)) * t2
        );

        const dy = 0.5 * (
          (-p0.y + p2.y) +
          (2 * (2 * p0.y - 5 * p1.y + 4 * p2.y - p3.y)) * t +
          (3 * (-p0.y + 3 * p1.y - 3 * p2.y + p3.y)) * t2
        );

        const angle = Math.atan2(dy, dx);

        if (prevPoint) {
          const segDist = Math.hypot(x - prevPoint.x, y - prevPoint.y);
          cumDist += segDist;
        }

        const point = { x, y, angle, dist: cumDist };
        trackSamples.push(point);
        prevPoint = point;
      }
    }

    trackTotalLength = cumDist;
  }

  function getTrackPoint(dist) {
    if (trackSamples.length === 0) {
      return { x: 0, y: 0, angle: 0, nx: 0, ny: 1 };
    }

    let d = dist % trackTotalLength;
    if (d < 0) d += trackTotalLength;

    let low = 0;
    let high = trackSamples.length - 1;

    while (low <= high) {
      const mid = (low + high) >> 1;
      if (trackSamples[mid].dist < d) {
        low = mid + 1;
      } else {
        high = mid - 1;
      }
    }

    const idx1 = Math.max(0, Math.min(trackSamples.length - 1, low - 1));
    const idx2 = Math.min(trackSamples.length - 1, idx1 + 1);
    const p1 = trackSamples[idx1];
    const p2 = trackSamples[idx2];
    const span = p2.dist - p1.dist;
    const t = span > 0.0001 ? (d - p1.dist) / span : 0;

    const x = p1.x + (p2.x - p1.x) * t;
    const y = p1.y + (p2.y - p1.y) * t;

    let dAngle = p2.angle - p1.angle;
    while (dAngle > Math.PI) dAngle -= Math.PI * 2;
    while (dAngle < -Math.PI) dAngle += Math.PI * 2;
    const angle = p1.angle + dAngle * t;

    return {
      x,
      y,
      angle,
      nx: -Math.sin(angle),
      ny: Math.cos(angle),
    };
  }

  function drawAlpineSkyAndStars(c, w, h, t) {
    // Crisp, bright Alpine day sky
    const skyGrad = c.createLinearGradient(0, 0, 0, h * 0.85);
    skyGrad.addColorStop(0, '#e0f2fe');
    skyGrad.addColorStop(0.55, '#f0f9ff');
    skyGrad.addColorStop(1, '#f8fafc');
    c.fillStyle = skyGrad;
    c.fillRect(0, 0, w, h);

    // Subtle drifting Alpine light motes
    for (let i = 0; i < alpineStars.length; i++) {
      const s = alpineStars[i];
      const alpha = 0.15 + 0.35 * (0.5 + 0.5 * Math.sin(s.phase + t * s.speed));
      c.fillStyle = `rgba(56, 189, 248, ${alpha.toFixed(2)})`;
      c.beginPath();
      c.arc(s.x, s.y, s.r * 0.9, 0, Math.PI * 2);
      c.fill();
    }

    // Warm golden Alpine morning beacon
    const beaconX = w * 0.86;
    const beaconY = h * 0.08;
    const bGlow = 0.55 + 0.3 * Math.sin(t * 2.2);
    c.fillStyle = `rgba(245, 158, 11, ${bGlow * 0.75})`;
    c.beginPath();
    c.arc(beaconX, beaconY, 3, 0, Math.PI * 2);
    c.fill();

    c.strokeStyle = `rgba(245, 158, 11, ${bGlow * 0.45})`;
    c.lineWidth = 1;
    c.beginPath();
    c.moveTo(beaconX - 8, beaconY);
    c.lineTo(beaconX + 8, beaconY);
    c.moveTo(beaconX, beaconY - 8);
    c.lineTo(beaconX, beaconY + 8);
    c.stroke();
  }

  function drawVeniceLagoon(c, w, h, t) {
    const waterY = h * 0.74;
    const waterW = w * 0.44;

    const waterGrad = c.createLinearGradient(0, waterY, 0, h);
    waterGrad.addColorStop(0, 'rgba(186, 230, 253, 0.4)');
    waterGrad.addColorStop(0.5, 'rgba(125, 211, 252, 0.3)');
    waterGrad.addColorStop(1, 'rgba(56, 189, 248, 0.2)');
    c.fillStyle = waterGrad;
    c.fillRect(0, waterY, waterW, h - waterY);

    c.lineWidth = 1.2;
    for (let r = 0; r < 7; r++) {
      const ry = waterY + 16 + r * 16;
      const rippleWave = Math.sin(t * 1.6 + r * 0.8) * 8;
      const rAlpha = 0.2 + 0.2 * Math.sin(t * 1.4 + r);
      c.strokeStyle = `rgba(2, 132, 199, ${rAlpha})`;
      c.beginPath();
      c.moveTo(10, ry);
      c.bezierCurveTo(
        waterW * 0.25, ry + rippleWave,
        waterW * 0.60, ry - rippleWave,
        waterW * 0.90, ry + 2
      );
      c.stroke();
    }

    // Briccole
    const poleX = w * 0.08;
    const poleBaseY = waterY + 30;
    c.save();
    c.translate(poleX, poleBaseY);

    c.strokeStyle = 'rgba(120, 85, 60, 0.92)';
    c.lineWidth = 3.5;
    c.beginPath();
    c.moveTo(-6, -42);
    c.lineTo(-4, 18);
    c.moveTo(0, -48);
    c.lineTo(0, 18);
    c.moveTo(6, -40);
    c.lineTo(4, 18);
    c.stroke();

    c.strokeStyle = 'rgba(203, 213, 225, 0.85)';
    c.lineWidth = 2;
    c.beginPath();
    c.moveTo(-8, -24);
    c.lineTo(8, -24);
    c.moveTo(-8, -14);
    c.lineTo(8, -14);
    c.stroke();
    c.restore();

    // Floating Venetian Gondola Silhouette with Gondolier & Oar
    const gondolaX = w * 0.15;
    const gondolaBaseY = waterY + 44;
    const bobY = Math.sin(t * 1.3) * 2.5;

    c.save();
    c.translate(gondolaX, gondolaBaseY + bobY);

    c.fillStyle = 'rgba(2, 132, 199, 0.16)';
    c.beginPath();
    c.ellipse(10, 12, 42, 6, 0, 0, Math.PI * 2);
    c.fill();

    c.fillStyle = 'rgba(15, 23, 42, 0.96)';
    c.beginPath();
    c.moveTo(-44, -2);
    c.quadraticCurveTo(-15, 12, 38, 7);
    c.quadraticCurveTo(46, -1, 52, -12);
    c.quadraticCurveTo(42, 5, 28, 6);
    c.quadraticCurveTo(-20, 7, -44, -2);
    c.closePath();
    c.fill();

    c.strokeStyle = 'rgba(15, 23, 42, 0.96)';
    c.lineWidth = 1.5;
    c.beginPath();
    c.moveTo(48, 0);
    c.lineTo(54, -16);
    c.lineTo(51, -18);
    c.stroke();

    const gX = -26;
    const gY = -1;

    c.fillStyle = 'rgba(15, 23, 42, 0.98)';
    c.beginPath();
    c.moveTo(gX - 4, gY);
    c.lineTo(gX - 2, gY - 26);
    c.lineTo(gX + 5, gY - 26);
    c.lineTo(gX + 4, gY);
    c.closePath();
    c.fill();

    c.beginPath();
    c.arc(gX + 1, gY - 30, 4, 0, Math.PI * 2);
    c.fill();

    c.strokeStyle = 'rgba(15, 23, 42, 0.98)';
    c.lineWidth = 1.4;
    c.beginPath();
    c.moveTo(gX - 6, gY - 32);
    c.lineTo(gX + 8, gY - 32);
    c.stroke();

    c.strokeStyle = 'rgba(2, 132, 199, 0.95)';
    c.lineWidth = 1.5;
    c.beginPath();
    c.moveTo(gX - 2, gY - 22);
    c.lineTo(gX + 10, gY - 14);
    c.lineTo(gX + 24, gY + 12);
    c.stroke();

    c.restore();
  }

  function drawAlpineMountains(c, w, h) {
    c.fillStyle = 'rgba(203, 213, 225, 0.35)';
    c.beginPath();
    c.moveTo(w * 0.35, h * 0.65);
    c.lineTo(w * 0.50, h * 0.28);
    c.lineTo(w * 0.62, h * 0.38);
    c.lineTo(w * 0.75, h * 0.22);
    c.lineTo(w * 0.98, h * 0.32);
    c.lineTo(w, h * 0.75);
    c.lineTo(w * 0.35, h * 0.75);
    c.closePath();
    c.fill();

    const p1 = { x: w * 0.56, y: h * 0.16, bx1: w * 0.42, bx2: w * 0.70, by: h * 0.52 };
    drawSingleAlpinePeak(c, p1.x, p1.y, p1.bx1, p1.bx2, p1.by, 0.9);

    const p2 = { x: w * 0.75, y: h * 0.08, bx1: w * 0.58, bx2: w * 0.92, by: h * 0.50 };
    drawSingleAlpinePeak(c, p2.x, p2.y, p2.bx1, p2.bx2, p2.by, 1.0);

    const p3 = { x: w * 0.92, y: h * 0.12, bx1: w * 0.80, bx2: w * 1.05, by: h * 0.46 };
    drawSingleAlpinePeak(c, p3.x, p3.y, p3.bx1, p3.bx2, p3.by, 0.95);

    const pines = [
      { x: w * 0.48, y: h * 0.58, size: 22 },
      { x: w * 0.51, y: h * 0.61, size: 18 },
      { x: w * 0.54, y: h * 0.56, size: 24 },
      { x: w * 0.67, y: h * 0.47, size: 20 },
      { x: w * 0.70, y: h * 0.49, size: 25 },
      { x: w * 0.78, y: h * 0.39, size: 22 },
      { x: w * 0.84, y: h * 0.35, size: 26 },
      { x: w * 0.88, y: h * 0.31, size: 20 },
    ];

    for (let i = 0; i < pines.length; i++) {
      drawAlpinePine(c, pines[i].x, pines[i].y, pines[i].size);
    }

    drawAlpineTerminalStation(c, w * 0.94, h * 0.20);
  }

  function drawSingleAlpinePeak(c, apexX, apexY, baseLeftX, baseRightX, baseY) {
    c.fillStyle = 'rgba(100, 116, 139, 0.45)';
    c.beginPath();
    c.moveTo(apexX, apexY);
    c.lineTo(baseLeftX, baseY);
    c.lineTo(apexX + (baseRightX - apexX) * 0.12, baseY);
    c.closePath();
    c.fill();

    c.fillStyle = 'rgba(148, 163, 184, 0.35)';
    c.beginPath();
    c.moveTo(apexX, apexY);
    c.lineTo(apexX + (baseRightX - apexX) * 0.12, baseY);
    c.lineTo(baseRightX, baseY);
    c.closePath();
    c.fill();

    c.fillStyle = '#ffffff';
    c.strokeStyle = 'rgba(148, 163, 184, 0.4)';
    c.lineWidth = 1.0;
    c.beginPath();
    c.moveTo(apexX, apexY);
    c.lineTo(apexX - (apexX - baseLeftX) * 0.32, apexY + (baseY - apexY) * 0.32);
    c.lineTo(apexX - (apexX - baseLeftX) * 0.18, apexY + (baseY - apexY) * 0.38);
    c.lineTo(apexX + (baseRightX - apexX) * 0.05, apexY + (baseY - apexY) * 0.44);
    c.lineTo(apexX + (baseRightX - apexX) * 0.22, apexY + (baseY - apexY) * 0.35);
    c.lineTo(apexX + (baseRightX - apexX) * 0.34, apexY + (baseY - apexY) * 0.32);
    c.closePath();
    c.fill();
    c.stroke();

    c.strokeStyle = 'rgba(56, 189, 248, 0.75)';
    c.lineWidth = 1.2;
    c.beginPath();
    c.moveTo(apexX, apexY);
    c.lineTo(apexX + (baseRightX - apexX) * 0.05, apexY + (baseY - apexY) * 0.44);
    c.stroke();
  }

  function drawAlpinePine(c, x, y, size) {
    c.save();
    c.translate(x, y);

    c.fillStyle = 'rgba(78, 60, 48, 0.9)';
    c.fillRect(-1.5, 0, 3, size * 0.3);

    c.fillStyle = 'rgba(20, 45, 35, 0.85)';
    c.strokeStyle = 'rgba(255, 255, 255, 0.5)';
    c.lineWidth = 0.8;

    for (let tier = 0; tier < 3; tier++) {
      const tierY = -size * 0.25 * tier;
      const w = size * 0.55 * (1 - tier * 0.22);
      const h = size * 0.42;

      c.beginPath();
      c.moveTo(0, tierY - h);
      c.lineTo(w, tierY);
      c.lineTo(-w, tierY);
      c.closePath();
      c.fill();
      c.stroke();
    }

    c.restore();
  }

  function drawAlpineTerminalStation(c, x, y) {
    c.save();
    c.translate(x, y);

    c.fillStyle = 'rgba(71, 85, 105, 0.95)';
    c.fillRect(-8, -10, 16, 20);

    c.strokeStyle = 'rgba(239, 68, 68, 0.9)';
    c.lineWidth = 2;
    c.beginPath();
    c.moveTo(-6, -8);
    c.lineTo(6, 8);
    c.moveTo(-6, 8);
    c.lineTo(6, -8);
    c.stroke();

    c.fillStyle = 'rgba(51, 65, 85, 0.95)';
    c.beginPath();
    c.moveTo(-20, -18);
    c.lineTo(16, -26);
    c.lineTo(24, -22);
    c.lineTo(-12, -14);
    c.closePath();
    c.fill();

    const lanternGrad = c.createRadialGradient(8, -12, 1, 8, -12, 28);
    lanternGrad.addColorStop(0, 'rgba(245, 158, 11, 0.95)');
    lanternGrad.addColorStop(0.4, 'rgba(251, 191, 36, 0.5)');
    lanternGrad.addColorStop(1, 'rgba(251, 191, 36, 0)');

    c.fillStyle = lanternGrad;
    c.beginPath();
    c.arc(8, -12, 28, 0, Math.PI * 2);
    c.fill();

    c.restore();
  }

  function drawRailwayTrack(c) {
    if (trackSamples.length < 2) return;

    c.save();
    c.beginPath();
    c.moveTo(trackSamples[0].x, trackSamples[0].y);
    for (let i = 1; i < trackSamples.length; i++) {
      c.lineTo(trackSamples[i].x, trackSamples[i].y);
    }
    c.strokeStyle = 'rgba(203, 213, 225, 0.75)';
    c.lineWidth = 14;
    c.lineCap = 'round';
    c.lineJoin = 'round';
    c.stroke();

    c.strokeStyle = 'rgba(100, 116, 139, 0.55)';
    c.lineWidth = 2.2;
    for (let d = 0; d < trackTotalLength; d += 11) {
      const pt = getTrackPoint(d);
      c.beginPath();
      c.moveTo(pt.x - pt.nx * 6.5, pt.y - pt.ny * 6.5);
      c.lineTo(pt.x + pt.nx * 6.5, pt.y + pt.ny * 6.5);
      c.stroke();
    }

    c.beginPath();
    for (let i = 0; i < trackSamples.length; i++) {
      const p = trackSamples[i];
      const nx = -Math.sin(p.angle);
      const ny = Math.cos(p.angle);
      const rx = p.x + nx * 3.5;
      const ry = p.y + ny * 3.5;
      if (i === 0) c.moveTo(rx, ry);
      else c.lineTo(rx, ry);
    }
    c.strokeStyle = 'rgba(51, 65, 85, 0.85)';
    c.lineWidth = 1.4;
    c.stroke();

    c.beginPath();
    for (let i = 0; i < trackSamples.length; i++) {
      const p = trackSamples[i];
      const nx = -Math.sin(p.angle);
      const ny = Math.cos(p.angle);
      const rx = p.x - nx * 3.5;
      const ry = p.y - ny * 3.5;
      if (i === 0) c.moveTo(rx, ry);
      else c.lineTo(rx, ry);
    }
    c.stroke();

    c.strokeStyle = 'rgba(255, 255, 255, 0.9)';
    c.lineWidth = 0.6;
    c.stroke();

    c.restore();
  }

  function drawArticulatedTrain(c, distortionAlpha, dt) {
    if (trackTotalLength <= 0) return;

    if (isArrived) {
      trainLeadDistance = trackTotalLength - 28;
    } else {
      const baseTrainSpeed = 38;
      const trainSpeed = baseTrainSpeed * (1.0 + Math.pow(distortionAlpha, 1.2) * 3.5);
      trainLeadDistance = (trainLeadDistance + trainSpeed * dt) % trackTotalLength;
    }

    const dLoco = trainLeadDistance - 16;
    const dCar1 = trainLeadDistance - 50;
    const dCar2 = trainLeadDistance - 82;
    const dCar3 = trainLeadDistance - 114;

    const cars = [
      { type: 'car', dist: dCar3 },
      { type: 'car', dist: dCar2 },
      { type: 'car', dist: dCar1 },
      { type: 'loco', dist: dLoco },
    ];

    // Bellows
    c.strokeStyle = 'rgba(15, 23, 42, 0.95)';
    c.lineWidth = 5;
    for (let i = 0; i < cars.length - 1; i++) {
      const ptA = getTrackPoint(cars[i].dist + 14);
      const ptB = getTrackPoint(cars[i + 1].dist - (cars[i + 1].type === 'loco' ? 16 : 14));
      c.beginPath();
      c.moveTo(ptA.x, ptA.y);
      c.lineTo(ptB.x, ptB.y);
      c.stroke();
    }

    // Locomotive Headlight Beam
    const locoPt = getTrackPoint(dLoco);
    c.save();
    c.translate(locoPt.x, locoPt.y);
    c.rotate(locoPt.angle);

    const beamGrad = c.createRadialGradient(16, 0, 4, 60, 0, 75);
    beamGrad.addColorStop(0, 'rgba(245, 158, 11, 0.35)');
    beamGrad.addColorStop(0.5, 'rgba(245, 158, 11, 0.15)');
    beamGrad.addColorStop(1, 'rgba(245, 158, 11, 0)');

    c.fillStyle = beamGrad;
    c.beginPath();
    c.moveTo(16, -2);
    c.lineTo(82, -26);
    c.lineTo(82, 26);
    c.lineTo(16, 2);
    c.closePath();
    c.fill();
    c.restore();

    // Carriages (3, 2, 1)
    for (let i = 0; i < 3; i++) {
      const car = cars[i];
      const pt = getTrackPoint(car.dist);
      c.save();
      c.translate(pt.x, pt.y);
      c.rotate(pt.angle);

      c.fillStyle = 'rgba(0, 0, 0, 0.25)';
      c.fillRect(-13, -5, 26, 10);

      // Silver-white body with crimson stripe
      c.fillStyle = 'rgba(248, 250, 252, 0.98)';
      c.beginPath();
      c.roundRect(-14, -4.5, 28, 9, 2);
      c.fill();

      c.fillStyle = 'rgba(225, 29, 72, 0.95)';
      c.fillRect(-14, -2.5, 28, 5);

      // Windows
      c.fillStyle = 'rgba(253, 224, 71, 0.95)';
      c.shadowColor = 'rgba(253, 224, 71, 0.8)';
      c.shadowBlur = 4;
      for (let w = 0; w < 4; w++) {
        const wx = -10 + w * 6.5;
        c.fillRect(wx, -1.8, 4.2, 3.6);
      }
      c.shadowBlur = 0;

      c.fillStyle = 'rgba(51, 65, 85, 0.95)';
      c.fillRect(-13.5, -4.5, 27, 1.2);

      c.restore();
    }

    // Locomotive
    c.save();
    c.translate(locoPt.x, locoPt.y);
    c.rotate(locoPt.angle);

    c.fillStyle = 'rgba(225, 29, 72, 0.98)';
    c.beginPath();
    c.moveTo(-15, -4.8);
    c.lineTo(11, -4.8);
    c.quadraticCurveTo(16, -4, 16, 0);
    c.quadraticCurveTo(16, 4, 11, 4.8);
    c.lineTo(-15, 4.8);
    c.closePath();
    c.fill();

    c.fillStyle = 'rgba(51, 65, 85, 0.98)';
    c.fillRect(-14, -3.2, 22, 6.4);

    c.fillStyle = 'rgba(186, 230, 253, 0.9)';
    c.fillRect(8, -3.5, 4, 7);

    c.strokeStyle = 'rgba(100, 116, 139, 0.85)';
    c.lineWidth = 1;
    c.beginPath();
    c.moveTo(-8, -3);
    c.lineTo(-5, -6);
    c.lineTo(-2, -3);
    c.moveTo(2, -3);
    c.lineTo(5, -6);
    c.lineTo(8, -3);
    c.stroke();

    c.fillStyle = 'rgba(255, 255, 255, 0.98)';
    c.shadowColor = 'rgba(245, 158, 11, 0.9)';
    c.shadowBlur = 6;
    c.beginPath();
    c.arc(15.5, -2.5, 1.3, 0, Math.PI * 2);
    c.arc(15.5, 2.5, 1.3, 0, Math.PI * 2);
    c.arc(14, 0, 1.1, 0, Math.PI * 2);
    c.fill();
    c.shadowBlur = 0;

    c.restore();
  }

  function renderTrainAtmosphere(distortionAlpha, dt = 0.016) {
    trainCtx.clearRect(0, 0, width, height);
    trainAnimTime += dt;

    drawAlpineSkyAndStars(trainCtx, width, height, trainAnimTime);
    drawVeniceLagoon(trainCtx, width, height, trainAnimTime);
    drawAlpineMountains(trainCtx, width, height);
    drawRailwayTrack(trainCtx);
    drawArticulatedTrain(trainCtx, distortionAlpha, dt);
  }

  // =========================================================================
  // Section 2: Reverse Countdown Chronometer
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
      isArrived = true;
      arrivalBanner.classList.remove('hidden');
      countdownView.style.opacity = '0.35';

      countDays.textContent = '000';
      countHours.textContent = '00';
      countMinutes.textContent = '00';
      countSeconds.textContent = '00';
      countMillis.textContent = '000';
      countMicros.textContent = '000';
      return;
    }

    isArrived = false;
    arrivalBanner.classList.add('hidden');
    countdownView.style.opacity = '1.0';

    const subMsFraction = (performance.now() % 1);
    const perceivedRemainingMicros = Math.max(0, ((realRemainingMs + subMsFraction) * 1000) / effectiveRatio);

    const parts = decomposeMicros(perceivedRemainingMicros);
    const totalRemainingDays = parts.years * 365 + parts.days;

    countDays.textContent = pad(totalRemainingDays, 3);
    countHours.textContent = pad(parts.hours, 2);
    countMinutes.textContent = pad(parts.minutes, 2);
    countSeconds.textContent = pad(parts.seconds, 2);
    countMillis.textContent = pad(parts.millis, 3);
    countMicros.textContent = pad(parts.micros, 3);
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
    renderTrainAtmosphere(alpha, dt);

    requestAnimationFrame(mainLoop);
  }

  // =========================================================================
  // Event Handlers & User Interaction
  // =========================================================================

  function setSliderValue(val) {
    const clamped = Math.max(0, Math.min(1, parseFloat(val)));
    state.sliderValue = clamped;
    slider.value = clamped;
    sliderProgress.style.width = `${clamped * 100}%`;
  }

  slider.addEventListener('input', (e) => {
    setSliderValue(e.target.value);
  });

  // Presets (Pure Numerical Factors)
  btnPresetReal.addEventListener('click', () => setSliderValue(0));
  btnPresetWeek.addEventListener('click', () => setSliderValue(0.5));
  btnPresetOur.addEventListener('click', () => setSliderValue(1.0));

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
