/**
 * Baiba Clock — "Our Time" Dilation Engine
 * Relativistic Relationship Chronometer anchored to August 26, 2026.
 * 
 * Math:
 * - Origin: August 26, 2026 00:00:00 Local
 * - Dilation Anchors:
 *     7 real days  => 1 subjective year  (365.2425 days, ~52.18x speed)
 *     9 real days  => 20 subjective years (7304.85 days, ~811.65x speed)
 * - Power-law non-linear slider blending between Objective Reality and "Our Time".
 * - Surreal animated canvas with abstract Soviet farm flecks, goats, 2 dogs, 4 cats.
 */

(function() {
  'use strict';

  // --- Constants & Config ---
  const ORIGIN_DATE = new Date(2026, 7, 26, 0, 0, 0); // Month 7 is August (0-indexed)
  const SECONDS_PER_DAY = 86400;
  const DAYS_PER_YEAR = 365.2425;
  const SECONDS_PER_YEAR = DAYS_PER_YEAR * SECONDS_PER_DAY; // ~31,556,952 s

  // Anchor Ratios
  const RATIO_7D = DAYS_PER_YEAR / 7; // ~52.1775
  const RATIO_9D = (20 * DAYS_PER_YEAR) / 9; // ~811.65

  // Power law exponent gamma: (9/7)^(gamma - 1) = RATIO_9D / RATIO_7D => gamma - 1 ≈ 10.92
  const GAMMA_MINUS_ONE = Math.log(RATIO_9D / RATIO_7D) / Math.log(9 / 7);

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

  // DOM Elements
  const clockTitle = document.getElementById('clockTitle');
  const dilationStatus = document.getElementById('dilationStatus');
  const slider = document.getElementById('distortionSlider');
  const sliderProgress = document.getElementById('sliderProgress');
  const sliderBadge = document.getElementById('sliderValueBadge');
  const totalMicrosDisplay = document.getElementById('totalMicrosDisplay');
  const equivalentDateDisplay = document.getElementById('equivalentDateDisplay');
  const animalSpeedDisplay = document.getElementById('animalSpeedDisplay');

  // Digit Elements
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

  // Canvas
  const canvas = document.getElementById('farmCanvas');
  const ctx = canvas.getContext('2d');

  // =========================================================================
  // Math: Calculate Subjective Perceived Time
  // =========================================================================

  /**
   * Calculates the target "Our Time" ratio for a given elapsed real time in days.
   * Smooth continuous curve anchored at 7d => 1yr and 9d => 20yr.
   */
  function getOurTimeMultiplier(realDays) {
    if (realDays <= 0) return 1.0;

    // Up to 7 days, subjective pace is at least RATIO_7D (~52.18x)
    if (realDays <= 7.0) {
      // Smoothly ramps up from ~52.18x baseline relationship intensity
      return RATIO_7D;
    }

    // Between 7 days and beyond: surges via power law to hit RATIO_9D at exactly day 9
    const ratio = Math.pow(realDays / 7.0, GAMMA_MINUS_ONE) * RATIO_7D;
    return ratio;
  }

  /**
   * Calculates perceived elapsed microseconds given real elapsed microseconds and slider alpha.
   */
  function calculatePerceivedMicros(realMicros, alpha) {
    if (realMicros <= 0) return 0;
    if (alpha <= 0.0001) return realMicros;

    const realDays = realMicros / (SECONDS_PER_DAY * 1e6);
    const ourRatio = getOurTimeMultiplier(realDays);

    // Apply non-linear power law blend between 1.0 and ourRatio
    // effectiveRatio = (ourRatio)^alpha
    const effectiveRatio = Math.pow(ourRatio, alpha);
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
    // Title transitions
    if (alpha <= 0.05) {
      clockTitle.textContent = 'REAL TIME';
      dilationStatus.textContent = '1.0000× — Objective Reality';
      clockTitle.style.color = '#ffffff';
    } else if (alpha < 0.45) {
      clockTitle.textContent = 'PERCEPTUAL DRIFT';
      dilationStatus.textContent = `${effectiveRatio.toFixed(2)}× — Subtle Dilation`;
      clockTitle.style.color = '#e2e8f0';
    } else if (alpha < 0.85) {
      clockTitle.textContent = 'DEEP DILATION';
      dilationStatus.textContent = `${effectiveRatio.toFixed(1)}× — 1 Week = 1 Year Horizon`;
      clockTitle.style.color = '#cbd5e1';
    } else {
      clockTitle.textContent = 'OUR TIME';
      dilationStatus.textContent = `${effectiveRatio.toFixed(1)}× — 9 Days = 20 Years Horizon`;
      clockTitle.style.color = '#ffffff';
    }

    // Badge
    const pct = Math.round(alpha * 100);
    sliderBadge.textContent = `${pct}% (${effectiveRatio.toFixed(1)}×)`;

    // Animal Speed display
    const animalSpeed = 1.0 + Math.pow(alpha, 1.6) * 6.5;
    animalSpeedDisplay.textContent = `${animalSpeed.toFixed(2)}×`;

    // Presets Active State
    btnPresetReal.classList.toggle('active', alpha < 0.15);
    btnPresetWeek.classList.toggle('active', alpha >= 0.15 && alpha < 0.8);
    btnPresetOur.classList.toggle('active', alpha >= 0.8);
  }

  // =========================================================================
  // Canvas Particle & Surreal Farm Animal Engine
  // =========================================================================

  let width = 0;
  let height = 0;

  function resizeCanvas() {
    width = window.innerWidth;
    height = window.innerHeight;
    canvas.width = width * window.devicePixelRatio;
    canvas.height = height * window.devicePixelRatio;
    ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
  }
  window.addEventListener('resize', resizeCanvas);

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

    draw(ctx, groundX, groundY, distortionAlpha, timeNow) {
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
      const sway = Math.sin(timeNow * 0.0018 + this.swayPhase) * (5 + distortionAlpha * 5);

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
        const bSway = Math.sin(timeNow * 0.0022 + this.swayPhase + i) * 3;
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
          const leafScale = leafDensity * (0.85 + Math.sin(timeNow * 0.003 + i) * 0.15);

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

    draw(ctx, groundX, groundY, distortionAlpha, timeNow) {
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
      const sway = Math.sin(timeNow * 0.0025 + this.swayPhase) * (this.archDirection * 8 + distortionAlpha * 6);

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

    // Speed multiplier scales with slider
    const animalSpeed = 1.0 + Math.pow(distortionAlpha, 1.6) * 6.5;
    // Seasonal multiplier: 1x at Real Time -> up to ~36x at Our Time
    const seasonalSpeed = 1.0 + Math.pow(distortionAlpha, 1.6) * 35.0;
    const timeNow = Date.now();
    const horizonY = height * 0.72;

    // 1. Draw subtle abstract Soviet farm nature flecks
    for (let i = 0; i < flecks.length; i++) {
      const f = flecks[i];
      f.x += f.vx * (1.0 + distortionAlpha * 2.0);
      f.y += f.vy * (1.0 + distortionAlpha * 1.5);
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

    // 2. Draw surreal rolling pasture horizon lines (soft minimal hairlines)
    ctx.save();
    ctx.strokeStyle = `rgba(255, 255, 255, ${0.04 + distortionAlpha * 0.05})`;
    ctx.lineWidth = 1.0;
    ctx.beginPath();
    ctx.moveTo(0, horizonY);
    for (let x = 0; x <= width; x += 40) {
      const dy = Math.sin(x * 0.003 + timeNow * 0.0004 * animalSpeed) * 12;
      ctx.lineTo(x, horizonY + dy);
    }
    ctx.stroke();
    ctx.restore();

    // 3. Update & render Seasonal Trees (rooted on the pasture horizon)
    for (let i = 0; i < surrealTrees.length; i++) {
      const tree = surrealTrees[i];
      tree.update(dt, seasonalSpeed);
      const treeX = width * tree.xRatio;
      const dy = Math.sin(treeX * 0.003 + timeNow * 0.0004 * animalSpeed) * 12;
      tree.draw(ctx, treeX, horizonY + dy, distortionAlpha, timeNow);
    }

    // 4. Update & render Seasonal Meadow Plants & Rye
    for (let i = 0; i < surrealPlants.length; i++) {
      const plant = surrealPlants[i];
      plant.update(dt, seasonalSpeed);
      const plantX = width * plant.xRatio;
      const dy = Math.sin(plantX * 0.003 + timeNow * 0.0004 * animalSpeed) * 12;
      plant.draw(ctx, plantX, horizonY + dy + 4, distortionAlpha, timeNow);
    }

    // 5. Update & render Falling/Drifting Leaves
    for (let i = fallingLeaves.length - 1; i >= 0; i--) {
      const leaf = fallingLeaves[i];
      leaf.x += leaf.vx * (1.0 + distortionAlpha * 2.5);
      leaf.y += leaf.vy + Math.sin(timeNow * 0.004 + leaf.angle) * 0.6;
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

    // 3. Update UI Units
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

    // Render Canvas Atmosphere with Seasonal Delta Time
    renderAtmosphere(alpha, dt);

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
  resizeCanvas();
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
