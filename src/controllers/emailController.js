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
 * Searchable, Paginated Audit Logs for Dashboard
 * GET /api/logs
 * Headers: { "x-api-key": "..." }
 * Query: search, status, page, limit, from, to
 */
async function getLogs(req, res) {
  try {
    const projectId = req.project._id;
    const { search, status, from, to } = req.query;
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 20));
    const skip = (page - 1) * limit;

    const query = { projectId };

    if (status && ['DELIVERED', 'FAILED', 'QUEUED'].includes(status.toUpperCase())) {
      query.status = status.toUpperCase();
    }

    if (search && search.trim()) {
      const term = search.trim();
      query.$or = [
        { to: { $regex: term, $options: 'i' } },
        { subject: { $regex: term, $options: 'i' } },
        { trackingId: { $regex: term, $options: 'i' } },
      ];
    }

    if (from || to) {
      query.createdAt = {};
      if (from) query.createdAt.$gte = new Date(from);
      if (to) query.createdAt.$lte = new Date(to);
    }

    const [total, logs] = await Promise.all([
      EmailLog.countDocuments(query),
      EmailLog.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit),
    ]);

    res.json({
      success: true,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit) || 1,
      },
      logs: logs.map((l) => ({
        trackingId: l.trackingId,
        senderEmail: l.senderEmail,
        to: l.to,
        subject: l.subject,
        status: l.status,
        error: l.error,
        hasAttachments: l.hasAttachments,
        attachmentsCount: l.attachmentsCount,
        executionTimeMs: l.executionTimeMs,
        webhookStatus: l.webhookStatus,
        sentAt: l.sentAt || l.createdAt,
      })),
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
}

/**
 * Full Dashboard Analytics & Capacity Stats
 * GET /api/stats
 * Headers: { "x-api-key": "..." }
 */
async function getStats(req, res) {
  try {
    const project = req.project;
    const projectId = project._id;

    // Today's boundaries in UTC
    const startOfToday = new Date();
    startOfToday.setUTCHours(0, 0, 0, 0);

    const [
      totalSent,
      totalDelivered,
      totalFailed,
      todayDelivered,
      todayFailed,
      recentAvgTimeResult,
    ] = await Promise.all([
      EmailLog.countDocuments({ projectId }),
      EmailLog.countDocuments({ projectId, status: 'DELIVERED' }),
      EmailLog.countDocuments({ projectId, status: 'FAILED' }),
      EmailLog.countDocuments({ projectId, status: 'DELIVERED', createdAt: { $gte: startOfToday } }),
      EmailLog.countDocuments({ projectId, status: 'FAILED', createdAt: { $gte: startOfToday } }),
      EmailLog.aggregate([
        { $match: { projectId, status: 'DELIVERED', executionTimeMs: { $gt: 0 } } },
        { $sort: { createdAt: -1 } },
        { $limit: 100 },
        { $group: { _id: null, avgTime: { $avg: '$executionTimeMs' } } },
      ]),
    ]);

    const capacity = project.getCapacitySummary();
    const todaySent = todayDelivered + todayFailed;
    const avgExecutionTimeMs =
      recentAvgTimeResult.length > 0 ? Math.round(recentAvgTimeResult[0].avgTime) : 0;

    res.json({
      success: true,
      project: {
        id: project._id,
        name: project.name,
        apiKey: project.apiKey,
        burstPacingMs: project.burstPacingMs || 200,
        webhookConfigured: !!project.webhookUrl,
        webhookUrl: project.webhookUrl,
      },
      capacity: {
        totalDailyQuota: capacity.totalDailyQuota,
        sentToday: capacity.totalSentToday,
        remainingToday: capacity.remainingToday,
        activeSendersCount: capacity.sendersCount,
        senders: capacity.senders,
      },
      metrics: {
        allTime: {
          totalSent,
          totalDelivered,
          totalFailed,
          successRate: totalSent > 0 ? `${((totalDelivered / totalSent) * 100).toFixed(1)}%` : '100%',
        },
        today: {
          sentToday: todaySent,
          deliveredToday: todayDelivered,
          failedToday: todayFailed,
          successRate: todaySent > 0 ? `${((todayDelivered / todaySent) * 100).toFixed(1)}%` : '100%',
        },
        performance: {
          avgExecutionTimeMs,
          status: avgExecutionTimeMs < 3000 ? 'EXCELLENT' : 'NORMAL',
        },
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
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
        senderEmail: log.senderEmail || (log.projectId ? log.projectId.senderEmail : ''),
        to: log.to,
        subject: log.subject,
        status: log.status,
        error: log.error,
        hasAttachments: log.hasAttachments,
        attachmentsCount: log.attachmentsCount,
        executionTimeMs: log.executionTimeMs,
        webhookStatus: log.webhookStatus,
        sentAt: log.sentAt || log.createdAt,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
}

/**
 * Ping & Connection Diagnostics Endpoint
 * GET /api/ping or POST /api/ping
 * Headers: { "x-api-key": "..." }
 */
async function ping(req, res) {
  try {
    const project = req.project;
    const clientIp = req.headers['x-forwarded-for']?.split(',')[0].trim() || req.socket.remoteAddress || 'unknown';

    const allSenders = project.getAllSenders ? project.getAllSenders() : [];
    const capacity = project.getCapacitySummary ? project.getCapacitySummary() : {
      totalDailyQuota: project.dailyQuota || 500,
      totalSentToday: project.emailsSentToday || 0,
      remainingToday: Math.max(0, (project.dailyQuota || 500) - (project.emailsSentToday || 0)),
      sendersCount: allSenders.length || 1,
    };

    res.status(200).json({
      success: true,
      status: 'ACTIVE',
      message: '✅ Dakly API Key is valid, authenticated, and ready to accept dispatches!',
      project: {
        id: project._id,
        name: project.name,
        primarySender: project.senderEmail || (allSenders[0] ? allSenders[0].email : 'Not configured'),
        activeSendersCount: capacity.sendersCount,
        dailyQuota: capacity.totalDailyQuota,
        emailsSentToday: capacity.totalSentToday,
        remainingToday: capacity.remainingToday,
        burstPacingMs: project.burstPacingMs || 200,
        webhookConfigured: !!project.webhookUrl,
      },
      diagnostics: {
        callerIp: clientIp,
        engineStatus: 'ONLINE',
        databaseStatus: 'CONNECTED',
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
}

/**
 * Legacy delivery reports endpoint
 * GET /api/reports
 * Headers: { "x-api-key": "..." }
 */
async function getReports(req, res) {
  return getStats(req, res);
}

module.exports = {
  send,
  getLogs,
  getStats,
  getStatus,
  getReports,
  ping,
};
