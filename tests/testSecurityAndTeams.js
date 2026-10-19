/**
 * Unit Test Suite for Feature 6:
 * Team Workspaces, Role-Based Access Control, API Key Rotation, and IP Whitelisting
 */

const assert = require('assert');
const {
  normalizeIp,
  ipv4ToLong,
  matchCidr,
  matchWildcard,
  isIpAllowed,
  extractClientIp,
} = require('../src/utils/ipFilter');
const { generateApiKey } = require('../src/utils/crypto');

console.log('🧪 Starting Dakly Feature 6 Security & Team Workspaces Tests...\n');

// ==========================================
// Test 1: IP Normalization & Localhost Alias
// ==========================================
assert.strictEqual(normalizeIp('::ffff:192.168.1.10'), '192.168.1.10', 'Should strip IPv4-mapped IPv6 prefix');
assert.strictEqual(normalizeIp('::1'), '127.0.0.1', 'Should normalize IPv6 loopback to 127.0.0.1');
assert.strictEqual(normalizeIp('localhost'), '127.0.0.1', 'Should normalize localhost to 127.0.0.1');
assert.strictEqual(normalizeIp('  203.0.113.195  '), '203.0.113.195', 'Should trim whitespace');
console.log('✅ Test 1 Passed: IP normalization and localhost mapping are accurate.');

// ==========================================
// Test 2: CIDR Subnet Range Matching
// ==========================================
assert.strictEqual(matchCidr('192.168.1.45', '192.168.1.0/24'), true, '192.168.1.45 is within /24');
assert.strictEqual(matchCidr('192.168.2.1', '192.168.1.0/24'), false, '192.168.2.1 is outside /24');
assert.strictEqual(matchCidr('10.250.3.99', '10.0.0.0/8'), true, '10.250.3.99 is within /8');
assert.strictEqual(matchCidr('172.16.5.2', '10.0.0.0/8'), false, '172.16.5.2 is outside 10.0.0.0/8');
assert.strictEqual(matchCidr('203.0.113.195', '0.0.0.0/0'), true, '0.0.0.0/0 permits all IPv4');
console.log('✅ Test 2 Passed: CIDR subnet range calculation (/8, /24, /0) matches correctly.');

// ==========================================
// Test 3: Wildcard Subnet Matching
// ==========================================
assert.strictEqual(matchWildcard('192.168.1.100', '192.168.1.*'), true);
assert.strictEqual(matchWildcard('192.168.2.100', '192.168.1.*'), false);
assert.strictEqual(matchWildcard('10.50.2.1', '10.*'), true);
console.log('✅ Test 3 Passed: Wildcard pattern matching works as expected.');

// ==========================================
// Test 4: isIpAllowed Whitelist Rule Engine
// ==========================================
// Rule: Empty whitelist permits all
assert.strictEqual(isIpAllowed('203.0.113.50', []), true);
assert.strictEqual(isIpAllowed('203.0.113.50', null), true);

// Rule: Exact match restriction
const strictWhitelist = ['203.0.113.50', '198.51.100.12'];
assert.strictEqual(isIpAllowed('203.0.113.50', strictWhitelist), true);
assert.strictEqual(isIpAllowed('198.51.100.12', strictWhitelist), true);
assert.strictEqual(isIpAllowed('8.8.8.8', strictWhitelist), false);

// Rule: Subnet mixing (CIDR + Localhost + Exact)
const mixedWhitelist = ['127.0.0.1', '10.0.0.0/16', '192.168.1.*'];
assert.strictEqual(isIpAllowed('::1', mixedWhitelist), true, 'IPv6 localhost should match 127.0.0.1');
assert.strictEqual(isIpAllowed('10.0.4.99', mixedWhitelist), true);
assert.strictEqual(isIpAllowed('192.168.1.5', mixedWhitelist), true);
assert.strictEqual(isIpAllowed('192.168.2.5', mixedWhitelist), false);
assert.strictEqual(isIpAllowed('54.210.1.1', mixedWhitelist), false);
console.log('✅ Test 4 Passed: Multi-rule IP whitelist accurately filters allowed and unauthorized IPs.');

// ==========================================
// Test 5: Client IP Extraction from Request
// ==========================================
const reqProxy = {
  headers: {
    'x-forwarded-for': '203.0.113.195, 10.0.0.1, 127.0.0.1',
  },
};
assert.strictEqual(extractClientIp(reqProxy), '203.0.113.195', 'Should extract first public IP from x-forwarded-for');

const reqReal = {
  headers: {
    'x-real-ip': '198.51.100.77',
  },
};
assert.strictEqual(extractClientIp(reqReal), '198.51.100.77', 'Should extract from x-real-ip when forwarded header absent');

const reqSocket = {
  headers: {},
  socket: {
    remoteAddress: '::ffff:192.168.0.5',
  },
};
assert.strictEqual(extractClientIp(reqSocket), '192.168.0.5', 'Should strip IPv6 prefix from socket remoteAddress');
console.log('✅ Test 5 Passed: extractClientIp accurately resolves caller IP across reverse proxies and sockets.');

// ==========================================
// Test 6: API Key Generation & Rotation Integrity
// ==========================================
const key1 = generateApiKey();
const key2 = generateApiKey();
assert.ok(key1.startsWith('gkey_live_'), 'Key should have standard gkey_live_ prefix');
assert.ok(key2.startsWith('gkey_live_'), 'Rotated key should have standard gkey_live_ prefix');
assert.notStrictEqual(key1, key2, 'Generated keys must be cryptographically unique');
assert.strictEqual(key1.length, 'gkey_live_'.length + 48, 'Should contain 24 random bytes (48 hex chars)');
console.log('✅ Test 6 Passed: API key rotation generates cryptographically unique, standard 24-byte hex keys.');

// ==========================================
// Test 7: Project Team Role-Based Access Control (RBAC) Logic
// ==========================================
const Project = require('../src/models/Project');

const ownerId = '660000000000000000000001';
const adminUserId = '660000000000000000000002';
const viewerUserId = '660000000000000000000003';
const outsiderUserId = '660000000000000000000004';

const mockProject = new Project({
  name: 'Fintech Hub',
  senderEmail: 'billing@fintech.io',
  encryptedPassword: 'enc',
  iv: 'iv',
  authTag: 'tag',
  userId: ownerId,
  ipWhitelist: ['192.168.1.0/24'],
  ipWhitelistEnabled: true,
  members: [
    {
      user: adminUserId,
      email: 'dev@fintech.io',
      role: 'admin',
      status: 'active',
    },
    {
      user: viewerUserId,
      email: 'analyst@fintech.io',
      role: 'viewer',
      status: 'active',
    },
    {
      email: 'pending_designer@fintech.io',
      role: 'viewer',
      status: 'pending',
    },
  ],
});

// Verify Owner
assert.strictEqual(mockProject.getUserRole({ _id: ownerId, email: 'owner@fintech.io' }), 'owner');

// Verify Admin Member
assert.strictEqual(mockProject.getUserRole({ _id: adminUserId, email: 'dev@fintech.io' }), 'admin');

// Verify Viewer Member
assert.strictEqual(mockProject.getUserRole({ _id: viewerUserId, email: 'analyst@fintech.io' }), 'viewer');

// Verify Pending Invite Matched By Email
assert.strictEqual(mockProject.getUserRole({ _id: '660000000000000000000005', email: 'pending_designer@fintech.io' }), 'viewer');

// Verify Outsider Denied
assert.strictEqual(mockProject.getUserRole({ _id: outsiderUserId, email: 'hacker@outside.com' }), null);

console.log('✅ Test 7 Passed: Project RBAC correctly resolves owner, admin, viewer, pending invites, and rejects unauthorized users.');

console.log('\n🎉 ALL DAKLY SECURITY & TEAM WORKSPACE TESTS PASSED SUCCESSFULLY!\n');
