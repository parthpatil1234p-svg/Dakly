/**
 * Payment Controller for Dakly
 * Handles YouPI Gateway Webhook ingestion and client-side payment queries.
 * 
 * @license MIT
 */

'use strict';

const paymentService = require('../services/paymentService');
const PaymentOrder = require('../models/PaymentOrder');

/**
 * Authoritative Webhook Receiver for Sovereign UPI (YouPI PG)
 * Expects unparsed raw bytes in req.body to verify cryptographic HMAC-SHA256 signature.
 * 
 * POST /api/webhooks/youpi
 */
async function handleYoupiWebhook(req, res) {
  try {
    const signature = req.headers['x-gateway-signature']; // e.g. "sha256=..."
    const webhookSecret = process.env.YOUPI_WEBHOOK_SECRET;

    if (!signature || !webhookSecret) {
      return res.status(401).json({ error: 'Missing webhook signature or secret' });
    }

    // Verify HMAC-SHA256 over raw unparsed request bytes
    const isValid = paymentService.verifyWebhookSignature(req.body, signature, webhookSecret);
    if (!isValid) {
      console.warn('⚠️ [YouPI Webhook] Rejected request with invalid HMAC signature.');
      return res.status(401).json({ error: 'Invalid HMAC signature' });
    }

    // Parse JSON payload from verified raw buffer
    let payload;
    try {
      const rawString = Buffer.isBuffer(req.body) ? req.body.toString('utf8') : String(req.body);
      payload = JSON.parse(rawString);
    } catch (parseErr) {
      return res.status(400).json({ error: 'Invalid JSON payload' });
    }

    if (payload.event === 'SUCCESS' && (payload.method === 'UPI' || !payload.method)) {
      const orderId = payload.orderId || payload.order_id;
      const amount = payload.amount || payload.amount_received;
      const utr = payload.utr || payload.bank_reference || null;
      const metadata = payload.metadata || {};

      console.log(`🎉 [YouPI Webhook] Order ${orderId} verified. Paid: ₹${amount}, UTR: ${utr}`);

      await paymentService.fulfillPaymentOrder({
        orderId,
        amount,
        utr,
        method: payload.method || 'UPI',
        metadata,
        rawPayload: payload,
      });
    } else {
      console.log(`ℹ️ [YouPI Webhook] Received unhandled event: ${payload.event}`);
    }

    return res.status(200).json({ received: true });
  } catch (error) {
    console.error('❌ [YouPI Webhook Error]:', error);
    return res.status(500).json({ error: 'Webhook processing failure', message: error.message });
  }
}

/**
 * Get available subscription plans and credit packs
 * GET /api/payments/plans
 */
function getPlans(req, res) {
  return res.json({
    success: true,
    currency: 'INR',
    payeeVpa: '9923092340@ptaxis',
    merchantKey: process.env.YOUPI_MERCHANT_KEY || '00000000-0000-0000-0000-000000000001',
    checkoutHost: process.env.YOUPI_CHECKOUT_HOST || 'https://dakly-pay.fly.dev',
    plans: paymentService.AVAILABLE_PLANS,
  });
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
    const order = await PaymentOrder.findOne({ orderId }).lean();
    if (!order) {
      return res.status(404).json({ success: false, error: 'Order not found' });
    }

    return res.json({
      success: true,
      order: {
        orderId: order.orderId,
        status: order.status,
        amount: order.amount,
        utr: order.utr,
        planId: order.planId,
        creditsAdded: order.creditsAdded,
        fulfilledAt: order.fulfilledAt,
      },
    });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
}

/**
 * Create a new sovereign UPI payment session on YouPI PG
 * POST /api/payments/create-session
 */
async function createCheckoutSession(req, res) {
  try {
    const { planId, priceRupees, credits, plan, cycle, projectId } = req.body;
    if (!planId || !priceRupees) {
      return res.status(400).json({ success: false, error: 'planId and priceRupees are required.' });
    }

    const orderId = `DAKLY-${planId}-${Date.now()}`;
    const user = req.user;

    const session = await paymentService.createCheckoutSession({
      orderId,
      amount: priceRupees,
      customer: {
        name: user?.name || 'Dakly Developer',
        email: user?.email || 'developer@example.com',
        phone: user?.phone || '',
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

    const mongoose = require('mongoose');
    await PaymentOrder.create({
      orderId,
      userId: user?._id || null,
      projectId: projectId && mongoose.isValidObjectId(projectId) ? projectId : null,
      amount: priceRupees,
      currency: 'INR',
      status: 'PENDING',
      method: 'UPI',
      planId,
      metadata: {
        paymentId: session.paymentId,
        checkoutUrl: session.checkoutUrl,
        creditsToAdd: credits || 0,
      },
    }).catch((err) => console.warn('Could not save pending order record:', err.message));

    return res.json({
      success: true,
      orderId,
      paymentId: session.paymentId,
      checkoutUrl: session.checkoutUrl,
      amount: session.amount,
    });
  } catch (error) {
    console.error('Error creating checkout session:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
}

module.exports = {
  handleYoupiWebhook,
  getPlans,
  getPaymentHistory,
  getOrderStatus,
  createCheckoutSession,
};
