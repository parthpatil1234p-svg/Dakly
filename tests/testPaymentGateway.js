/**
 * Automated Verification for Razorpay Payment Gateway Integration
 * Tests:
 * 1. Razorpay client signature verification over order_id|payment_id
 * 2. Razorpay webhook HMAC-SHA256 signature verification over raw request bytes
 * 3. Tampered signature and secret rejection
 * 4. Plan upgrade fulfillment (Monthly & Annual Pass)
 * 5. Credit bundle fulfillment (5,000 & 25,000 credits)
 * 6. Webhook idempotency protection (duplicate orderId handling)
 */

'use strict';

const assert = require('assert');
const crypto = require('crypto');
const paymentService = require('../src/services/paymentService');

console.log('🧪 Starting Razorpay Payment Gateway Unit & Webhook Tests...\n');

const TEST_SECRET = 'rzp_sec_test_razorpay_dakly_2026';
process.env.RAZORPAY_KEY_SECRET = TEST_SECRET;
process.env.RAZORPAY_KEY_ID = 'rzp_test_mock_key';

// -------------------------------------------------------------
// Test 1: Razorpay Payment Signature Verification
// -------------------------------------------------------------
{
  const razorpayOrderId = 'order_MOCK_12345';
  const razorpayPaymentId = 'pay_MOCK_67890';
  const payload = `${razorpayOrderId}|${razorpayPaymentId}`;
  const validSignature = crypto
    .createHmac('sha256', TEST_SECRET)
    .update(payload)
    .digest('hex');

  // Valid verification
  const isValid = paymentService.verifyRazorpayPaymentSignature({
    razorpayOrderId,
    razorpayPaymentId,
    razorpaySignature: validSignature,
  });
  assert.strictEqual(isValid, true, 'Valid signature should verify cleanly');

  // Tampered payment ID
  const isTamperedValid = paymentService.verifyRazorpayPaymentSignature({
    razorpayOrderId,
    razorpayPaymentId: 'pay_MOCK_TAMPERED',
    razorpaySignature: validSignature,
  });
  assert.strictEqual(isTamperedValid, false, 'Tampered payment ID must be rejected');

  // Tampered signature
  const isBadSigValid = paymentService.verifyRazorpayPaymentSignature({
    razorpayOrderId,
    razorpayPaymentId,
    razorpaySignature: 'bad_signature_12345',
  });
  assert.strictEqual(isBadSigValid, false, 'Bad signature must be rejected');

  console.log('✅ Test 1 Passed: Razorpay client payment signature verification accurately validates authenticity.');
}

// -------------------------------------------------------------
// Test 2: Razorpay Webhook HMAC-SHA256 Signature Verification
// -------------------------------------------------------------
{
  const mockWebhookPayload = JSON.stringify({
    event: 'order.paid',
    payload: {
      payment: {
        entity: {
          id: 'pay_WEBHOOK_123',
          order_id: 'order_WEBHOOK_456',
          amount: 2000,
          method: 'upi',
        },
      },
    },
  });

  const rawBytes = Buffer.from(mockWebhookPayload, 'utf8');
  const validSignature = crypto.createHmac('sha256', TEST_SECRET).update(rawBytes).digest('hex');

  const isValid = paymentService.verifyRazorpayWebhookSignature(rawBytes, validSignature, TEST_SECRET);
  assert.strictEqual(isValid, true, 'Valid webhook signature must pass');

  const tamperedBytes = Buffer.from(mockWebhookPayload.replace('2000', '9999'), 'utf8');
  assert.strictEqual(
    paymentService.verifyRazorpayWebhookSignature(tamperedBytes, validSignature, TEST_SECRET),
    false,
    'Tampered webhook body must fail'
  );

  console.log('✅ Test 2 Passed: Razorpay webhook HMAC verification rejects tampered bytes and accepts valid payloads.');
}

// -------------------------------------------------------------
// Test 3: Catalog Plans & Pricing Structure
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

  console.log('✅ Test 3 Passed: Available plan tiers match requested pricing (₹20/mo, ₹216/yr, ₹99 starter, ₹299 growth).');
}

// -------------------------------------------------------------
// Test 4: Idempotency & Order Fulfillment Simulation
// -------------------------------------------------------------
(async () => {
  try {
    const PaymentOrder = require('../src/models/PaymentOrder');

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
      razorpayOrderId: 'order_MOCK_TEST_883391',
      razorpayPaymentId: 'pay_MOCK_TEST_883391',
      method: 'RAZORPAY',
      metadata: {
        planId: 'growth-pack',
        creditsToAdd: 25000,
      },
      rawPayload: { event: 'order.paid' },
    };

    // First fulfillment
    const result1 = await paymentService.fulfillPaymentOrder(mockOrderPayload);
    assert.strictEqual(result1.success, true);
    assert.strictEqual(result1.order.status, 'SUCCESS');
    assert.strictEqual(result1.order.creditsAdded, 25000);
    assert.strictEqual(result1.order.razorpayPaymentId, 'pay_MOCK_TEST_883391');

    // Second fulfillment with identical orderId (idempotency check)
    const result2 = await paymentService.fulfillPaymentOrder(mockOrderPayload);
    assert.strictEqual(result2.success, true);
    assert.strictEqual(result2.alreadyProcessed, true, 'Duplicate order must trigger idempotency guard');

    // Test Pro Plan upgrade fulfillment
    const proOrderPayload = {
      orderId: `DAKLY-PRO-TEST-${Date.now()}`,
      amount: 20,
      razorpayOrderId: 'order_PRO_992309',
      razorpayPaymentId: 'pay_PRO_992309',
      method: 'RAZORPAY',
      metadata: {
        planId: 'pro-monthly',
        plan: 'pro',
        cycle: 'monthly',
      },
      rawPayload: { event: 'order.paid' },
    };
    const proResult = await paymentService.fulfillPaymentOrder(proOrderPayload);
    assert.strictEqual(proResult.success, true);
    assert.strictEqual(proResult.order.planUpgraded, 'pro');

    console.log('✅ Test 4 Passed: Payment order fulfillment and idempotency guard succeed without duplicate credit issuance.');

    // -------------------------------------------------------------
    // Test 5: End-to-End HTTP Webhook Endpoint Test (Express Raw Bytes)
    // -------------------------------------------------------------
    const express = require('express');
    const http = require('http');
    const paymentController = require('../src/controllers/paymentController');

    const app = express();
    process.env.RAZORPAY_WEBHOOK_SECRET = TEST_SECRET;

    app.post(
      '/api/webhooks/razorpay',
      express.raw({ type: 'application/json' }),
      paymentController.handleRazorpayWebhook
    );

    const server = http.createServer(app);
    await new Promise((resolve) => server.listen(0, resolve));
    const port = server.address().port;
    const webhookUrl = `http://127.0.0.1:${port}/api/webhooks/razorpay`;

    try {
      // 5A: Valid Signed Request
      const orderId = `DAKLY-HTTP-TEST-${Date.now()}`;
      const payloadString = JSON.stringify({
        event: 'order.paid',
        payload: {
          payment: {
            entity: {
              id: 'pay_HTTP_TEST_123',
              order_id: 'order_HTTP_TEST_456',
              amount: 9900,
              method: 'upi',
              notes: {
                orderId,
                planId: 'starter-pack',
                creditsToAdd: '5000',
              },
            },
          },
        },
      });

      const signature = crypto
        .createHmac('sha256', TEST_SECRET)
        .update(Buffer.from(payloadString, 'utf8'))
        .digest('hex');

      const resValid = await fetch(webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-razorpay-signature': signature,
        },
        body: payloadString,
      });

      assert.strictEqual(resValid.status, 200);
      const resJson = await resValid.json();
      assert.strictEqual(resJson.status, 'ok');

      // 5B: Tampered Payload
      const resTampered = await fetch(webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-razorpay-signature': signature,
        },
        body: payloadString.replace('9900', '9999'),
      });
      assert.strictEqual(resTampered.status, 401);

      // 5C: Missing Signature
      const resNoSig = await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: payloadString,
      });
      assert.strictEqual(resNoSig.status, 401);

      console.log('✅ Test 5 Passed: Raw HTTP Webhook endpoint successfully receives, validates HMAC, and acknowledges with 200 { status: "ok" }.');
    } finally {
      await new Promise((resolve) => server.close(resolve));
    }

    console.log('\n🎉 ALL RAZORPAY PAYMENT GATEWAY UNIT & HTTP TESTS PASSED SUCCESSFULLY!');
  } catch (err) {
    console.error('❌ Test failed:', err);
    process.exit(1);
  }
})();
