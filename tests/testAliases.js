const assert = require('assert');
const Project = require('../src/models/Project');

console.log('🧪 Starting Dakly Sender Aliases Unit Tests...');

// Mock Project instance
const mockProject = new Project({
  name: 'Test Project',
  apiKey: 'gkey_live_testalias123',
  senderEmail: 'primary@gmail.com',
  senderDisplayName: 'Primary Team',
  encryptedPassword: 'dummy',
  iv: 'dummy',
  authTag: 'dummy',
  senders: [
    {
      _id: 'sender1',
      email: 'primary@gmail.com',
      displayName: 'Primary Team',
      priority: 0,
      isActive: true,
      dailyQuota: 500,
      emailsSentToday: 10,
      warmupEnabled: false,
      encryptedPassword: 'dummy',
      iv: 'dummy',
      authTag: 'dummy',
      aliases: [
        {
          email: 'support@mycustombrand.com',
          displayName: 'Brand Support',
          isDefault: true,
        },
        {
          email: 'billing@mycustombrand.com',
          displayName: 'Brand Billing',
          isDefault: false,
        },
      ],
    },
    {
      _id: 'sender2',
      email: 'backup@gmail.com',
      displayName: 'Backup Team',
      priority: 1,
      isActive: true,
      dailyQuota: 500,
      emailsSentToday: 0,
      warmupEnabled: false,
      encryptedPassword: 'dummy',
      iv: 'dummy',
      authTag: 'dummy',
      aliases: [
        {
          email: 'sales@seconddomain.org',
          displayName: 'Global Sales',
          isDefault: false,
        },
      ],
    },
  ],
});

// Test 1: findSenderForAlias matches primary email directly
const matchPrimary = mockProject.findSenderForAlias('primary@gmail.com');
assert(matchPrimary !== null, 'Should find sender for primary email');
assert.strictEqual(matchPrimary.isAlias, false);
assert.strictEqual(matchPrimary.sender.email, 'primary@gmail.com');
console.log('✅ Test 1 Passed: findSenderForAlias matches primary account directly.');

// Test 2: findSenderForAlias matches alias on primary account (case-insensitive)
const matchSupportAlias = mockProject.findSenderForAlias('SUPPORT@MyCustomBrand.com');
assert(matchSupportAlias !== null, 'Should find sender for support alias');
assert.strictEqual(matchSupportAlias.isAlias, true);
assert.strictEqual(matchSupportAlias.sender.email, 'primary@gmail.com');
assert.strictEqual(matchSupportAlias.alias.email, 'support@mycustombrand.com');
assert.strictEqual(matchSupportAlias.alias.displayName, 'Brand Support');
console.log('✅ Test 2 Passed: findSenderForAlias matches alias case-insensitively.');

// Test 3: findSenderForAlias matches alias on backup account
const matchSalesAlias = mockProject.findSenderForAlias('sales@seconddomain.org');
assert(matchSalesAlias !== null, 'Should find sender for sales alias');
assert.strictEqual(matchSalesAlias.isAlias, true);
assert.strictEqual(matchSalesAlias.sender.email, 'backup@gmail.com');
console.log('✅ Test 3 Passed: findSenderForAlias routes to the correct backup account owning the alias.');

// Test 4: getActiveSender routes to the specific sender owning the requested alias
const senderForSales = mockProject.getActiveSender('sales@seconddomain.org');
assert(senderForSales !== null, 'Active sender should be returned');
assert.strictEqual(senderForSales.email, 'backup@gmail.com');
console.log('✅ Test 4 Passed: getActiveSender prioritizes sender that owns the requested alias.');

// Test 5: getActiveSender falls back to primary sender when no alias is requested
const defaultSender = mockProject.getActiveSender();
assert.strictEqual(defaultSender.email, 'primary@gmail.com');
console.log('✅ Test 5 Passed: getActiveSender falls back to priority 0 when no alias is requested.');

// Test 6: getCapacitySummary includes allAliases and per-sender aliases
const capacity = mockProject.getCapacitySummary();
assert(Array.isArray(capacity.allAliases), 'allAliases should be an array');
assert.strictEqual(capacity.allAliases.length, 3);
assert.strictEqual(capacity.allAliases[0].email, 'support@mycustombrand.com');
assert.strictEqual(capacity.allAliases[0].senderEmail, 'primary@gmail.com');
assert.strictEqual(capacity.senders[0].aliases.length, 2);
assert.strictEqual(capacity.senders[1].aliases.length, 1);
console.log('✅ Test 6 Passed: getCapacitySummary correctly aggregates all aliases.');

console.log('\n🎉 ALL DAKLY SENDER ALIASES TESTS PASSED SUCCESSFULLY!\n');
