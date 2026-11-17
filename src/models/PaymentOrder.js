/**
 * PaymentOrder Model for Dakly
 * Tracks YouPI Sovereign Payment Gateway orders, UPI UTR numbers, and credit/tier fulfillment.
 * 
 * @license MIT
 */

'use strict';

const mongoose = require('mongoose');

const paymentOrderSchema = new mongoose.Schema(
  {
    orderId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      index: true,
      default: null,
    },
    projectId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Project',
      index: true,
      default: null,
    },
    amount: {
      type: Number,
      required: true,
    },
    currency: {
      type: String,
      default: 'INR',
    },
    status: {
      type: String,
      enum: ['PENDING', 'SUCCESS', 'FAILED'],
      default: 'PENDING',
      index: true,
    },
    method: {
      type: String,
      default: 'UPI',
    },
    utr: {
      type: String,
      default: null,
      index: true,
    },
    planId: {
      type: String,
      default: null,
    },
    creditsAdded: {
      type: Number,
      default: 0,
    },
    planUpgraded: {
      type: String,
      default: null,
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    rawWebhookPayload: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },
    fulfilledAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('PaymentOrder', paymentOrderSchema);
