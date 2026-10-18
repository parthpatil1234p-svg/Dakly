const Project = require('../models/Project');
const { encrypt } = require('../utils/crypto');
const { invalidateTransporter } = require('../services/emailService');

/**
 * Register a new project and receive an API Key
 * POST /api/projects
 */
async function createProject(req, res) {
  try {
    const { name, senderEmail, appPassword, senderDisplayName, dailyQuota } = req.body;

    if (!name || !senderEmail || !appPassword) {
      return res.status(400).json({
        success: false,
        error: 'Please provide name, senderEmail, and appPassword (Google App Password).',
      });
    }

    // Google App Passwords often have spaces (e.g. "abcd efgh ijkl mnop"). Strip spaces.
    const cleanPassword = appPassword.replace(/\s+/g, '');

    // Encrypt the Google App Password
    const { encryptedData, iv, authTag } = encrypt(cleanPassword);

    const project = await Project.create({
      name: name.trim(),
      senderEmail: senderEmail.trim().toLowerCase(),
      senderDisplayName: senderDisplayName ? senderDisplayName.trim() : name.trim(),
      encryptedPassword: encryptedData,
      iv,
      authTag,
      dailyQuota: dailyQuota || 500,
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
 * List all active projects
 * GET /api/projects
 */
async function getProjects(req, res) {
  try {
    const projects = await Project.find({ isActive: true }).sort({ createdAt: -1 });

    const sanitized = projects.map((p) => ({
      id: p._id,
      name: p.name,
      senderEmail: p.senderEmail,
      senderDisplayName: p.senderDisplayName,
      apiKey: p.apiKey,
      dailyQuota: p.dailyQuota,
      emailsSentToday: p.emailsSentToday,
      remainingToday: Math.max(0, p.dailyQuota - p.emailsSentToday),
      createdAt: p.createdAt,
    }));

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
  deleteProject,
};
