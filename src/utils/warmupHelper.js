/**
 * Dakly Smart Email Warm-up & Bounce Protection Helper
 * Manages progressive ramp-up schedules for Gmail senders
 * and detects SMTP hard bounces.
 */

// Progressive Gmail ramp-up schedule (Emails allowed per 24h window)
const WARMUP_SCHEDULE = [
  { day: 1, limit: 25 },
  { day: 2, limit: 50 },
  { day: 3, limit: 100 },
  { day: 4, limit: 200 },
  { day: 5, limit: 350 },
  { day: 6, limit: 500 }, // Day 6+ is considered fully warmed up
];

/**
 * Calculates progressive warm-up stage and effective sending limit
 * @param {Date|string|number} startedAt - When warm-up was started
 * @param {number} dailyQuota - Max configured daily quota (typically 500 for Gmail)
 * @returns {Object} Warmup stage metadata and effective limit
 */
function calculateWarmupStage(startedAt, dailyQuota = 500) {
  if (!startedAt) {
    return {
      enabled: false,
      day: 6,
      stage: 'WARMED_UP',
      effectiveQuota: dailyQuota,
      maxQuota: dailyQuota,
      isComplete: true,
      progressPercent: 100,
    };
  }

  const start = new Date(startedAt);
  const now = new Date();
  const diffMs = Math.max(0, now.getTime() - start.getTime());
  const elapsedDays = Math.floor(diffMs / (1000 * 60 * 60 * 24)) + 1; // 1-indexed

  let warmupLimit = 500;
  if (elapsedDays === 1) warmupLimit = 25;
  else if (elapsedDays === 2) warmupLimit = 50;
  else if (elapsedDays === 3) warmupLimit = 100;
  else if (elapsedDays === 4) warmupLimit = 200;
  else if (elapsedDays === 5) warmupLimit = 350;
  else warmupLimit = 500;

  const effectiveQuota = Math.min(warmupLimit, dailyQuota);
  const isComplete = elapsedDays >= 6;
  const progressPercent = Math.min(100, Math.round((Math.min(elapsedDays, 6) / 6) * 100));

  return {
    enabled: true,
    day: Math.min(elapsedDays, 6),
    elapsedDays,
    stage: isComplete ? 'WARMED_UP' : `DAY_${elapsedDays}`,
    effectiveQuota,
    maxQuota: dailyQuota,
    isComplete,
    progressPercent,
  };
}

/**
 * Detects whether an SMTP error constitutes a hard bounce or permanent mailbox failure
 * @param {string} errorMsg - Nodemailer error message or code
 * @returns {boolean} True if hard bounce
 */
function isHardBounceError(errorMsg = '') {
  if (!errorMsg || typeof errorMsg !== 'string') return false;
  const lower = errorMsg.toLowerCase();

  return (
    lower.includes('550') || // 550 5.1.1 User unknown / does not exist
    lower.includes('551') || // User not local
    lower.includes('552') || // Mailbox storage exceeded
    lower.includes('553') || // Mailbox name not allowed / invalid address format
    lower.includes('554') || // Delivery failure / recipient rejected
    lower.includes('does not exist') ||
    lower.includes('no such user') ||
    lower.includes('user unknown') ||
    lower.includes('invalid recipient') ||
    lower.includes('recipient address rejected') ||
    lower.includes('mailbox unavailable') ||
    lower.includes('address rejected') ||
    lower.includes('account disabled') ||
    lower.includes('undeliverable')
  );
}

module.exports = {
  WARMUP_SCHEDULE,
  calculateWarmupStage,
  isHardBounceError,
};
