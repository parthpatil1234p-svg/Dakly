/**
 * Dakly - Standalone Zero-Dependency SDK (Single File Drop-In)
 * https://dakly.vercel.app
 * 
 * Works in Node.js 18+, Bun, Deno, Browser, and Next.js / Edge.
 * 
 * Usage:
 *   const { Dakly } = require('./dakly.js');
 *   // or: import { Dakly } from './dakly.js';
 */

'use strict';

class DaklyError extends Error {
  constructor(message, options = {}) {
    super(message);
    this.name = this.constructor.name;
    this.statusCode = options.statusCode || 500;
    this.status = options.status || 'ERROR';
    this.trackingId = options.trackingId || null;
    this.details = options.details || null;
  }
}

class DaklyAuthenticationError extends DaklyError {
  constructor(message = 'Invalid or missing Dakly API Key.', options = {}) {
    super(message, { statusCode: 401, status: 'UNAUTHORIZED', ...options });
  }
}

class DaklyRateLimitError extends DaklyError {
  constructor(message = 'Daily quota limit or rate limit exceeded.', options = {}) {
    super(message, { statusCode: 429, status: 'RATE_LIMITED', ...options });
  }
}

class DaklySuppressedError extends DaklyError {
  constructor(message, options = {}) {
    super(message || 'Recipient is blocked on Suppression List due to previous hard bounce.', {
      statusCode: 200,
      status: 'BLOCKED_SUPPRESSED',
      ...options,
    });
    this.suppressed = true;
    this.reason = options.reason || 'HARD_BOUNCE';
  }
}

class DaklyValidationError extends DaklyError {
  constructor(message = 'Invalid parameters provided to Dakly SDK.', options = {}) {
    super(message, { statusCode: 400, status: 'VALIDATION_ERROR', ...options });
  }
}

class Dakly {
  constructor(apiKeyOrOptions) {
    if (typeof apiKeyOrOptions === 'string') {
      this.apiKey = apiKeyOrOptions.trim();
      this.baseUrl = 'https://dakly-engin.vercel.app';
      this.timeout = 15000;
      this.throwOnSuppressed = true;
    } else if (typeof apiKeyOrOptions === 'object' && apiKeyOrOptions !== null) {
      this.apiKey = (apiKeyOrOptions.apiKey || (typeof process !== 'undefined' && process.env && process.env.DAKLY_API_KEY) || '').trim();
      this.baseUrl = (apiKeyOrOptions.baseUrl || (typeof process !== 'undefined' && process.env && process.env.DAKLY_BASE_URL) || 'https://dakly-engin.vercel.app').replace(/\/+$/, '');
      this.timeout = typeof apiKeyOrOptions.timeout === 'number' ? apiKeyOrOptions.timeout : 15000;
      this.throwOnSuppressed = apiKeyOrOptions.throwOnSuppressed !== false;
    } else {
      this.apiKey = (typeof process !== 'undefined' && process.env && process.env.DAKLY_API_KEY) || '';
      this.baseUrl = 'https://dakly-engin.vercel.app';
      this.timeout = 15000;
      this.throwOnSuppressed = true;
    }
  }

  async _request(path, options = {}) {
    if (!this.apiKey) {
      throw new DaklyAuthenticationError(
        'Dakly API Key is required. Pass it to new Dakly("gkey_live_...") or set DAKLY_API_KEY.'
      );
    }

    const url = `${this.baseUrl}${path.startsWith('/') ? '' : '/'}${path}`;
    const headers = {
      'Accept': 'application/json',
      'x-api-key': this.apiKey,
      ...(options.headers || {}),
    };

    let body = options.body;
    if (body && typeof body === 'object') {
      headers['Content-Type'] = 'application/json';
      body = JSON.stringify(body);
    }

    let controller, timer;
    if (typeof AbortController !== 'undefined' && this.timeout > 0) {
      controller = new AbortController();
      timer = setTimeout(() => controller.abort(), this.timeout);
    }

    try {
      const response = await fetch(url, {
        method: options.method || 'GET',
        headers,
        body,
        signal: controller ? controller.signal : undefined,
      });

      if (timer) clearTimeout(timer);

      let data;
      const contentType = response.headers.get('content-type') || '';
      if (contentType.includes('application/json')) {
        data = await response.json();
      } else {
        const text = await response.text();
        try { data = JSON.parse(text); } catch { data = { message: text }; }
      }

      if (!response.ok) {
        const msg = data?.error || data?.message || `HTTP ${response.status}`;
        if (response.status === 401 || response.status === 403) throw new DaklyAuthenticationError(msg, { statusCode: response.status, details: data });
        if (response.status === 429) throw new DaklyRateLimitError(msg, { statusCode: 429, details: data });
        if (response.status === 400) throw new DaklyValidationError(msg, { statusCode: 400, details: data });
        throw new DaklyError(msg, { statusCode: response.status, details: data });
      }

      if (data?.status === 'BLOCKED_SUPPRESSED' && this.throwOnSuppressed) {
        throw new DaklySuppressedError(data.error, { trackingId: data.trackingId, reason: data.reason, details: data });
      }

      return data;
    } catch (err) {
      if (timer) clearTimeout(timer);
      if (err.name === 'AbortError') {
        throw new DaklyError(`Request timed out after ${this.timeout}ms connecting to Dakly.`, { statusCode: 408, status: 'TIMEOUT' });
      }
      if (err instanceof DaklyError) throw err;
      throw new DaklyError(`Dakly Network Request Failed: ${err.message}`, { statusCode: 500, status: 'NETWORK_ERROR' });
    }
  }

  async send(options) {
    if (!options || typeof options !== 'object') throw new DaklyValidationError('Options object required.');
    if (!options.to) throw new DaklyValidationError('Recipient email ("to") required.');
    return this._request('/api/send', { method: 'POST', body: options });
  }

  async sendOtp(optionsOrTo, codeIfPositional, appNameIfPositional) {
    let to, code, appName, validity, subject;
    if (typeof optionsOrTo === 'string') {
      to = optionsOrTo;
      code = codeIfPositional;
      appName = appNameIfPositional || 'Dakly App';
      validity = '10 minutes';
    } else if (typeof optionsOrTo === 'object' && optionsOrTo !== null) {
      to = optionsOrTo.to;
      code = optionsOrTo.code || optionsOrTo.otp;
      appName = optionsOrTo.appName || 'Dakly App';
      validity = optionsOrTo.validity || (optionsOrTo.expiresInMinutes ? `${optionsOrTo.expiresInMinutes} minutes` : '10 minutes');
      subject = optionsOrTo.subject;
    } else {
      throw new DaklyValidationError('Recipient email ("to") and code required.');
    }
    if (!to || !code) throw new DaklyValidationError('to and code are required.');

    return this.send({
      to,
      subject: subject || `${code} is your ${appName} verification code`,
      template: 'otp',
      vars: { otp: String(code), appName, validity },
    });
  }

  async sendTemplate(options) {
    if (!options?.to || !options?.template) throw new DaklyValidationError('to and template are required.');
    return this.send(options);
  }

  async sendWelcome(options) {
    if (!options?.to) throw new DaklyValidationError('to is required.');
    return this.sendTemplate({
      to: options.to,
      template: 'welcome',
      subject: options.subject,
      vars: {
        name: options.name || 'there',
        appName: options.appName || 'Our Platform',
        loginUrl: options.loginUrl || 'https://dakly.vercel.app',
        supportEmail: options.supportEmail || 'support@dakly.com',
      },
    });
  }

  async sendPasswordReset(options) {
    if (!options?.to || !options?.resetUrl) throw new DaklyValidationError('to and resetUrl are required.');
    return this.sendTemplate({
      to: options.to,
      template: 'password_reset',
      subject: options.subject,
      vars: {
        name: options.name || 'there',
        resetUrl: options.resetUrl,
        validity: options.validity || (options.expiresInMinutes ? `${options.expiresInMinutes} minutes` : '15 minutes'),
      },
    });
  }

  async sendNotes(options) {
    if (!options?.to || !options?.subjectName || !options?.notesTitle) {
      throw new DaklyValidationError('to, subjectName and notesTitle are required.');
    }
    return this.sendTemplate({
      to: options.to,
      template: 'notes',
      subject: options.subject,
      attachments: options.attachments,
      vars: {
        studentName: options.studentName || 'Student',
        subjectName: options.subjectName,
        notesTitle: options.notesTitle,
        downloadUrl: options.downloadUrl || '#',
        examNotice: options.examNotice || 'Mid-term exams start next week.',
        professorName: options.professorName || 'Department Faculty',
      },
    });
  }

  async sendInvoice(options) {
    if (!options?.to || !options?.invoiceNumber || !options?.amount) {
      throw new DaklyValidationError('to, invoiceNumber and amount are required.');
    }
    return this.sendTemplate({
      to: options.to,
      template: 'invoice',
      subject: options.subject,
      attachments: options.attachments,
      vars: {
        clientName: options.clientName || 'Valued Customer',
        invoiceNumber: options.invoiceNumber,
        amount: options.amount,
        dueDate: options.dueDate || 'Upon Receipt',
        downloadUrl: options.downloadUrl || '#',
        itemsSummary: options.itemsSummary || 'Standard Cloud Microservice Subscription',
      },
    });
  }

  async ping() { return this._request('/api/ping', { method: 'GET' }); }
  async getTemplates() { return this._request('/api/templates', { method: 'GET' }); }
  async getLogs(params = {}) {
    const q = new URLSearchParams();
    if (params.page) q.set('page', params.page);
    if (params.limit) q.set('limit', params.limit);
    if (params.status) q.set('status', params.status);
    if (params.search) q.set('search', params.search);
    if (params.template) q.set('template', params.template);
    const qs = q.toString();
    return this._request(`/api/logs${qs ? `?${qs}` : ''}`, { method: 'GET' });
  }
  async getStats() { return this._request('/api/stats', { method: 'GET' }); }
  async getStatus(trackingId) {
    if (!trackingId) throw new DaklyValidationError('trackingId is required.');
    return this._request(`/api/status/${encodeURIComponent(trackingId)}`, { method: 'GET' });
  }
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = Dakly;
  module.exports.Dakly = Dakly;
  module.exports.DaklyError = DaklyError;
  module.exports.DaklyAuthenticationError = DaklyAuthenticationError;
  module.exports.DaklyRateLimitError = DaklyRateLimitError;
  module.exports.DaklySuppressedError = DaklySuppressedError;
  module.exports.DaklyValidationError = DaklyValidationError;
}
