const nodemailer = require('nodemailer');
const EmailLog = require('../models/EmailLog');
const Project = require('../models/Project');
const { generateTrackingId } = require('../utils/crypto');
const { processAttachments } = require('../utils/attachmentHelper');
const { paceSender } = require('./pacingService');
const { dispatchWebhook } = require('./webhookService');

// In-memory cache for Nodemailer transports with connection pooling
// Cache Key: `${projectId}_${senderEmail}` -> Transporter instance
const transporterCache = new Map();

/**
 * Gets or creates a pooled Nodemailer transporter for a sender
 * @param {Object} project - Mongoose Project document
 * @param {Object} sender - Sender subdocument or legacy sender
 * @param {string} decryptedPassword - Plain-text Google App Password
 */
function getTransporter(project, sender, decryptedPassword) {
  const cacheKey = `${project._id.toString()}_${sender.email.toLowerCase()}`;

  // Return existing pooled connection if available
  if (transporterCache.has(cacheKey)) {
    return transporterCache.get(cacheKey);
  }

  // Create cloud-compatible transporter for Gmail SMTP (Port 587 with STARTTLS)
  const transporter = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 587,
    secure: false, // Must be false for 587 (uses STARTTLS)
    requireTLS: true,
    auth: {
      user: sender.email,
      pass: decryptedPassword,
    },
    connectionTimeout: 10000, // 10s connection timeout
    greetingTimeout: 5000,    // 5s greeting timeout
    socketTimeout: 15000,     // 15s socket timeout
    tls: {
      rejectUnauthorized: true,
    },
  });

  transporterCache.set(cacheKey, transporter);
  return transporter;
}

/**
 * Invalidate transporter cache when project or sender credentials change
 */
function invalidateTransporter(projectId, senderEmail) {
  const prefix = projectId.toString();
  for (const [key, transporter] of transporterCache.entries()) {
    if (key.startsWith(prefix)) {
      if (!senderEmail || key.includes(senderEmail.toLowerCase())) {
        try {
          transporter.close();
        } catch {
          // ignore close error
        }
        transporterCache.delete(key);
      }
    }
  }
}

/**
 * Detects if an error is due to Gmail daily quota or temporary sending limits
 */
function isQuotaOrAuthLimitError(errorMsg = '') {
  const lower = errorMsg.toLowerCase();
  return (
    lower.includes('daily user sending limit exceeded') ||
    lower.includes('rate limit') ||
    lower.includes('quota') ||
    lower.includes('550 5.4.5') ||
    lower.includes('too many messages')
  );
}

/**
 * Sends an email using Multi-Account Failover, Anti-Spam Pacing, and Attachment Engine
 * @param {Object} options
 * @param {Object} options.project - Project document from DB
 * @param {string} options.to - Recipient email
 * @param {string} options.subject - Email subject line
 * @param {string} [options.html] - Custom HTML content provided by caller project
 * @param {string} [options.text] - Plain text fallback
 * @param {string} [options.otp] - Convenience OTP string if no full HTML provided
 * @param {string} [options.template] - Pre-built template ID if used
 * @param {Array} [options.attachments] - Array of attachments (URLs, base64, or files)
 * @returns {Promise<{ success: boolean, trackingId: string, status: string, error?: string, sender?: string }>}
 */
async function sendEmail({ project, to, subject, html, text, otp, template, attachments = [] }) {
  const startTime = Date.now();
  const trackingId = generateTrackingId();

  // 1. Process and validate attachments (URLs, base64, 15MB limit)
  let processedAttachments = [];
  try {
    processedAttachments = await processAttachments(attachments);
  } catch (err) {
    const errorMsg = `Attachment Error: ${err.message}`;
    await EmailLog.create({
      projectId: project._id,
      trackingId,
      to,
      subject: subject || 'No Subject',
      status: 'FAILED',
      template: template || null,
      error: errorMsg,
      hasAttachments: attachments.length > 0,
      attachmentsCount: attachments.length,
      executionTimeMs: Date.now() - startTime,
    });

    return {
      success: false,
      status: 'FAILED',
      trackingId,
      error: errorMsg,
    };
  }

  // 2. Select Active Sender with Failover (Primary -> Backup 1 -> Backup 2)
  let activeSender = project.getActiveSender();

  if (!activeSender) {
    const quotaSummary = project.getCapacitySummary();
    const quotaError = `Daily quota reached across all ${quotaSummary.sendersCount} configured Gmail account(s) (${quotaSummary.totalSentToday}/${quotaSummary.totalDailyQuota} sent today). Resets at 00:00 UTC.`;

    await EmailLog.create({
      projectId: project._id,
      trackingId,
      to,
      subject: subject || 'No Subject',
      status: 'FAILED',
      template: template || null,
      error: quotaError,
      hasAttachments: processedAttachments.length > 0,
      attachmentsCount: processedAttachments.length,
      executionTimeMs: Date.now() - startTime,
    });

    dispatchWebhook(project, {
      event: 'email.failed',
      trackingId,
      projectId: project._id,
      projectName: project.name,
      recipient: to,
      subject: subject || 'No Subject',
      status: 'FAILED',
      error: quotaError,
      timestamp: new Date().toISOString(),
    }).catch(() => {});

    return {
      success: false,
      status: 'FAILED',
      trackingId,
      error: quotaError,
    };
  }

  // 3. Prepare HTML & Subject
  let finalHtml = html;
  let finalSubject = subject;

  // Convenience OTP fallback
  if (!finalHtml && otp) {
    finalSubject = finalSubject || `${project.name}: Your Verification Code`;
    const logoHtml = project.brandLogo && project.brandLogo.data
      ? `<div style="margin-bottom: 20px; display: flex; align-items: center;">
           <img src="${project.brandLogo.data}" width="48" height="48" alt="${project.name} Logo" style="width: 48px; height: 48px; border-radius: 8px; object-fit: cover; margin-right: 12px; border: 1px solid #e2e8f0; display: inline-block; vertical-align: middle;" />
           <span style="font-size: 20px; font-weight: 700; color: #1a202c; vertical-align: middle;">${project.name}</span>
         </div>`
      : `<h2 style="margin: 0 0 16px; color: #1a202c; font-size: 20px;">${project.name}</h2>`;

    finalHtml = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 500px; margin: 0 auto; padding: 30px; border: 1px solid #e2e8f0; border-radius: 12px; background: #ffffff;">
        ${logoHtml}
        <p style="color: #4a5568; font-size: 15px; line-height: 1.5; margin: 0 0 20px;">Here is your one-time verification code:</p>
        <div style="background: #f7fafc; border: 2px dashed #cbd5e0; border-radius: 8px; padding: 18px; text-align: center; margin: 20px 0;">
          <span style="font-size: 32px; font-weight: 700; letter-spacing: 6px; color: #2b6cb0;">${otp}</span>
        </div>
        <p style="color: #718096; font-size: 13px; margin: 20px 0 0;">This code is valid for 10 minutes. If you did not request this, please ignore this email.</p>
      </div>
    `;
  }

  if (!finalHtml && !text) {
    throw new Error('Either "html", "text", or "otp" must be provided in the request body.');
  }

  // 4. Send with Multi-Account Failover & Anti-Spam Pacing
  let currentSender = activeSender;
  let attempts = 0;
  const maxAttempts = 2; // Allow 1 automatic failover retry if primary hits rate limit

  while (attempts < maxAttempts && currentSender) {
    attempts++;
    const senderEmail = currentSender.email;
    const displayName = currentSender.displayName || project.senderDisplayName || project.name;

    try {
      // Phase 1.3: Anti-Spam Burst Pacing
      await paceSender(senderEmail, project.burstPacingMs || 200);

      // Decrypt credentials for this sender
      const decryptedPassword = project.getDecryptedPassword(currentSender);
      const transporter = getTransporter(project, currentSender, decryptedPassword);

      const mailOptions = {
        from: `"${displayName}" <${senderEmail}>`,
        to,
        subject: finalSubject || `${project.name} Notification`,
        html: finalHtml,
        text: text || undefined,
        attachments: processedAttachments.length > 0 ? processedAttachments : undefined,
      };

      const info = await transporter.sendMail(mailOptions);
      const executionTimeMs = Date.now() - startTime;

      // Increment sent counter on DB
      await project.incrementSenderSent(senderEmail);

      // Save successful delivery log
      await EmailLog.create({
        projectId: project._id,
        trackingId,
        senderEmail,
        to,
        subject: mailOptions.subject,
        status: 'DELIVERED',
        template: template || null,
        hasAttachments: processedAttachments.length > 0,
        attachmentsCount: processedAttachments.length,
        executionTimeMs,
      });

      // Phase 1.4: Asynchronous Webhook Dispatch
      dispatchWebhook(project, {
        event: 'email.delivered',
        trackingId,
        projectId: project._id,
        projectName: project.name,
        sender: senderEmail,
        recipient: to,
        subject: mailOptions.subject,
        status: 'DELIVERED',
        hasAttachments: processedAttachments.length > 0,
        attachmentsCount: processedAttachments.length,
        executionTimeMs,
        timestamp: new Date().toISOString(),
      }).catch(() => {});

      return {
        success: true,
        status: 'DELIVERED',
        trackingId,
        messageId: info.messageId,
        sender: senderEmail,
        recipient: to,
        executionTimeMs,
        hasAttachments: processedAttachments.length > 0,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      console.warn(`⚠️ Dispatch attempt ${attempts} failed on sender [${senderEmail}]: ${error.message}`);

      // Check if this error warrants failing over to the backup sender
      if (isQuotaOrAuthLimitError(error.message) && attempts < maxAttempts) {
        console.log(`🔄 Auto-failing over: Marking [${senderEmail}] as exhausted and switching to backup sender...`);
        await project.markSenderExhausted(senderEmail);
        currentSender = project.getActiveSender();
        if (currentSender) {
          // Loop will retry with next sender
          continue;
        }
      }

      // If no failover was possible or retry also failed:
      const executionTimeMs = Date.now() - startTime;

      await EmailLog.create({
        projectId: project._id,
        trackingId,
        senderEmail,
        to,
        subject: finalSubject || `${project.name} Notification`,
        status: 'FAILED',
        template: template || null,
        error: error.message,
        hasAttachments: processedAttachments.length > 0,
        attachmentsCount: processedAttachments.length,
        executionTimeMs,
      });

      dispatchWebhook(project, {
        event: 'email.failed',
        trackingId,
        projectId: project._id,
        projectName: project.name,
        sender: senderEmail,
        recipient: to,
        subject: finalSubject || `${project.name} Notification`,
        status: 'FAILED',
        error: error.message,
        executionTimeMs,
        timestamp: new Date().toISOString(),
      }).catch(() => {});

      return {
        success: false,
        status: 'FAILED',
        trackingId,
        sender: senderEmail,
        error: error.message,
        executionTimeMs,
      };
    }
  }

  return {
    success: false,
    status: 'FAILED',
    trackingId,
    error: 'All sender accounts failed to deliver the message.',
  };
}

module.exports = {
  sendEmail,
  invalidateTransporter,
};
