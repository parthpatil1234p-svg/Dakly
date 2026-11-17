/**
 * Razorpay Payment Gateway Service for Dakly
 * Handles Razorpay order generation, signature verification, plan pricing, credit bundles, and order fulfillment.
 * 
 * @license MIT
 */

'use strict';

const crypto = require('crypto');
const mongoose = require('mongoose');
const Razorpay = require('razorpay');
const PaymentOrder = require('../models/PaymentOrder');
const Project = require('../models/Project');
const User = require('../models/User');

const AVAILABLE_PLANS = [
  {
    id: 'starter-pack',
    name: 'Starter Credits Pack',
    badge: 'PAY-AS-YOU-GO',
    type: 'credits',
    priceRupees: 99,
    credits: 5000,
    tagline: '5,000 emails for ₹99',
    description: 'Instant top-up of 5,000 transactional emails. Credits never expire and stack on top of daily Gmail quota.',
    features: ['5,000 extra email credits', 'Never expires', 'Zero SaaS markup fees', 'Dual-sender failover ready'],
  },
  {
    id: 'growth-pack',
    name: 'Growth Credits Pack',
    badge: 'POPULAR',
    type: 'credits',
    priceRupees: 299,
    credits: 25000,
    tagline: '25,000 emails for ₹299',
    description: 'High-volume batch dispatches for growing startups and SaaS platforms. Zero transaction fee via UPI.',
    features: ['25,000 extra email credits', 'Never expires', 'Sub-second queue priority', 'Unlimited recipient domains'],
  },
  {
    id: 'pro-monthly',
    name: 'Pro Monthly Pass',
    badge: 'MONTHLY',
    type: 'subscription',
    plan: 'pro',
    cycle: 'monthly',
    priceRupees: 20,
    credits: 0,
    tagline: '₹20/month',
    description: 'Unlocks Custom Transactional Templates, brand logos, dynamic {{variables}}, and multi-account failover.',
    features: ['Custom HTML Templates & Live Editor', 'Brand Logo anti-piracy header', 'Multi-account pool failover', 'Full REST API & SDK access'],
  },
  {
    id: 'pro-yearly',
    name: 'Pro Annual Pass',
    badge: '10% OFF',
    type: 'subscription',
    plan: 'pro',
    cycle: 'yearly',
    priceRupees: 216,
    originalPriceRupees: 240,
    credits: 0,
    tagline: '₹216/year (save ₹24)',
    description: 'Monthly plan × 12 with 10% discount applied. 365 days of uninterrupted developer Pro features.',
    features: ['Full Pro developer features for 1 year', '10% discount applied', 'All future Pro templates included', 'Priority webhook delivery'],
  },
  {
    id: 'pro-unlimited',
    name: 'Pro Unlimited & Scale Pack',
    badge: 'ENTERPRISE',
    type: 'hybrid',
    plan: 'pro',
    cycle: 'monthly',
    priceRupees: 499,
    credits: 50000,
    tagline: '50,000 emails + Pro features',
    description: 'Everything in Pro plus 50,000 high-speed transactional email credits.',
    features: ['50,000 email credits', 'Pro Custom Templates unlocked', 'Dedicated IP warm-up routing', '24/7 developer webhook assistance'],
  },
];

/**
 * Returns an authenticated Razorpay instance
 * @returns {Razorpay}
 */
function getRazorpayClient() {
  const key_id = process.env.RAZORPAY_KEY_ID;
  const key_secret = process.env.RAZORPAY_KEY_SECRET;

  if (!key_id || !key_secret) {
    throw new Error('Razorpay keys not configured. Please set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET in environment variables.');
  }

  return new Razorpay({ key_id, key_secret });
}

/**
 * Creates an order on Razorpay
 * 
 * @param {Object} options
 * @param {string} options.orderId - Unique Dakly internal order ID
 * @param {number} options.amount - Amount in INR (e.g. 20, 216, 299)
 * @param {string} [options.currency='INR'] - Currency code
 * @param {Object} [options.customer={}] - Customer name and email
 * @param {Object} [options.metadata={}] - Metadata to attach
 * @returns {Promise<{ razorpayOrderId: string, amount: number, currency: string, keyId: string }>}
 */
async function createRazorpayOrder({ orderId, amount, currency = 'INR', customer = {}, metadata = {} }) {
  const instance = getRazorpayClient();
  const amountPaise = Math.round(Number(amount) * 100);

  const rzpOrder = await instance.orders.create({
    amount: amountPaise,
    currency,
    receipt: (orderId || `order_${Date.now()}`).substring(0, 40),
    notes: {
      orderId: String(orderId || ''),
      userId: String(metadata.userId || ''),
      projectId: String(metadata.projectId || ''),
      planId: String(metadata.planId || ''),
      creditsToAdd: String(metadata.creditsToAdd || 0),
      plan: String(metadata.plan || ''),
      cycle: String(metadata.cycle || ''),
    },
  });

  return {
    razorpayOrderId: rzpOrder.id,
    amount: rzpOrder.amount,
    currency: rzpOrder.currency,
    keyId: process.env.RAZORPAY_KEY_ID,
  };
}

/**
 * Verifies the payment signature returned by the client-side Razorpay modal.
 * HMAC-SHA256 of `${razorpayOrderId}|${razorpayPaymentId}` with RAZORPAY_KEY_SECRET
 * 
 * @param {Object} params
 * @param {string} params.razorpayOrderId
 * @param {string} params.razorpayPaymentId
 * @param {string} params.razorpaySignature
 * @returns {boolean}
 */
function verifyRazorpayPaymentSignature({ razorpayOrderId, razorpayPaymentId, razorpaySignature }) {
  const secret = process.env.RAZORPAY_KEY_SECRET;
  if (!secret || !razorpayOrderId || !razorpayPaymentId || !razorpaySignature) {
    return false;
  }

  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(`${razorpayOrderId}|${razorpayPaymentId}`)
    .digest('hex');

  const providedBuf = Buffer.from(String(razorpaySignature).trim());
  const expectedBuf = Buffer.from(expectedSignature.trim());

  if (providedBuf.length !== expectedBuf.length) {
    return false;
  }

  return crypto.timingSafeEqual(providedBuf, expectedBuf);
}

/**
 * Verifies Razorpay Webhook signature (x-razorpay-signature header)
 * 
 * @param {Buffer|string} rawBody - Raw unparsed webhook bytes
 * @param {string} signature - Header value
 * @param {string} secret - RAZORPAY_WEBHOOK_SECRET
 * @returns {boolean}
 */
function verifyRazorpayWebhookSignature(rawBody, signature, secret) {
  if (!signature || !secret) {
    return false;
  }

  const rawBuffer = Buffer.isBuffer(rawBody)
    ? rawBody
    : Buffer.from(typeof rawBody === 'string' ? rawBody : JSON.stringify(rawBody), 'utf8');

  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(rawBuffer)
    .digest('hex');

  const providedBuf = Buffer.from(String(signature).trim());
  const expectedBuf = Buffer.from(expectedSignature.trim());

  if (providedBuf.length !== expectedBuf.length) {
    return false;
  }

  return crypto.timingSafeEqual(providedBuf, expectedBuf);
}

/**
 * Fulfills an authenticated payment order (upgrades plan tier and/or adds credits).
 * Implements strict idempotency so duplicate requests or webhooks are safely ignored.
 * 
 * @param {Object} params
 * @param {string} params.orderId - Unique internal order ID
 * @param {number} [params.amount] - Paid amount in INR
 * @param {string} [params.razorpayOrderId] - Razorpay Order ID
 * @param {string} [params.razorpayPaymentId] - Razorpay Payment ID
 * @param {string} [params.razorpaySignature] - Payment signature
 * @param {string} [params.method='RAZORPAY'] - Payment method
 * @param {Object} [params.metadata={}] - Metadata attached to checkout
 * @param {Object} [params.rawPayload=null] - Full event / verification payload
 * @returns {Promise<{ success: boolean, alreadyProcessed?: boolean, order: Object, project?: Object, user?: Object }>}
 */
async function fulfillPaymentOrder({
  orderId,
  amount,
  razorpayOrderId = null,
  razorpayPaymentId = null,
  razorpaySignature = null,
  method = 'RAZORPAY',
  metadata = {},
  rawPayload = null,
}) {
  if (!orderId && !razorpayOrderId) {
    throw new Error('Order ID or Razorpay Order ID is required for fulfillment');
  }

  // Idempotency check: if this order was already successfully fulfilled, return cleanly
  let existingOrder = null;
  if (orderId) {
    existingOrder = await PaymentOrder.findOne({ orderId });
  }
  if (!existingOrder && razorpayOrderId) {
    existingOrder = await PaymentOrder.findOne({ razorpayOrderId });
  }

  if (existingOrder && existingOrder.status === 'SUCCESS') {
    return {
      success: true,
      alreadyProcessed: true,
      order: existingOrder,
    };
  }

  const planId = metadata.planId || existingOrder?.planId || null;
  const creditsToAdd = Number(metadata.creditsToAdd || existingOrder?.creditsAdded || 0);
  const targetPlan = metadata.plan || (planId && planId.startsWith('pro') ? 'pro' : null);
  const targetCycle = metadata.cycle || (planId === 'pro-yearly' ? 'yearly' : 'monthly');

  let updatedProject = null;
  let updatedUser = null;

  const targetProjectId = metadata.projectId || existingOrder?.projectId;
  const targetUserId = metadata.userId || existingOrder?.userId;

  // 1. Fulfill Project Tier / Quota if targetProjectId is valid
  if (targetProjectId && mongoose.isValidObjectId(targetProjectId)) {
    const project = await Project.findById(targetProjectId);
    if (project) {
      if (targetPlan === 'pro') {
        project.plan = 'pro';
        project.planCycle = targetCycle;
      }
      if (creditsToAdd > 0) {
        project.purchasedCredits = (project.purchasedCredits || 0) + creditsToAdd;
      }
      await project.save();
      updatedProject = project;
    }
  } else if (targetUserId && mongoose.isValidObjectId(targetUserId)) {
    // If no specific projectId provided, upgrade user's primary project
    const project = await Project.findOne({ userId: targetUserId });
    if (project) {
      if (targetPlan === 'pro') {
        project.plan = 'pro';
        project.planCycle = targetCycle;
      }
      if (creditsToAdd > 0) {
        project.purchasedCredits = (project.purchasedCredits || 0) + creditsToAdd;
      }
      await project.save();
      updatedProject = project;
    }
  }

  // 2. Fulfill User Account Credits if targetUserId is valid
  if (targetUserId && mongoose.isValidObjectId(targetUserId)) {
    const user = await User.findById(targetUserId);
    if (user && creditsToAdd > 0) {
      user.credits = (user.credits || 0) + creditsToAdd;
      await user.save();
      updatedUser = user;
    }
  }

  // 3. Record or Update PaymentOrder Record
  let order = existingOrder;
  if (!order) {
    order = new PaymentOrder({
      orderId: orderId || `dakly_rzp_${Date.now()}`,
      userId: targetUserId && mongoose.isValidObjectId(targetUserId) ? targetUserId : null,
      projectId: updatedProject ? updatedProject._id : (targetProjectId && mongoose.isValidObjectId(targetProjectId) ? targetProjectId : null),
      amount: Number(amount) || 0,
      currency: 'INR',
      status: 'SUCCESS',
      method: method || 'RAZORPAY',
      razorpayOrderId,
      razorpayPaymentId,
      razorpaySignature,
      planId,
      creditsAdded: creditsToAdd,
      planUpgraded: targetPlan,
      metadata,
      rawWebhookPayload: rawPayload,
      fulfilledAt: new Date(),
    });
  } else {
    order.status = 'SUCCESS';
    order.amount = Number(amount) || order.amount;
    order.method = method || order.method || 'RAZORPAY';
    order.razorpayOrderId = razorpayOrderId || order.razorpayOrderId;
    order.razorpayPaymentId = razorpayPaymentId || order.razorpayPaymentId;
    order.razorpaySignature = razorpaySignature || order.razorpaySignature;
    order.planId = planId || order.planId;
    order.creditsAdded = creditsToAdd || order.creditsAdded;
    order.planUpgraded = targetPlan || order.planUpgraded;
    order.metadata = { ...order.metadata, ...metadata };
    order.rawWebhookPayload = rawPayload || order.rawWebhookPayload;
    order.fulfilledAt = new Date();
  }

  await order.save();

  return {
    success: true,
    order,
    project: updatedProject,
    user: updatedUser,
  };
}

module.exports = {
  AVAILABLE_PLANS,
  getRazorpayClient,
  createRazorpayOrder,
  verifyRazorpayPaymentSignature,
  verifyRazorpayWebhookSignature,
  fulfillPaymentOrder,
};
