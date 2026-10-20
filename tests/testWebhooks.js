/**
 * Unit Tests for Dakly Webhooks & Instant Delivery Alerts
 */

'use strict';

const assert = require('assert');
const crypto = require('crypto');
const { verifyWebhookSignature, dispatchWebhook, sendTestWebhook } = require('../src/services/webhookService');
const { Dakly } = require('../packages/dakly/src/index.js');
const StandaloneDakly = require('../sdk/dakly.js');

async function runWebhookTests() {
  console.log('🧪 Starting Dakly Webhook Unit Tests...\n');

  const testSecret = 'daksec_test_mock_secret_key';
  const testPayload = {
    event: 'email.delivered',
    trackingId: 'tr_test_999',
    recipient: 'student@example.com',
    status: 'DELIVERED',
    timestamp: new Date().toISOString(),
  };

  const payloadString = JSON.stringify(testPayload);
  const correctHex = crypto
    .createHmac('sha256', testSecret)
    .update(payloadString)
    .digest('hex');

  // Test 1: Valid HMAC verification in webhookService
  {
    const isValid = verifyWebhookSignature(payloadString, `sha256=${correctHex}`, testSecret);
    assert.strictEqual(isValid, true, 'HMAC with sha256= prefix should be valid');

    const isValidRaw = verifyWebhookSignature(payloadString, correctHex, testSecret);
    assert.strictEqual(isValidRaw, true, 'HMAC without sha256= prefix should be valid');

    console.log('✅ Test 1 Passed: webhookService.verifyWebhookSignature accurately validates cryptographic HMAC.');
  }

  // Test 2: Invalid HMAC signature rejected
  {
    const isBad = verifyWebhookSignature(payloadString, 'sha256=bad_hex_signature', testSecret);
    assert.strictEqual(isBad, false, 'Invalid signature should return false');

    const isWrongSecret = verifyWebhookSignature(payloadString, `sha256=${correctHex}`, 'daksec_wrong_key');
    assert.strictEqual(isWrongSecret, false, 'Wrong secret should return false');

    console.log('✅ Test 2 Passed: Tampered or invalid HMAC signatures are strictly rejected.');
  }

  // Test 3: Node.js SDK Dakly.verifyWebhookSignature matches backend
  {
    const isValidSdk = Dakly.verifyWebhookSignature({
      payload: testPayload,
      signature: `sha256=${correctHex}`,
      secret: testSecret,
    });
    assert.strictEqual(isValidSdk, true, 'Dakly Node SDK verifyWebhookSignature should return true');

    const isValidStandalone = StandaloneDakly.verifyWebhookSignature({
      payload: testPayload,
      signature: `sha256=${correctHex}`,
      secret: testSecret,
    });
    assert.strictEqual(isValidStandalone, true, 'Standalone sdk/dakly.js verifyWebhookSignature should return true');

    console.log('✅ Test 3 Passed: Official Node.js SDK and standalone verifyWebhookSignature pass cleanly.');
  }

  // Test 4: Disabled Webhooks are not dispatched
  {
    const mockProject = {
      _id: 'mock_proj_id',
      name: 'Test Project',
      webhookUrl: 'https://example.com/webhook',
      webhookEnabled: false,
    };

    const res = await dispatchWebhook(mockProject, testPayload);
    assert.strictEqual(res.dispatched, false);
    assert.strictEqual(res.status, 'NOT_CONFIGURED_OR_DISABLED');
    console.log('✅ Test 4 Passed: Webhooks paused with webhookEnabled=false are safely skipped.');
  }

  // Test 5: Event Subscriptions filter out unsubscribed events
  {
    const mockProject = {
      _id: 'mock_proj_id',
      name: 'Test Project',
      webhookUrl: 'https://example.com/webhook',
      webhookEnabled: true,
      webhookEvents: ['email.delivered', 'email.failed'], // only delivered and failed
    };

    const clickPayload = {
      event: 'email.clicked',
      trackingId: 'tr_test_999',
    };

    const res = await dispatchWebhook(mockProject, clickPayload);
    assert.strictEqual(res.dispatched, false);
    assert.strictEqual(res.status, 'EVENT_NOT_SUBSCRIBED');
    console.log('✅ Test 5 Passed: Event subscription filter intercepts unsubscribed events.');
  }

  // Test 6: Mocked fetch testing live dispatch and headers
  {
    const originalFetch = global.fetch;
    let interceptedUrl = null;
    let interceptedHeaders = null;
    let interceptedBody = null;

    global.fetch = async (url, opts) => {
      interceptedUrl = url;
      interceptedHeaders = opts.headers;
      interceptedBody = JSON.parse(opts.body);
      return {
        ok: true,
        status: 200,
        text: async () => 'OK',
      };
    };

    try {
      const mockProject = {
        _id: 'proj_mock_123',
        name: 'Webhook Test Proj',
        webhookUrl: 'https://receiver.mysaas.com/api/dakly-webhook',
        webhookSecret: testSecret,
        webhookEnabled: true,
        webhookEvents: ['email.delivered'],
      };

      const res = await dispatchWebhook(mockProject, testPayload);
      assert.strictEqual(res.dispatched, true);
      assert.strictEqual(res.status, 'SUCCESS');
      assert.strictEqual(res.httpStatus, 200);

      assert.strictEqual(interceptedUrl, 'https://receiver.mysaas.com/api/dakly-webhook');
      assert.strictEqual(interceptedHeaders['x-dakly-event'], 'email.delivered');
      assert.strictEqual(interceptedHeaders['x-dakly-delivery'], 'tr_test_999');
      assert(interceptedHeaders['x-dakly-signature'].startsWith('sha256='));
      assert.strictEqual(interceptedBody.event, 'email.delivered');

      console.log('✅ Test 6 Passed: dispatchWebhook successfully sends headers, payload, and HMAC signature.');
    } finally {
      global.fetch = originalFetch;
    }
  }

  // Test 7: sendTestWebhook mock ping
  {
    const originalFetch = global.fetch;
    global.fetch = async () => ({
      ok: true,
      status: 200,
      text: async () => '{"received": true}',
    });

    try {
      const mockProject = {
        _id: 'proj_mock_123',
        name: 'Test Project',
        webhookUrl: 'https://receiver.mysaas.com/webhook',
        webhookSecret: testSecret,
      };

      const testRes = await sendTestWebhook(mockProject);
      assert.strictEqual(testRes.success, true);
      assert.strictEqual(testRes.httpStatus, 200);
      assert(testRes.latencyMs >= 0);
      console.log('✅ Test 7 Passed: sendTestWebhook successfully delivers mock ping payload.');
    } finally {
      global.fetch = originalFetch;
    }
  }

  console.log('\n🎉 ALL DAKLY WEBHOOK UNIT TESTS PASSED SUCCESSFULLY!\n');
  process.exit(0);
}

runWebhookTests().catch((err) => {
  console.error('❌ Webhook Test Failed:', err);
  process.exit(1);
});
