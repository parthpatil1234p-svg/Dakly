const mongoose = require('mongoose');

const emailLogSchema = new mongoose.Schema(
  {
    projectId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Project',
      required: true,
      index: true,
    },
    trackingId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    senderEmail: {
      type: String,
      default: '',
      trim: true,
    },
    to: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    subject: {
      type: String,
      default: '(No Subject)',
      trim: true,
    },
    status: {
      type: String,
      enum: ['DELIVERED', 'FAILED', 'QUEUED'],
      default: 'DELIVERED',
      index: true,
    },
    error: {
      type: String,
      default: null,
    },
    hasAttachments: {
      type: Boolean,
      default: false,
    },
    attachmentsCount: {
      type: Number,
      default: 0,
    },
    executionTimeMs: {
      type: Number,
      default: 0,
    },
    webhookStatus: {
      type: String,
      enum: ['NOT_CONFIGURED', 'SENT', 'FAILED', 'SKIPPED'],
      default: 'NOT_CONFIGURED',
    },
    sentAt: {
      type: Date,
      default: Date.now,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

// Compound indexes for high-performance dashboard searches
emailLogSchema.index({ projectId: 1, createdAt: -1 });
emailLogSchema.index({ projectId: 1, status: 1, createdAt: -1 });

module.exports = mongoose.model('EmailLog', emailLogSchema);
