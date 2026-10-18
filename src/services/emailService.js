const nodemailer = require('nodemailer');
const EmailLog = require('../models/EmailLog');
const Project = require('../models/Project');
const { generateTrackingId } = require('../utils/crypto');

// In-memory cache for Nodemailer transports with connection pooling
// Cache Key: projectId -> Transporter instance
const transporterCache = new Map();

/**
 * Gets or creates a pooled Nodemailer transporter for a project
 * @param {Object} project - Mongoose Project document
 * @param {string} decryptedPassword - Plain-text Google App Password
 */
function getTransporter(project, decryptedPassword) {
  const cacheKey = project._id.toString();

  // Return existing pooled connection if available
  if (transporterCache.has(cacheKey)) {
    return transporterCache.get(cacheKey);
  }

  // Create new pooled transporter for Gmail SMTP
  const transporter = nodemailer.createTransport({
    service: 'gmail',
    host: 'smtp.gmail.com',
    port: 465,
    secure: true, // Use SSL
    pool: true, // KEEP CONNECTION ALIVE (Solves cold start & OTP delay!)
    maxConnections: 5,
    maxMessages: 100,
    auth: {
      user: project.senderEmail,
      pass: decryptedPassword,
    },
    tls: {
      rejectUnauthorized: true,
    },
  });

  transporterCache.set(cacheKey, transporter);
  return transporter;
}

/**
 * Invalidate transporter cache when project credentials change
 */
function invalidateTransporter(projectId) {
  const key = projectId.toString();
  if (transporterCache.has(key)) {
    const transporter = transporterCache.get(key);
    try {
      transporter.close();
    } catch (err) {
      // Ignore close error
    }
    transporterCache.delete(key);
  }
}

/**
 * Sends an email using the project's Gmail account
 * @param {Object} options
 * @param {Object} options.project - Project document from DB
 * @param {string} options.to - Recipient email
 * @param {string} options.subject - Email subject line
 * @param {string} [options.html] - Custom HTML content provided by caller project
 * @param {string} [options.text] - Plain text fallback
 * @param {string} [options.otp] - Convenience OTP string if no full HTML provided
 * @param {Array} [options.attachments] - Array of attachments (URLs, base64, or files)
 * @returns {Promise<{ success: boolean, trackingId: string, status: string, error?: string }>}
 */
async function sendEmail({ project, to, subject, html, text, otp, attachments = [] }) {
  const trackingId = generateTrackingId();

  // 1. Check daily quota
  if (!project.canSendEmail()) {
    const quotaError = `Daily quota limit reached (${project.dailyQuota} emails/day). Resets at 00:00 UTC.`;
    await EmailLog.create({
      projectId: project._id,
      trackingId,
      to,
      subject: subject || 'No Subject',
      status: 'FAILED',
      error: quotaError,
      hasAttachments: attachments.length > 0,
      attachmentsCount: attachments.length,
    });

    return {
      success: false,
      status: 'FAILED',
      trackingId,
      error: quotaError,
    };
  }

  // 2. Prepare HTML & Subject
  let finalHtml = html;
  let finalSubject = subject;

  // Convenience fallback if caller only passed OTP without custom HTML
  if (!finalHtml && otp) {
    finalSubject = finalSubject || `${project.name}: Your Verification Code`;
    finalHtml = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 500px; margin: 0 auto; padding: 30px; border: 1px solid #e2e8f0; border-radius: 12px; background: #ffffff;">
        <h2 style="margin: 0 0 16px; color: #1a202c; font-size: 20px;">${project.name}</h2>
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

  // 3. Decrypt App Password and get pooled transporter
  const decryptedPassword = project.getDecryptedPassword();
  const transporter = getTransporter(project, decryptedPassword);

  const displayName = project.senderDisplayName || project.name;
  const mailOptions = {
    from: `"${displayName}" <${project.senderEmail}>`,
    to,
    subject: finalSubject || `${project.name} Notification`,
    html: finalHtml,
    text: text || undefined,
    attachments: attachments && attachments.length > 0 ? attachments : undefined,
  };

  // 4. Dispatch Email with Timeout Protection
  try {
    const info = await transporter.sendMail(mailOptions);

    // Save successful log in MongoDB
    await EmailLog.create({
      projectId: project._id,
      trackingId,
      to,
      subject: mailOptions.subject,
      status: 'DELIVERED',
      hasAttachments: attachments.length > 0,
      attachmentsCount: attachments.length,
    });

    // Increment today's count
    await project.incrementSentCount();

    return {
      success: true,
      status: 'DELIVERED',
      trackingId,
      messageId: info.messageId,
      recipient: to,
      timestamp: new Date().toISOString(),
    };
  } catch (error) {
    console.error(`❌ Dakly Dispatch Error [${project.name} -> ${to}]:`, error.message);

    // Log failure in MongoDB
    await EmailLog.create({
      projectId: project._id,
      trackingId,
      to,
      subject: mailOptions.subject,
      status: 'FAILED',
      error: error.message,
      hasAttachments: attachments.length > 0,
      attachmentsCount: attachments.length,
    });

    return {
      success: false,
      status: 'FAILED',
      trackingId,
      error: error.message,
    };
  }
}

module.exports = {
  sendEmail,
  invalidateTransporter,
};
