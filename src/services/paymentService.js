/**
 * Sovereign UPI Payment Gateway (YouPI PG) Service for Dakly
 * Handles signature verification, plan pricing, credit bundles, and order fulfillment.
 * 
 * @license MIT
 */

'use strict';

const crypto = require('crypto');
const mongoose = require('mongoose');
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
 * Verifies the HMAC-SHA256 signature from YouPI PG over the raw request bytes.
 * @param {Buffer|string} rawBody - Raw unparsed request body
 * @param {string} signatureHeader - 'x-gateway-signature' header (e.g. 'sha256=...')
 * @param {string} secret - YOUPI_WEBHOOK_SECRET
 * @returns {boolean} Whether signature is valid and authentic
 */
function verifyWebhookSignature(rawBody, signatureHeader, secret) {
  if (!signatureHeader || !secret) {
    return false;
  }

  const rawBuffer = Buffer.isBuffer(rawBody)
    ? rawBody
    : Buffer.from(typeof rawBody === 'string' ? rawBody : JSON.stringify(rawBody), 'utf8');

  const expectedHash = crypto
    .createHmac('sha256', secret)
    .update(rawBuffer)
    .digest('hex');

  const expectedSignature = `sha256=${expectedHash}`;

  const providedBuf = Buffer.from(signatureHeader.trim());
  const expectedBuf = Buffer.from(expectedSignature);

  if (providedBuf.length !== expectedBuf.length) {
    return false;
  }

  return crypto.timingSafeEqual(providedBuf, expectedBuf);
}

/**
 * Fulfills an authenticated payment order (upgrades plan tier and/or adds credits).
 * Implements strict idempotency so duplicate webhook dispatches are safely ignored.
 * 
 * @param {Object} params
 * @param {string} params.orderId - Unique merchant order id
 * @param {number} params.amount - Paid amount in INR
 * @param {string} [params.utr] - UPI bank transaction reference
 * @param {string} [params.method='UPI'] - Payment method
 * @param {Object} [params.metadata={}] - Metadata attached to checkout
 * @param {Object} [params.rawPayload=null] - Full unparsed gateway event
 * @returns {Promise<{ success: boolean, alreadyProcessed?: boolean, order: Object, project?: Object }>}
 */
async function fulfillPaymentOrder({
  orderId,
  amount,
  utr = null,
  method = 'UPI',
  metadata = {},
  rawPayload = null,
}) {
  if (!orderId) {
    throw new Error('Order ID is required for fulfillment');
  }

  // Idempotency check: if this order was already successfully fulfilled, skip re-fulfillment
  const existingOrder = await PaymentOrder.findOne({ orderId });
  if (existingOrder && existingOrder.status === 'SUCCESS') {
    return {
      success: true,
      alreadyProcessed: true,
      order: existingOrder,
    };
  }

  const planId = metadata.planId || null;
  const creditsToAdd = Number(metadata.creditsToAdd || 0);
  const targetPlan = metadata.plan || (planId && planId.startsWith('pro') ? 'pro' : null);
  const targetCycle = metadata.cycle || (planId === 'pro-yearly' ? 'yearly' : 'monthly');

  let updatedProject = null;
  let updatedUser = null;

  // 1. Fulfill Project Tier / Quota if projectId or userId is present
  if (metadata.projectId && mongoose.isValidObjectId(metadata.projectId)) {
    const project = await Project.findById(metadata.projectId);
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
  } else if (metadata.userId && mongoose.isValidObjectId(metadata.userId)) {
    // If no specific projectId provided, upgrade user's first/primary project
    const project = await Project.findOne({ userId: metadata.userId });
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

  // 2. Fulfill User Account Credits if userId is provided
  if (metadata.userId && mongoose.isValidObjectId(metadata.userId)) {
    const user = await User.findById(metadata.userId);
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
      orderId,
      userId: metadata.userId && mongoose.isValidObjectId(metadata.userId) ? metadata.userId : null,
      projectId: updatedProject ? updatedProject._id : (metadata.projectId && mongoose.isValidObjectId(metadata.projectId) ? metadata.projectId : null),
      amount: Number(amount) || 0,
      currency: 'INR',
      status: 'SUCCESS',
      method: method || 'UPI',
      utr: utr || null,
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
    order.utr = utr || order.utr;
    order.planId = planId || order.planId;
    order.creditsAdded = creditsToAdd;
    order.planUpgraded = targetPlan;
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

/**
 * Creates a server-side Sovereign UPI checkout session via YouPI PG
 * 
 * @param {Object} options
 * @param {string} options.orderId - Unique order ID
 * @param {number} options.amount - Amount in INR
 * @param {Object} options.customer - Customer details (name, email, phone)
 * @param {Object} options.metadata - Order metadata
 * @returns {Promise<{ paymentId: string, checkoutUrl: string, orderId: string, amount: string }>}
 */
async function createCheckoutSession({ orderId, amount, customer = {}, metadata = {} }) {
  const host = process.env.YOUPI_CHECKOUT_HOST || 'https://dakly-pay.fly.dev';
  const merchantId = process.env.YOUPI_MERCHANT_KEY || '00000000-0000-0000-0000-000000000001';
  const merchantKey = process.env.YOUPI_MERCHANT_API_KEY || 'mk_live_25a249554b4028c390b2f1f5b9728472ade498445dabc630';

  const res = await fetch(`${host}/api/v1/payments`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Merchant-Id': merchantId,
      'X-Merchant-Key': merchantKey,
    },
    body: JSON.stringify({
      orderId,
      amount: Number(amount).toFixed(2),
      currency: 'INR',
      method: 'MANUAL_UPI',
      customer: {
        name: customer.name || 'Dakly Developer',
        email: customer.email || 'developer@example.com',
        phone: customer.phone || '',
      },
      metadata,
    }),
  });

  const data = await res.json();
  if (!res.ok || !data.paymentId) {
    throw new Error(data.error || 'Failed to create payment session on YouPI PG');
  }

  return {
    paymentId: data.paymentId,
    checkoutUrl: data.checkoutUrl,
    orderId: data.orderId,
    amount: data.amount,
  };
}

module.exports = {
  AVAILABLE_PLANS,
  verifyWebhookSignature,
  fulfillPaymentOrder,
  createCheckoutSession,
};
