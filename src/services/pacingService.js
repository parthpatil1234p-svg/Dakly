/**
 * Anti-Spam Burst Pacing Service for Dakly
 * Enforces safe spacing between rapid email dispatches per Gmail account.
 * Protects Gmail accounts from temporary Google spam blocks (421/454 errors).
 */

const lastSentMap = new Map();
const senderLocks = new Map();

/**
 * Ensures consecutive emails sent through the same Gmail sender account
 * maintain at least `burstPacingMs` (default 200ms) spacing.
 * Uses a promise queue per sender address to eliminate race conditions.
 *
 * @param {string} senderEmail
 * @param {number} burstPacingMs
 * @returns {Promise<void>}
 */
async function paceSender(senderEmail, burstPacingMs = 200) {
  if (!senderEmail || !burstPacingMs || burstPacingMs <= 0) {
    return;
  }

  const key = senderEmail.trim().toLowerCase();
  const currentLock = senderLocks.get(key) || Promise.resolve();

  const nextLock = currentLock
    .then(async () => {
      const lastSent = lastSentMap.get(key) || 0;
      const now = Date.now();
      const elapsed = now - lastSent;

      if (elapsed < burstPacingMs) {
        const waitTime = burstPacingMs - elapsed;
        await new Promise((resolve) => setTimeout(resolve, waitTime));
      }

      lastSentMap.set(key, Date.now());
    })
    .catch((err) => {
      console.warn(`Pacing warning for ${key}:`, err.message);
      lastSentMap.set(key, Date.now());
    });

  senderLocks.set(key, nextLock);
  await nextLock;
}

/**
 * Resets the pacing history for a sender (useful in testing)
 */
function resetPacing(senderEmail) {
  if (senderEmail) {
    const key = senderEmail.trim().toLowerCase();
    lastSentMap.delete(key);
    senderLocks.delete(key);
  } else {
    lastSentMap.clear();
    senderLocks.clear();
  }
}

module.exports = {
  paceSender,
  resetPacing,
};
