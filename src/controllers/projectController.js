const crypto = require('crypto');
const Project = require('../models/Project');
const Suppression = require('../models/Suppression');
const { encrypt } = require('../utils/crypto');
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
      webhookUrl: webhookUrl || null,
      webhookSecret: webhookSecret || null,
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
    if (webhookUrl !== undefined) project.webhookUrl = webhookUrl ? webhookUrl.trim() : null;
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
 * Remove / deactivate a sender
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

    if (project.senders && project.senders.length > 0) {
      const sender = project.senders.id(senderId);
      if (sender) {
        sender.isActive = false;
        await project.save();
        invalidateTransporter(project._id, sender.email);
      }
    }

    res.json({
      success: true,
      message: 'Sender deactivated successfully.',
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
      query.email = { $regex: search.trim(), $options: 'i' };
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

    if (project.userId && req.user && project.userId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, error: 'Access denied.' });
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

    if (project.userId && req.user && project.userId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, error: 'Access denied.' });
    }

    // Allow testing a new URL before saving
    if (req.body.webhookUrl && req.body.webhookUrl.trim()) {
      project.webhookUrl = req.body.webhookUrl.trim();
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

module.exports = {
  createProject,
  getProjects,
  updateProject,
  addSender,
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
};
