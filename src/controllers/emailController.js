const { sendEmail } = require('../services/emailService');
const EmailLog = require('../models/EmailLog');
const { compileTemplate, getCatalogList } = require('../utils/templateEngine');
const { TRANSPARENT_GIF_BUFFER, detectDeviceType } = require('../utils/trackingHelper');

/**
 * Universal headless send endpoint
 * POST /api/send
 * Headers: { "x-api-key": "..." }
 * Body: { to, subject, html, text, otp, template, vars, attachments }
 */
async function send(req, res) {
  try {
    const {
      to,
      subject,
      html,
      text,
      otp,
      template,
      vars,
      attachments,
      trackClicks,
      trackOpens,
      tracking,
    } = req.body;

    if (!to) {
      return res.status(400).json({
        success: false,
        error: 'Recipient email address ("to") is required.',
      });
    }

    let resolvedHtml = html;
    let resolvedText = text;
    let resolvedSubject = subject ? subject.trim() : '';
    let usedTemplateId = null;

    // Compile pre-built template if requested
    if (template) {
      try {
        const compiled = compileTemplate({
          template,
          vars: vars || {},
          project: req.project,
        });
        resolvedHtml = compiled.html;
        resolvedText = compiled.text;
        usedTemplateId = compiled.templateId;
        if (!resolvedSubject) {
          resolvedSubject = compiled.defaultSubject;
        }
      } catch (err) {
        return res.status(400).json({
          success: false,
          error: err.message,
          supportedTemplates: getCatalogList().map((t) => t.id),
        });
      }
    }

    // Dispatch email through project-specific pooled transport
    const result = await sendEmail({
      project: req.project,
      to: to.trim().toLowerCase(),
      subject: resolvedSubject,
      html: resolvedHtml,
      text: resolvedText,
      otp,
      template: usedTemplateId,
      attachments: Array.isArray(attachments) ? attachments : [],
      trackClicks,
      trackOpens,
      tracking,
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

    if (req.query.template && req.query.template.trim()) {
      query.template = req.query.template.trim().toLowerCase();
    }

    if (search && search.trim()) {
      const term = search.trim();
      query.$or = [
        { to: { $regex: term, $options: 'i' } },
        { subject: { $regex: term, $options: 'i' } },
        { trackingId: { $regex: term, $options: 'i' } },
        { template: { $regex: term, $options: 'i' } },
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
        template: l.template,
        openedAt: l.openedAt,
        opensCount: l.opensCount || 0,
        clickedAt: l.clickedAt,
        clicksCount: l.clicksCount || 0,
        deviceType: l.deviceType,
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
      totalOpened,
      totalClicked,
      mobileOpens,
      desktopOpens,
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
      EmailLog.countDocuments({ projectId, opensCount: { $gt: 0 } }),
      EmailLog.countDocuments({ projectId, clicksCount: { $gt: 0 } }),
      EmailLog.countDocuments({ projectId, opensCount: { $gt: 0 }, deviceType: 'MOBILE' }),
      EmailLog.countDocuments({ projectId, opensCount: { $gt: 0 }, deviceType: 'DESKTOP' }),
    ]);

    const capacity = project.getCapacitySummary();
    const todaySent = todayDelivered + todayFailed;
    const avgExecutionTimeMs =
      recentAvgTimeResult.length > 0 ? Math.round(recentAvgTimeResult[0].avgTime) : 0;

    // Tracking analytics calculations
    const openRateNum = totalDelivered > 0 ? (totalOpened / totalDelivered) * 100 : 0;
    const clickRateNum = totalDelivered > 0 ? (totalClicked / totalDelivered) * 100 : 0;
    const otherOpens = Math.max(0, totalOpened - (mobileOpens + desktopOpens));
    const totalKnownDevices = mobileOpens + desktopOpens + otherOpens;
    const mobilePercent = totalKnownDevices > 0 ? Math.round((mobileOpens / totalKnownDevices) * 100) : 0;
    const desktopPercent = totalKnownDevices > 0 ? Math.round((desktopOpens / totalKnownDevices) * 100) : 0;
    const otherPercent = totalKnownDevices > 0 ? Math.max(0, 100 - (mobilePercent + desktopPercent)) : 0;

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
        tracking: {
          totalOpened,
          totalClicked,
          openRate: `${openRateNum.toFixed(1)}%`,
          clickRate: `${clickRateNum.toFixed(1)}%`,
          devices: {
            mobile: mobileOpens,
            desktop: desktopOpens,
            other: otherOpens,
            mobilePercent,
            desktopPercent,
            otherPercent,
          },
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

/**
 * Returns available pre-built templates and their schemas
 * GET /api/templates
 */
async function getTemplates(req, res) {
  try {
    const templates = getCatalogList();
    res.json({
      success: true,
      count: templates.length,
      templates,
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
}

/**
 * Renders a preview of a template with given vars without sending an email
 * POST /api/templates/preview
 * Headers: optional { "x-api-key": "..." }
 * Body: { template, vars }
 */
async function previewTemplate(req, res) {
  try {
    const { template, vars } = req.body;
    if (!template) {
      return res.status(400).json({
        success: false,
        error: 'Field "template" is required.',
        supportedTemplates: getCatalogList().map((t) => t.id),
      });
    }

    const project = req.project || { name: 'Preview App' };
    const compiled = compileTemplate({ template, vars: vars || {}, project });

    res.json({
      success: true,
      template: compiled.templateId,
      defaultSubject: compiled.defaultSubject,
      html: compiled.html,
      text: compiled.text,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message,
      supportedTemplates: getCatalogList().map((t) => t.id),
    });
  }
}

/**
 * Serves 1x1 transparent tracking pixel and records email open event
 * GET /api/track/open/:trackingId.png
 */
async function trackOpen(req, res) {
  try {
    // 1. Immediately send 1x1 transparent GIF with aggressive zero-cache headers
    res.set({
      'Content-Type': 'image/gif',
      'Content-Length': TRANSPARENT_GIF_BUFFER.length,
      'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0',
      'Pragma': 'no-cache',
      'Expires': '0',
      'Access-Control-Allow-Origin': '*',
    });
    res.end(TRANSPARENT_GIF_BUFFER);

    // 2. Extract tracking ID (strips optional .png/.gif extension)
    const rawId = req.params.trackingId || '';
    const trackingId = rawId.replace(/\.(png|gif|jpg|jpeg)$/i, '').trim();
    if (!trackingId) return;

    const userAgent = req.headers['user-agent'] || '';
    const deviceType = detectDeviceType(userAgent);

    // 3. Record open in database asynchronously
    const log = await EmailLog.findOne({ trackingId });
    if (!log) return;

    const isFirstOpen = !log.openedAt;
    log.openedAt = log.openedAt || new Date();
    log.opensCount = (log.opensCount || 0) + 1;
    if (!log.deviceType) log.deviceType = deviceType;
    if (!log.userAgent) log.userAgent = userAgent.slice(0, 300);

    await log.save();

    // 4. Dispatch webhook on first open
    if (isFirstOpen) {
      const Project = require('../models/Project');
      const project = await Project.findById(log.projectId);
      if (project && project.webhookUrl) {
        const { dispatchWebhook } = require('../services/webhookService');
        dispatchWebhook(project, {
          event: 'email.opened',
          trackingId: log.trackingId,
          projectId: project._id,
          projectName: project.name,
          recipient: log.to,
          subject: log.subject,
          deviceType,
          openedAt: log.openedAt.toISOString(),
          timestamp: new Date().toISOString(),
        }).catch(() => {});
      }
    }
  } catch (error) {
    console.error('Track Open Error:', error.message);
  }
}

/**
 * Records link click event and redirects recipient to target destination URL
 * GET /api/track/click/:trackingId
 * Query: url (target URL)
 */
async function trackClick(req, res) {
  try {
    const rawId = req.params.trackingId || '';
    const trackingId = rawId.trim();
    let targetUrl = req.query.url ? String(req.query.url).trim() : '';

    if (targetUrl.includes('%')) {
      try {
        targetUrl = decodeURIComponent(targetUrl).trim();
      } catch (_) {}
    }

    // Safety check: only redirect to valid http/https URLs to prevent javascript: or file: exploits
    if (!targetUrl || (!targetUrl.startsWith('http://') && !targetUrl.startsWith('https://'))) {
      return res.redirect(302, 'https://dakly.vercel.app');
    }

    const userAgent = req.headers['user-agent'] || '';
    const deviceType = detectDeviceType(userAgent);

    // Record click event in background
    if (trackingId) {
      EmailLog.findOne({ trackingId }).then(async (log) => {
        if (!log) return;

        const isFirstClick = !log.clickedAt;
        log.clickedAt = log.clickedAt || new Date();
        log.clicksCount = (log.clicksCount || 0) + 1;
        log.openedAt = log.openedAt || new Date(); // Clicking a link confirms email was opened
        log.opensCount = Math.max(log.opensCount || 0, 1);
        if (!log.deviceType) log.deviceType = deviceType;

        log.clicks.push({
          url: targetUrl.slice(0, 500),
          clickedAt: new Date(),
          userAgent: userAgent.slice(0, 300),
        });

        await log.save();

        if (isFirstClick) {
          const Project = require('../models/Project');
          const project = await Project.findById(log.projectId);
          if (project && project.webhookUrl) {
            const { dispatchWebhook } = require('../services/webhookService');
            dispatchWebhook(project, {
              event: 'email.clicked',
              trackingId: log.trackingId,
              projectId: project._id,
              projectName: project.name,
              recipient: log.to,
              subject: log.subject,
              url: targetUrl,
              deviceType,
              clickedAt: log.clickedAt.toISOString(),
              timestamp: new Date().toISOString(),
            }).catch(() => {});
          }
        }
      }).catch((err) => console.error('Track Click DB Error:', err.message));
    }

    // Validate target destination URL to prevent Open Redirect attacks to internal cloud metadata
    let safeDestination = 'https://dakly.vercel.app';
    try {
      const parsed = new URL(targetUrl);
      if (
        (parsed.protocol === 'http:' || parsed.protocol === 'https:') &&
        !/[\r\n]/.test(targetUrl)
      ) {
        const host = parsed.hostname.toLowerCase();
        // Allow all valid websites and localhost/dev endpoints; block only cloud instance metadata endpoints
        if (
          host !== '169.254.169.254' &&
          host !== 'metadata.google.internal' &&
          !host.endsWith('.metadata.google.internal')
        ) {
          safeDestination = parsed.href;
        }
      }
    } catch {
      safeDestination = 'https://dakly.vercel.app';
    }

    // Immediate 302 Redirect to destination
    return res.redirect(302, safeDestination);
  } catch (error) {
    console.error('Track Click Error:', error.message);
    res.redirect(302, 'https://dakly.vercel.app');
  }
}

module.exports = {
  send,
  getLogs,
  getStats,
  getStatus,
  getReports,
  ping,
  getTemplates,
  previewTemplate,
  trackOpen,
  trackClick,
};

