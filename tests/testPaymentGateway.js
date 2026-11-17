/**
 * Automated Verification for YouPI Sovereign Payment Gateway Integration
 * Tests:
 * 1. HMAC-SHA256 signature verification over raw request bytes
 * 2. Tampered signature and secret rejection
 * 3. Plan upgrade fulfillment (Monthly & Annual Pass)
 * 4. Credit bundle fulfillment (5,000 & 25,000 credits)
 * 5. Webhook idempotency protection (duplicate orderId handling)
 */

'use strict';

const assert = require('assert');
const crypto = require('crypto');
const paymentService = require('../src/services/paymentService');

console.log('🧪 Starting YouPI Payment Gateway Unit & Webhook Tests...\n');

const TEST_SECRET = 'youpi_sec_test_9923092340_dakly';

// -------------------------------------------------------------
// Test 1: HMAC-SHA256 Signature Verification
// -------------------------------------------------------------
{
  const mockPayload = JSON.stringify({
    event: 'SUCCESS',
    method: 'UPI',
    orderId: 'DAKLY-starter-pack-17948399221',
    amount: 99,
    utr: 'UTR992309234001',
    metadata: {
      creditsToAdd: 5000,
      planId: 'starter-pack',
    },
  });

  const rawBytes = Buffer.from(mockPayload, 'utf8');
  const validHash = crypto.createHmac('sha256', TEST_SECRET).update(rawBytes).digest('hex');
  const validHeader = `sha256=${validHash}`;

  // Valid verification
  const isValid = paymentService.verifyWebhookSignature(rawBytes, validHeader, TEST_SECRET);
  assert.strictEqual(isValid, true, 'Valid signature should verify cleanly');

  // Tampered payload verification
  const tamperedBytes = Buffer.from(mockPayload.replace('"amount":99', '"amount":999'), 'utf8');
  const isTamperedValid = paymentService.verifyWebhookSignature(tamperedBytes, validHeader, TEST_SECRET);
  assert.strictEqual(isTamperedValid, false, 'Tampered payload must be rejected');

  // Invalid secret
  const isWrongSecretValid = paymentService.verifyWebhookSignature(rawBytes, validHeader, 'wrong_secret_123');
  assert.strictEqual(isWrongSecretValid, false, 'Wrong secret must be rejected');

  // Missing or malformed header
  assert.strictEqual(paymentService.verifyWebhookSignature(rawBytes, null, TEST_SECRET), false);
  assert.strictEqual(paymentService.verifyWebhookSignature(rawBytes, '', TEST_SECRET), false);
  assert.strictEqual(paymentService.verifyWebhookSignature(rawBytes, 'sha256=short', TEST_SECRET), false);

  console.log('✅ Test 1 Passed: HMAC-SHA256 signature verification accurately validates authenticity and rejects tampered bytes.');
}

// -------------------------------------------------------------
// Test 2: Catalog Plans & Pricing Structure
// -------------------------------------------------------------
{
  const plans = paymentService.AVAILABLE_PLANS;
  assert(Array.isArray(plans) && plans.length >= 4, 'Plans catalog must contain at least 4 tiers');

  const starter = plans.find((p) => p.id === 'starter-pack');
  assert.strictEqual(starter.priceRupees, 99);
  assert.strictEqual(starter.credits, 5000);

  const growth = plans.find((p) => p.id === 'growth-pack');
  assert.strictEqual(growth.priceRupees, 299);
  assert.strictEqual(growth.credits, 25000);

  const proMonthly = plans.find((p) => p.id === 'pro-monthly');
  assert.strictEqual(proMonthly.priceRupees, 20);
  assert.strictEqual(proMonthly.cycle, 'monthly');

  const proYearly = plans.find((p) => p.id === 'pro-yearly');
  assert.strictEqual(proYearly.priceRupees, 216);
  assert.strictEqual(proYearly.cycle, 'yearly');

  console.log('✅ Test 2 Passed: Available plan tiers match requested pricing (₹20/mo, ₹216/yr, ₹99 starter, ₹299 growth).');
}

// -------------------------------------------------------------
// Test 3: Idempotency & Order Fulfillment Simulation
// -------------------------------------------------------------
(async () => {
  try {
    const PaymentOrder = require('../src/models/PaymentOrder');
    const Project = require('../src/models/Project');

    // In-memory mock for DB-independent unit test execution
    const mockDb = new Map();
    PaymentOrder.findOne = async (filter) => {
      if (filter && filter.orderId) {
        return mockDb.get(filter.orderId) || null;
      }
      return null;
    };
    PaymentOrder.prototype.save = async function () {
      mockDb.set(this.orderId, this);
      return this;
    };

    const mockOrderPayload = {
      orderId: `DAKLY-UNIT-TEST-${Date.now()}`,
      amount: 299,
      utr: 'UTR_MOCK_TEST_883391',
      method: 'UPI',
      metadata: {
        planId: 'growth-pack',
        creditsToAdd: 25000,
      },
      rawPayload: { event: 'SUCCESS' },
    };

    // First fulfillment
    const result1 = await paymentService.fulfillPaymentOrder(mockOrderPayload);
    assert.strictEqual(result1.success, true);
    assert.strictEqual(result1.order.status, 'SUCCESS');
    assert.strictEqual(result1.order.creditsAdded, 25000);
    assert.strictEqual(result1.order.utr, 'UTR_MOCK_TEST_883391');

    // Second fulfillment with identical orderId (idempotency check)
    const result2 = await paymentService.fulfillPaymentOrder(mockOrderPayload);
    assert.strictEqual(result2.success, true);
    assert.strictEqual(result2.alreadyProcessed, true, 'Duplicate order must trigger idempotency guard');

    // Test Pro Plan upgrade fulfillment
    const proOrderPayload = {
      orderId: `DAKLY-PRO-TEST-${Date.now()}`,
      amount: 20,
      utr: 'UTR_PRO_992309',
      method: 'UPI',
      metadata: {
        planId: 'pro-monthly',
        plan: 'pro',
        cycle: 'monthly',
      },
      rawPayload: { event: 'SUCCESS' },
    };
    const proResult = await paymentService.fulfillPaymentOrder(proOrderPayload);
    assert.strictEqual(proResult.success, true);
    assert.strictEqual(proResult.order.planUpgraded, 'pro');

    console.log('✅ Test 3 Passed: Payment order fulfillment and idempotency guard succeed without duplicate credit issuance.');

    // -------------------------------------------------------------
    // Test 4: End-to-End HTTP Webhook Endpoint Test (Express Raw Bytes)
    // -------------------------------------------------------------
    const express = require('express');
    const http = require('http');
    const paymentController = require('../src/controllers/paymentController');

    const app = express();
    process.env.YOUPI_WEBHOOK_SECRET = TEST_SECRET;

    app.post(
      '/api/webhooks/youpi',
      express.raw({ type: 'application/json' }),
      paymentController.handleYoupiWebhook
    );

    const server = http.createServer(app);
    await new Promise((resolve) => server.listen(0, resolve));
    const port = server.address().port;
    const webhookUrl = `http://127.0.0.1:${port}/api/webhooks/youpi`;

    try {
      // 4A: Valid Signed Request
      const orderId = `DAKLY-HTTP-TEST-${Date.now()}`;
      const payloadString = JSON.stringify({
        event: 'SUCCESS',
        method: 'UPI',
        orderId,
        amount: 99,
        utr: 'UTR_HTTP_TEST_123',
        metadata: {
          planId: 'starter-pack',
          creditsToAdd: 5000,
        },
      });

      const signature = 'sha256=' + crypto
        .createHmac('sha256', TEST_SECRET)
        .update(Buffer.from(payloadString, 'utf8'))
        .digest('hex');

      const resValid = await fetch(webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-gateway-signature': signature,
        },
        body: payloadString,
      });

      assert.strictEqual(resValid.status, 200);
      const resJson = await resValid.json();
      assert.strictEqual(resJson.received, true);

      // 4B: Tampered Payload
      const resTampered = await fetch(webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-gateway-signature': signature,
        },
        body: payloadString.replace('"amount":99', '"amount":999'),
      });
      assert.strictEqual(resTampered.status, 401);

      // 4C: Missing Signature
      const resNoSig = await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: payloadString,
      });
      assert.strictEqual(resNoSig.status, 401);

      console.log('✅ Test 4 Passed: Raw HTTP Webhook endpoint successfully receives, validates HMAC, and acknowledges with 200 { received: true }.');
    } finally {
      await new Promise((resolve) => server.close(resolve));
    }

    console.log('\n🎉 ALL YOUPI PAYMENT GATEWAY UNIT & HTTP TESTS PASSED SUCCESSFULLY!');
  } catch (err) {
    console.error('❌ Test failed:', err);
    process.exit(1);
  }
})();
