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
    to: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
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
    sentAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

// Index for fast query of recent logs per project
emailLogSchema.index({ projectId: 1, createdAt: -1 });

module.exports = mongoose.model('EmailLog', emailLogSchema);
