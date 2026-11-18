const crypto = require('crypto');
const Project = require('../models/Project');
const Suppression = require('../models/Suppression');
const { encrypt, decrypt } = require('../utils/crypto');
const { invalidateTransporter } = require('../services/emailService');
const { validateLogoImage } = require('../utils/logoValidator');
const { calculateWarmupStage } = require('../utils/warmupHelper');

/**
 * Register a new project and receive an API Key
 * POST /api/projects
 */
async function createProject(req, res) {
  try {
    const {
      name,
      senderEmail,
      appPassword,
      senderDisplayName,
      dailyQuota,
      burstPacingMs,
      webhookUrl,
      webhookSecret,
    } = req.body;

    if (!name || !senderEmail || !appPassword) {
      return res.status(400).json({
        success: false,
        error: 'Please provide name, senderEmail, and appPassword (Google App Password).',
      });
    }

    // Google App Passwords often have spaces (e.g. "abcd efgh ijkl mnop"). Strip spaces.
    const cleanPassword = appPassword.replace(/\s+/g, '');
    const cleanEmail = senderEmail.trim().toLowerCase();

    // Encrypt the Google App Password
    const { encryptedData, iv, authTag } = encrypt(cleanPassword);

    let cleanWebhookUrl = null;
    if (webhookUrl && typeof webhookUrl === 'string' && webhookUrl.trim()) {
      const SAFE_URL_PATTERN = /^https?:\/\/(?:[a-zA-Z0-9-]+\.)+[a-zA-Z]{2,}(?::\d{1,5})?(?:\/[^\s]*)?$/;
      const { isSafeRemoteUrl, sanitizeUrlString } = require('../utils/ssrfHelper');
      const candidate = webhookUrl.trim();
      if (!SAFE_URL_PATTERN.test(candidate) || !isSafeRemoteUrl(candidate)) {
        return res.status(400).json({
          success: false,
          error: 'Disallowed Webhook Destination: URL must be a public HTTP(S) address.',
        });
      }
      cleanWebhookUrl = sanitizeUrlString(candidate);
    }

    const project = await Project.create({
      userId: req.user ? req.user._id : null,
      name: name.trim(),
      senderEmail: cleanEmail,
      senderDisplayName: senderDisplayName ? senderDisplayName.trim() : name.trim(),
      encryptedPassword: encryptedData,
      iv,
      authTag,
      dailyQuota: dailyQuota || 500,
      burstPacingMs: burstPacingMs !== undefined ? burstPacingMs : 200,
      webhookUrl: cleanWebhookUrl,
      webhookSecret: webhookSecret ? webhookSecret.trim() : null,
      senders: [
        {
          email: cleanEmail,
          displayName: senderDisplayName ? senderDisplayName.trim() : name.trim(),
          encryptedPassword: encryptedData,
          iv,
          authTag,
          dailyQuota: dailyQuota || 500,
          priority: 0,
          isActive: true,
        },
      ],
    });

    res.status(201).json({
      success: true,
      message: 'Project registered successfully!',
      project: {
        id: project._id,
        name: project.name,
        senderEmail: project.senderEmail,
        senderDisplayName: project.senderDisplayName,
        apiKey: project.apiKey,
        dailyQuota: project.dailyQuota,
        burstPacingMs: project.burstPacingMs,
        webhookConfigured: !!project.webhookUrl,
      },
      quickStart: {
        method: 'POST',
        endpoint: '/api/send',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': project.apiKey,
        },
        body: {
          to: 'customer@example.com',
          subject: 'Your Verification Code',
          html: '<h1>Your OTP is 849201</h1>',
        },
      },
    });
  } catch (error) {
    console.error('Create Project Error:', error.message);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
}

/**
 * List all active projects for the authenticated user (Multi-Tenant)
 * GET /api/projects
 */
async function getProjects(req, res) {
  try {
    const query = { isActive: true };

    if (req.user) {
      // Return projects belonging to the logged in user, shared team projects, or unclaimed legacy projects
      query.$or = [
        { userId: req.user._id },
        { 'members.user': req.user._id },
        { 'members.email': req.user.email.toLowerCase() },
        { userId: null },
        { userId: { $exists: false } },
      ];
    }

    const projects = await Project.find(query)
      .select('+encryptedPassword +iv +authTag +senders.encryptedPassword +senders.iv +senders.authTag')
      .sort({ createdAt: -1 });

    const sanitized = projects.map((p) => {
      const capacity = p.getCapacitySummary();
      const userRole = p.getUserRole ? p.getUserRole(req.user) : 'owner';
      return {
        id: p._id,
        name: p.name,
        currentUserRole: userRole,
        isOwner: userRole === 'owner',
        canEdit: userRole === 'owner' || userRole === 'admin',
        senderEmail: p.senderEmail,
        senderDisplayName: p.senderDisplayName,
        apiKey: p.apiKey,
        dailyQuota: capacity.totalDailyQuota,
        emailsSentToday: capacity.totalSentToday,
        remainingToday: capacity.remainingToday,
        activeSendersCount: capacity.sendersCount,
        senders: capacity.senders,
        burstPacingMs: p.burstPacingMs || 200,
        webhookUrl: p.webhookUrl,
        webhookSecret: p.webhookSecret,
        webhookSecretConfigured: !!p.webhookSecret,
        webhookEnabled: p.webhookEnabled !== false,
        webhookEvents: p.webhookEvents && p.webhookEvents.length > 0 ? p.webhookEvents : [
          'email.delivered',
          'email.failed',
          'email.suppressed',
          'email.opened',
          'email.clicked',
        ],
        lastWebhookDispatchedAt: p.lastWebhookDispatchedAt || null,
        lastWebhookStatus: p.lastWebhookStatus || null,
        lastWebhookResponseCode: p.lastWebhookResponseCode || null,
        lastWebhookLatencyMs: p.lastWebhookLatencyMs || null,
        lastWebhookError: p.lastWebhookError || null,
        lastApiCallAt: p.lastApiCallAt || null,
        lastClientIp: p.lastClientIp || null,
        ipWhitelist: p.ipWhitelist || [],
        ipWhitelistEnabled: Boolean(p.ipWhitelistEnabled),
        members: (p.members || []).map((m) => ({
          id: m._id,
          user: m.user,
          email: m.email,
          role: m.role,
          status: m.status,
          invitedBy: m.invitedBy,
          invitedAt: m.invitedAt,
        })),
        brandLogo: p.brandLogo && p.brandLogo.data ? {
          data: p.brandLogo.data,
          contentType: p.brandLogo.contentType,
          width: p.brandLogo.width,
          height: p.brandLogo.height,
          sizeBytes: p.brandLogo.sizeBytes,
          updatedAt: p.brandLogo.updatedAt,
          url: `/api/projects/${p._id}/logo`,
        } : null,
        plan: p.plan || 'free',
        planCycle: p.planCycle || 'monthly',
        isPro: p.plan === 'pro',
        purchasedCredits: capacity.purchasedCredits || p.purchasedCredits || 0,
        customTemplates: (p.customTemplates || []).map((ct) => ({
          id: ct._id,
          templateId: ct.templateId,
          name: ct.name,
          badge: ct.badge || 'Custom',
          badgeColor: ct.badgeColor || 'border-brand-500/30 text-brand-600 bg-brand-500/10 dark:text-brand-400',
          description: ct.description || '',
          subject: ct.subject || '',
          html: ct.html,
          sampleVars: ct.sampleVars || {},
          fields: ct.fields || [],
          createdAt: ct.createdAt,
          updatedAt: ct.updatedAt,
        })),
        createdAt: p.createdAt,
      };
    });

    res.json({
      success: true,
      count: sanitized.length,
      projects: sanitized,
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
}

/**
 * Update project settings (Webhooks, pacing, display name, IP whitelist)
 * PATCH /api/projects/:id
 */
async function updateProject(req, res) {
  try {
    const { id } = req.params;
    const {
      name,
      senderDisplayName,
      burstPacingMs,
      webhookUrl,
      webhookSecret,
      webhookEnabled,
      webhookEvents,
      ipWhitelist,
      ipWhitelistEnabled,
    } = req.body;

    const project = await Project.findById(id);
    if (!project) {
      return res.status(404).json({ success: false, error: 'Project not found.' });
    }

    // Role check: Only Owner or Admin can update settings
    const userRole = project.getUserRole ? project.getUserRole(req.user) : 'owner';
    if (!['owner', 'admin'].includes(userRole)) {
      return res.status(403).json({
        success: false,
        error: 'Access denied. Only Owner or Admin can update project settings.',
      });
    }

    if (!project.userId && req.user) {
      project.userId = req.user._id;
    }

    if (name !== undefined) project.name = name.trim();
    if (senderDisplayName !== undefined) project.senderDisplayName = senderDisplayName.trim();
    if (burstPacingMs !== undefined) project.burstPacingMs = Math.max(0, parseInt(burstPacingMs, 10));
    if (webhookUrl !== undefined) {
      if (webhookUrl && typeof webhookUrl === 'string' && webhookUrl.trim()) {
        const SAFE_URL_PATTERN = /^https?:\/\/(?:[a-zA-Z0-9-]+\.)+[a-zA-Z]{2,}(?::\d{1,5})?(?:\/[^\s]*)?$/;
        const { isSafeRemoteUrl, sanitizeUrlString } = require('../utils/ssrfHelper');
        const candidate = webhookUrl.trim();
        if (!SAFE_URL_PATTERN.test(candidate) || !isSafeRemoteUrl(candidate)) {
          return res.status(400).json({
            success: false,
            error: 'Disallowed Webhook Destination: URL must be a public HTTP(S) address.',
          });
        }
        project.webhookUrl = sanitizeUrlString(candidate);
      } else {
        project.webhookUrl = null;
      }
    }
    if (webhookSecret !== undefined) project.webhookSecret = webhookSecret ? webhookSecret.trim() : null;
    if (webhookEnabled !== undefined) project.webhookEnabled = Boolean(webhookEnabled);
    if (webhookEvents !== undefined && Array.isArray(webhookEvents)) project.webhookEvents = webhookEvents;
    if (ipWhitelist !== undefined && Array.isArray(ipWhitelist)) {
      project.ipWhitelist = ipWhitelist
        .map((ip) => (typeof ip === 'string' ? ip.trim() : ''))
        .filter(Boolean);
    }
    if (ipWhitelistEnabled !== undefined) {
      project.ipWhitelistEnabled = Boolean(ipWhitelistEnabled);
    }

    await project.save();

    res.json({
      success: true,
      message: 'Project settings updated successfully.',
      project: {
        id: project._id,
        name: project.name,
        senderDisplayName: project.senderDisplayName,
        burstPacingMs: project.burstPacingMs,
        webhookUrl: project.webhookUrl,
        webhookSecret: project.webhookSecret,
        webhookSecretConfigured: !!project.webhookSecret,
        webhookEnabled: project.webhookEnabled !== false,
        webhookEvents: project.webhookEvents,
        ipWhitelist: project.ipWhitelist,
        ipWhitelistEnabled: project.ipWhitelistEnabled,
        lastWebhookDispatchedAt: project.lastWebhookDispatchedAt,
        lastWebhookStatus: project.lastWebhookStatus,
        lastWebhookResponseCode: project.lastWebhookResponseCode,
        lastWebhookLatencyMs: project.lastWebhookLatencyMs,
        lastWebhookError: project.lastWebhookError,
        plan: project.plan || 'free',
        planCycle: project.planCycle || 'monthly',
        isPro: project.plan === 'pro',
        purchasedCredits: capacity.purchasedCredits || project.purchasedCredits || 0,
        customTemplates: project.customTemplates || [],
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
}

/**
 * Add a secondary/backup Gmail sender to double the daily limit
 * POST /api/projects/:id/senders
 */
async function addSender(req, res) {
  try {
    const { id } = req.params;
    const { email, appPassword, displayName, dailyQuota, priority } = req.body;

    if (!email || !appPassword) {
      return res.status(400).json({
        success: false,
        error: 'Please provide email and appPassword for the sender account.',
      });
    }

    const project = await Project.findById(id).select(
      '+encryptedPassword +iv +authTag +senders.encryptedPassword +senders.iv +senders.authTag'
    );

    if (!project) {
      return res.status(404).json({ success: false, error: 'Project not found.' });
    }

    // Tenant check
    if (project.userId && req.user && project.userId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, error: 'Access denied to this project.' });
    }

    if (!project.userId && req.user) {
      project.userId = req.user._id;
    }

    await project.addSender({
      email,
      appPassword,
      displayName,
      dailyQuota: dailyQuota || 500,
      priority: priority !== undefined ? priority : (project.senders ? project.senders.length : 1),
    });

    invalidateTransporter(project._id);

    const capacity = project.getCapacitySummary();

    res.status(201).json({
      success: true,
      message: `Sender [${email}] added successfully to project "${project.name}"!`,
      capacity,
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
}

/**
 * Update sender credentials (Gmail address, Google App Password, display name, daily quota)
 * Validates the new Google App Password against Google SMTP before updating.
 * PATCH /api/projects/:id/senders/:senderId
 */
async function updateSender(req, res) {
  try {
    const { id, senderId } = req.params;
    const { email, appPassword, displayName, dailyQuota } = req.body;

    const project = await Project.findById(id).select(
      '+encryptedPassword +iv +authTag +senders.encryptedPassword +senders.iv +senders.authTag'
    );
    if (!project) {
      return res.status(404).json({ success: false, error: 'Project not found.' });
    }

    if (project.userId && req.user && project.userId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, error: 'Access denied to this project.' });
    }

    const sender = project.senders && (project.senders.id(senderId) || project.senders.find((s) => s._id.toString() === senderId));
    if (!sender) {
      return res.status(404).json({ success: false, error: 'Sender not found.' });
    }

    const targetEmail = email ? email.trim().toLowerCase() : sender.email;

    // If an App Password is provided, validate it with Google SMTP
    if (appPassword) {
      const cleanPassword = appPassword.replace(/\s+/g, '');
      if (cleanPassword.length < 16) {
        return res.status(400).json({
          success: false,
          error: 'Google App Passwords are 16 characters long. Please check your password.',
        });
      }

      // Live Google SMTP verification handshake
      if (process.env.NODE_ENV !== 'test' && !process.env.SKIP_SMTP_VERIFY) {
        const nodemailer = require('nodemailer');
        const testTransporter = nodemailer.createTransport({
          host: 'smtp.gmail.com',
          port: 465,
          secure: true,
          auth: {
            user: targetEmail,
            pass: cleanPassword,
          },
        });

        try {
          await testTransporter.verify();
        } catch (smtpErr) {
          return res.status(400).json({
            success: false,
            error: `Google rejected this App Password: ${smtpErr.message}. Ensure 2-Step Verification is active on the account and you generated a 16-character App Password at myaccount.google.com/apppasswords.`,
          });
        }
      }

      const { encrypt } = require('../utils/crypto');
      const { encryptedData, iv, authTag } = encrypt(cleanPassword);
      sender.encryptedPassword = encryptedData;
      sender.iv = iv;
      sender.authTag = authTag;

      if (sender.priority === 0 || project.senderEmail === sender.email) {
        project.encryptedPassword = encryptedData;
        project.iv = iv;
        project.authTag = authTag;
      }
    }

    if (email) {
      sender.email = targetEmail;
      if (sender.priority === 0 || project.senderEmail === sender.email) {
        project.senderEmail = targetEmail;
      }
    }

    if (displayName !== undefined) {
      sender.displayName = displayName.trim();
      if (sender.priority === 0) {
        project.senderDisplayName = displayName.trim();
      }
    }

    if (dailyQuota !== undefined) {
      sender.dailyQuota = parseInt(dailyQuota, 10) || 500;
    }

    await project.save();
    invalidateTransporter(project._id);

    const capacity = project.getCapacitySummary();
    res.json({
      success: true,
      message: `Sender [${targetEmail}] credentials updated successfully!`,
      capacity,
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
}

/**
 * List all senders for a project
 * GET /api/projects/:id/senders
 */
async function getSenders(req, res) {
  try {
    const { id } = req.params;
    const project = await Project.findById(id).select(
      '+encryptedPassword +iv +authTag +senders.encryptedPassword +senders.iv +senders.authTag'
    );

    if (!project) {
      return res.status(404).json({ success: false, error: 'Project not found.' });
    }

    // Tenant check
    if (project.userId && req.user && project.userId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, error: 'Access denied to this project.' });
    }

    const capacity = project.getCapacitySummary();
    res.json({
      success: true,
      projectName: project.name,
      ...capacity,
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
}

/**
 * Remove / delete a sender (Primary or Backup)
 * DELETE /api/projects/:id/senders/:senderId
 */
async function removeSender(req, res) {
  try {
    const { id, senderId } = req.params;
    const project = await Project.findById(id).select(
      '+encryptedPassword +iv +authTag +senders.encryptedPassword +senders.iv +senders.authTag'
    );

    if (!project) {
      return res.status(404).json({ success: false, error: 'Project not found.' });
    }

    // Tenant check
    if (project.userId && req.user && project.userId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, error: 'Access denied to this project.' });
    }

    let deletedEmail = '';

    if (project.senders && project.senders.length > 0) {
      const sender =
        project.senders.id(senderId) ||
        project.senders.find((s) => s._id.toString() === senderId || s.email === senderId);

      if (sender) {
        deletedEmail = sender.email;
        const wasPrimary = project.senderEmail === sender.email || sender.priority === 0;

        project.senders.pull(sender._id);

        if (wasPrimary) {
          const remainingSenders = project.senders.filter((s) => s.isActive !== false);
          if (remainingSenders.length > 0) {
            remainingSenders.sort((a, b) => a.priority - b.priority);
            remainingSenders[0].priority = 0;
            project.senderEmail = remainingSenders[0].email;
            project.senderDisplayName = remainingSenders[0].displayName || project.name;
            project.encryptedPassword = remainingSenders[0].encryptedPassword;
            project.iv = remainingSenders[0].iv;
            project.authTag = remainingSenders[0].authTag;
          } else {
            project.senderEmail = '';
            project.encryptedPassword = '';
            project.iv = '';
            project.authTag = '';
          }
        }
        await project.save();
        invalidateTransporter(project._id, deletedEmail);
      }
    } else if (
      project.senderEmail &&
      (senderId === project._id.toString() ||
        senderId === project.senderEmail ||
        senderId === 'primary')
    ) {
      deletedEmail = project.senderEmail;
      project.senderEmail = '';
      project.encryptedPassword = '';
      project.iv = '';
      project.authTag = '';
      await project.save();
      invalidateTransporter(project._id, deletedEmail);
    }

    const capacity = project.getCapacitySummary();

    res.json({
      success: true,
      message: deletedEmail
        ? `Sender ${deletedEmail} removed successfully.`
        : 'Sender removed successfully.',
      capacity,
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
}

/**
 * Delete / deactivate a project
 * DELETE /api/projects/:id
 */
async function deleteProject(req, res) {
  try {
    const { id } = req.params;
    const project = await Project.findById(id);

    if (!project) {
      return res.status(404).json({ success: false, error: 'Project not found.' });
    }

    // Tenant check
    if (project.userId && req.user && project.userId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, error: 'Access denied to this project.' });
    }

    project.isActive = false;
    await project.save();

    invalidateTransporter(project._id);

    res.json({
      success: true,
      message: `Project "${project.name}" has been deactivated.`,
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
}

/**
 * Upload & Store Brand Logo for Project (1:1 Square Only, 1 Image Limit, Anti-Piracy verification)
 * POST /api/projects/:id/logo
 */
async function uploadLogo(req, res) {
  try {
    const { id } = req.params;
    const { image } = req.body; // Expects base64 data URI or clean base64 string

    if (!image) {
      return res.status(400).json({
        success: false,
        error: 'Please provide an image payload in base64 data URI format.',
      });
    }

    const project = await Project.findById(id);
    if (!project) {
      return res.status(404).json({ success: false, error: 'Project not found.' });
    }

    // Tenant check
    if (project.userId && req.user && project.userId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, error: 'Access denied to this project.' });
    }

    // Validate 1:1 square aspect ratio + magic-byte anti-piracy check + 1.5MB limit
    const validated = validateLogoImage(image);

    // Save/replace logo on project (enforces 1 image limit per project)
    project.brandLogo = {
      data: validated.dataUri,
      contentType: validated.contentType,
      width: validated.width,
      height: validated.height,
      sizeBytes: validated.sizeBytes,
      updatedAt: new Date(),
    };

    await project.save();

    res.json({
      success: true,
      message: `Brand logo uploaded successfully (${validated.width}x${validated.height} 1:1 Square verified)!`,
      logo: {
        width: validated.width,
        height: validated.height,
        contentType: validated.contentType,
        sizeBytes: validated.sizeBytes,
        updatedAt: project.brandLogo.updatedAt,
        url: `/api/projects/${project._id}/logo`,
      },
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message,
    });
  }
}

/**
 * Serves the project's brand logo image binary directly
 * GET /api/projects/:id/logo
 */
async function getLogo(req, res) {
  try {
    const { id } = req.params;
    const project = await Project.findById(id);

    if (!project || !project.brandLogo || !project.brandLogo.data) {
      return res.status(404).json({ success: false, error: 'No brand logo configured for this project.' });
    }

    const dataUri = project.brandLogo.data;
    const matches = dataUri.match(/^data:([^;]+);base64,(.+)$/);

    if (!matches) {
      return res.status(500).json({ success: false, error: 'Corrupted logo data.' });
    }

    const contentType = matches[1];
    const imageBuffer = Buffer.from(matches[2], 'base64');

    res.set('Content-Type', contentType);
    res.set('Content-Length', imageBuffer.length);
    res.set('Cache-Control', 'public, max-age=86400'); // Cache for 24h
    res.send(imageBuffer);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
}

/**
 * Deletes the project's brand logo
 * DELETE /api/projects/:id/logo
 */
async function deleteLogo(req, res) {
  try {
    const { id } = req.params;
    const project = await Project.findById(id);

    if (!project) {
      return res.status(404).json({ success: false, error: 'Project not found.' });
    }

    // Tenant check
    if (project.userId && req.user && project.userId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, error: 'Access denied to this project.' });
    }

    project.brandLogo = {
      data: null,
      contentType: null,
      width: null,
      height: null,
      sizeBytes: 0,
      updatedAt: null,
    };

    await project.save();

    res.json({
      success: true,
      message: 'Brand logo removed successfully.',
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
}

/**
 * Get paginated list of suppressed emails for a project
 * GET /api/projects/:id/suppression
 */
async function getSuppressionList(req, res) {
  try {
    const { id } = req.params;
    const { page = 1, limit = 50, search = '' } = req.query;

    const project = await Project.findById(id);
    if (!project) {
      return res.status(404).json({ success: false, error: 'Project not found.' });
    }

    if (project.userId && req.user && project.userId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, error: 'Access denied to this project.' });
    }

    const query = { projectId: project._id };
    if (search && search.trim()) {
      const safeSearch = search.trim().slice(0, 100).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      query.email = { $regex: safeSearch, $options: 'i' };
    }

    const pageNum = Math.max(1, parseInt(page, 10));
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10)));
    const skip = (pageNum - 1) * limitNum;

    const [total, suppressions] = await Promise.all([
      Suppression.countDocuments(query),
      Suppression.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum)
        .lean(),
    ]);

    res.json({
      success: true,
      total,
      page: pageNum,
      totalPages: Math.ceil(total / limitNum) || 1,
      count: suppressions.length,
      suppressions,
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
}

/**
 * Manually add an email to the suppression list
 * POST /api/projects/:id/suppression
 * Body: { email, reason, details }
 */
async function addSuppression(req, res) {
  try {
    const { id } = req.params;
    const { email, reason = 'MANUAL_BLOCK', details } = req.body;

    if (!id || typeof id !== 'string' || !mongoose.isValidObjectId(id)) {
      return res.status(400).json({ success: false, error: 'Valid project ID is required.' });
    }

    if (!email || typeof email !== 'string' || !email.includes('@')) {
      return res.status(400).json({ success: false, error: 'Valid email address is required.' });
    }

    const cleanEmail = String(email).trim().toLowerCase();
    if (!/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(cleanEmail)) {
      return res.status(400).json({ success: false, error: 'Invalid email format.' });
    }

    const project = await Project.findById(id);
    if (!project) {
      return res.status(404).json({ success: false, error: 'Project not found.' });
    }

    if (project.userId && req.user && project.userId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, error: 'Access denied to this project.' });
    }

    const cleanReason = typeof reason === 'string' ? String(reason).trim().slice(0, 100) : 'MANUAL_BLOCK';
    const cleanDetails = typeof details === 'string' ? String(details).trim().slice(0, 500) : 'Manually added by workspace operator';

    const suppression = await Suppression.findOneAndUpdate(
      { projectId: project._id, email: cleanEmail },
      {
        $set: {
          projectId: project._id,
          email: cleanEmail,
          reason: cleanReason,
          details: cleanDetails,
          lastAttemptedAt: new Date(),
        },
      },
      { upsert: true, new: true }
    );

    res.json({
      success: true,
      message: `Email "${cleanEmail}" added to suppression list. Future dispatches will be blocked.`,
      suppression,
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
}

/**
 * Remove an email from the suppression list (unblock)
 * DELETE /api/projects/:id/suppression/:suppressionId
 */
async function removeSuppression(req, res) {
  try {
    const { id, suppressionId } = req.params;

    const project = await Project.findById(id);
    if (!project) {
      return res.status(404).json({ success: false, error: 'Project not found.' });
    }

    if (project.userId && req.user && project.userId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, error: 'Access denied to this project.' });
    }

    // Support deletion by suppression ObjectId or by email address
    let deleted;
    if (suppressionId.includes('@')) {
      deleted = await Suppression.findOneAndDelete({
        projectId: project._id,
        email: suppressionId.trim().toLowerCase(),
      });
    } else {
      deleted = await Suppression.findOneAndDelete({
        _id: suppressionId,
        projectId: project._id,
      });
    }

    if (!deleted) {
      return res.status(404).json({ success: false, error: 'Suppression record not found.' });
    }

    res.json({
      success: true,
      message: `Email "${deleted.email}" removed from suppression list. Dispatches unblocked.`,
      deleted,
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
}

/**
 * Toggle Smart Warm-up mode or reset warm-up start date for a sender
 * PATCH /api/projects/:id/senders/:senderId/warmup
 * Body: { warmupEnabled, resetStartDate }
 */
async function updateSenderWarmup(req, res) {
  try {
    const { id, senderId } = req.params;
    const { warmupEnabled, resetStartDate } = req.body;

    const project = await Project.findById(id);
    if (!project) {
      return res.status(404).json({ success: false, error: 'Project not found.' });
    }

    if (project.userId && req.user && project.userId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, error: 'Access denied to this project.' });
    }

    let updatedSender = null;

    // Check in senders array
    if (project.senders && project.senders.length > 0) {
      const sender = project.senders.id(senderId) || project.senders.find((s) => s.email.toLowerCase() === senderId.toLowerCase());
      if (sender) {
        if (warmupEnabled !== undefined) {
          sender.warmupEnabled = !!warmupEnabled;
        }
        if (resetStartDate) {
          sender.warmupStartedAt = new Date();
        }
        updatedSender = sender;
      }
    }

    // Check if matching legacy sender
    if (!updatedSender && (project.senderEmail && (senderId === 'primary' || senderId === project.senderEmail.toLowerCase() || senderId === project._id.toString()))) {
      if (warmupEnabled !== undefined) {
        project.warmupEnabled = !!warmupEnabled;
      }
      if (resetStartDate) {
        project.warmupStartedAt = new Date();
      }
      updatedSender = { email: project.senderEmail };
    }

    if (!updatedSender) {
      return res.status(404).json({ success: false, error: 'Sender account not found in project.' });
    }

    await project.save();

    const capacity = project.getCapacitySummary();
    res.json({
      success: true,
      message: 'Warm-up settings updated successfully.',
      capacity,
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
}

/**
 * Generate or rotate Webhook HMAC signing secret
 * POST /api/projects/:id/webhook/secret
 */
async function generateWebhookSecret(req, res) {
  try {
    const { id } = req.params;
    const project = await Project.findById(id);
    if (!project) {
      return res.status(404).json({ success: false, error: 'Project not found.' });
    }

    // SSRF-02: Require authentication and owner/admin authorization to test webhooks
    if (project.userId) {
      if (!req.user) {
        return res.status(401).json({ success: false, error: 'Authentication required to test webhooks.' });
      }
      const userRole = project.getUserRole ? project.getUserRole(req.user) : (project.userId.toString() === req.user._id.toString() ? 'owner' : null);
      if (!['owner', 'admin'].includes(userRole)) {
        return res.status(403).json({ success: false, error: 'Access denied. Only project Owner or Admin can test webhooks.' });
      }
    }

    const newSecret = `daksec_${crypto.randomBytes(24).toString('hex')}`;
    project.webhookSecret = newSecret;
    await project.save();

    res.json({
      success: true,
      message: 'New Webhook HMAC secret generated successfully.',
      webhookSecret: newSecret,
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
}

/**
 * Dispatch live test webhook to verify receiver endpoint
 * POST /api/projects/:id/webhook/test
 */
async function testWebhookEndpoint(req, res) {
  try {
    const { id } = req.params;
    const project = await Project.findById(id);
    if (!project) {
      return res.status(404).json({ success: false, error: 'Project not found.' });
    }

    // SSRF-02: Require authentication and owner/admin authorization to test webhooks
    if (project.userId) {
      if (!req.user) {
        return res.status(401).json({ success: false, error: 'Authentication required to test webhooks.' });
      }
      const userRole = project.getUserRole ? project.getUserRole(req.user) : (project.userId.toString() === req.user._id.toString() ? 'owner' : null);
      if (!['owner', 'admin'].includes(userRole)) {
        return res.status(403).json({ success: false, error: 'Access denied. Only project Owner or Admin can test webhooks.' });
      }
    }

    // Allow testing a new URL before saving
    if (req.body.webhookUrl && req.body.webhookUrl.trim()) {
      const candidateUrl = req.body.webhookUrl.trim();
      const SAFE_URL_PATTERN = /^https?:\/\/(?:[a-zA-Z0-9-]+\.)+[a-zA-Z]{2,}(?::\d{1,5})?(?:\/[^\s]*)?$/;
      const { isSafeRemoteUrl, assertSafeRemoteUrl } = require('../utils/ssrfHelper');
      if (!SAFE_URL_PATTERN.test(candidateUrl) || !isSafeRemoteUrl(candidateUrl)) {
        return res.status(400).json({ success: false, error: 'Disallowed Webhook Destination: URL must be a public HTTP(S) address.' });
      }
      try {
        project.webhookUrl = assertSafeRemoteUrl(candidateUrl, 'Webhook Destination');
      } catch (valErr) {
        return res.status(400).json({ success: false, error: valErr.message });
      }
    }
    if (req.body.webhookSecret !== undefined) {
      project.webhookSecret = req.body.webhookSecret ? req.body.webhookSecret.trim() : null;
    }

    const { sendTestWebhook } = require('../services/webhookService');
    const result = await sendTestWebhook(project);

    res.json({
      success: result.success,
      result,
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
}

/**
 * 1-Click API Key Rotation / Regeneration
 * Permanently revokes the old key and generates a brand-new cryptographically secure API key
 * POST /api/projects/:id/api-key/rotate
 */
async function rotateApiKey(req, res) {
  try {
    const { id } = req.params;
    const project = await Project.findById(id);
    if (!project) {
      return res.status(404).json({ success: false, error: 'Project not found.' });
    }

    const userRole = project.getUserRole ? project.getUserRole(req.user) : 'owner';
    if (!['owner', 'admin'].includes(userRole)) {
      return res.status(403).json({
        success: false,
        error: 'Access denied. Only project Owner or Admin can rotate the API key.',
      });
    }

    const { generateApiKey } = require('../utils/crypto');
    const newApiKey = generateApiKey();
    project.apiKey = newApiKey;
    await project.save();

    res.json({
      success: true,
      message: 'API Key regenerated successfully. Previous key has been permanently invalidated.',
      apiKey: newApiKey,
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
}

/**
 * Get IP Whitelist configuration and detected caller IP
 * GET /api/projects/:id/ip-whitelist
 */
async function getIpWhitelist(req, res) {
  try {
    const { id } = req.params;
    const project = await Project.findById(id);
    if (!project) {
      return res.status(404).json({ success: false, error: 'Project not found.' });
    }

    const userRole = project.getUserRole ? project.getUserRole(req.user) : 'owner';
    if (!userRole) {
      return res.status(403).json({ success: false, error: 'Access denied to this project.' });
    }

    const { extractClientIp } = require('../utils/ipFilter');
    const detectedIp = extractClientIp(req);

    res.json({
      success: true,
      clientIp: detectedIp,
      ipWhitelist: project.ipWhitelist || [],
      ipWhitelistEnabled: Boolean(project.ipWhitelistEnabled),
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
}

/**
 * Update IP Whitelist configuration
 * PATCH /api/projects/:id/ip-whitelist
 */
async function updateIpWhitelist(req, res) {
  try {
    const { id } = req.params;
    const { ipWhitelist, ipWhitelistEnabled } = req.body;

    const project = await Project.findById(id);
    if (!project) {
      return res.status(404).json({ success: false, error: 'Project not found.' });
    }

    const userRole = project.getUserRole ? project.getUserRole(req.user) : 'owner';
    if (!['owner', 'admin'].includes(userRole)) {
      return res.status(403).json({
        success: false,
        error: 'Access denied. Only Owner or Admin can configure IP Whitelisting.',
      });
    }

    if (ipWhitelist !== undefined && Array.isArray(ipWhitelist)) {
      project.ipWhitelist = ipWhitelist
        .map((ip) => (typeof ip === 'string' ? ip.trim() : ''))
        .filter(Boolean);
    }

    if (ipWhitelistEnabled !== undefined) {
      project.ipWhitelistEnabled = Boolean(ipWhitelistEnabled);
    }

    await project.save();

    const { extractClientIp } = require('../utils/ipFilter');
    res.json({
      success: true,
      message: 'IP Whitelist configuration updated successfully.',
      clientIp: extractClientIp(req),
      ipWhitelist: project.ipWhitelist,
      ipWhitelistEnabled: project.ipWhitelistEnabled,
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
}

/**
 * List team members for a project
 * GET /api/projects/:id/members
 */
async function getProjectMembers(req, res) {
  try {
    const { id } = req.params;
    const project = await Project.findById(id).populate('userId', 'name email');
    if (!project) {
      return res.status(404).json({ success: false, error: 'Project not found.' });
    }

    const userRole = project.getUserRole ? project.getUserRole(req.user) : 'owner';
    if (!userRole) {
      return res.status(403).json({ success: false, error: 'Access denied to this project.' });
    }

    const ownerInfo = project.userId
      ? { id: project.userId._id, name: project.userId.name, email: project.userId.email }
      : { id: null, name: 'Project Creator', email: project.senderEmail };

    const members = (project.members || []).map((m) => ({
      id: m._id,
      user: m.user,
      email: m.email,
      role: m.role,
      status: m.status,
      invitedBy: m.invitedBy,
      invitedAt: m.invitedAt,
    }));

    res.json({
      success: true,
      currentUserRole: userRole,
      isOwner: userRole === 'owner',
      canManageMembers: userRole === 'owner',
      owner: ownerInfo,
      members,
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
}

/**
 * Invite / Add a collaborator to the project
 * POST /api/projects/:id/members
 */
async function addProjectMember(req, res) {
  try {
    const { id } = req.params;
    const { email, role } = req.body;

    if (!email || !email.trim()) {
      return res.status(400).json({ success: false, error: 'Please provide a valid teammate email address.' });
    }

    const cleanEmail = email.trim().toLowerCase();
    const assignedRole = role === 'viewer' ? 'viewer' : 'admin';

    const project = await Project.findById(id).populate('userId', 'name email');
    if (!project) {
      return res.status(404).json({ success: false, error: 'Project not found.' });
    }

    const userRole = project.getUserRole ? project.getUserRole(req.user) : 'owner';
    if (!['owner', 'admin'].includes(userRole)) {
      return res.status(403).json({
        success: false,
        error: 'Access denied. Only Owner or Admin can invite team members.',
      });
    }

    // Check if email matches owner
    if (project.userId && project.userId.email && project.userId.email.toLowerCase() === cleanEmail) {
      return res.status(400).json({
        success: false,
        error: `${cleanEmail} is already the Owner of this project.`,
      });
    }

    // Check if already in members
    if (project.members && project.members.some((m) => m.email.toLowerCase() === cleanEmail)) {
      return res.status(400).json({
        success: false,
        error: `${cleanEmail} is already a member of this project team.`,
      });
    }

    const User = require('../models/User');
    const existingUser = await User.findOne({ email: cleanEmail });

    const newMember = {
      user: existingUser ? existingUser._id : null,
      email: cleanEmail,
      role: assignedRole,
      status: existingUser ? 'active' : 'pending',
      invitedBy: req.user ? req.user.email : 'Owner',
      invitedAt: new Date(),
    };

    project.members.push(newMember);
    await project.save();

    res.status(201).json({
      success: true,
      message: `Teammate ${cleanEmail} invited successfully as ${assignedRole.toUpperCase()}.`,
      members: project.members,
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
}

/**
 * Update collaborator role (Admin / Viewer)
 * PATCH /api/projects/:id/members/:memberId
 */
async function updateProjectMember(req, res) {
  try {
    const { id, memberId } = req.params;
    const { role } = req.body;

    if (!role || !['admin', 'viewer'].includes(role)) {
      return res.status(400).json({ success: false, error: 'Role must be either "admin" or "viewer".' });
    }

    const project = await Project.findById(id);
    if (!project) {
      return res.status(404).json({ success: false, error: 'Project not found.' });
    }

    const userRole = project.getUserRole ? project.getUserRole(req.user) : 'owner';
    if (userRole !== 'owner') {
      return res.status(403).json({
        success: false,
        error: 'Access denied. Only the project Owner can modify team member roles.',
      });
    }

    const member = project.members.id(memberId);
    if (!member) {
      return res.status(404).json({ success: false, error: 'Team member not found in project.' });
    }

    member.role = role;
    await project.save();

    res.json({
      success: true,
      message: `Member ${member.email} role updated to ${role.toUpperCase()}.`,
      members: project.members,
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
}

/**
 * Remove collaborator from project or leave project
 * DELETE /api/projects/:id/members/:memberId
 */
async function removeProjectMember(req, res) {
  try {
    const { id, memberId } = req.params;
    const project = await Project.findById(id);
    if (!project) {
      return res.status(404).json({ success: false, error: 'Project not found.' });
    }

    const member = project.members.id(memberId);
    if (!member) {
      return res.status(404).json({ success: false, error: 'Team member not found in project.' });
    }

    const userRole = project.getUserRole ? project.getUserRole(req.user) : 'owner';
    const isSelf = req.user && (
      (member.user && member.user.toString() === req.user._id.toString()) ||
      (member.email.toLowerCase() === req.user.email.toLowerCase())
    );

    // Permitted if: Owner, or Self (leaving project), or Admin removing Viewer
    const canRemove = userRole === 'owner' || isSelf || (userRole === 'admin' && member.role === 'viewer');
    if (!canRemove) {
      return res.status(403).json({
        success: false,
        error: 'Access denied. You do not have permission to remove this member.',
      });
    }

    project.members.pull({ _id: memberId });
    await project.save();

    res.json({
      success: true,
      message: isSelf ? 'You have left the project team.' : `Member ${member.email} removed from project.`,
      members: project.members,
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
}


/**
 * Add a sender alias to a specific sender account
 * POST /api/projects/:id/senders/:senderId/aliases
 * Body: { email, displayName, isDefault }
 */
async function addSenderAlias(req, res) {
  try {
    const { id, senderId } = req.params;
    const { email, displayName, isDefault } = req.body;

    if (!email) {
      return res.status(400).json({ success: false, error: 'Alias email address is required.' });
    }

    const cleanEmail = email.trim().toLowerCase();
    if (cleanEmail.length < 3 || cleanEmail.length > 254) {
      return res.status(400).json({ success: false, error: 'Invalid alias email format.' });
    }
    const atIndex = cleanEmail.indexOf('@');
    const dotIndex = cleanEmail.lastIndexOf('.');
    if (
      atIndex <= 0 ||
      atIndex !== cleanEmail.lastIndexOf('@') ||
      dotIndex <= atIndex + 1 ||
      dotIndex === cleanEmail.length - 1 ||
      /\s/.test(cleanEmail)
    ) {
      return res.status(400).json({ success: false, error: 'Invalid alias email format.' });
    }

    const project = await Project.findById(id).select(
      '+encryptedPassword +iv +authTag +senders.encryptedPassword +senders.iv +senders.authTag'
    );
    if (!project) {
      return res.status(404).json({ success: false, error: 'Project not found.' });
    }

    if (project.userId && req.user && project.userId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, error: 'Access denied to this project.' });
    }

    // Locate sender
    let targetSender = null;
    if (project.senders && project.senders.length > 0) {
      targetSender =
        project.senders.id(senderId) ||
        project.senders.find((s) => s._id.toString() === senderId || s.email.toLowerCase() === senderId.toLowerCase());
    }

    if (!targetSender && (senderId === 'primary' || senderId === project._id.toString() || (project.senderEmail && senderId.toLowerCase() === project.senderEmail.toLowerCase()))) {
      if (project.senders && project.senders.length > 0) {
        targetSender = project.senders[0];
      }
    }

    if (!targetSender) {
      return res.status(404).json({ success: false, error: 'Sender account not found.' });
    }

    if (!targetSender.aliases) {
      targetSender.aliases = [];
    }

    // Check if alias already exists on this sender
    const exists = targetSender.aliases.some((a) => a.email.toLowerCase() === cleanEmail);
    if (exists) {
      return res.status(400).json({ success: false, error: `Alias [${cleanEmail}] already exists on this sender.` });
    }

    if (isDefault) {
      targetSender.aliases.forEach((a) => {
        a.isDefault = false;
      });
      project.defaultFromEmail = cleanEmail;
      if (displayName) project.defaultFromDisplayName = displayName.trim();
    }

    targetSender.aliases.push({
      email: cleanEmail,
      displayName: displayName ? displayName.trim() : '',
      isDefault: Boolean(isDefault),
      addedAt: new Date(),
    });

    await project.save();

    res.status(201).json({
      success: true,
      message: `Alias [${cleanEmail}] added successfully to sender [${targetSender.email}].`,
      aliases: targetSender.aliases,
      capacity: project.getCapacitySummary(),
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
}

/**
 * Remove an alias from a sender account
 * DELETE /api/projects/:id/senders/:senderId/aliases/:aliasEmail
 */
async function removeSenderAlias(req, res) {
  try {
    const { id, senderId, aliasEmail } = req.params;

    if (!aliasEmail) {
      return res.status(400).json({ success: false, error: 'Alias email is required.' });
    }

    const cleanAlias = decodeURIComponent(aliasEmail).trim().toLowerCase();

    const project = await Project.findById(id).select(
      '+encryptedPassword +iv +authTag +senders.encryptedPassword +senders.iv +senders.authTag'
    );
    if (!project) {
      return res.status(404).json({ success: false, error: 'Project not found.' });
    }

    if (project.userId && req.user && project.userId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, error: 'Access denied to this project.' });
    }

    let targetSender = null;
    if (project.senders && project.senders.length > 0) {
      targetSender =
        project.senders.id(senderId) ||
        project.senders.find((s) => s._id.toString() === senderId || s.email.toLowerCase() === senderId.toLowerCase());
    }

    if (!targetSender && (senderId === 'primary' || senderId === project._id.toString() || (project.senderEmail && senderId.toLowerCase() === project.senderEmail.toLowerCase()))) {
      if (project.senders && project.senders.length > 0) {
        targetSender = project.senders[0];
      }
    }

    if (!targetSender) {
      return res.status(404).json({ success: false, error: 'Sender account not found.' });
    }

    if (!targetSender.aliases || targetSender.aliases.length === 0) {
      return res.status(404).json({ success: false, error: 'No aliases found for this sender.' });
    }

    const initialLen = targetSender.aliases.length;
    targetSender.aliases = targetSender.aliases.filter((a) => a.email.toLowerCase() !== cleanAlias);

    if (targetSender.aliases.length === initialLen) {
      return res.status(404).json({ success: false, error: `Alias [${cleanAlias}] not found on this sender.` });
    }

    if (project.defaultFromEmail && project.defaultFromEmail.toLowerCase() === cleanAlias) {
      project.defaultFromEmail = '';
      project.defaultFromDisplayName = '';
    }

    await project.save();

    res.json({
      success: true,
      message: `Alias [${cleanAlias}] removed successfully from sender [${targetSender.email}].`,
      aliases: targetSender.aliases,
      capacity: project.getCapacitySummary(),
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
}

/**
 * Get all aliases across all senders for a project
 * GET /api/projects/:id/aliases
 */
async function getProjectAliases(req, res) {
  try {
    const { id } = req.params;
    const project = await Project.findById(id);

    if (!project) {
      return res.status(404).json({ success: false, error: 'Project not found.' });
    }

    if (project.userId && req.user && project.userId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, error: 'Access denied to this project.' });
    }

    const summary = project.getCapacitySummary();
    res.json({
      success: true,
      aliases: summary.allAliases || [],
      defaultFromEmail: project.defaultFromEmail || '',
      defaultFromDisplayName: project.defaultFromDisplayName || '',
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
}

/**
 * Test & Verify an alias with Google SMTP
 * POST /api/projects/:id/senders/:senderId/aliases/:aliasEmail/verify
 */
async function verifySenderAlias(req, res) {
  try {
    const { id, senderId, aliasEmail } = req.params;

    if (!aliasEmail) {
      return res.status(400).json({ success: false, error: 'Alias email is required.' });
    }

    const cleanAlias = decodeURIComponent(aliasEmail).trim().toLowerCase();

    const project = await Project.findById(id).select(
      '+encryptedPassword +iv +authTag +senders.encryptedPassword +senders.iv +senders.authTag'
    );
    if (!project) {
      return res.status(404).json({ success: false, error: 'Project not found.' });
    }

    if (project.userId && req.user && project.userId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, error: 'Access denied to this project.' });
    }

    let targetSender = null;
    if (project.senders && project.senders.length > 0) {
      targetSender =
        project.senders.id(senderId) ||
        project.senders.find((s) => s._id.toString() === senderId || s.email.toLowerCase() === senderId.toLowerCase());
    }

    if (!targetSender && (senderId === 'primary' || senderId === project._id.toString() || (project.senderEmail && senderId.toLowerCase() === project.senderEmail.toLowerCase()))) {
      if (project.senders && project.senders.length > 0) {
        targetSender = project.senders[0];
      }
    }

    if (!targetSender) {
      return res.status(404).json({ success: false, error: 'Sender account not found.' });
    }

    const alias = (targetSender.aliases || []).find((a) => a.email.toLowerCase() === cleanAlias);
    if (!alias) {
      return res.status(404).json({ success: false, error: `Alias [${cleanAlias}] not found on sender [${targetSender.email}].` });
    }

    // Decrypt credentials
    let decryptedPassword;
    try {
      if (targetSender.encryptedPassword && targetSender.iv && targetSender.authTag) {
        decryptedPassword = decrypt(targetSender.encryptedPassword, targetSender.iv, targetSender.authTag);
      } else if (project.encryptedPassword && project.iv && project.authTag) {
        decryptedPassword = decrypt(project.encryptedPassword, project.iv, project.authTag);
      }
    } catch (decErr) {
      return res.status(500).json({ success: false, error: 'Failed to decrypt sender credentials.' });
    }

    if (!decryptedPassword) {
      return res.status(400).json({ success: false, error: 'Sender credentials not available.' });
    }

    // Connect to Google SMTP
    const nodemailer = require('nodemailer');
    const transporter = nodemailer.createTransport({
      host: 'smtp.gmail.com',
      port: 465,
      secure: true,
      auth: {
        user: targetSender.email,
        pass: decryptedPassword,
      },
    });

    // Generate cryptographically random 6-digit verification challenge
    const verificationCode = crypto.randomInt(100000, 999999).toString();
    alias.verificationCode = verificationCode;
    alias.verificationExpires = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes
    alias.lastTestedAt = new Date();
    alias.isVerified = false; // Strictly requires user to enter the challenge code

    try {
      // Dispatch verification code directly to the alias inbox
      await transporter.sendMail({
        from: `"${targetSender.displayName || project.name}" <${targetSender.email}>`,
        to: alias.email,
        subject: `[Dakly] ${verificationCode} is your sender alias verification code`,
        text: `Your 6-digit verification code for alias "${alias.email}" is: ${verificationCode}\n\nEnter this code in your Dakly dashboard to verify that you own and can receive email at this address.\n\nThis code expires in 15 minutes.`,
        html: `<div style="font-family:sans-serif;padding:24px;border-radius:8px;background:#f8fafc;border:1px solid #e2e8f0;max-width:540px;">
          <h2 style="color:#0f172a;margin-top:0;">Verify Sender Alias</h2>
          <p style="color:#334155;font-size:15px;">To prove that you own and receive emails at <strong>${alias.email}</strong>, enter this 6-digit code in your Dakly dashboard:</p>
          <div style="font-size:32px;font-weight:bold;letter-spacing:6px;color:#10b981;padding:16px;background:#ffffff;border:1px dashed #cbd5e1;border-radius:8px;text-align:center;margin:20px 0;">
            ${verificationCode}
          </div>
          <p style="color:#64748b;font-size:13px;margin-bottom:0;">This code expires in 15 minutes. If you did not request this verification, you can safely ignore this email.</p>
        </div>`,
      });

      await project.save();

      return res.json({
        success: true,
        challengeSent: true,
        message: `6-digit verification code sent to [${alias.email}]. Check that inbox and enter the code to verify.`,
        aliasEmail: alias.email,
        expiresIn: '15 minutes',
      });
    } catch (smtpErr) {
      alias.isVerified = false;
      alias.lastTestedAt = new Date();
      alias.verificationError = smtpErr.message || 'SMTP dispatch error';
      await project.save();

      return res.status(400).json({
        success: false,
        error: `Failed to deliver verification code to "${alias.email}": ${smtpErr.message}`,
        alias,
      });
    }
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
}

/**
 * Confirm 6-digit verification code for an alias
 * POST /api/projects/:id/senders/:senderId/aliases/:aliasEmail/confirm
 */
async function confirmSenderAliasVerification(req, res) {
  try {
    const { id, senderId, aliasEmail } = req.params;
    const { code } = req.body;

    if (!aliasEmail || !code) {
      return res.status(400).json({ success: false, error: 'Alias email and 6-digit verification code are required.' });
    }

    const cleanAlias = decodeURIComponent(aliasEmail).trim().toLowerCase();
    const cleanCode = String(code).trim();

    const project = await Project.findById(id);
    if (!project) {
      return res.status(404).json({ success: false, error: 'Project not found.' });
    }

    if (project.userId && req.user && project.userId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, error: 'Access denied to this project.' });
    }

    let targetSender = null;
    if (project.senders && project.senders.length > 0) {
      targetSender =
        project.senders.id(senderId) ||
        project.senders.find((s) => s._id.toString() === senderId || s.email.toLowerCase() === senderId.toLowerCase());
    }

    if (!targetSender && (senderId === 'primary' || senderId === project._id.toString() || (project.senderEmail && senderId.toLowerCase() === project.senderEmail.toLowerCase()))) {
      if (project.senders && project.senders.length > 0) {
        targetSender = project.senders[0];
      }
    }

    if (!targetSender) {
      return res.status(404).json({ success: false, error: 'Sender account not found.' });
    }

    const alias = (targetSender.aliases || []).find((a) => a.email.toLowerCase() === cleanAlias);
    if (!alias) {
      return res.status(404).json({ success: false, error: `Alias [${cleanAlias}] not found on sender.` });
    }

    if (!alias.verificationCode || !alias.verificationExpires) {
      return res.status(400).json({ success: false, error: 'No active verification code found. Please click "Verify" to receive a new code.' });
    }

    if (new Date() > new Date(alias.verificationExpires)) {
      alias.verificationCode = undefined;
      alias.verificationExpires = undefined;
      alias.verificationError = 'Verification code expired.';
      await project.save();
      return res.status(400).json({ success: false, error: 'Verification code has expired. Please request a new code.' });
    }

    if (alias.verificationCode !== cleanCode) {
      return res.status(400).json({ success: false, error: 'Incorrect verification code. Please check your inbox and try again.' });
    }

    alias.isVerified = true;
    alias.verifiedAt = new Date();
    alias.verificationCode = undefined;
    alias.verificationExpires = undefined;
    alias.verificationError = '';
    await project.save();

    return res.json({
      success: true,
      verified: true,
      message: `Alias [${alias.email}] verified successfully!`,
      alias,
      capacity: project.getCapacitySummary(),
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
}

/**
 * Upgrade project plan / subscription tier (Free -> Pro)
 * POST /api/projects/:id/upgrade
 */
async function upgradeProjectPlan(req, res) {
  try {
    const { id } = req.params;
    const { plan = 'pro', cycle = 'monthly' } = req.body;

    const project = await Project.findById(id);
    if (!project) {
      return res.status(404).json({ success: false, error: 'Project not found.' });
    }

    const userRole = project.getUserRole ? project.getUserRole(req.user) : 'owner';
    if (!['owner', 'admin'].includes(userRole)) {
      return res.status(403).json({
        success: false,
        error: 'Access denied. Only Owner or Admin can manage project subscriptions.',
      });
    }

    project.plan = plan === 'pro' ? 'pro' : 'free';
    project.planCycle = cycle === 'yearly' ? 'yearly' : 'monthly';
    await project.save();

    res.json({
      success: true,
      message: project.plan === 'pro'
        ? `Congratulations! Project has been upgraded to Dakly Pro (${project.planCycle === 'yearly' ? 'Annual Pass ₹216/year (10% off)' : 'Monthly Pass ₹20/month'}).`
        : 'Project plan set to Free.',
      project: {
        id: project._id,
        name: project.name,
        plan: project.plan,
        planCycle: project.planCycle,
        isPro: project.plan === 'pro',
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
}

/**
 * List all custom templates for a project
 * GET /api/projects/:id/templates
 */
async function getProjectCustomTemplates(req, res) {
  try {
    const { id } = req.params;
    const project = await Project.findById(id);
    if (!project) {
      return res.status(404).json({ success: false, error: 'Project not found.' });
    }

    const userRole = project.getUserRole ? project.getUserRole(req.user) : 'owner';
    if (!userRole) {
      return res.status(403).json({ success: false, error: 'Access denied.' });
    }

    res.json({
      success: true,
      plan: project.plan || 'free',
      isPro: project.plan === 'pro',
      count: (project.customTemplates || []).length,
      templates: project.customTemplates || [],
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
}

/**
 * Create a new custom transactional template (Pro Plan Exclusive)
 * POST /api/projects/:id/templates
 */
async function createProjectCustomTemplate(req, res) {
  try {
    const { id } = req.params;
    const {
      templateId,
      name,
      badge,
      badgeColor,
      description,
      subject,
      html,
      sampleVars,
      fields,
    } = req.body;

    const project = await Project.findById(id);
    if (!project) {
      return res.status(404).json({ success: false, error: 'Project not found.' });
    }

    const userRole = project.getUserRole ? project.getUserRole(req.user) : 'owner';
    if (!['owner', 'admin'].includes(userRole)) {
      return res.status(403).json({
        success: false,
        error: 'Access denied. Only Owner or Admin can create custom templates.',
      });
    }

    // Paid / Pro Tier Gate
    if (project.plan !== 'pro') {
      return res.status(403).json({
        success: false,
        code: 'PRO_REQUIRED',
        error: 'Custom Templates are exclusively available on the Dakly Pro plan. Upgrade your project to unlock custom templates.',
        upgradeUrl: '/pricing',
      });
    }

    if (!templateId || !name || !html) {
      return res.status(400).json({
        success: false,
        error: 'Fields "templateId", "name", and "html" are required.',
      });
    }

    const cleanId = String(templateId).trim().toLowerCase();
    if (!/^[a-z0-9_-]{2,50}$/.test(cleanId)) {
      return res.status(400).json({
        success: false,
        error: 'templateId must be 2-50 characters and contain only lowercase letters, numbers, hyphens, and underscores.',
      });
    }

    // Prevent conflict with built-in templates
    const reservedIds = ['otp', 'welcome', 'password_reset', 'notes_delivery', 'receipt', 'notes', 'invoice', 'reset_password'];
    if (reservedIds.includes(cleanId)) {
      return res.status(400).json({
        success: false,
        error: `templateId "${cleanId}" is reserved by system templates. Please pick a custom identifier.`,
      });
    }

    // Prevent duplicate custom templates on the same project
    if (!project.customTemplates) project.customTemplates = [];
    const exists = project.customTemplates.some((t) => t.templateId === cleanId);
    if (exists) {
      return res.status(400).json({
        success: false,
        error: `A custom template with ID "${cleanId}" already exists on this project.`,
      });
    }

    // Auto-extract dynamic fields from {{varName}} in html/subject if fields not specified
    let resolvedFields = Array.isArray(fields) && fields.length > 0 ? fields : [];
    if (resolvedFields.length === 0) {
      const matched = (html + ' ' + (subject || '')).match(/{{\s*([a-zA-Z0-9_.-]+)\s*}}/g) || [];
      const uniqueKeys = Array.from(new Set(matched.map((m) => m.replace(/[{}]/g, '').trim()))).filter(Boolean);
      resolvedFields = uniqueKeys.map((k) => ({
        key: k,
        label: k.replace(/([A-Z])/g, ' $1').replace(/^./, (str) => str.toUpperCase()),
        placeholder: (sampleVars && sampleVars[k]) ? String(sampleVars[k]) : `e.g. ${k}`,
        isTextarea: false,
        type: 'text',
      }));
    }

    const newTemplate = {
      templateId: cleanId,
      name: name.trim(),
      badge: badge ? badge.trim() : 'Custom',
      badgeColor: badgeColor || 'border-brand-500/30 text-brand-600 bg-brand-500/10 dark:text-brand-400',
      description: description ? description.trim() : '',
      subject: subject ? subject.trim() : '',
      html,
      sampleVars: sampleVars || {},
      fields: resolvedFields,
    };

    project.customTemplates.push(newTemplate);
    await project.save();

    const created = project.customTemplates[project.customTemplates.length - 1];

    res.status(201).json({
      success: true,
      message: 'Custom template created successfully.',
      template: created,
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
}

/**
 * Update an existing custom template
 * PATCH /api/projects/:id/templates/:templateId
 */
async function updateProjectCustomTemplate(req, res) {
  try {
    const { id, templateId } = req.params;
    const project = await Project.findById(id);
    if (!project) {
      return res.status(404).json({ success: false, error: 'Project not found.' });
    }

    const userRole = project.getUserRole ? project.getUserRole(req.user) : 'owner';
    if (!['owner', 'admin'].includes(userRole)) {
      return res.status(403).json({
        success: false,
        error: 'Access denied. Only Owner or Admin can update custom templates.',
      });
    }

    const cleanId = String(templateId).trim().toLowerCase();
    const tIndex = (project.customTemplates || []).findIndex(
      (t) => t.templateId === cleanId || String(t._id) === cleanId
    );
    if (tIndex === -1) {
      return res.status(404).json({ success: false, error: 'Custom template not found.' });
    }

    const { name, badge, badgeColor, description, subject, html, sampleVars, fields } = req.body;
    const t = project.customTemplates[tIndex];

    if (name !== undefined) t.name = name.trim();
    if (badge !== undefined) t.badge = badge.trim();
    if (badgeColor !== undefined) t.badgeColor = badgeColor;
    if (description !== undefined) t.description = description.trim();
    if (subject !== undefined) t.subject = subject.trim();
    if (html !== undefined) t.html = html;
    if (sampleVars !== undefined) t.sampleVars = sampleVars;
    if (fields !== undefined && Array.isArray(fields)) t.fields = fields;

    await project.save();

    res.json({
      success: true,
      message: 'Custom template updated successfully.',
      template: project.customTemplates[tIndex],
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
}

/**
 * Delete a custom template
 * DELETE /api/projects/:id/templates/:templateId
 */
async function deleteProjectCustomTemplate(req, res) {
  try {
    const { id, templateId } = req.params;
    const project = await Project.findById(id);
    if (!project) {
      return res.status(404).json({ success: false, error: 'Project not found.' });
    }

    const userRole = project.getUserRole ? project.getUserRole(req.user) : 'owner';
    if (!['owner', 'admin'].includes(userRole)) {
      return res.status(403).json({
        success: false,
        error: 'Access denied. Only Owner or Admin can delete custom templates.',
      });
    }

    const cleanId = String(templateId).trim().toLowerCase();
    const initialCount = project.customTemplates.length;
    project.customTemplates = project.customTemplates.filter(
      (t) => t.templateId !== cleanId && String(t._id) !== cleanId
    );

    if (project.customTemplates.length === initialCount) {
      return res.status(404).json({ success: false, error: 'Custom template not found.' });
    }

    await project.save();

    res.json({
      success: true,
      message: 'Custom template deleted successfully.',
      remainingCount: project.customTemplates.length,
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
}

module.exports = {
  createProject,
  getProjects,
  updateProject,
  upgradeProjectPlan,
  getProjectCustomTemplates,
  createProjectCustomTemplate,
  updateProjectCustomTemplate,
  deleteProjectCustomTemplate,
  addSender,
  updateSender,
  getSenders,
  removeSender,
  deleteProject,
  uploadLogo,
  getLogo,
  deleteLogo,
  getSuppressionList,
  addSuppression,
  removeSuppression,
  updateSenderWarmup,
  generateWebhookSecret,
  testWebhookEndpoint,
  rotateApiKey,
  getIpWhitelist,
  updateIpWhitelist,
  getProjectMembers,
  addProjectMember,
  updateProjectMember,
  removeProjectMember,
  addSenderAlias,
  removeSenderAlias,
  getProjectAliases,
  verifySenderAlias,
  confirmSenderAliasVerification,
};
