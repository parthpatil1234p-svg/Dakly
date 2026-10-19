const mongoose = require('mongoose');

const suppressionSchema = new mongoose.Schema(
  {
    projectId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Project',
      required: true,
      index: true,
    },
    email: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
    },
    reason: {
      type: String,
      enum: ['HARD_BOUNCE', 'INVALID_RECIPIENT', 'MANUAL_BLOCK', 'SPAM_COMPLAINT'],
      default: 'HARD_BOUNCE',
    },
    bounceCode: {
      type: String,
      default: null, // e.g. "550 5.1.1 User Unknown"
    },
    details: {
      type: String,
      default: null,
    },
    blockedDispatchesCount: {
      type: Number,
      default: 0,
    },
    lastAttemptedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

// Compound index to guarantee uniqueness per project and fast O(1) lookups
suppressionSchema.index({ projectId: 1, email: 1 }, { unique: true });

module.exports = mongoose.model('Suppression', suppressionSchema);
