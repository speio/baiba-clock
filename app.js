/**
 * Baiba Clock — "Since We Met"
 * Relativistic Chronometer anchored to August 26, 2026.
 * 
 * Permanently frozen in monochrome as of October 6, 2026.
 * All counters stopped; background canvas and controls removed.
 */

(function() {
  'use strict';

  // Frozen timestamps & values (as of October 6, 2026 09:40:08 Local)
  const FROZEN_STATE = {
    inkling: {
      years: '00',
      days: '041',
      hours: '09',
      minutes: '40',
      seconds: '08',
      millis: '000',
      micros: '000'
    },
    brush: {
      years: '00',
      days: '034',
      hours: '14',
      minutes: '20',
      seconds: '08',
      millis: '000',
      micros: '000'
    },
    countdown: {
      years: '00',
      days: '000',
      hours: '00',
      minutes: '00',
      seconds: '00',
      millis: '000',
      micros: '000'
    }
  };

  function applyFrozenValues() {
    // 1. First Inkling
    const elYearsInkling = document.getElementById('valYearsInkling');
    const elDaysInkling = document.getElementById('valDaysInkling');
    const elHoursInkling = document.getElementById('valHoursInkling');
    const elMinutesInkling = document.getElementById('valMinutesInkling');
    const elSecondsInkling = document.getElementById('valSecondsInkling');
    const elMillisInkling = document.getElementById('valMillisInkling');
    const elMicrosInkling = document.getElementById('valMicrosInkling');

    if (elYearsInkling) elYearsInkling.textContent = FROZEN_STATE.inkling.years;
    if (elDaysInkling) elDaysInkling.textContent = FROZEN_STATE.inkling.days;
    if (elHoursInkling) elHoursInkling.textContent = FROZEN_STATE.inkling.hours;
    if (elMinutesInkling) elMinutesInkling.textContent = FROZEN_STATE.inkling.minutes;
    if (elSecondsInkling) elSecondsInkling.textContent = FROZEN_STATE.inkling.seconds;
    if (elMillisInkling) elMillisInkling.textContent = FROZEN_STATE.inkling.millis;
    if (elMicrosInkling) elMicrosInkling.textContent = FROZEN_STATE.inkling.micros;

    // 2. First Brush
    const elYearsBrush = document.getElementById('valYearsBrush');
    const elDaysBrush = document.getElementById('valDaysBrush');
    const elHoursBrush = document.getElementById('valHoursBrush');
    const elMinutesBrush = document.getElementById('valMinutesBrush');
    const elSecondsBrush = document.getElementById('valSecondsBrush');
    const elMillisBrush = document.getElementById('valMillisBrush');
    const elMicrosBrush = document.getElementById('valMicrosBrush');

    if (elYearsBrush) elYearsBrush.textContent = FROZEN_STATE.brush.years;
    if (elDaysBrush) elDaysBrush.textContent = FROZEN_STATE.brush.days;
    if (elHoursBrush) elHoursBrush.textContent = FROZEN_STATE.brush.hours;
    if (elMinutesBrush) elMinutesBrush.textContent = FROZEN_STATE.brush.minutes;
    if (elSecondsBrush) elSecondsBrush.textContent = FROZEN_STATE.brush.seconds;
    if (elMillisBrush) elMillisBrush.textContent = FROZEN_STATE.brush.millis;
    if (elMicrosBrush) elMicrosBrush.textContent = FROZEN_STATE.brush.micros;

    // 3. Nearness (Countdown Completed)
    const countYears = document.getElementById('countYears');
    const countDays = document.getElementById('countDays');
    const countHours = document.getElementById('countHours');
    const countMinutes = document.getElementById('countMinutes');
    const countSeconds = document.getElementById('countSeconds');
    const countMillis = document.getElementById('countMillis');
    const countMicros = document.getElementById('countMicros');
    const arrivalBanner = document.getElementById('arrivalBanner');

    if (countYears) countYears.textContent = FROZEN_STATE.countdown.years;
    if (countDays) countDays.textContent = FROZEN_STATE.countdown.days;
    if (countHours) countHours.textContent = FROZEN_STATE.countdown.hours;
    if (countMinutes) countMinutes.textContent = FROZEN_STATE.countdown.minutes;
    if (countSeconds) countSeconds.textContent = FROZEN_STATE.countdown.seconds;
    if (countMillis) countMillis.textContent = FROZEN_STATE.countdown.millis;
    if (countMicros) countMicros.textContent = FROZEN_STATE.countdown.micros;
    if (arrivalBanner) arrivalBanner.classList.remove('hidden');
  }

  // Set the values once upon load — no dynamic intervals or frame updates.
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', applyFrozenValues);
  } else {
    applyFrozenValues();
  }
})();
