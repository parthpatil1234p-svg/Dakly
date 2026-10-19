const Project = require('../models/Project');
const { encrypt } = require('../utils/crypto');
const { invalidateTransporter } = require('../services/emailService');

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
      // Return projects belonging to the logged in user, or unclaimed legacy projects
      query.$or = [{ userId: req.user._id }, { userId: null }, { userId: { $exists: false } }];
    }

    const projects = await Project.find(query)
      .select('+encryptedPassword +iv +authTag +senders.encryptedPassword +senders.iv +senders.authTag')
      .sort({ createdAt: -1 });

    const sanitized = projects.map((p) => {
      const capacity = p.getCapacitySummary();
      return {
        id: p._id,
        name: p.name,
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
 * Update project settings (Webhooks, pacing, display name)
 * PATCH /api/projects/:id
 */
async function updateProject(req, res) {
  try {
    const { id } = req.params;
    const { name, senderDisplayName, burstPacingMs, webhookUrl, webhookSecret } = req.body;

    const project = await Project.findById(id);
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

    if (name !== undefined) project.name = name.trim();
    if (senderDisplayName !== undefined) project.senderDisplayName = senderDisplayName.trim();
    if (burstPacingMs !== undefined) project.burstPacingMs = Math.max(0, parseInt(burstPacingMs, 10));
    if (webhookUrl !== undefined) project.webhookUrl = webhookUrl ? webhookUrl.trim() : null;
    if (webhookSecret !== undefined) project.webhookSecret = webhookSecret ? webhookSecret.trim() : null;

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
        webhookSecretConfigured: !!project.webhookSecret,
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

module.exports = {
  createProject,
  getProjects,
  updateProject,
  addSender,
  getSenders,
  removeSender,
  deleteProject,
};
