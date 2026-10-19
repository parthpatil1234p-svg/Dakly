/**
 * Delivery Webhook Dispatcher for Dakly
 * Sends real-time callbacks to client applications upon email delivery, open, click, or failure.
 * Features HMAC-SHA256 signature verification, event filtering, and timeout protection.
 * 
 * @license MIT
 */

const crypto = require('crypto');
const mongoose = require('mongoose');
const EmailLog = require('../models/EmailLog');
const Project = require('../models/Project');
const { isSafeRemoteUrl, isPrivateIp } = require('../utils/ssrfHelper');

/**
 * Verifies an incoming webhook HMAC signature
 * @param {string|object} payload - Raw request body string or JSON object
 * @param {string} signatureHeader - Value of 'x-dakly-signature' header
 * @param {string} secret - Project webhookSecret
 * @returns {boolean} Whether signature is valid
 */
function verifyWebhookSignature(payload, signatureHeader, secret) {
  if (!signatureHeader || !secret) return false;
  try {
    const rawSignature = signatureHeader.startsWith('sha256=')
      ? signatureHeader.slice(7)
      : signatureHeader;

    const bodyString = typeof payload === 'string' ? payload : JSON.stringify(payload);
    const expected = crypto
      .createHmac('sha256', secret)
      .update(bodyString)
      .digest('hex');

    const signatureBuf = Buffer.from(rawSignature, 'hex');
    const expectedBuf = Buffer.from(expected, 'hex');

    if (signatureBuf.length !== expectedBuf.length) return false;
    return crypto.timingSafeEqual(signatureBuf, expectedBuf);
  } catch {
    return false;
  }
}

/**
 * Dispatches a delivery webhook notification asynchronously
 * @param {Object} project - Project document
 * @param {Object} payload - Event payload
 * @returns {Promise<{ dispatched: boolean, status: string, error?: string }>}
 */
async function dispatchWebhook(project, payload) {
  // 1. Guard check if webhooks are configured and enabled
  if (!project.webhookUrl || project.webhookEnabled === false) {
    return { dispatched: false, status: 'NOT_CONFIGURED_OR_DISABLED' };
  }

  // 2. Check event subscription filter
  if (
    Array.isArray(project.webhookEvents) &&
    project.webhookEvents.length > 0 &&
    payload.event !== 'webhook.test' &&
    !project.webhookEvents.includes(payload.event)
  ) {
    return { dispatched: false, status: 'EVENT_NOT_SUBSCRIBED' };
  }

  let parsedUrl;
  try {
    parsedUrl = new URL(project.webhookUrl);
  } catch {
    return { dispatched: false, status: 'UNSAFE_OR_INVALID_URL', reason: 'Invalid URL format.' };
  }

  if (parsedUrl.protocol !== 'http:' && parsedUrl.protocol !== 'https:') {
    return { dispatched: false, status: 'UNSAFE_OR_INVALID_URL', reason: 'Disallowed protocol.' };
  }

  const host = parsedUrl.hostname.toLowerCase();
  if (
    host === 'localhost' ||
    host === '127.0.0.1' ||
    host === '0.0.0.0' ||
    host === '169.254.169.254' ||
    host.endsWith('.localhost') ||
    host.endsWith('.local') ||
    host.endsWith('.internal') ||
    (/^(\d{1,3}\.){3}\d{1,3}$/.test(host) && isPrivateIp(host))
  ) {
    return { dispatched: false, status: 'UNSAFE_OR_INVALID_URL', reason: 'Disallowed private or loopback destination.' };
  }

  const safeWebhookUrl = parsedUrl.href;
  const timestamp = new Date().toISOString();
  const enhancedPayload = {
    ...payload,
    timestamp: payload.timestamp || timestamp,
  };

  const bodyString = JSON.stringify(enhancedPayload);

  const headers = {
    'Content-Type': 'application/json',
    'User-Agent': 'Dakly-Webhook-Dispatcher/1.0',
    'x-dakly-event': payload.event,
    'x-dakly-delivery': payload.trackingId || 'test',
    'x-dakly-timestamp': timestamp,
  };

  // Attach cryptographic HMAC signature if secret is configured
  if (project.webhookSecret) {
    const signature = crypto
      .createHmac('sha256', project.webhookSecret)
      .update(bodyString)
      .digest('hex');
    headers['x-dakly-signature'] = `sha256=${signature}`;
  }

  const startTime = Date.now();

  try {
    const response = await fetch(safeWebhookUrl, {
      method: 'POST',
      headers,
      body: bodyString,
      signal: AbortSignal.timeout(5000), // 5s timeout
    });

    const latencyMs = Date.now() - startTime;
    const isSuccess = response.ok;
    const webhookStatus = isSuccess ? 'SUCCESS' : 'FAILED';

    // Update Project metrics in background
    if (project._id && mongoose.isValidObjectId(project._id)) {
      Project.updateOne(
        { _id: project._id },
        {
          lastWebhookDispatchedAt: new Date(),
          lastWebhookStatus: webhookStatus,
          lastWebhookResponseCode: response.status,
          lastWebhookLatencyMs: latencyMs,
          lastWebhookError: isSuccess ? null : `HTTP ${response.status} ${response.statusText}`,
        }
      ).catch(() => {});
    }

    // Update EmailLog if trackingId was passed
    if (payload.trackingId) {
      EmailLog.updateOne(
        { trackingId: payload.trackingId },
        { webhookStatus: isSuccess ? 'SENT' : 'FAILED' }
      ).catch(() => {});
    }

    return {
      dispatched: true,
      status: webhookStatus,
      httpStatus: response.status,
      latencyMs,
    };
  } catch (error) {
    const latencyMs = Date.now() - startTime;
    console.warn(`⚠️ Webhook delivery failed for ${webhookUrl}:`, error.message);

    if (project._id && mongoose.isValidObjectId(project._id)) {
      Project.updateOne(
        { _id: project._id },
        {
          lastWebhookDispatchedAt: new Date(),
          lastWebhookStatus: 'FAILED',
          lastWebhookResponseCode: 0,
          lastWebhookLatencyMs: latencyMs,
          lastWebhookError: error.message,
        }
      ).catch(() => {});
    }

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
      latencyMs,
    };
  }
}

/**
 * Sends a live mock test webhook event to verify endpoint connectivity
 * @param {Object} project - Project document
 * @returns {Promise<{ success: boolean, httpStatus?: number, latencyMs?: number, responseText?: string, error?: string }>}
 */
async function sendTestWebhook(project) {
  if (!project.webhookUrl) {
    return {
      success: false,
      error: 'Please enter a valid Webhook Destination URL first.',
    };
  }

  let parsedUrl;
  try {
    parsedUrl = new URL(project.webhookUrl);
  } catch {
    return {
      success: false,
      error: 'Invalid Webhook Destination URL format.',
    };
  }

  if (parsedUrl.protocol !== 'http:' && parsedUrl.protocol !== 'https:') {
    return {
      success: false,
      error: 'Only http: and https: protocols are permitted for webhooks.',
    };
  }

  const host = parsedUrl.hostname.toLowerCase();
  if (
    host === 'localhost' ||
    host === '127.0.0.1' ||
    host === '0.0.0.0' ||
    host === '169.254.169.254' ||
    host.endsWith('.localhost') ||
    host.endsWith('.local') ||
    host.endsWith('.internal') ||
    (/^(\d{1,3}\.){3}\d{1,3}$/.test(host) && isPrivateIp(host))
  ) {
    return {
      success: false,
      error: 'Disallowed Webhook Destination: localhost and private network addresses are blocked for security.',
    };
  }

  const safeWebhookUrl = parsedUrl.href;

  const testPayload = {
    event: 'webhook.test',
    test: true,
    projectId: project._id.toString(),
    projectName: project.name,
    trackingId: `tr_test_${Math.random().toString(36).substring(2, 10)}`,
    recipient: 'developer-test@example.com',
    message: '🎉 Ping test succeeded! Your webhook endpoint is successfully connected to Dakly.',
    timestamp: new Date().toISOString(),
  };

  const bodyString = JSON.stringify(testPayload);
  const headers = {
    'Content-Type': 'application/json',
    'User-Agent': 'Dakly-Webhook-Tester/1.0',
    'x-dakly-event': 'webhook.test',
    'x-dakly-delivery': testPayload.trackingId,
    'x-dakly-timestamp': testPayload.timestamp,
  };

  if (project.webhookSecret) {
    const signature = crypto
      .createHmac('sha256', project.webhookSecret)
      .update(bodyString)
      .digest('hex');
    headers['x-dakly-signature'] = `sha256=${signature}`;
  }

  const startTime = Date.now();

  try {
    const response = await fetch(safeWebhookUrl, {
      method: 'POST',
      headers,
      body: bodyString,
      signal: AbortSignal.timeout(6000),
    });

    const latencyMs = Date.now() - startTime;
    let responseText = '';
    try {
      responseText = await response.text();
      if (responseText.length > 500) {
        responseText = responseText.substring(0, 500) + '... (truncated)';
      }
    } catch {
      responseText = '';
    }

    const isSuccess = response.ok;

    // Record on project
    if (project._id && mongoose.isValidObjectId(project._id)) {
      await Project.updateOne(
        { _id: project._id },
        {
          lastWebhookDispatchedAt: new Date(),
          lastWebhookStatus: isSuccess ? 'SUCCESS' : 'FAILED',
          lastWebhookResponseCode: response.status,
          lastWebhookLatencyMs: latencyMs,
          lastWebhookError: isSuccess ? null : `HTTP ${response.status}`,
        }
      ).catch(() => {});
    }

    return {
      success: isSuccess,
      httpStatus: response.status,
      latencyMs,
      responseText,
      error: isSuccess ? null : `Server responded with HTTP ${response.status}`,
    };
  } catch (err) {
    const latencyMs = Date.now() - startTime;
    if (project._id && mongoose.isValidObjectId(project._id)) {
      await Project.updateOne(
        { _id: project._id },
        {
          lastWebhookDispatchedAt: new Date(),
          lastWebhookStatus: 'FAILED',
          lastWebhookResponseCode: 0,
          lastWebhookLatencyMs: latencyMs,
          lastWebhookError: err.message,
        }
      ).catch(() => {});
    }

    return {
      success: false,
      httpStatus: 0,
      latencyMs,
      error: `Connection error: ${err.message}`,
    };
  }
}

module.exports = {
  dispatchWebhook,
  sendTestWebhook,
  verifyWebhookSignature,
};
