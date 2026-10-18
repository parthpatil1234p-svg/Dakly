const mongoose = require('mongoose');
const { decrypt, generateApiKey } = require('../utils/crypto');

const projectSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: false, // Optional so projects can also be created directly via quick setup
    },
    name: {
      type: String,
      required: [true, 'Please provide a project name'],
      trim: true,
      maxlength: [100, 'Project name cannot exceed 100 characters'],
    },
    senderEmail: {
      type: String,
      required: [true, 'Please provide the sender Gmail address'],
      lowercase: true,
      trim: true,
      match: [
        /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/,
        'Please provide a valid Gmail address',
      ],
    },
    senderDisplayName: {
      type: String,
      default: '', // If empty, defaults to project name
    },
    // AES-256-GCM Encrypted Google App Password
    encryptedPassword: {
      type: String,
      required: [true, 'Encrypted password is required'],
      select: false,
    },
    iv: {
      type: String,
      required: true,
      select: false,
    },
    authTag: {
      type: String,
      required: true,
      select: false,
    },
    // Unique API Key for calling the email microservice
    apiKey: {
      type: String,
      required: true,
      unique: true,
      index: true,
      default: () => generateApiKey(),
    },
    // Daily Quota Tracking (Gmail free limit = 500/day)
    dailyQuota: {
      type: Number,
      default: 500,
    },
    emailsSentToday: {
      type: Number,
      default: 0,
    },
    lastQuotaReset: {
      type: Date,
      default: Date.now,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

/**
 * Helper to decrypt the stored Google App Password
 */
projectSchema.methods.getDecryptedPassword = function () {
  return decrypt(this.encryptedPassword, this.iv, this.authTag);
};

/**
 * Check if project has remaining quota for today
 * Automatically resets quota if a new day has started
 */
projectSchema.methods.canSendEmail = function () {
  const now = new Date();
  const lastReset = new Date(this.lastQuotaReset);

  // Check if today is a different calendar day
  const isDifferentDay =
    now.getUTCFullYear() !== lastReset.getUTCFullYear() ||
    now.getUTCMonth() !== lastReset.getUTCMonth() ||
    now.getUTCDate() !== lastReset.getUTCDate();

  if (isDifferentDay) {
    this.emailsSentToday = 0;
    this.lastQuotaReset = now;
  }

  return this.emailsSentToday < this.dailyQuota;
};

/**
 * Increment today's sent email count
 */
projectSchema.methods.incrementSentCount = async function () {
  this.emailsSentToday += 1;
  return await this.save();
};

module.exports = mongoose.model('Project', projectSchema);
