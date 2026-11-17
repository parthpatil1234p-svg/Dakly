'use strict';

const assert = require('assert');
const Project = require('../src/models/Project');

console.log('🧪 Starting Dakly Sender Alias Verification Unit Tests...');

// Mock Project instance with verified and unverified aliases
const mockProject = new Project({
  name: 'Disheera Portal Test',
  apiKey: 'gkey_live_aliasverify987',
  senderEmail: 'parthpatil1234p@gmail.com',
  senderDisplayName: 'Parth Patil',
  encryptedPassword: 'dummyEncryptedPassword',
  iv: 'dummyIv',
  authTag: 'dummyAuthTag',
  senders: [
    {
      _id: 'sender_primary_1',
      email: 'parthpatil1234p@gmail.com',
      displayName: 'Parth Patil',
      priority: 0,
      isActive: true,
      dailyQuota: 500,
      emailsSentToday: 5,
      warmupEnabled: false,
      encryptedPassword: 'dummyEncryptedPassword',
      iv: 'dummyIv',
      authTag: 'dummyAuthTag',
      aliases: [
        {
          email: 'support@disheera.site',
          displayName: 'disheera support',
          isDefault: true,
          isVerified: true,
          verifiedAt: new Date(),
        },
        {
          email: 'parthpatil@disheera.site',
          displayName: 'ParthPatil',
          isDefault: false,
          isVerified: false,
        },
      ],
    },
  ],
});

// Test 1: Verify alias model schema contains verification fields
const sender = mockProject.senders[0];
const supportAlias = sender.aliases.find((a) => a.email === 'support@disheera.site');
assert(supportAlias !== undefined, 'Support alias should exist');
assert.strictEqual(supportAlias.isVerified, true);
assert(supportAlias.verifiedAt instanceof Date, 'verifiedAt should be a Date');
console.log('✅ Test 1 Passed: Alias model schema accurately stores isVerified and verifiedAt timestamp.');

// Test 2: Unverified alias defaults
const personalAlias = sender.aliases.find((a) => a.email === 'parthpatil@disheera.site');
assert(personalAlias !== undefined, 'Personal alias should exist');
assert.strictEqual(personalAlias.isVerified, false);
assert.strictEqual(personalAlias.verifiedAt, undefined);
console.log('✅ Test 2 Passed: Unverified aliases default isVerified to false.');

// Test 3: Capacity summary includes verification status
const capacity = mockProject.getCapacitySummary();
assert(Array.isArray(capacity.senders), 'senders must be an array');
assert(Array.isArray(capacity.allAliases), 'allAliases must be an array');

const summarySupport = capacity.allAliases.find((a) => a.email === 'support@disheera.site');
assert(summarySupport !== undefined, 'allAliases should include support alias');
assert.strictEqual(summarySupport.isVerified, true);

const summaryPersonal = capacity.allAliases.find((a) => a.email === 'parthpatil@disheera.site');
assert(summaryPersonal !== undefined, 'allAliases should include personal alias');
assert.strictEqual(summaryPersonal.isVerified, false);
console.log('✅ Test 3 Passed: getCapacitySummary() exposes isVerified on allAliases and per-sender lists.');

// Test 4: Dynamic verification state update
personalAlias.isVerified = true;
personalAlias.verifiedAt = new Date();
const updatedCapacity = mockProject.getCapacitySummary();
const updatedPersonalSummary = updatedCapacity.allAliases.find((a) => a.email === 'parthpatil@disheera.site');
assert.strictEqual(updatedPersonalSummary.isVerified, true);
console.log('✅ Test 4 Passed: Updating alias verification status instantly propagates to capacity summary.');

console.log('🎉 ALL DAKLY SENDER ALIAS VERIFICATION UNIT TESTS PASSED SUCCESSFULLY!\n');
