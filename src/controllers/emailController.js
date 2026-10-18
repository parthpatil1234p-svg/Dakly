const { sendEmail } = require('../services/emailService');
const EmailLog = require('../models/EmailLog');

/**
 * Universal headless send endpoint
 * POST /api/send
 * Headers: { "x-api-key": "..." }
 * Body: { to, subject, html, text, otp, attachments }
 */
async function send(req, res) {
  try {
    const { to, subject, html, text, otp, attachments } = req.body;

    if (!to) {
      return res.status(400).json({
        success: false,
        error: 'Recipient email address ("to") is required.',
      });
    }

    // Dispatch email through project-specific pooled transport
    const result = await sendEmail({
      project: req.project,
      to: to.trim().toLowerCase(),
      subject: subject ? subject.trim() : '',
      html,
      text,
      otp,
      attachments: Array.isArray(attachments) ? attachments : [],
    });

    if (result.success) {
      return res.status(200).json(result);
    } else {
      return res.status(500).json(result);
    }
  } catch (error) {
    console.error('Controller Send Error:', error.message);
    res.status(500).json({
      success: false,
      status: 'FAILED',
      error: error.message,
    });
  }
}

/**
 * Get status of an email by trackingId
 * GET /api/status/:trackingId
 */
async function getStatus(req, res) {
  try {
    const { trackingId } = req.params;
    const log = await EmailLog.findOne({ trackingId }).populate('projectId', 'name senderEmail');

    if (!log) {
      return res.status(404).json({
        success: false,
        error: `No delivery record found for tracking ID "${trackingId}".`,
      });
    }

    res.json({
      success: true,
      log: {
        trackingId: log.trackingId,
        project: log.projectId ? log.projectId.name : 'Unknown',
        sender: log.projectId ? log.projectId.senderEmail : '',
        to: log.to,
        subject: log.subject,
        status: log.status,
        error: log.error,
        hasAttachments: log.hasAttachments,
        attachmentsCount: log.attachmentsCount,
        sentAt: log.sentAt,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
}

/**
 * Get delivery report & history for the authenticated project
 * GET /api/reports
 * Headers: { "x-api-key": "..." }
 */
async function getReports(req, res) {
  try {
    const projectId = req.project._id;
    const limit = parseInt(req.query.limit, 10) || 50;

    const [totalSent, totalDelivered, totalFailed, recentLogs] = await Promise.all([
      EmailLog.countDocuments({ projectId }),
      EmailLog.countDocuments({ projectId, status: 'DELIVERED' }),
      EmailLog.countDocuments({ projectId, status: 'FAILED' }),
      EmailLog.find({ projectId }).sort({ createdAt: -1 }).limit(limit),
    ]);

    res.json({
      success: true,
      project: {
        id: req.project._id,
        name: req.project.name,
        senderEmail: req.project.senderEmail,
        dailyQuota: req.project.dailyQuota,
        sentToday: req.project.emailsSentToday,
        remainingToday: Math.max(0, req.project.dailyQuota - req.project.emailsSentToday),
      },
      stats: {
        totalSent,
        totalDelivered,
        totalFailed,
        successRate: totalSent > 0 ? `${((totalDelivered / totalSent) * 100).toFixed(1)}%` : '100%',
      },
      recentLogs: recentLogs.map((l) => ({
        trackingId: l.trackingId,
        to: l.to,
        subject: l.subject,
        status: l.status,
        error: l.error,
        hasAttachments: l.hasAttachments,
        sentAt: l.sentAt,
      })),
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
}

module.exports = {
  send,
  getStatus,
  getReports,
};
