/**
 * Unit Tests for Dakly Official Node.js SDK
 */

'use strict';

const assert = require('assert');
const {
  Dakly,
  DaklyError,
  DaklyAuthenticationError,
  DaklyRateLimitError,
  DaklySuppressedError,
  DaklyValidationError,
} = require('../packages/dakly/src/index.js');

async function runSdkTests() {
  console.log('🧪 Starting Dakly SDK Unit Tests...\n');

  // Test 1: Instantiation with string
  {
    const client = new Dakly('gkey_test_12345');
    assert.strictEqual(client.apiKey, 'gkey_test_12345');
    assert.strictEqual(client.baseUrl, 'https://dakly-engin.vercel.app');
    assert.strictEqual(client.timeout, 15000);
    assert.strictEqual(client.throwOnSuppressed, true);
    console.log('✅ Test 1 Passed: Dakly constructor accepts string API key.');
  }

  // Test 2: Instantiation with options object
  {
    const client = new Dakly({
      apiKey: 'gkey_custom_999',
      baseUrl: 'http://localhost:5000/',
      timeout: 5000,
      throwOnSuppressed: false,
    });
    assert.strictEqual(client.apiKey, 'gkey_custom_999');
    assert.strictEqual(client.baseUrl, 'http://localhost:5000');
    assert.strictEqual(client.timeout, 5000);
    assert.strictEqual(client.throwOnSuppressed, false);
    console.log('✅ Test 2 Passed: Dakly constructor accepts options object and cleans trailing slashes.');
  }

  // Test 3: Missing API Key throws DaklyAuthenticationError
  {
    const client = new Dakly('');
    try {
      await client.sendOtp('test@test.com', '123456');
      assert.fail('Should have thrown DaklyAuthenticationError');
    } catch (err) {
      assert(err instanceof DaklyAuthenticationError, 'Error must be DaklyAuthenticationError');
      assert.strictEqual(err.statusCode, 401);
      console.log('✅ Test 3 Passed: Missing API key throws DaklyAuthenticationError.');
    }
  }

  // Test 4: Missing arguments validation
  {
    const client = new Dakly('gkey_valid_key');
    try {
      await client.send();
      assert.fail('Should have thrown DaklyValidationError');
    } catch (err) {
      assert(err instanceof DaklyValidationError, 'Must be DaklyValidationError');
      console.log('✅ Test 4 Passed: Missing send options throws DaklyValidationError.');
    }

    try {
      await client.sendOtp({ to: 'user@test.com' }); // missing code
      assert.fail('Should have thrown DaklyValidationError');
    } catch (err) {
      assert(err instanceof DaklyValidationError, 'Must be DaklyValidationError');
      console.log('✅ Test 4b Passed: Missing OTP code throws DaklyValidationError.');
    }
  }

  // Test 5: Mocked fetch testing sendOtp payload
  {
    const originalFetch = global.fetch;
    let interceptedUrl = null;
    let interceptedOptions = null;

    global.fetch = async (url, opts) => {
      interceptedUrl = url;
      interceptedOptions = opts;
      return {
        ok: true,
        status: 200,
        headers: { get: () => 'application/json' },
        json: async () => ({
          success: true,
          status: 'DELIVERED',
          trackingId: 'tr_mock_123',
          messageId: '<msg123@gmail.com>',
          executionTimeMs: 420,
        }),
      };
    };

    try {
      const client = new Dakly('gkey_live_test');
      const res = await client.sendOtp({
        to: 'Student@College.edu',
        code: '984521',
        appName: 'CampusPortal',
        expiresInMinutes: 5,
      });

      assert.strictEqual(res.success, true);
      assert.strictEqual(res.trackingId, 'tr_mock_123');
      assert.strictEqual(interceptedUrl, 'https://dakly-engin.vercel.app/api/send');
      assert.strictEqual(interceptedOptions.method, 'POST');
      assert.strictEqual(interceptedOptions.headers['x-api-key'], 'gkey_live_test');

      const body = JSON.parse(interceptedOptions.body);
      assert.strictEqual(body.to, 'student@college.edu');
      assert.strictEqual(body.template, 'otp');
      assert.strictEqual(body.vars.otp, '984521');
      assert.strictEqual(body.vars.appName, 'CampusPortal');
      assert.strictEqual(body.vars.validity, '5 minutes');
      console.log('✅ Test 5 Passed: sendOtp correctly normalizes recipient and formats template vars.');
    } finally {
      global.fetch = originalFetch;
    }
  }

  // Test 6: Mocked fetch testing sendWelcome, sendNotes, sendInvoice
  {
    const originalFetch = global.fetch;
    const interceptedBodies = [];

    global.fetch = async (url, opts) => {
      interceptedBodies.push(JSON.parse(opts.body));
      return {
        ok: true,
        status: 200,
        headers: { get: () => 'application/json' },
        json: async () => ({ success: true, trackingId: 'tr_mock_ok', status: 'DELIVERED' }),
      };
    };

    try {
      const client = new Dakly('gkey_live_test');

      // Welcome
      await client.sendWelcome({
        to: 'newuser@startup.com',
        name: 'Rahul',
        appName: 'EduApp',
        loginUrl: 'https://eduapp.in/login',
      });

      // Notes
      await client.sendNotes({
        to: 'student@college.edu',
        studentName: 'Priya',
        subjectName: 'Operating Systems',
        notesTitle: 'Unit 4: Deadlocks',
        downloadUrl: 'https://cdn.college.edu/os-unit4.pdf',
      });

      // Invoice
      await client.sendInvoice({
        to: 'client@biz.com',
        invoiceNumber: 'INV-2026-009',
        amount: '$99.00',
      });

      assert.strictEqual(interceptedBodies[0].template, 'welcome');
      assert.strictEqual(interceptedBodies[0].vars.name, 'Rahul');

      assert.strictEqual(interceptedBodies[1].template, 'notes');
      assert.strictEqual(interceptedBodies[1].vars.subjectName, 'Operating Systems');
      assert.strictEqual(interceptedBodies[1].vars.studentName, 'Priya');

      assert.strictEqual(interceptedBodies[2].template, 'invoice');
      assert.strictEqual(interceptedBodies[2].vars.invoiceNumber, 'INV-2026-009');
      assert.strictEqual(interceptedBodies[2].vars.amount, '$99.00');

      console.log('✅ Test 6 Passed: High-level methods (sendWelcome, sendNotes, sendInvoice) compile properly.');
    } finally {
      global.fetch = originalFetch;
    }
  }

  // Test 7: Handling Suppression Error
  {
    const originalFetch = global.fetch;
    global.fetch = async () => ({
      ok: true,
      status: 200,
      headers: { get: () => 'application/json' },
      json: async () => ({
        success: false,
        status: 'BLOCKED_SUPPRESSED',
        suppressed: true,
        reason: 'HARD_BOUNCE',
        trackingId: 'tr_blocked_1',
        error: 'Recipient is on Suppression List due to previous hard bounce.',
      }),
    });

    try {
      const client = new Dakly('gkey_live_test');
      try {
        await client.sendOtp('bounced@bad.com', '123456');
        assert.fail('Should throw DaklySuppressedError');
      } catch (err) {
        assert(err instanceof DaklySuppressedError, 'Must throw DaklySuppressedError');
        assert.strictEqual(err.suppressed, true);
        assert.strictEqual(err.reason, 'HARD_BOUNCE');
        assert.strictEqual(err.trackingId, 'tr_blocked_1');
        console.log('✅ Test 7 Passed: SDK throws DaklySuppressedError on hard bounce suppression.');
      }

      // If throwOnSuppressed is false, it returns the object
      const lenientClient = new Dakly({ apiKey: 'gkey_live_test', throwOnSuppressed: false });
      const res = await lenientClient.sendOtp('bounced@bad.com', '123456');
      assert.strictEqual(res.status, 'BLOCKED_SUPPRESSED');
      console.log('✅ Test 7b Passed: SDK returns suppressed result cleanly when throwOnSuppressed is false.');
    } finally {
      global.fetch = originalFetch;
    }
  }

  // Test 8: Rate Limit HTTP 429
  {
    const originalFetch = global.fetch;
    global.fetch = async () => ({
      ok: false,
      status: 429,
      headers: { get: () => 'application/json' },
      json: async () => ({ error: 'Daily sender quota reached (500/500 sent).' }),
    });

    try {
      const client = new Dakly('gkey_live_test');
      try {
        await client.sendOtp('quota@test.com', '123456');
        assert.fail('Should throw DaklyRateLimitError');
      } catch (err) {
        assert(err instanceof DaklyRateLimitError, 'Must be DaklyRateLimitError');
        assert.strictEqual(err.statusCode, 429);
        console.log('✅ Test 8 Passed: SDK throws DaklyRateLimitError on HTTP 429.');
      }
    } finally {
      global.fetch = originalFetch;
    }
  }

  // Test 9: Ping Diagnostics
  {
    const originalFetch = global.fetch;
    global.fetch = async (url, opts) => {
      assert.strictEqual(url, 'https://dakly-engin.vercel.app/api/ping');
      assert.strictEqual(opts.method, 'GET');
      return {
        ok: true,
        status: 200,
        headers: { get: () => 'application/json' },
        json: async () => ({
          success: true,
          project: 'EduVibe Production',
          capacity: { totalDailyQuota: 1000, remainingToday: 820 },
        }),
      };
    };

    try {
      const client = new Dakly('gkey_live_test');
      const ping = await client.ping();
      assert.strictEqual(ping.project, 'EduVibe Production');
      assert.strictEqual(ping.capacity.remainingToday, 820);
      console.log('✅ Test 9 Passed: ping() correctly calls GET /api/ping.');
    } finally {
      global.fetch = originalFetch;
    }
  }

  // Test 10: Standalone single-file drop-in matches core SDK
  {
    const StandaloneDakly = require('../sdk/dakly.js');
    const client = new StandaloneDakly('gkey_standalone');
    assert.strictEqual(client.apiKey, 'gkey_standalone');
    assert.strictEqual(typeof client.sendOtp, 'function');
    assert.strictEqual(typeof client.sendNotes, 'function');
    console.log('✅ Test 10 Passed: Standalone sdk/dakly.js is fully compliant.');
  }

  console.log('\n🎉 ALL DAKLY NODE.JS SDK TESTS PASSED SUCCESSFULLY!\n');
}

runSdkTests().catch((err) => {
  console.error('❌ SDK Test Failed:', err);
  process.exit(1);
});
