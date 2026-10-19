const mongoose = require('mongoose');
const { decrypt, encrypt, generateApiKey } = require('../utils/crypto');
const { calculateWarmupStage } = require('../utils/warmupHelper');

const senderAccountSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: [true, 'Please provide the sender Gmail address'],
      lowercase: true,
      trim: true,
      match: [
        /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/,
        'Please provide a valid Gmail address',
      ],
    },
    displayName: {
      type: String,
      default: '',
      trim: true,
    },
    encryptedPassword: {
      type: String,
      required: true,
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
    priority: {
      type: Number,
      default: 0, // 0 = Primary, 1 = Backup 1, 2 = Backup 2
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    isExhaustedToday: {
      type: Boolean,
      default: false,
    },
    // Smart Warm-up Mode (Progressive daily ramp: Day 1: 25, Day 2: 50... Day 6: 500)
    warmupEnabled: {
      type: Boolean,
      default: true,
    },
    warmupStartedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

const memberSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: false,
    },
    email: {
      type: String,
      required: [true, 'Please provide member email'],
      lowercase: true,
      trim: true,
    },
    role: {
      type: String,
      enum: ['admin', 'viewer'],
      default: 'admin',
    },
    status: {
      type: String,
      enum: ['active', 'pending'],
      default: 'active',
    },
    invitedBy: {
      type: String,
      default: '',
    },
    invitedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

const projectSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: false,
    },
    name: {
      type: String,
      required: [true, 'Please provide a project name'],
      trim: true,
      maxlength: [100, 'Project name cannot exceed 100 characters'],
    },
    // Multi-Account Failover Pool (Primary + Backup Gmails)
    senders: [senderAccountSchema],

    // Legacy fields preserved for 100% backward compatibility
    senderEmail: {
      type: String,
      lowercase: true,
      trim: true,
    },
    senderDisplayName: {
      type: String,
      default: '',
    },
    encryptedPassword: {
      type: String,
      select: false,
    },
    iv: {
      type: String,
      select: false,
    },
    authTag: {
      type: String,
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
    // Aggregated Quota Tracking
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
    // Smart Warm-up Mode (Project-level default)
    warmupEnabled: {
      type: Boolean,
      default: true,
    },
    warmupStartedAt: {
      type: Date,
      default: Date.now,
    },
    // Anti-Spam Burst Pacing (Default 200ms spacing between rapid sends)
    burstPacingMs: {
      type: Number,
      default: 200,
      min: 0,
      max: 5000,
    },
    // Delivery Webhooks & Instant Delivery Alerts
    webhookUrl: {
      type: String,
      default: null,
      trim: true,
    },
    webhookSecret: {
      type: String,
      default: null,
      trim: true,
    },
    webhookEnabled: {
      type: Boolean,
      default: true,
    },
    webhookEvents: {
      type: [String],
      default: [
        'email.delivered',
        'email.failed',
        'email.suppressed',
        'email.opened',
        'email.clicked',
      ],
    },
    lastWebhookDispatchedAt: {
      type: Date,
      default: null,
    },
    lastWebhookStatus: {
      type: String,
      default: null,
    },
    lastWebhookResponseCode: {
      type: Number,
      default: null,
    },
    lastWebhookLatencyMs: {
      type: Number,
      default: null,
    },
    lastWebhookError: {
      type: String,
      default: null,
    },
    // Inbound Activity & Connectivity Tracking
    lastApiCallAt: {
      type: Date,
      default: null,
    },
    lastClientIp: {
      type: String,
      default: null,
    },
    // Brand Logo (Strict 1:1 Square Only, 1 Image Limit per Project)
    brandLogo: {
      data: {
        type: String,
        default: null,
      },
      contentType: {
        type: String,
        default: null,
      },
      width: {
        type: Number,
        default: null,
      },
      height: {
        type: Number,
        default: null,
      },
      sizeBytes: {
        type: Number,
        default: 0,
      },
      updatedAt: {
        type: Date,
        default: null,
      },
    },
    // IP Whitelisting (Security Guard)
    ipWhitelist: {
      type: [String],
      default: [],
    },
    ipWhitelistEnabled: {
      type: Boolean,
      default: false,
    },
    // Team Workspaces & Multi-Seat Collaboration
    members: [memberSchema],
  },
  {
    timestamps: true,
  }
);

/**
 * Resolves user role on this project: 'owner', 'admin', 'viewer', or null if no access
 * @param {Object} user - Decoded User object or { _id, email }
 * @returns {'owner' | 'admin' | 'viewer' | null}
 */
projectSchema.methods.getUserRole = function (user) {
  if (!user) {
    return !this.userId ? 'owner' : null;
  }

  const userIdStr = (user._id || user.id || '').toString();
  const userEmail = (user.email || '').toLowerCase().trim();

  // If project has no owner recorded (legacy), whoever connects is treated as owner
  if (!this.userId) {
    return 'owner';
  }

  // Project owner
  if (this.userId.toString() === userIdStr) {
    return 'owner';
  }

  // Check team members list
  if (this.members && this.members.length > 0) {
    const member = this.members.find((m) => {
      const mUserId = m.user ? m.user.toString() : null;
      const mEmail = (m.email || '').toLowerCase().trim();
      return (mUserId && mUserId === userIdStr) || (userEmail && mEmail === userEmail);
    });

    if (member) {
      return member.role || 'viewer';
    }
  }

  return null;
};

/**
 * Normalizes all available senders (handles both multi-sender array & legacy single sender)
 * @returns {Array<Object>} Sorted list of active senders
 */
projectSchema.methods.getAllSenders = function () {
  if (this.senders && this.senders.length > 0) {
    return this.senders
      .filter((s) => s.isActive)
      .sort((a, b) => a.priority - b.priority);
  }

  // Fallback to legacy single sender fields
  if (this.senderEmail) {
    return [
      {
        _id: this._id,
        email: this.senderEmail,
        displayName: this.senderDisplayName || this.name,
        encryptedPassword: this.encryptedPassword,
        iv: this.iv,
        authTag: this.authTag,
        dailyQuota: this.dailyQuota || 500,
        emailsSentToday: this.emailsSentToday || 0,
        lastQuotaReset: this.lastQuotaReset || Date.now(),
        priority: 0,
        isActive: this.isActive !== false,
        isExhaustedToday: false,
        warmupEnabled: this.warmupEnabled !== false,
        warmupStartedAt: this.warmupStartedAt || this.createdAt || Date.now(),
        isLegacy: true,
      },
    ];
  }

  return [];
};

/**
 * Selects the active sender using Failover Logic:
 * Checks Primary -> if full/exhausted -> switches to Backup 1 -> Backup 2...
 * Automatically resets daily quota on day transition (UTC).
 * Respects progressive Smart Warm-up daily limits if enabled.
 * @returns {Object|null} Active sender object or null if all quotas exhausted
 */
projectSchema.methods.getActiveSender = function () {
  const senders = this.getAllSenders();
  const now = new Date();

  for (const sender of senders) {
    const lastReset = new Date(sender.lastQuotaReset || this.lastQuotaReset);
    const isDifferentDay =
      now.getUTCFullYear() !== lastReset.getUTCFullYear() ||
      now.getUTCMonth() !== lastReset.getUTCMonth() ||
      now.getUTCDate() !== lastReset.getUTCDate();

    if (isDifferentDay) {
      sender.emailsSentToday = 0;
      sender.isExhaustedToday = false;
      sender.lastQuotaReset = now;
    }

    // Determine effective daily quota (Progressive Warm-up vs Full Quota)
    const effectiveLimit = sender.warmupEnabled !== false
      ? calculateWarmupStage(sender.warmupStartedAt, sender.dailyQuota).effectiveQuota
      : sender.dailyQuota;

    if (!sender.isExhaustedToday && sender.emailsSentToday < effectiveLimit) {
      return sender;
    }
  }

  return null;
};

/**
 * Decrypts the Google App Password for a specific sender or the legacy sender
 */
projectSchema.methods.getDecryptedPassword = function (sender) {
  const encPass = sender ? sender.encryptedPassword : this.encryptedPassword;
  const iv = sender ? sender.iv : this.iv;
  const authTag = sender ? sender.authTag : this.authTag;

  if (!encPass || !iv || !authTag) {
    throw new Error('Encryption credentials missing for sender.');
  }

  return decrypt(encPass, iv, authTag);
};

/**
 * Increment sent email count for the active sender and the project
 */
projectSchema.methods.incrementSenderSent = async function (senderEmail) {
  this.emailsSentToday = (this.emailsSentToday || 0) + 1;

  if (this.senders && this.senders.length > 0) {
    const target = this.senders.find((s) => s.email.toLowerCase() === senderEmail.toLowerCase());
    if (target) {
      target.emailsSentToday = (target.emailsSentToday || 0) + 1;
    }
  }

  return await this.save();
};

/**
 * Temporarily marks a sender as exhausted for today (e.g. if Gmail returns daily limit exceeded)
 * This causes the engine to automatically failover to the next backup sender.
 */
projectSchema.methods.markSenderExhausted = async function (senderEmail) {
  if (this.senders && this.senders.length > 0) {
    const target = this.senders.find((s) => s.email.toLowerCase() === senderEmail.toLowerCase());
    if (target) {
      target.isExhaustedToday = true;
    }
  }
  return await this.save();
};

/**
 * Adds a new Gmail sender (Primary or Backup) to the project
 */
projectSchema.methods.addSender = async function ({
  email,
  appPassword,
  displayName = '',
  dailyQuota = 500,
  priority = 1,
  warmupEnabled = true,
}) {
  const cleanPassword = appPassword.replace(/\s+/g, '');
  const { encryptedData, iv, authTag } = encrypt(cleanPassword);

  const cleanEmail = email.trim().toLowerCase();

  // If this is the first sender added to a project with legacy fields, migrate legacy to senders[0]
  if ((!this.senders || this.senders.length === 0) && this.senderEmail) {
    this.senders = [
      {
        email: this.senderEmail,
        displayName: this.senderDisplayName || this.name,
        encryptedPassword: this.encryptedPassword,
        iv: this.iv,
        authTag: this.authTag,
        dailyQuota: this.dailyQuota || 500,
        emailsSentToday: this.emailsSentToday || 0,
        lastQuotaReset: this.lastQuotaReset || Date.now(),
        priority: 0,
        isActive: true,
        warmupEnabled: this.warmupEnabled !== false,
        warmupStartedAt: this.warmupStartedAt || Date.now(),
      },
    ];
  }

  // Check if sender already exists
  const existingIndex = this.senders.findIndex((s) => s.email.toLowerCase() === cleanEmail);
  if (existingIndex >= 0) {
    this.senders[existingIndex].displayName = displayName || this.senders[existingIndex].displayName;
    this.senders[existingIndex].encryptedPassword = encryptedData;
    this.senders[existingIndex].iv = iv;
    this.senders[existingIndex].authTag = authTag;
    this.senders[existingIndex].dailyQuota = dailyQuota;
    this.senders[existingIndex].priority = priority;
    this.senders[existingIndex].isActive = true;
    this.senders[existingIndex].isExhaustedToday = false;
    if (warmupEnabled !== undefined) {
      this.senders[existingIndex].warmupEnabled = warmupEnabled;
    }
  } else {
    this.senders.push({
      email: cleanEmail,
      displayName: displayName || this.name,
      encryptedPassword: encryptedData,
      iv,
      authTag,
      dailyQuota,
      priority,
      isActive: true,
      isExhaustedToday: false,
      warmupEnabled: warmupEnabled !== false,
      warmupStartedAt: new Date(),
    });
  }

  // Recalculate total daily quota
  this.dailyQuota = this.senders.reduce((acc, s) => acc + (s.isActive ? s.dailyQuota : 0), 0);

  return await this.save();
};

/**
 * Returns overall quota and sender status summary including Smart Warm-up details
 */
projectSchema.methods.getCapacitySummary = function () {
  const senders = this.getAllSenders();
  const totalDailyQuota = senders.reduce((acc, s) => acc + (s.isActive ? s.dailyQuota : 0), 0) || this.dailyQuota;

  const totalEffectiveDailyQuota = senders.reduce((acc, s) => {
    if (!s.isActive) return acc;
    const stage = calculateWarmupStage(s.warmupStartedAt, s.dailyQuota);
    return acc + (s.warmupEnabled !== false ? stage.effectiveQuota : s.dailyQuota);
  }, 0) || this.dailyQuota;

  const totalSentToday = senders.reduce((acc, s) => acc + s.emailsSentToday, 0) || this.emailsSentToday;

  return {
    totalDailyQuota,
    totalEffectiveDailyQuota,
    totalSentToday,
    remainingToday: Math.max(0, totalEffectiveDailyQuota - totalSentToday),
    sendersCount: senders.length,
    senders: senders.map((s, idx) => {
      const warmup = calculateWarmupStage(s.warmupStartedAt, s.dailyQuota);
      const effectiveQuota = s.warmupEnabled !== false ? warmup.effectiveQuota : s.dailyQuota;
      return {
        id: s._id,
        email: s.email,
        displayName: s.displayName,
        priority: s.priority,
        role: s.priority === 0 || idx === 0 ? 'Primary' : `Backup #${s.priority || idx}`,
        dailyQuota: s.dailyQuota,
        effectiveQuota,
        emailsSentToday: s.emailsSentToday,
        remainingToday: Math.max(0, effectiveQuota - s.emailsSentToday),
        isActive: s.isActive,
        isExhaustedToday: !!s.isExhaustedToday,
        warmupEnabled: s.warmupEnabled !== false,
        warmup: {
          enabled: s.warmupEnabled !== false,
          day: warmup.day,
          stage: warmup.stage,
          effectiveQuota: warmup.effectiveQuota,
          maxQuota: s.dailyQuota,
          isComplete: warmup.isComplete,
          progressPercent: warmup.progressPercent,
        },
      };
    }),
  };
};

module.exports = mongoose.model('Project', projectSchema);
