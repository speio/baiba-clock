/**
 * Baiba Clock — "Since We Met" / "Our Time" Dilation Engine
 * Relativistic Relationship Chronometer anchored to August 26, 2026.
 * 
 * Math:
 * - Origin: August 26, 2026 00:00:00 Local
 * - Dilation Anchors:
 *     Objective Reality => 1.0x (1 real day = 1 day)
 *     Perceptual Drift  => ~2.65x
 *     Our Time          => 7.0x (1 real day = 1 subjective week)
 * - Power-law slider blending between Objective Reality and 7.0x "Our Time".
 * - Surreal animated canvas with abstract Soviet farm flecks, goats, 2 dogs, 4 cats, and seasonal trees.
 */

(function() {
  'use strict';

  // --- Constants & Config ---
  const ORIGIN_DATE = new Date(2026, 7, 26, 0, 0, 0); // Month 7 is August (0-indexed)
  // Target arrival: September 11, 2026 at 20:36:00 Local Time
  const ARRIVAL_DATE = new Date(2026, 8, 11, 20, 36, 0); // Month 8 is September
  const DEPARTURE_DATE = new Date(2026, 8, 11, 15, 47, 0);
  const SECONDS_PER_DAY = 86400;
  const DAYS_PER_YEAR = 365.2425;
  const SECONDS_PER_YEAR = DAYS_PER_YEAR * SECONDS_PER_DAY; // ~31,556,952 s

  // Anchor Ratios
  const RATIO_REAL = 1.0;
  const RATIO_MID = Math.sqrt(7.0); // ~2.64575 (Perceptual Drift)
  const RATIO_MAX = 7.0; // Our Time: 1 real day = 1 subjective week (7.0x speed)

  // State
  const state = {
    sliderValue: 0.0,      // 0.0 = Real Time, 1.0 = Our Time
    isPaused: false,
    viewMode: 'chrono',    // 'chrono' or 'bins'
    simulatedDays: null,   // null = use live real time
    timeWarpActive: false,
    pausedTimeMicros: 0,
    pauseStartedAt: 0,
    lastFramePerf: performance.now(),
  };

  // Section 1 DOM Elements ("Since We Met")
  const clockTitle = document.getElementById('clockTitle');
  const dilationStatus = document.getElementById('dilationStatus');
  const slider = document.getElementById('distortionSlider');
  const sliderProgress = document.getElementById('sliderProgress');
  const sliderBadge = document.getElementById('sliderValueBadge');
  const totalMicrosDisplay = document.getElementById('totalMicrosDisplay');
  const equivalentDateDisplay = document.getElementById('equivalentDateDisplay');
  const animalSpeedDisplay = document.getElementById('animalSpeedDisplay');

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

  // Section 2 DOM Elements (Reverse Countdown & Alpine Train)
  const countDays = document.getElementById('countDays');
  const countHours = document.getElementById('countHours');
  const countMinutes = document.getElementById('countMinutes');
  const countSeconds = document.getElementById('countSeconds');
  const countMillis = document.getElementById('countMillis');
  const countMicros = document.getElementById('countMicros');
  const countdownStatus = document.getElementById('countdownStatus');
  const realRemainingDisplay = document.getElementById('realRemainingDisplay');
  const trainProgressDisplay = document.getElementById('trainProgressDisplay');
  const subjectiveRemainingDisplay = document.getElementById('subjectiveRemainingDisplay');
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

  /**
   * Calculates the target ratio for a given slider alpha in [0, 1].
   * Continuous power law scaling from 1.0x (Real Time) to 7.0x (Our Time):
   * - alpha = 0.0 => 1.0x (Objective Reality)
   * - alpha = 0.5 => ~2.65x (Perceptual Drift)
   * - alpha = 1.0 => 7.0x (Our Time: 1 Day = 1 Week)
   */
  function getEffectiveRatio(alpha) {
    if (alpha <= 0.0001) return 1.0;
    if (alpha >= 0.9999) return RATIO_MAX;

    return Math.pow(RATIO_MAX, alpha);
  }

  /**
   * Calculates perceived elapsed microseconds given real elapsed microseconds and slider alpha.
   */
  function calculatePerceivedMicros(realMicros, alpha) {
    if (realMicros <= 0) return 0;
    if (alpha <= 0.0001) return realMicros;

    const effectiveRatio = getEffectiveRatio(alpha);
    return realMicros * effectiveRatio;
  }

  /**
   * Decomposes total microseconds into { years, days, hours, minutes, seconds, millis, micros }
   */
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
  // Base-10 Decadic Bins Setup
  // =========================================================================
  const DECADE_LABELS = [
    { power: 0,  name: '1 µs' },
    { power: 1,  name: '10 µs' },
    { power: 2,  name: '100 µs' },
    { power: 3,  name: '1 ms' },
    { power: 4,  name: '10 ms' },
    { power: 5,  name: '100 ms' },
    { power: 6,  name: '1 Second' },
    { power: 7,  name: '10 Sec' },
    { power: 8,  name: '100 Sec' },
    { power: 9,  name: '1 K-Sec (~16m)' },
    { power: 10, name: '10 K-Sec (~2.7h)' },
    { power: 11, name: '100 K-Sec (~1.1d)' },
    { power: 12, name: '1 M-Sec (~11.6d)' },
    { power: 13, name: '10 M-Sec (~115d)' },
    { power: 14, name: '100 M-Sec (~3.1yr)' },
    { power: 15, name: '1 G-Sec (~31.7yr)' },
  ];

  const binElements = [];

  function initBinsGrid() {
    binsGrid.innerHTML = '';
    binElements.length = 0;

    // Render from highest power down to 10^0 for natural reading left-to-right
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
    let temp = Math.floor(totalMicros);
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
    // Main Title
    clockTitle.textContent = 'SINCE WE MET';

    // Subtitle transitions
    if (alpha <= 0.05) {
      dilationStatus.textContent = '1.0000× — Objective Reality';
      dilationStatus.style.color = '#94a3b8';
    } else if (alpha < 0.75) {
      dilationStatus.textContent = `${effectiveRatio.toFixed(2)}× — Perceptual Drift`;
      dilationStatus.style.color = '#cbd5e1';
    } else {
      dilationStatus.textContent = `${effectiveRatio.toFixed(1)}× — Our Time (1 Day = 1 Week)`;
      dilationStatus.style.color = '#ffffff';
    }

    // Badge
    const pct = Math.round(alpha * 100);
    sliderBadge.textContent = `${pct}% (${effectiveRatio.toFixed(1)}×)`;

    // Animal Speed display
    const animalSpeed = 1.0 + Math.pow(alpha, 1.3) * 1.4;
    animalSpeedDisplay.textContent = `${animalSpeed.toFixed(2)}×`;

    // Presets Active State
    btnPresetReal.classList.toggle('active', alpha < 0.25);
    btnPresetWeek.classList.toggle('active', alpha >= 0.25 && alpha < 0.75);
    btnPresetOur.classList.toggle('active', alpha >= 0.75);
  }

  // =========================================================================
  // Canvas Particle & Surreal Farm Animal Engine
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

    if (typeof initAlpineRailway === 'function') {
      initAlpineRailway();
    }
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

  // Continuous animation phase state (prevents stuttering during speed changes)
  let horizonPhase = 0;
  let animTime = 0;

  // 1. Rural Soviet Farm Ambient Flecks (Rye chaff, wheat awns, birch motes)
  const FLECKS_COUNT = 55;
  const flecks = [];

  for (let i = 0; i < FLECKS_COUNT; i++) {
    flecks.push({
      x: Math.random() * 2000,
      y: Math.random() * 1200,
      length: 3 + Math.random() * 6,
      width: 0.8 + Math.random() * 1.5,
      angle: Math.random() * Math.PI * 2,
      rotationSpeed: (Math.random() - 0.5) * 0.02,
      vx: 0.2 + Math.random() * 0.4,
      vy: 0.1 + Math.random() * 0.3,
      opacity: 0.05 + Math.random() * 0.10, // Barely noticeable as requested
      hue: Math.random() > 0.4 ? 'silver' : 'rye', // Subtle warm amber or silvery grey
    });
  }

  // 2. Surreal Looping Farm Animals (2 Goats, 3 Dogs including 1 Golden, 4 Cats)
  // Each animal runs along a whimsical undulating pasture path with cyclical limbs
  class SurrealAnimal {
    constructor(type, index, totalOfKind, colorScheme = 'silver') {
      this.type = type; // 'goat', 'dog', 'cat'
      this.index = index;
      this.colorScheme = colorScheme; // 'silver' or 'golden'
      this.x = (index / totalOfKind) * 1200 + Math.random() * 200;
      this.baseY = colorScheme === 'golden' ? 0.60 : (0.64 + (index % 3) * 0.08); // Dedicated pasture layer for golden dog
      this.phase = Math.random() * Math.PI * 2;
      this.size = type === 'goat' ? 22 : (type === 'dog' ? (colorScheme === 'golden' ? 20 : 18) : 13);
      this.baseSpeed = type === 'dog' ? (colorScheme === 'golden' ? 1.48 : 1.52) : (type === 'cat' ? 1.1 : 0.9);
      this.stride = Math.random() * Math.PI * 2;
      this.trail = [];
    }

    update(speedMultiplier, canvasWidth, canvasHeight) {
      // Advance position
      const effectiveSpeed = this.baseSpeed * speedMultiplier;
      this.x += effectiveSpeed;
      this.stride += 0.12 * speedMultiplier;

      // Wrap around screen in infinite surreal loop
      if (this.x > canvasWidth + 80) {
        this.x = -80;
        this.trail = [];
      }

      // Surreal gentle undulation (rolling pasture field)
      const currentY = canvasHeight * this.baseY + Math.sin(this.x * 0.005 + this.phase) * 35;

      // Record trail for relativistic dilation distortion
      this.trail.push({ x: this.x, y: currentY, alpha: 1.0 });
      if (this.trail.length > Math.min(18, Math.floor(4 + speedMultiplier * 2.5))) {
        this.trail.shift();
      }

      return currentY;
    }

    draw(ctx, y, speedMultiplier, distortionAlpha) {
      // 1. Draw relativistic fading motion trails if dilated
      if (distortionAlpha > 0.15 && this.trail.length > 1) {
        ctx.save();
        for (let i = 0; i < this.trail.length - 1; i++) {
          const pt = this.trail[i];
          const trailFade = (i / this.trail.length) * (distortionAlpha * 0.35);
          ctx.strokeStyle = this.colorScheme === 'golden'
            ? `rgba(245, 185, 66, ${trailFade * 1.3})`
            : `rgba(226, 232, 240, ${trailFade})`;
          ctx.lineWidth = 1.0;
          ctx.beginPath();
          ctx.arc(pt.x, pt.y, this.size * 0.45, 0, Math.PI * 2);
          ctx.stroke();
        }
        ctx.restore();
      }

      // 2. Relativistic Stretch & Shear under high dilation
      ctx.save();
      ctx.translate(this.x, y);

      // Subtle horizontal stretch scaling with time distortion
      const stretchX = 1.0 + distortionAlpha * 0.35;
      ctx.scale(stretchX, 1.0);

      // Stylized Soviet-modernist silhouette / hairline drawing
      let bodyColor, limbColor;
      if (this.colorScheme === 'golden') {
        bodyColor = `rgba(245, 182, 55, ${0.72 + distortionAlpha * 0.25})`;
        limbColor = `rgba(217, 132, 22, ${0.65 + distortionAlpha * 0.25})`;
      } else {
        bodyColor = `rgba(235, 242, 250, ${0.45 + distortionAlpha * 0.35})`;
        limbColor = `rgba(200, 210, 225, ${0.35 + distortionAlpha * 0.35})`;
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
      // Torso
      ctx.beginPath();
      ctx.ellipse(0, 0, this.size, this.size * 0.55, 0.1, 0, Math.PI * 2);
      ctx.fill();

      // Head & Arching Neck
      ctx.beginPath();
      ctx.moveTo(this.size * 0.6, -this.size * 0.2);
      ctx.lineTo(this.size * 1.1, -this.size * 0.85);
      ctx.lineTo(this.size * 1.35, -this.size * 0.7);
      ctx.lineTo(this.size * 0.8, -this.size * 0.1);
      ctx.closePath();
      ctx.fill();

      // Curved Horns (Iconic goat silhouette)
      ctx.beginPath();
      ctx.moveTo(this.size * 1.1, -this.size * 0.85);
      ctx.quadraticCurveTo(this.size * 0.8, -this.size * 1.4, this.size * 0.6, -this.size * 1.1);
      ctx.stroke();

      // Beard
      ctx.beginPath();
      ctx.moveTo(this.size * 1.3, -this.size * 0.6);
      ctx.lineTo(this.size * 1.25, -this.size * 0.35);
      ctx.stroke();

      // Legs (running cycle)
      ctx.beginPath();
      // Front legs
      ctx.moveTo(this.size * 0.6, this.size * 0.3);
      ctx.lineTo(this.size * 0.7 + c1 * 7, this.size * 1.1);
      ctx.moveTo(this.size * 0.5, this.size * 0.3);
      ctx.lineTo(this.size * 0.6 - c1 * 7, this.size * 1.1);
      // Back legs
      ctx.moveTo(-this.size * 0.6, this.size * 0.2);
      ctx.lineTo(-this.size * 0.7 + c2 * 8, this.size * 1.1);
      ctx.moveTo(-this.size * 0.5, this.size * 0.2);
      ctx.lineTo(-this.size * 0.5 - c2 * 8, this.size * 1.1);
      ctx.stroke();
    }

    drawDog(ctx, c1, c2) {
      // Sleek running canine body
      ctx.beginPath();
      ctx.ellipse(0, 0, this.size * 1.1, this.size * 0.45, -0.05, 0, Math.PI * 2);
      ctx.fill();

      // Head & Snout
      ctx.beginPath();
      ctx.moveTo(this.size * 0.8, -this.size * 0.15);
      ctx.lineTo(this.size * 1.3, -this.size * 0.5);
      ctx.lineTo(this.size * 1.55, -this.size * 0.3);
      ctx.lineTo(this.size * 0.9, 0.1);
      ctx.closePath();
      ctx.fill();

      // Floppy / Streamlined Ear
      ctx.beginPath();
      ctx.moveTo(this.size * 1.2, -this.size * 0.45);
      if (this.colorScheme === 'golden') {
        // Slightly softer rounded retriever ear
        ctx.quadraticCurveTo(this.size * 1.0, -this.size * 0.85 - Math.abs(c1) * 3, this.size * 0.75, -this.size * 0.45);
      } else {
        ctx.lineTo(this.size * 0.9, -this.size * 0.55 - Math.abs(c1) * 3);
      }
      ctx.stroke();

      // Playfully wagging tail
      ctx.beginPath();
      ctx.moveTo(-this.size * 1.0, -this.size * 0.1);
      if (this.colorScheme === 'golden') {
        ctx.quadraticCurveTo(-this.size * 1.6, -this.size * 0.9 + c1 * 5, -this.size * 1.85, -this.size * 0.35);
      } else {
        ctx.quadraticCurveTo(-this.size * 1.5, -this.size * 0.8 + c1 * 4, -this.size * 1.7, -this.size * 0.4);
      }
      ctx.stroke();

      // Galloping Legs
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
      // Nimble feline silhouette
      ctx.beginPath();
      ctx.ellipse(0, 0, this.size * 0.9, this.size * 0.48, 0, 0, Math.PI * 2);
      ctx.fill();

      // Rounded head with pointed ears
      ctx.beginPath();
      ctx.arc(this.size * 1.0, -this.size * 0.35, this.size * 0.38, 0, Math.PI * 2);
      ctx.fill();

      // Pointed ears
      ctx.beginPath();
      ctx.moveTo(this.size * 0.9, -this.size * 0.65);
      ctx.lineTo(this.size * 0.98, -this.size * 0.95);
      ctx.lineTo(this.size * 1.15, -this.size * 0.65);
      ctx.fill();

      // Curved expressive tail
      ctx.beginPath();
      ctx.moveTo(-this.size * 0.85, 0);
      ctx.bezierCurveTo(-this.size * 1.4, -this.size * 0.5, -this.size * 1.2, -this.size * 1.1 + c1 * 3, -this.size * 1.5, -this.size * 1.1);
      ctx.stroke();

      // Prancing Paws
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

  // Instantiate the whimsical troupe: 2 Goats, 3 Dogs (including 1 Golden), 4 Cats
  const surrealAnimals = [
    new SurrealAnimal('goat', 0, 2),
    new SurrealAnimal('goat', 1, 2),
    new SurrealAnimal('dog', 0, 3, 'silver'),
    new SurrealAnimal('dog', 1, 3, 'silver'),
    new SurrealAnimal('dog', 2, 3, 'golden'),
    new SurrealAnimal('cat', 0, 4),
    new SurrealAnimal('cat', 1, 4),
    new SurrealAnimal('cat', 2, 4),
    new SurrealAnimal('cat', 3, 4),
  ];

  // =========================================================================
  // 3. Seasonal Trees & Plants System (Birch trees, meadow rye & wildflowers)
  // Progresses slowly in Real Time, accelerated by the Time Dilation Slider
  // Complete lifecycle: Spring sprout -> Summer bloom -> Autumn gold/shedding -> Winter dormancy
  // =========================================================================

  const fallingLeaves = [];
  const MAX_FALLING_LEAVES = 45;

  function spawnFallingLeaf(x, y, color) {
    if (fallingLeaves.length >= MAX_FALLING_LEAVES) return;
    fallingLeaves.push({
      x: x + (Math.random() - 0.5) * 16,
      y: y,
      vx: 0.7 + Math.random() * 1.3,
      vy: 0.35 + Math.random() * 0.65,
      size: 2.2 + Math.random() * 2.2,
      angle: Math.random() * Math.PI * 2,
      vAngle: (Math.random() - 0.5) * 0.09,
      life: 1.0,
      decay: 0.007 + Math.random() * 0.008,
      color: color,
    });
  }

  class SurrealTree {
    constructor(xRatio, maxHeight, seasonOffset) {
      this.xRatio = xRatio; // 0 to 1 across screen width
      this.maxHeight = maxHeight; // in pixels
      this.season = seasonOffset; // 0 to 1
      this.swayPhase = Math.random() * Math.PI * 2;
      this.branches = [
        { heightRatio: 0.35, angle: -0.65, lengthRatio: 0.38, subRatio: 0.5 },
        { heightRatio: 0.46, angle: 0.60, lengthRatio: 0.42, subRatio: 0.5 },
        { heightRatio: 0.60, angle: -0.55, lengthRatio: 0.46, subRatio: 0.45 },
        { heightRatio: 0.72, angle: 0.50, lengthRatio: 0.36, subRatio: 0.4 },
        { heightRatio: 0.84, angle: -0.40, lengthRatio: 0.28, subRatio: 0.35 },
        { heightRatio: 0.92, angle: 0.35, lengthRatio: 0.22, subRatio: 0.3 },
      ];
    }

    update(dt, seasonalSpeedMultiplier) {
      // Base cycle: ~45 seconds at 1x speed. Scales with dilation up to ~36x
      const baseCycleRate = 1 / 45;
      this.season = (this.season + baseCycleRate * seasonalSpeedMultiplier * dt) % 1.0;
    }

    draw(ctx, groundX, groundY, distortionAlpha, animTime) {
      const s = this.season;

      // Seasonal Phases:
      // Spring (0.00 - 0.25): Sprouting & upward growth
      // Summer (0.25 - 0.52): Full lush silver-sky canopy & peak bloom
      // Autumn (0.52 - 0.78): Turning warm harvest gold & amber, shedding leaves
      // Winter (0.78 - 1.00): Bare branches, dormancy & peaceful renewal

      let growthProgress = 1.0;
      let leafDensity = 0.0;
      let leafColor = '';
      let treeAlpha = 0.85;

      if (s < 0.25) {
        // Spring: Sprouting
        const p = s / 0.25;
        growthProgress = p * p * (3 - 2 * p); // smoothstep
        leafDensity = p > 0.3 ? (p - 0.3) / 0.7 : 0;
        // Soft celadon / young spring silver-green
        leafColor = `rgba(187, 247, 208, ${0.5 + p * 0.3})`;
        treeAlpha = 0.4 + growthProgress * 0.45;
      } else if (s < 0.52) {
        // Summer: Full lush canopy
        growthProgress = 1.0;
        leafDensity = 1.0;
        // Ethereal silver-white with pale sky shimmer
        leafColor = `rgba(238, 246, 255, ${0.75 + distortionAlpha * 0.2})`;
        treeAlpha = 0.85;
      } else if (s < 0.78) {
        // Autumn: Golden harvest & shedding
        growthProgress = 1.0;
        const autP = (s - 0.52) / 0.26;
        leafDensity = Math.max(0, 1.0 - autP * 1.15); // Progressively drops leaves
        // Vibrant harvest gold to deep amber
        const r = Math.round(245 - autP * 25);
        const g = Math.round(180 - autP * 50);
        const b = Math.round(50 - autP * 35);
        leafColor = `rgba(${r}, ${g}, ${b}, ${0.85 - autP * 0.3})`;
        treeAlpha = 0.80;

        // Spawn falling leaves during autumn shedding
        if (Math.random() < (0.20 + distortionAlpha * 0.25) && leafDensity > 0.04) {
          spawnFallingLeaf(groundX + (Math.random() - 0.5) * 50, groundY - this.maxHeight * (0.5 + Math.random() * 0.4), leafColor);
        }
      } else {
        // Winter: Bare sculptural branches & dormancy
        growthProgress = 1.0;
        leafDensity = 0.0;
        const winP = (s - 0.78) / 0.22;
        // Ethereal bare branches soften slightly right before spring reset
        treeAlpha = winP > 0.75 ? 0.75 - (winP - 0.75) * 2.5 : 0.75;
      }

      const currentHeight = this.maxHeight * Math.max(0.05, growthProgress);
      const sway = Math.sin(animTime * 1.8 + this.swayPhase) * (5 + distortionAlpha * 5);

      ctx.save();
      ctx.translate(groundX, groundY);

      // Draw Birch Trunk
      ctx.beginPath();
      ctx.moveTo(0, 0);
      const ctrlX = sway * 0.4;
      const ctrlY = -currentHeight * 0.5;
      const topX = sway;
      const topY = -currentHeight;
      ctx.quadraticCurveTo(ctrlX, ctrlY, topX, topY);
      ctx.strokeStyle = `rgba(235, 242, 250, ${treeAlpha})`;
      ctx.lineWidth = Math.max(1.2, 2.6 * growthProgress);
      ctx.lineCap = 'round';
      ctx.stroke();

      // Delicate birch bark lenticel dashes along trunk
      if (growthProgress > 0.35) {
        ctx.strokeStyle = `rgba(30, 41, 59, ${0.45 * treeAlpha})`;
        ctx.lineWidth = 1.0;
        const lenticelCount = Math.floor(currentHeight / 18);
        for (let k = 1; k < lenticelCount; k++) {
          const tFrac = k / lenticelCount;
          const lx = (1 - tFrac) * (1 - tFrac) * 0 + 2 * (1 - tFrac) * tFrac * ctrlX + tFrac * tFrac * topX;
          const ly = (1 - tFrac) * (1 - tFrac) * 0 + 2 * (1 - tFrac) * tFrac * ctrlY + tFrac * tFrac * topY;
          ctx.beginPath();
          ctx.moveTo(lx - 2.5, ly);
          ctx.lineTo(lx + 2.5, ly);
          ctx.stroke();
        }
      }

      // Draw Branches & Leaves
      for (let i = 0; i < this.branches.length; i++) {
        const br = this.branches[i];
        if (growthProgress < br.heightRatio * 0.9) continue;

        // Position on trunk
        const tFrac = br.heightRatio;
        const bx = (1 - tFrac) * (1 - tFrac) * 0 + 2 * (1 - tFrac) * tFrac * ctrlX + tFrac * tFrac * topX;
        const by = (1 - tFrac) * (1 - tFrac) * 0 + 2 * (1 - tFrac) * tFrac * ctrlY + tFrac * tFrac * topY;

        const branchLen = br.lengthRatio * currentHeight;
        const bSway = Math.sin(animTime * 2.2 + this.swayPhase + i) * 3;
        const endX = bx + Math.sin(br.angle) * branchLen + bSway;
        const endY = by - Math.cos(br.angle) * branchLen;

        ctx.strokeStyle = `rgba(215, 225, 238, ${treeAlpha * 0.8})`;
        ctx.lineWidth = Math.max(0.8, 1.4 * growthProgress);
        ctx.beginPath();
        ctx.moveTo(bx, by);
        ctx.quadraticCurveTo((bx + endX) / 2 + bSway, (by + endY) / 2, endX, endY);
        ctx.stroke();

        // Sub-branch
        const subEndX = bx + (endX - bx) * br.subRatio + Math.sin(br.angle + 0.3) * (branchLen * 0.45);
        const subEndY = by + (endY - by) * br.subRatio - Math.cos(br.angle + 0.3) * (branchLen * 0.45);
        ctx.beginPath();
        ctx.moveTo(bx + (endX - bx) * br.subRatio, by + (endY - by) * br.subRatio);
        ctx.lineTo(subEndX, subEndY);
        ctx.stroke();

        // Draw Foliage Nodes if leaves exist
        if (leafDensity > 0.02) {
          ctx.fillStyle = leafColor;
          const leafScale = leafDensity * (0.85 + Math.sin(animTime * 3.0 + i) * 0.15);

          // Leaf cluster at branch tip
          ctx.beginPath();
          ctx.arc(endX, endY, 3.8 * leafScale, 0, Math.PI * 2);
          ctx.fill();

          // Leaf cluster along branch
          ctx.beginPath();
          ctx.arc(bx + (endX - bx) * 0.65, by + (endY - by) * 0.65 - 2, 3.0 * leafScale, 0, Math.PI * 2);
          ctx.fill();

          // Leaf cluster at sub-branch tip
          ctx.beginPath();
          ctx.arc(subEndX, subEndY, 3.2 * leafScale, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      // Topmost Crown Canopy Cluster
      if (leafDensity > 0.02) {
        ctx.fillStyle = leafColor;
        const crownScale = leafDensity * 4.2;
        ctx.beginPath();
        ctx.arc(topX, topY - 3, crownScale, 0, Math.PI * 2);
        ctx.arc(topX - 4, topY + 2, crownScale * 0.8, 0, Math.PI * 2);
        ctx.arc(topX + 4, topY + 1, crownScale * 0.8, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.restore();
    }
  }

  class SurrealPlant {
    constructor(xRatio, maxHeight, seasonOffset, type = 'rye') {
      this.xRatio = xRatio;
      this.maxHeight = maxHeight; // 35 to 65 px
      this.season = seasonOffset;
      this.type = type; // 'rye' or 'meadow'
      this.archDirection = Math.random() > 0.5 ? 1 : -1;
      this.swayPhase = Math.random() * Math.PI * 2;
    }

    update(dt, seasonalSpeedMultiplier) {
      const baseCycleRate = 1 / 38;
      this.season = (this.season + baseCycleRate * seasonalSpeedMultiplier * dt) % 1.0;
    }

    draw(ctx, groundX, groundY, distortionAlpha, animTime) {
      const s = this.season;

      // Spring (0.00-0.25): Sprouting shoot upward
      // Summer (0.25-0.52): Full flowering awn & swaying stalk
      // Autumn (0.52-0.78): Ripe golden harvest grain
      // Winter (0.78-1.00): Reedy winter dormancy & renewal

      let growth = 1.0;
      let plantColor = '';
      let headColor = '';

      if (s < 0.25) {
        // Spring shoot
        const p = s / 0.25;
        growth = p * p * (3 - 2 * p);
        plantColor = `rgba(167, 243, 208, ${0.4 + p * 0.4})`;
        headColor = `rgba(209, 250, 229, ${0.3 + p * 0.4})`;
      } else if (s < 0.52) {
        // Summer green/silver rye
        growth = 1.0;
        plantColor = `rgba(215, 235, 225, ${0.7 + distortionAlpha * 0.2})`;
        headColor = `rgba(240, 249, 255, ${0.85 + distortionAlpha * 0.15})`;
      } else if (s < 0.78) {
        // Autumn golden harvest rye
        growth = 1.0;
        const autP = (s - 0.52) / 0.26;
        plantColor = `rgba(245, 185, 66, ${0.85 - autP * 0.2})`;
        headColor = `rgba(251, 191, 36, ${0.9 - autP * 0.2})`;

        // Emit golden pollen/seed motes in Autumn
        if (Math.random() < 0.08) {
          spawnFallingLeaf(groundX + (Math.random() - 0.5) * 10, groundY - this.maxHeight * 0.7, 'rgba(251, 191, 36, 0.75)');
        }
      } else {
        // Winter dry stalk
        growth = 1.0;
        const winP = (s - 0.78) / 0.22;
        plantColor = `rgba(180, 195, 210, ${Math.max(0.05, 0.5 - winP * 0.4)})`;
        headColor = `rgba(180, 195, 210, ${Math.max(0.05, 0.45 - winP * 0.4)})`;
      }

      const h = this.maxHeight * Math.max(0.08, growth);
      const sway = Math.sin(animTime * 2.5 + this.swayPhase) * (this.archDirection * 8 + distortionAlpha * 6);

      ctx.save();
      ctx.translate(groundX, groundY);
      ctx.strokeStyle = plantColor;
      ctx.lineWidth = 1.2;
      ctx.lineCap = 'round';

      // Graceful arched culm (stem)
      const tipX = sway + this.archDirection * 12 * growth;
      const tipY = -h;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.quadraticCurveTo(this.archDirection * 8, -h * 0.55, tipX, tipY);
      ctx.stroke();

      // Feathery Rye Awn / Spikelet Head
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

          // Grain kernel dot
          ctx.beginPath();
          ctx.arc(ax, ay, 1.2, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      ctx.restore();
    }
  }

  // 4 Trees across the pastoral horizon, each with different seasonal phase offset
  const surrealTrees = [
    new SurrealTree(0.12, 160, 0.10), // Late Spring
    new SurrealTree(0.36, 130, 0.38), // Peak Summer
    new SurrealTree(0.66, 175, 0.62), // Autumn Harvest & Leaf Falling
    new SurrealTree(0.88, 145, 0.86), // Winter Bare Branches
  ];

  // 7 Meadow plants & wild rye stalks along the pasture line
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

    // Speed multiplier scales gracefully with slider
    const animalSpeed = 1.0 + Math.pow(distortionAlpha, 1.3) * 1.4;
    // Seasonal multiplier: 1x at Real Time -> up to 7x at Our Time
    const seasonalSpeed = 1.0 + Math.pow(distortionAlpha, 1.3) * 6.0;

    // Smooth continuous time and wave phase (completely eliminates tree and scenery stutter)
    animTime += dt;
    horizonPhase += dt * 0.5 * animalSpeed;

    const horizonY = height * 0.72;

    // 1. Draw subtle abstract Soviet farm nature flecks
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
        // Subtle warm rye chaff mote
        ctx.fillStyle = `rgba(214, 175, 125, ${f.opacity * (1.0 + distortionAlpha * 0.4)})`;
      } else {
        // Silvery birch bark dust
        ctx.fillStyle = `rgba(226, 232, 240, ${f.opacity * (1.0 + distortionAlpha * 0.4)})`;
      }

      ctx.fillRect(-f.length / 2, -f.width / 2, f.length, f.width);
      ctx.restore();
    }

    // 2. Draw surreal rolling pasture horizon lines (using continuous horizonPhase)
    ctx.save();
    ctx.strokeStyle = `rgba(255, 255, 255, ${0.04 + distortionAlpha * 0.05})`;
    ctx.lineWidth = 1.0;
    ctx.beginPath();
    ctx.moveTo(0, horizonY);
    for (let x = 0; x <= width; x += 40) {
      const dy = Math.sin(x * 0.003 + horizonPhase) * 12;
      ctx.lineTo(x, horizonY + dy);
    }
    ctx.stroke();
    ctx.restore();

    // 3. Update & render Seasonal Trees (rooted on continuous pasture horizon)
    for (let i = 0; i < surrealTrees.length; i++) {
      const tree = surrealTrees[i];
      tree.update(dt, seasonalSpeed);
      const treeX = width * tree.xRatio;
      const dy = Math.sin(treeX * 0.003 + horizonPhase) * 12;
      tree.draw(ctx, treeX, horizonY + dy, distortionAlpha, animTime);
    }

    // 4. Update & render Seasonal Meadow Plants & Rye
    for (let i = 0; i < surrealPlants.length; i++) {
      const plant = surrealPlants[i];
      plant.update(dt, seasonalSpeed);
      const plantX = width * plant.xRatio;
      const dy = Math.sin(plantX * 0.003 + horizonPhase) * 12;
      plant.draw(ctx, plantX, horizonY + dy + 4, distortionAlpha, animTime);
    }

    // 5. Update & render Falling/Drifting Leaves
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

    // 6. Update & render animals
    for (let i = 0; i < surrealAnimals.length; i++) {
      const animal = surrealAnimals[i];
      const y = animal.update(animalSpeed, width, height);
      animal.draw(ctx, y, animalSpeed, distortionAlpha);
    }
  }

  // =========================================================================
  // Section 2: Alpine Railway, Sinuous Track & Venetian Departure Engine
  // =========================================================================

  let trackSamples = [];
  let trackTotalLength = 0;
  let trainLeadDistance = 0;
  let alpineStars = [];
  let trainAnimTime = 0;
  let isArrived = false;

  function initAlpineRailway() {
    // 1. Generate Night Sky Stars for the Alpine atmosphere
    alpineStars = [];
    const starCount = 85;
    for (let i = 0; i < starCount; i++) {
      alpineStars.push({
        x: Math.random() * width,
        y: Math.random() * (height * 0.58),
        r: 0.5 + Math.random() * 1.3,
        phase: Math.random() * Math.PI * 2,
        speed: 0.6 + Math.random() * 1.8,
        color: Math.random() > 0.35 ? 'rgba(248, 250, 252, ' : 'rgba(186, 230, 253, ',
      });
    }

    // 2. Generate Long Sinuous Mountain Track Path (Catmull-Rom Spline)
    // Waypoints carefully proportioned so track winds from Venice lagoon (bottom-left)
    // through rolling valleys and pine switchbacks up to Alpine terminal (top-right)
    const waypoints = [
      { x: width * 0.04, y: height * 0.88 }, // P0: Lagoon water edge (Venice departure)
      { x: width * 0.22, y: height * 0.82 }, // P1: Venetian coastal plain
      { x: width * 0.45, y: height * 0.74 }, // P2: Foothill ascent entry
      { x: width * 0.72, y: height * 0.65 }, // P3: Hairpin curve 1
      { x: width * 0.36, y: height * 0.49 }, // P4: Switchback through pine crags
      { x: width * 0.64, y: height * 0.37 }, // P5: Elevated mountain viaduct ledge
      { x: width * 0.82, y: height * 0.27 }, // P6: Alpine pass entrance
      { x: width * 0.94, y: height * 0.20 }, // P7: Terminal platform under snow peaks
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
    // Sky twilight gradient
    const skyGrad = c.createLinearGradient(0, 0, 0, h * 0.7);
    skyGrad.addColorStop(0, '#040711');
    skyGrad.addColorStop(0.45, '#091322');
    skyGrad.addColorStop(1, '#0d1b2d');
    c.fillStyle = skyGrad;
    c.fillRect(0, 0, w, h);

    // Stars
    for (let i = 0; i < alpineStars.length; i++) {
      const s = alpineStars[i];
      const alpha = 0.2 + 0.6 * (0.5 + 0.5 * Math.sin(s.phase + t * s.speed));
      c.fillStyle = s.color + alpha.toFixed(2) + ')';
      c.beginPath();
      c.arc(s.x, s.y, s.r, 0, Math.PI * 2);
      c.fill();
    }

    // Polar Star / Alpine Beacon above the peaks
    const beaconX = w * 0.86;
    const beaconY = h * 0.08;
    const bGlow = 0.6 + 0.35 * Math.sin(t * 2.2);
    c.fillStyle = `rgba(253, 230, 138, ${bGlow})`;
    c.beginPath();
    c.arc(beaconX, beaconY, 2.4, 0, Math.PI * 2);
    c.fill();

    // 4-point subtle star glint
    c.strokeStyle = `rgba(254, 240, 138, ${bGlow * 0.7})`;
    c.lineWidth = 1;
    c.beginPath();
    c.moveTo(beaconX - 7, beaconY);
    c.lineTo(beaconX + 7, beaconY);
    c.moveTo(beaconX, beaconY - 7);
    c.lineTo(beaconX, beaconY + 7);
    c.stroke();
  }

  function drawVeniceLagoon(c, w, h, t) {
    const waterY = h * 0.74;
    const waterW = w * 0.44;

    // Lagoon water depth gradient
    const waterGrad = c.createLinearGradient(0, waterY, 0, h);
    waterGrad.addColorStop(0, 'rgba(8, 28, 44, 0.75)');
    waterGrad.addColorStop(0.5, 'rgba(5, 18, 28, 0.90)');
    waterGrad.addColorStop(1, 'rgba(2, 8, 14, 0.98)');
    c.fillStyle = waterGrad;
    c.fillRect(0, waterY, waterW, h - waterY);

    // Shimmering horizontal water ripples
    c.lineWidth = 1.2;
    for (let r = 0; r < 7; r++) {
      const ry = waterY + 16 + r * 16;
      const rippleWave = Math.sin(t * 1.6 + r * 0.8) * 8;
      const rAlpha = 0.15 + 0.15 * Math.sin(t * 1.4 + r);
      c.strokeStyle = `rgba(56, 189, 248, ${rAlpha})`;
      c.beginPath();
      c.moveTo(10, ry);
      c.bezierCurveTo(
        waterW * 0.25, ry + rippleWave,
        waterW * 0.60, ry - rippleWave,
        waterW * 0.90, ry + 2
      );
      c.stroke();
    }

    // Venetian Mooring Poles (Briccole: 3 slanted wooden poles tied with rope)
    const poleX = w * 0.08;
    const poleBaseY = waterY + 30;
    c.save();
    c.translate(poleX, poleBaseY);

    // Wood poles
    c.strokeStyle = 'rgba(78, 60, 48, 0.9)';
    c.lineWidth = 3.5;
    c.beginPath();
    c.moveTo(-6, -42);
    c.lineTo(-4, 18);
    c.moveTo(0, -48);
    c.lineTo(0, 18);
    c.moveTo(6, -40);
    c.lineTo(4, 18);
    c.stroke();

    // Rope wrap
    c.strokeStyle = 'rgba(203, 213, 225, 0.7)';
    c.lineWidth = 2;
    c.beginPath();
    c.moveTo(-8, -24);
    c.lineTo(8, -24);
    c.moveTo(-8, -14);
    c.lineTo(8, -14);
    c.stroke();

    // Waterline reflection
    c.strokeStyle = 'rgba(56, 189, 248, 0.25)';
    c.lineWidth = 2;
    c.beginPath();
    c.moveTo(-6, 20);
    c.lineTo(-4, 38);
    c.moveTo(0, 20);
    c.lineTo(0, 42);
    c.moveTo(6, 20);
    c.lineTo(4, 36);
    c.stroke();
    c.restore();

    // Floating Venetian Gondola Silhouette with Gondolier & Oar
    const gondolaX = w * 0.15;
    const gondolaBaseY = waterY + 44;
    const bobY = Math.sin(t * 1.3) * 2.5;

    c.save();
    c.translate(gondolaX, gondolaBaseY + bobY);

    // Water reflection under gondola
    c.fillStyle = 'rgba(56, 189, 248, 0.14)';
    c.beginPath();
    c.ellipse(10, 12, 42, 6, 0, 0, Math.PI * 2);
    c.fill();

    // Gondola Hull (iconic crescent shape)
    c.fillStyle = 'rgba(15, 23, 42, 0.96)';
    c.strokeStyle = 'rgba(203, 213, 225, 0.55)';
    c.lineWidth = 1.2;
    c.beginPath();
    c.moveTo(-44, -2);
    c.quadraticCurveTo(-15, 12, 38, 7);
    c.quadraticCurveTo(46, -1, 52, -12);
    c.quadraticCurveTo(42, 5, 28, 6);
    c.quadraticCurveTo(-20, 7, -44, -2);
    c.closePath();
    c.fill();
    c.stroke();

    // Venetian Ferro (Iron prow with 6 forward prongs)
    c.strokeStyle = 'rgba(248, 250, 252, 0.9)';
    c.lineWidth = 1.5;
    c.beginPath();
    c.moveTo(48, 0);
    c.lineTo(54, -16);
    c.lineTo(51, -18);
    c.stroke();

    // Gondolier Silhouette (standing at the stern)
    const gX = -26;
    const gY = -1;

    // Body
    c.fillStyle = 'rgba(15, 23, 42, 0.98)';
    c.beginPath();
    c.moveTo(gX - 4, gY);
    c.lineTo(gX - 2, gY - 26);
    c.lineTo(gX + 5, gY - 26);
    c.lineTo(gX + 4, gY);
    c.closePath();
    c.fill();

    // Head & Straw Hat (Boater)
    c.beginPath();
    c.arc(gX + 1, gY - 30, 4, 0, Math.PI * 2);
    c.fill();

    c.strokeStyle = 'rgba(248, 250, 252, 0.85)';
    c.lineWidth = 1.4;
    c.beginPath();
    c.moveTo(gX - 6, gY - 32);
    c.lineTo(gX + 8, gY - 32);
    c.stroke();

    // Arms & Long Oar (Remo) dipping into lagoon water
    c.strokeStyle = 'rgba(186, 230, 253, 0.95)';
    c.lineWidth = 1.5;
    c.beginPath();
    c.moveTo(gX - 2, gY - 22);
    c.lineTo(gX + 10, gY - 14);
    c.lineTo(gX + 24, gY + 12);
    c.stroke();

    c.restore();
  }

  function drawAlpineMountains(c, w, h) {
    // 1. Distant Mountain Silhouette Ridge
    c.fillStyle = 'rgba(12, 22, 36, 0.7)';
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

    // 2. High Alpine Peak 1 (Left shoulder peak)
    const p1 = { x: w * 0.56, y: h * 0.16, bx1: w * 0.42, bx2: w * 0.70, by: h * 0.52 };
    drawSingleAlpinePeak(c, p1.x, p1.y, p1.bx1, p1.bx2, p1.by, 0.9);

    // 3. Central Majestic Peak 2 (Highest summit)
    const p2 = { x: w * 0.75, y: h * 0.08, bx1: w * 0.58, bx2: w * 0.92, by: h * 0.50 };
    drawSingleAlpinePeak(c, p2.x, p2.y, p2.bx1, p2.bx2, p2.by, 1.0);

    // 4. Terminal Peak 3 (Above the arrival platform)
    const p3 = { x: w * 0.92, y: h * 0.12, bx1: w * 0.80, bx2: w * 1.05, by: h * 0.46 };
    drawSingleAlpinePeak(c, p3.x, p3.y, p3.bx1, p3.bx2, p3.by, 0.95);

    // 5. Alpine Conifer (Pine) Clusters on foothills
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

    // 6. Alpine Station Terminal (Top-Right Arrival Point)
    drawAlpineTerminalStation(c, w * 0.94, h * 0.20);
  }

  function drawSingleAlpinePeak(c, apexX, apexY, baseLeftX, baseRightX, baseY, scale = 1.0) {
    // Shadowed western face
    c.fillStyle = 'rgba(16, 26, 42, 0.95)';
    c.beginPath();
    c.moveTo(apexX, apexY);
    c.lineTo(baseLeftX, baseY);
    c.lineTo(apexX + (baseRightX - apexX) * 0.12, baseY);
    c.closePath();
    c.fill();

    // Moonlit eastern face
    c.fillStyle = 'rgba(28, 44, 68, 0.92)';
    c.beginPath();
    c.moveTo(apexX, apexY);
    c.lineTo(apexX + (baseRightX - apexX) * 0.12, baseY);
    c.lineTo(baseRightX, baseY);
    c.closePath();
    c.fill();

    // Pristine Snow Cap & Glacial Cirque
    c.fillStyle = 'rgba(248, 250, 252, 0.96)';
    c.beginPath();
    c.moveTo(apexX, apexY);
    c.lineTo(apexX - (apexX - baseLeftX) * 0.32, apexY + (baseY - apexY) * 0.32);
    c.lineTo(apexX - (apexX - baseLeftX) * 0.18, apexY + (baseY - apexY) * 0.38);
    c.lineTo(apexX + (baseRightX - apexX) * 0.05, apexY + (baseY - apexY) * 0.44);
    c.lineTo(apexX + (baseRightX - apexX) * 0.22, apexY + (baseY - apexY) * 0.35);
    c.lineTo(apexX + (baseRightX - apexX) * 0.34, apexY + (baseY - apexY) * 0.32);
    c.closePath();
    c.fill();

    // Cool ice-blue crevasse highlight
    c.strokeStyle = 'rgba(186, 230, 253, 0.8)';
    c.lineWidth = 1.2;
    c.beginPath();
    c.moveTo(apexX, apexY);
    c.lineTo(apexX + (baseRightX - apexX) * 0.05, apexY + (baseY - apexY) * 0.44);
    c.stroke();
  }

  function drawAlpinePine(c, x, y, size) {
    c.save();
    c.translate(x, y);

    // Trunk
    c.fillStyle = 'rgba(30, 24, 20, 0.9)';
    c.fillRect(-1.5, 0, 3, size * 0.3);

    // 3 tiered evergreen foliage triangles
    c.fillStyle = 'rgba(14, 28, 32, 0.95)';
    c.strokeStyle = 'rgba(203, 213, 225, 0.25)';
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

    // Terminal Platform buffer / bumper
    c.fillStyle = 'rgba(51, 65, 85, 0.95)';
    c.fillRect(-8, -10, 16, 20);

    c.strokeStyle = 'rgba(239, 68, 68, 0.9)';
    c.lineWidth = 2;
    c.beginPath();
    c.moveTo(-6, -8);
    c.lineTo(6, 8);
    c.moveTo(-6, 8);
    c.lineTo(6, -8);
    c.stroke();

    // Platform wooden awning
    c.fillStyle = 'rgba(30, 41, 59, 0.95)';
    c.beginPath();
    c.moveTo(-20, -18);
    c.lineTo(16, -26);
    c.lineTo(24, -22);
    c.lineTo(-12, -14);
    c.closePath();
    c.fill();

    // Warm glowing platform lantern (welcoming beacon)
    const lanternGrad = c.createRadialGradient(8, -12, 1, 8, -12, 28);
    lanternGrad.addColorStop(0, 'rgba(254, 240, 138, 0.98)');
    lanternGrad.addColorStop(0.35, 'rgba(251, 191, 36, 0.55)');
    lanternGrad.addColorStop(1, 'rgba(251, 191, 36, 0)');

    c.fillStyle = lanternGrad;
    c.beginPath();
    c.arc(8, -12, 28, 0, Math.PI * 2);
    c.fill();

    // Signal Mast with green terminal light
    c.fillStyle = 'rgba(15, 23, 42, 0.95)';
    c.fillRect(-24, -30, 3, 22);

    c.fillStyle = 'rgba(52, 211, 153, 0.95)';
    c.shadowColor = 'rgba(52, 211, 153, 0.8)';
    c.shadowBlur = 8;
    c.beginPath();
    c.arc(-22.5, -27, 2.5, 0, Math.PI * 2);
    c.fill();

    c.restore();
  }

  function drawRailwayTrack(c) {
    if (trackSamples.length < 2) return;

    // 1. Dark gravel ballast bed
    c.save();
    c.beginPath();
    c.moveTo(trackSamples[0].x, trackSamples[0].y);
    for (let i = 1; i < trackSamples.length; i++) {
      c.lineTo(trackSamples[i].x, trackSamples[i].y);
    }
    c.strokeStyle = 'rgba(15, 23, 42, 0.68)';
    c.lineWidth = 14;
    c.lineCap = 'round';
    c.lineJoin = 'round';
    c.stroke();

    // 2. Sleepers (Railway Cross-Ties) spaced every 11px
    c.strokeStyle = 'rgba(148, 163, 184, 0.38)';
    c.lineWidth = 2.2;
    for (let d = 0; d < trackTotalLength; d += 11) {
      const pt = getTrackPoint(d);
      c.beginPath();
      c.moveTo(pt.x - pt.nx * 6.5, pt.y - pt.ny * 6.5);
      c.lineTo(pt.x + pt.nx * 6.5, pt.y + pt.ny * 6.5);
      c.stroke();
    }

    // 3. Double Steel Rails (Gauge = 7px, +3.5 and -3.5 from center)
    // Left Rail
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
    c.strokeStyle = 'rgba(226, 232, 240, 0.75)';
    c.lineWidth = 1.4;
    c.stroke();

    // Right Rail
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

    // Rail Top Gleam highlight
    c.strokeStyle = 'rgba(255, 255, 255, 0.38)';
    c.lineWidth = 0.6;
    c.stroke();

    c.restore();
  }

  function drawArticulatedTrain(c, distortionAlpha, dt) {
    if (trackTotalLength <= 0) return;

    // Movement: If arrived at terminal, stay smoothly docked
    if (isArrived) {
      trainLeadDistance = trackTotalLength - 28;
    } else {
      const baseTrainSpeed = 38; // px/sec
      const trainSpeed = baseTrainSpeed * (1.0 + Math.pow(distortionAlpha, 1.2) * 3.5);
      trainLeadDistance = (trainLeadDistance + trainSpeed * dt) % trackTotalLength;
    }

    // Train composition:
    // Lead Locomotive (32px) + 3 Passenger Carriages (28px each) + 4px gangway gaps
    const dLoco = trainLeadDistance - 16;
    const dCar1 = trainLeadDistance - 50;
    const dCar2 = trainLeadDistance - 82;
    const dCar3 = trainLeadDistance - 114;

    const cars = [
      { type: 'car', dist: dCar3, num: 3 },
      { type: 'car', dist: dCar2, num: 2 },
      { type: 'car', dist: dCar1, num: 1 },
      { type: 'loco', dist: dLoco, num: 0 },
    ];

    // 1. Draw connecting gangway bellows between carriages
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

    // 2. Draw Locomotive Headlight Beam projecting forward along rails
    const locoPt = getTrackPoint(dLoco);
    c.save();
    c.translate(locoPt.x, locoPt.y);
    c.rotate(locoPt.angle);

    const beamGrad = c.createRadialGradient(16, 0, 4, 60, 0, 75);
    beamGrad.addColorStop(0, 'rgba(254, 240, 138, 0.45)');
    beamGrad.addColorStop(0.5, 'rgba(254, 240, 138, 0.20)');
    beamGrad.addColorStop(1, 'rgba(254, 240, 138, 0)');

    c.fillStyle = beamGrad;
    c.beginPath();
    c.moveTo(16, -2);
    c.lineTo(82, -26);
    c.lineTo(82, 26);
    c.lineTo(16, 2);
    c.closePath();
    c.fill();
    c.restore();

    // 3. Draw Passenger Carriages (cars 3, 2, 1)
    for (let i = 0; i < 3; i++) {
      const car = cars[i];
      const pt = getTrackPoint(car.dist);
      c.save();
      c.translate(pt.x, pt.y);
      c.rotate(pt.angle);

      // Chassis shadow
      c.fillStyle = 'rgba(0, 0, 0, 0.4)';
      c.fillRect(-13, -5, 26, 10);

      // Carriage Body (Eurofima: Silver-gray with ÖBB Crimson accent)
      c.fillStyle = 'rgba(203, 213, 225, 0.96)';
      c.beginPath();
      c.roundRect(-14, -4.5, 28, 9, 2);
      c.fill();

      // ÖBB Crimson Window Stripe
      c.fillStyle = 'rgba(225, 29, 72, 0.95)';
      c.fillRect(-14, -2.5, 28, 5);

      // 4 Warm Glowing Passenger Windows
      c.fillStyle = 'rgba(253, 224, 71, 0.92)';
      c.shadowColor = 'rgba(253, 224, 71, 0.8)';
      c.shadowBlur = 4;
      for (let w = 0; w < 4; w++) {
        const wx = -10 + w * 6.5;
        c.fillRect(wx, -1.8, 4.2, 3.6);
      }
      c.shadowBlur = 0;

      // Dark graphite roof
      c.fillStyle = 'rgba(30, 41, 59, 0.95)';
      c.fillRect(-13.5, -4.5, 27, 1.2);

      c.restore();
    }

    // 4. Draw Taurus Locomotive (Car 0)
    c.save();
    c.translate(locoPt.x, locoPt.y);
    c.rotate(locoPt.angle);

    // Locomotive Body (ÖBB Traffic Red)
    c.fillStyle = 'rgba(225, 29, 72, 0.98)';
    c.beginPath();
    // Aerodynamic curved nose on forward right (+X)
    c.moveTo(-15, -4.8);
    c.lineTo(11, -4.8);
    c.quadraticCurveTo(16, -4, 16, 0);
    c.quadraticCurveTo(16, 4, 11, 4.8);
    c.lineTo(-15, 4.8);
    c.closePath();
    c.fill();

    // Dark graphite aerodynamic cab roof
    c.fillStyle = 'rgba(30, 41, 59, 0.98)';
    c.fillRect(-14, -3.2, 22, 6.4);

    // Windshield (Front cab glass)
    c.fillStyle = 'rgba(186, 230, 253, 0.9)';
    c.fillRect(8, -3.5, 4, 7);

    // Metal Pantographs on roof
    c.strokeStyle = 'rgba(148, 163, 184, 0.85)';
    c.lineWidth = 1;
    c.beginPath();
    c.moveTo(-8, -3);
    c.lineTo(-5, -6);
    c.lineTo(-2, -3);
    c.moveTo(2, -3);
    c.lineTo(5, -6);
    c.lineTo(8, -3);
    c.stroke();

    // Twin High-Intensity Headlights + Center Lantern
    c.fillStyle = 'rgba(255, 255, 255, 0.98)';
    c.shadowColor = 'rgba(254, 240, 138, 0.95)';
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

    // 1. Alpine Twilight Sky & Starfield
    drawAlpineSkyAndStars(trainCtx, width, height, trainAnimTime);

    // 2. Venetian Lagoon Departure Area (Bottom-Left)
    drawVeniceLagoon(trainCtx, width, height, trainAnimTime);

    // 3. Alpine Mountain Massifs & Terminal Station (Top-Right)
    drawAlpineMountains(trainCtx, width, height);

    // 4. Sinuous Railway Track
    drawRailwayTrack(trainCtx);

    // 5. Articulated ÖBB Passenger Express Train
    drawArticulatedTrain(trainCtx, distortionAlpha, dt);
  }

  // =========================================================================
  // Section 2: Reverse Countdown Chronometer Engine
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
      // Terminal destination reached!
      isArrived = true;
      arrivalBanner.classList.remove('hidden');
      countdownView.style.opacity = '0.35';

      countDays.textContent = '000';
      countHours.textContent = '00';
      countMinutes.textContent = '00';
      countSeconds.textContent = '00';
      countMillis.textContent = '000';
      countMicros.textContent = '000';

      countdownStatus.textContent = 'DESTINATION REACHED • SEP 11, 20:36';
      countdownStatus.style.color = '#38bdf8';

      realRemainingDisplay.textContent = '0d 00h 00m 00s (Arrived)';
      subjectiveRemainingDisplay.textContent = '0d 00h 00m 00s (Arrived)';
      trainProgressDisplay.textContent = '100.0% (Terminal Station)';
      return;
    }

    // Journey in progress
    isArrived = false;
    arrivalBanner.classList.add('hidden');
    countdownView.style.opacity = '1.0';

    // Reverse time dilation: perceived remaining time shrinks by effectiveRatio
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

    // Dynamic subtitle feedback
    if (alpha <= 0.05) {
      countdownStatus.textContent = 'Objective Reality (1.00× Real-Time Arrival Clock)';
      countdownStatus.style.color = 'var(--text-silver-muted)';
    } else if (alpha >= 0.95) {
      countdownStatus.textContent = 'Our Time: 7.0× Compression (1 Day = 1 Week)';
      countdownStatus.style.color = '#38bdf8';
    } else {
      countdownStatus.textContent = `${effectiveRatio.toFixed(2)}× Subjective Arrival Compression`;
      countdownStatus.style.color = '#7dd3fc';
    }

    // Scientific Tickers
    realRemainingDisplay.textContent = formatDuration(realRemainingMs);
    subjectiveRemainingDisplay.textContent = formatDuration(realRemainingMs / effectiveRatio);

    const trackPct = trackTotalLength > 0 ? ((trainLeadDistance / trackTotalLength) * 100).toFixed(1) : '0.0';
    trainProgressDisplay.textContent = `${trackPct}% (Alpine Line)`;
  }

  function formatDuration(ms) {
    if (ms <= 0) return '0d 00h 00m 00s';
    const totalSec = Math.floor(ms / 1000);
    const d = Math.floor(totalSec / SECONDS_PER_DAY);
    const h = Math.floor((totalSec % SECONDS_PER_DAY) / 3600);
    const m = Math.floor((totalSec % 3600) / 60);
    const s = totalSec % 60;
    return `${d}d ${pad(h, 2)}h ${pad(m, 2)}m ${pad(s, 2)}s`;
  }

  // =========================================================================
  // Main Animation & Chronometer Loop
  // =========================================================================

  function mainLoop(now) {
    const dt = (now - state.lastFramePerf) / 1000;
    state.lastFramePerf = now;

    // 1. Calculate Real Elapsed Microseconds since Aug 26, 2026
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
        // Include high-precision fraction using performance.now()
        const subMsFraction = (performance.now() % 1);
        realElapsedMicros = (elapsedMs + subMsFraction) * 1000;
      }
    }

    const realDays = realElapsedMicros / (SECONDS_PER_DAY * 1e6);

    // 2. Calculate Perceived / Dilated Microseconds
    const alpha = state.sliderValue;
    const perceivedMicros = calculatePerceivedMicros(realElapsedMicros, alpha);
    const effectiveRatio = realElapsedMicros > 0 ? (perceivedMicros / realElapsedMicros) : 1.0;

    // 3. Update Section 1 UI Units ("Since We Met")
    const parts = decomposeMicros(perceivedMicros);

    valYears.textContent = pad(parts.years, 2);
    valDays.textContent = pad(parts.days, 3);
    valHours.textContent = pad(parts.hours, 2);
    valMinutes.textContent = pad(parts.minutes, 2);
    valSeconds.textContent = pad(parts.seconds, 2);
    valMillis.textContent = pad(parts.millis, 3);
    valMicros.textContent = pad(parts.micros, 3);

    // Scientific readouts
    totalMicrosDisplay.textContent = Math.floor(perceivedMicros).toLocaleString();

    // Equivalent calendar date
    const equivalentTimestamp = ORIGIN_DATE.getTime() + (perceivedMicros / 1000);
    const eqDate = new Date(equivalentTimestamp);
    equivalentDateDisplay.textContent = eqDate.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    }) + ` ${pad(eqDate.getHours(), 2)}:${pad(eqDate.getMinutes(), 2)}:${pad(eqDate.getSeconds(), 2)}`;

    // Update Bins view if visible
    if (state.viewMode === 'bins') {
      updateBinsGrid(perceivedMicros);
    }

    // Dynamic Header & Status
    updateHeaderAndLabels(alpha, realDays, effectiveRatio);

    // Render Canvas Atmosphere with Seasonal Delta Time (Section 1)
    renderAtmosphere(alpha, dt);

    // 4. Update Section 2 Reverse Countdown & Train Atmosphere
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

  // Preset Buttons
  btnPresetReal.addEventListener('click', () => setSliderValue(0));
  btnPresetWeek.addEventListener('click', () => setSliderValue(0.5));
  btnPresetOur.addEventListener('click', () => setSliderValue(1.0));

  // Toggle View Mode (Chronological vs Base-10 Bins)
  btnToggleView.addEventListener('click', () => {
    if (state.viewMode === 'chrono') {
      state.viewMode = 'bins';
      chronoView.classList.add('hidden');
      binsView.classList.remove('hidden');
      btnToggleView.innerHTML = '<span class="btn-icon">⏱</span> Standard Units';
    } else {
      state.viewMode = 'chrono';
      binsView.classList.add('hidden');
      chronoView.classList.remove('hidden');
      btnToggleView.innerHTML = '<span class="btn-icon">❖</span> Toggle Base-10 Bins';
    }
  });

  // Pause / Resume
  btnPauseResume.addEventListener('click', () => {
    state.isPaused = !state.isPaused;
    if (state.isPaused) {
      const liveNowMs = Date.now();
      const originMs = ORIGIN_DATE.getTime();
      state.pausedTimeMicros = (liveNowMs - originMs) * 1000;
      btnPauseResume.innerHTML = '<span class="btn-icon">▶</span> Resume';
      btnPauseResume.style.borderColor = 'rgba(255, 255, 255, 0.4)';
    } else {
      btnPauseResume.innerHTML = '<span class="btn-icon">⏸</span> Pause';
      btnPauseResume.style.borderColor = '';
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

  // Warp Presets (1d, 3d, 7d, 9d, etc.)
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
  setSliderValue(0); // Start at Real Time

  // Calculate initial elapsed days from Aug 26 to pre-populate warp slider
  const initialDays = (Date.now() - ORIGIN_DATE.getTime()) / (SECONDS_PER_DAY * 1000);
  if (initialDays > 0) {
    warpDaysSlider.value = initialDays.toFixed(2);
    warpDaysVal.textContent = initialDays.toFixed(2);
  }

  // Start Animation Loop
  requestAnimationFrame(mainLoop);

})();
