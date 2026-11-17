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
  // 1. Pro Developer Subscription Passes
  {
    id: 'pro-monthly',
    name: 'Pro Monthly Pass',
    category: 'plans',
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
    category: 'plans',
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
  // 2. Extra Email Credit Packs (One-time, stacks on daily Gmail quota)
  {
    id: 'starter-pack',
    name: 'Starter Credits Pack',
    category: 'credits',
    badge: 'PAY-AS-YOU-GO',
    type: 'credits',
    plan: null,
    cycle: null,
    priceRupees: 99,
    credits: 5000,
    tagline: '5,000 emails for ₹99',
    description: 'Instant top-up of 5,000 transactional emails. Credits never expire and stack on top of daily Gmail quota.',
    features: ['5,000 extra email credits', 'Never expires', 'Stacks over daily Gmail limit', 'Works with all REST endpoints & SDK'],
  },
  {
    id: 'growth-pack',
    name: 'Growth Credits Pack',
    category: 'credits',
    badge: 'MOST POPULAR',
    type: 'credits',
    plan: null,
    cycle: null,
    priceRupees: 299,
    credits: 25000,
    tagline: '25,000 emails for ₹299',
    description: 'High-volume batch dispatches for growing startups and SaaS platforms. (₹0.011 / email).',
    features: ['25,000 extra email credits', 'Permanent validity with zero expiry', 'Sub-second queue priority', 'Dedicated IP burst pacing protection'],
  },
  {
    id: 'scale-pack',
    name: 'Scale Credits Pack',
    category: 'credits',
    badge: 'BEST VALUE',
    type: 'credits',
    plan: null,
    cycle: null,
    priceRupees: 499,
    credits: 50000,
    tagline: '50,000 emails for ₹499',
    description: 'Maximum volume injection: 50,000 permanent email credits for large-scale marketing & launch OTPs.',
    features: ['50,000 extra email credits', 'Never expires', 'Priority routing & burst protection', 'Volume discount (₹0.009 / email)'],
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
      category: String(metadata.category || ''),
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
 * Strictly guarantees database persistence in MongoDB so upgrades survive page refresh.
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

  // Find existing order if already created in database
  let existingOrder = null;
  if (orderId) {
    existingOrder = await PaymentOrder.findOne({ orderId });
  }
  if (!existingOrder && razorpayOrderId) {
    existingOrder = await PaymentOrder.findOne({ razorpayOrderId });
  }

  // Idempotency: if already fulfilled, return current state
  if (existingOrder && existingOrder.status === 'SUCCESS') {
    let p = null;
    if (existingOrder.projectId) {
      p = await Project.findById(existingOrder.projectId);
    }
    return {
      success: true,
      alreadyProcessed: true,
      order: existingOrder,
      project: p,
    };
  }

  // Merge metadata: explicit parameters passed in verify call take precedence over initial pending order
  const mergedMeta = {
    ...(existingOrder?.metadata || {}),
    ...metadata,
  };

  const planId = mergedMeta.planId || existingOrder?.planId || null;
  const creditsToAdd = Number(mergedMeta.creditsToAdd || mergedMeta.credits || existingOrder?.creditsAdded || 0);

  // Determine whether this purchase is for a Pro subscription pass or email credits
  const isSubscriptionPass =
    mergedMeta.category === 'plans' ||
    planId === 'pro-monthly' ||
    planId === 'pro-yearly' ||
    (mergedMeta.plan === 'pro' && creditsToAdd === 0);

  const targetPlan = isSubscriptionPass ? 'pro' : null;
  const targetCycle = mergedMeta.cycle || (planId === 'pro-yearly' ? 'yearly' : 'monthly');

  let updatedProject = null;
  let updatedUser = null;

  const targetProjectId = mergedMeta.projectId || existingOrder?.projectId;
  const targetUserId = mergedMeta.userId || existingOrder?.userId;

  // 1. Locate and update Project in MongoDB
  if (targetProjectId && mongoose.isValidObjectId(targetProjectId)) {
    updatedProject = await Project.findById(targetProjectId);
  }

  // Fallback: If not found by targetProjectId, look up by owner userId
  if (!updatedProject && targetUserId && mongoose.isValidObjectId(targetUserId)) {
    updatedProject = await Project.findOne({ userId: targetUserId });
  }

  // Fallback 2: Look up by team workspace member user ID
  if (!updatedProject && targetUserId && mongoose.isValidObjectId(targetUserId)) {
    updatedProject = await Project.findOne({ 'members.user': targetUserId });
  }

  // Apply updates to project
  if (updatedProject) {
    if (targetPlan === 'pro') {
      updatedProject.plan = 'pro';
      updatedProject.planCycle = targetCycle;
      console.log(`🚀 [Payment] Project ${updatedProject.name} (${updatedProject._id}) upgraded to Pro (${targetCycle}).`);
    }

    if (creditsToAdd > 0) {
      updatedProject.purchasedCredits = Number(updatedProject.purchasedCredits || 0) + creditsToAdd;
      console.log(`💎 [Payment] Added ${creditsToAdd} credits to project ${updatedProject.name}. Total: ${updatedProject.purchasedCredits}`);
    }

    await updatedProject.save();
  }

  // 2. Fulfill User Account record if targetUserId is valid
  if (targetUserId && mongoose.isValidObjectId(targetUserId)) {
    updatedUser = await User.findById(targetUserId);
    if (updatedUser && creditsToAdd > 0) {
      updatedUser.credits = Number(updatedUser.credits || 0) + creditsToAdd;
      await updatedUser.save();
    }
  }

  // 3. Save or update PaymentOrder Record
  let order = existingOrder;
  if (!order) {
    order = new PaymentOrder({
      orderId: orderId || `dakly_rzp_${Date.now()}`,
      userId: targetUserId && mongoose.isValidObjectId(targetUserId) ? targetUserId : (updatedProject?.userId || null),
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
      metadata: mergedMeta,
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
    order.metadata = { ...order.metadata, ...mergedMeta };
    order.rawWebhookPayload = rawPayload || order.rawWebhookPayload;
    order.fulfilledAt = new Date();
    if (updatedProject && !order.projectId) {
      order.projectId = updatedProject._id;
    }
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
