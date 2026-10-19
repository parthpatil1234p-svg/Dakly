const assert = require('assert');
const { calculateWarmupStage, isHardBounceError, WARMUP_SCHEDULE } = require('../src/utils/warmupHelper');

// 1. Warm-up schedule structure
assert.strictEqual(WARMUP_SCHEDULE.length, 6);
assert.strictEqual(WARMUP_SCHEDULE[0].limit, 25);
assert.strictEqual(WARMUP_SCHEDULE[1].limit, 50);
assert.strictEqual(WARMUP_SCHEDULE[2].limit, 100);
assert.strictEqual(WARMUP_SCHEDULE[3].limit, 200);
assert.strictEqual(WARMUP_SCHEDULE[4].limit, 350);
assert.strictEqual(WARMUP_SCHEDULE[5].limit, 500);

// 2. Warm-up stage calculation
const now = Date.now();
const oneDayMs = 24 * 60 * 60 * 1000;

// Day 1
const stageDay1 = calculateWarmupStage(new Date(now));
assert.strictEqual(stageDay1.day, 1);
assert.strictEqual(stageDay1.effectiveQuota, 25);
assert.strictEqual(stageDay1.isComplete, false);

// Day 2
const stageDay2 = calculateWarmupStage(new Date(now - oneDayMs * 1.5));
assert.strictEqual(stageDay2.day, 2);
assert.strictEqual(stageDay2.effectiveQuota, 50);
assert.strictEqual(stageDay2.isComplete, false);

// Day 3
const stageDay3 = calculateWarmupStage(new Date(now - oneDayMs * 2.5));
assert.strictEqual(stageDay3.day, 3);
assert.strictEqual(stageDay3.effectiveQuota, 100);
assert.strictEqual(stageDay3.isComplete, false);

// Day 4
const stageDay4 = calculateWarmupStage(new Date(now - oneDayMs * 3.5));
assert.strictEqual(stageDay4.day, 4);
assert.strictEqual(stageDay4.effectiveQuota, 200);

// Day 5
const stageDay5 = calculateWarmupStage(new Date(now - oneDayMs * 4.5));
assert.strictEqual(stageDay5.day, 5);
assert.strictEqual(stageDay5.effectiveQuota, 350);

// Day 7 (Fully warmed up)
const stageDay7 = calculateWarmupStage(new Date(now - oneDayMs * 7));
assert.strictEqual(stageDay7.day, 6);
assert.strictEqual(stageDay7.effectiveQuota, 500);
assert.strictEqual(stageDay7.isComplete, true);
assert.strictEqual(stageDay7.stage, 'WARMED_UP');

// 3. Hard bounce detection
assert.strictEqual(isHardBounceError('550 5.1.1 The email account that you tried to reach does not exist'), true);
assert.strictEqual(isHardBounceError('553 Relaying denied: recipient address rejected'), true);
assert.strictEqual(isHardBounceError('554 5.7.1 Delivery failure'), true);
assert.strictEqual(isHardBounceError('User unknown in virtual mailbox table'), true);
assert.strictEqual(isHardBounceError('Account disabled due to violation'), true);

// Non-bounces (temporary or rate limits)
assert.strictEqual(isHardBounceError('421 4.7.0 Try again later, closing connection'), false);
assert.strictEqual(isHardBounceError('454 Temporary authentication failure'), false);
assert.strictEqual(isHardBounceError('ETIMEDOUT connection timeout to port 587'), false);

console.log('✅ ALL WARM-UP & BOUNCE SUPPRESSION TESTS PASSED SUCCESSFULLY!');
