/**
 * Payment Controller for Dakly
 * Handles Razorpay order creation, payment signature verification, and webhook fulfillment.
 * 
 * @license MIT
 */

'use strict';

const mongoose = require('mongoose');
const paymentService = require('../services/paymentService');
const PaymentOrder = require('../models/PaymentOrder');

/**
 * Get available subscription plans and credit packs
 * GET /api/payments/plans
 */
function getPlans(req, res) {
  return res.json({
    success: true,
    currency: 'INR',
    keyId: process.env.RAZORPAY_KEY_ID || '',
    plans: paymentService.AVAILABLE_PLANS,
  });
}

/**
 * Create a new Razorpay order for checkout
 * POST /api/payments/razorpay/create-order
 */
async function createRazorpayOrder(req, res) {
  try {
    const { planId, priceRupees, credits, plan, cycle, projectId } = req.body;
    if (!planId || !priceRupees) {
      return res.status(400).json({ success: false, error: 'planId and priceRupees are required.' });
    }

    const orderId = `DAKLY-${planId}-${Date.now()}`;
    const user = req.user;

    const rzpData = await paymentService.createRazorpayOrder({
      orderId,
      amount: priceRupees,
      currency: 'INR',
      customer: {
        name: user?.name || 'Dakly Developer',
        email: user?.email || 'developer@example.com',
      },
      metadata: {
        userId: user?._id?.toString() || '',
        projectId: projectId || '',
        planId,
        creditsToAdd: credits || 0,
        plan: plan || (planId.startsWith('pro') ? 'pro' : 'free'),
        cycle: cycle || (planId === 'pro-yearly' ? 'yearly' : 'monthly'),
      },
    });

    // Save initial PENDING order record in database
    await PaymentOrder.create({
      orderId,
      userId: user?._id || null,
      projectId: projectId && mongoose.isValidObjectId(projectId) ? projectId : null,
      amount: priceRupees,
      currency: 'INR',
      status: 'PENDING',
      method: 'RAZORPAY',
      razorpayOrderId: rzpData.razorpayOrderId,
      planId,
      creditsAdded: credits || 0,
      metadata: {
        planId,
        creditsToAdd: credits || 0,
        plan,
        cycle,
      },
    }).catch((err) => console.warn('Could not save initial pending order record:', err.message));

    return res.json({
      success: true,
      orderId,
      razorpayOrderId: rzpData.razorpayOrderId,
      amount: rzpData.amount, // amount in paise
      currency: rzpData.currency,
      keyId: rzpData.keyId,
    });
  } catch (error) {
    console.error('❌ Error creating Razorpay order:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
}

/**
 * Verify client-side payment signature from Razorpay modal
 * POST /api/payments/razorpay/verify
 */
async function verifyRazorpayPayment(req, res) {
  try {
    const { orderId, razorpayOrderId, razorpayPaymentId, razorpaySignature } = req.body;

    if (!razorpayOrderId || !razorpayPaymentId || !razorpaySignature) {
      return res.status(400).json({
        success: false,
        error: 'razorpayOrderId, razorpayPaymentId, and razorpaySignature are required.',
      });
    }

    const isValid = paymentService.verifyRazorpayPaymentSignature({
      razorpayOrderId,
      razorpayPaymentId,
      razorpaySignature,
    });

    if (!isValid) {
      console.warn('⚠️ [Razorpay] Invalid payment signature received.');
      return res.status(400).json({ success: false, error: 'Invalid payment signature' });
    }

    // Signature is cryptographically verified - fulfill order
    const fulfillment = await paymentService.fulfillPaymentOrder({
      orderId,
      razorpayOrderId,
      razorpayPaymentId,
      razorpaySignature,
      method: 'RAZORPAY',
      metadata: {
        userId: req.user?._id?.toString(),
      },
      rawPayload: req.body,
    });

    return res.json({
      success: true,
      message: 'Payment verified and credits/tier activated successfully.',
      order: fulfillment.order,
    });
  } catch (error) {
    console.error('❌ Error verifying Razorpay payment:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
}

/**
 * Authoritative Webhook Receiver for Razorpay Events
 * Expects unparsed raw bytes in req.body to verify cryptographic HMAC-SHA256 signature.
 * 
 * POST /api/webhooks/razorpay
 */
async function handleRazorpayWebhook(req, res) {
  try {
    const signature = req.headers['x-razorpay-signature'];
    const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET || process.env.RAZORPAY_KEY_SECRET;

    if (!signature || !webhookSecret) {
      return res.status(401).json({ error: 'Missing webhook signature or secret' });
    }

    const isValid = paymentService.verifyRazorpayWebhookSignature(req.body, signature, webhookSecret);
    if (!isValid) {
      console.warn('⚠️ [Razorpay Webhook] Rejected request with invalid HMAC signature.');
      return res.status(401).json({ error: 'Invalid HMAC signature' });
    }

    let payload;
    try {
      const rawString = Buffer.isBuffer(req.body) ? req.body.toString('utf8') : String(req.body);
      payload = JSON.parse(rawString);
    } catch {
      return res.status(400).json({ error: 'Invalid JSON payload' });
    }

    const event = payload.event;
    console.log(`ℹ️ [Razorpay Webhook] Event received: ${event}`);

    if (event === 'order.paid' || event === 'payment.captured') {
      const paymentEntity = payload.payload?.payment?.entity || {};
      const orderEntity = payload.payload?.order?.entity || {};

      const razorpayOrderId = paymentEntity.order_id || orderEntity.id;
      const razorpayPaymentId = paymentEntity.id;
      const notes = paymentEntity.notes || orderEntity.notes || {};
      const orderId = notes.orderId;
      const amount = (paymentEntity.amount || orderEntity.amount || 0) / 100;

      await paymentService.fulfillPaymentOrder({
        orderId,
        amount,
        razorpayOrderId,
        razorpayPaymentId,
        method: paymentEntity.method || 'RAZORPAY',
        metadata: notes,
        rawPayload: payload,
      });

      console.log(`🎉 [Razorpay Webhook] Successfully processed order ${orderId || razorpayOrderId}`);
    }

    return res.status(200).json({ status: 'ok' });
  } catch (error) {
    console.error('❌ [Razorpay Webhook Error]:', error);
    return res.status(500).json({ error: 'Webhook processing failure', message: error.message });
  }
}

/**
 * Get payment order history for the authenticated user
 * GET /api/payments/orders
 */
async function getPaymentHistory(req, res) {
  try {
    const userId = req.user?._id;
    if (!userId) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }

    const orders = await PaymentOrder.find({ userId })
      .sort({ createdAt: -1 })
      .limit(50)
      .lean();

    return res.json({
      success: true,
      orders,
    });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
}

/**
 * Get status of an order by orderId
 * GET /api/payments/orders/:orderId
 */
async function getOrderStatus(req, res) {
  try {
    const { orderId } = req.params;
    const order = await PaymentOrder.findOne({
      $or: [{ orderId }, { razorpayOrderId: orderId }],
    }).lean();

    if (!order) {
      return res.status(404).json({ success: false, error: 'Order not found' });
    }

    return res.json({
      success: true,
      order: {
        orderId: order.orderId,
        razorpayOrderId: order.razorpayOrderId,
        status: order.status,
        amount: order.amount,
        planId: order.planId,
        creditsAdded: order.creditsAdded,
        fulfilledAt: order.fulfilledAt,
      },
    });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
}

module.exports = {
  getPlans,
  createRazorpayOrder,
  verifyRazorpayPayment,
  handleRazorpayWebhook,
  getPaymentHistory,
  getOrderStatus,
};
