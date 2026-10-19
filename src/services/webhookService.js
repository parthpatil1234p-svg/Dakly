/**
 * Delivery Webhook Dispatcher for Dakly
 * Sends real-time callbacks to client applications upon email delivery or failure.
 * Features optional HMAC-SHA256 signature verification and timeout protection.
 */

const crypto = require('crypto');
const EmailLog = require('../models/EmailLog');

/**
 * Dispatches a delivery webhook notification asynchronously
 * @param {Object} project - Project document
 * @param {Object} payload - Event payload
 * @returns {Promise<{ dispatched: boolean, status: string, error?: string }>}
 */
async function dispatchWebhook(project, payload) {
  if (!project.webhookUrl) {
    return { dispatched: false, status: 'NOT_CONFIGURED' };
  }

  const webhookUrl = project.webhookUrl;
  const bodyString = JSON.stringify(payload);

  const headers = {
    'Content-Type': 'application/json',
    'User-Agent': 'Dakly-Webhook-Dispatcher/1.0',
    'x-dakly-event': payload.event,
    'x-dakly-delivery': payload.trackingId,
  };

  // Attach cryptographic signature if secret is configured
  if (project.webhookSecret) {
    const signature = crypto
      .createHmac('sha256', project.webhookSecret)
      .update(bodyString)
      .digest('hex');
    headers['x-dakly-signature'] = `sha256=${signature}`;
  }

  try {
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers,
      body: bodyString,
      signal: AbortSignal.timeout(5000), // 5s timeout
    });

    const isSuccess = response.ok;
    const webhookStatus = isSuccess ? 'SENT' : 'FAILED';

    // Update log in background
    if (payload.trackingId) {
      EmailLog.updateOne(
        { trackingId: payload.trackingId },
        { webhookStatus }
      ).catch(() => {});
    }

    return {
      dispatched: true,
      status: webhookStatus,
      httpStatus: response.status,
    };
  } catch (error) {
    console.warn(`⚠️ Webhook delivery failed for ${webhookUrl}:`, error.message);

    if (payload.trackingId) {
      EmailLog.updateOne(
        { trackingId: payload.trackingId },
        { webhookStatus: 'FAILED' }
      ).catch(() => {});
    }

    return {
      dispatched: false,
      status: 'FAILED',
      error: error.message,
    };
  }
}

module.exports = {
  dispatchWebhook,
};
