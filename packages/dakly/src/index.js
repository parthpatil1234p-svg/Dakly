/**
 * Dakly - Official Node.js & TypeScript SDK
 * The High-Performance Free Gmail Microservice for Developers
 * 
 * @license MIT
 * @copyright (c) 2026 Dakly Technologies
 */

'use strict';

/**
 * Custom Dakly Error Classes
 */
class DaklyError extends Error {
  constructor(message, options = {}) {
    super(message);
    this.name = this.constructor.name;
    this.statusCode = options.statusCode || 500;
    this.status = options.status || 'ERROR';
    this.trackingId = options.trackingId || null;
    this.details = options.details || null;
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    }
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

/**
 * Main Dakly Client Class
 */
class Dakly {
  /**
   * Initialize a new Dakly client instance
   * @param {string|object} apiKeyOrOptions - Dakly API Key string or options object
   * @param {string} [apiKeyOrOptions.apiKey] - Your Project API Key (e.g. "gkey_live_...")
   * @param {string} [apiKeyOrOptions.baseUrl] - Custom API endpoint (default: "https://dakly-engin.vercel.app")
   * @param {number} [apiKeyOrOptions.timeout] - Request timeout in ms (default: 15000)
   * @param {boolean} [apiKeyOrOptions.throwOnSuppressed] - Whether to throw DaklySuppressedError (default: true)
   */
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

    if (!this.apiKey) {
      // We allow lazy initialization, but will throw on first request if still missing
    }
  }

  /**
   * Internal HTTP Request Helper
   * Uses native global fetch (Node 18+, Bun, Deno, Edge, Browser)
   * @private
   */
  async _request(path, options = {}) {
    if (!this.apiKey) {
      throw new DaklyAuthenticationError(
        'Dakly API Key is required. Pass it to `new Dakly("gkey_live_...")` or set the `DAKLY_API_KEY` environment variable.'
      );
    }

    const url = `${this.baseUrl}${path.startsWith('/') ? '' : '/'}${path}`;
    const method = options.method || 'GET';
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

    // Abort controller for timeout
    let controller;
    let timer;
    if (typeof AbortController !== 'undefined' && this.timeout > 0) {
      controller = new AbortController();
      timer = setTimeout(() => controller.abort(), this.timeout);
    }

    try {
      const response = await fetch(url, {
        method,
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
        try {
          data = JSON.parse(text);
        } catch {
          data = { message: text };
        }
      }

      // Handle HTTP Error codes
      if (!response.ok) {
        const errorMessage = data?.error || data?.message || `HTTP ${response.status} ${response.statusText}`;
        if (response.status === 401 || response.status === 403) {
          throw new DaklyAuthenticationError(errorMessage, { statusCode: response.status, details: data });
        }
        if (response.status === 429) {
          throw new DaklyRateLimitError(errorMessage, { statusCode: 429, details: data });
        }
        if (response.status === 400) {
          throw new DaklyValidationError(errorMessage, { statusCode: 400, details: data });
        }
        throw new DaklyError(errorMessage, { statusCode: response.status, details: data });
      }

      // Check for Dakly Suppression block (which returns 200 with status: 'BLOCKED_SUPPRESSED')
      if (data?.status === 'BLOCKED_SUPPRESSED') {
        if (this.throwOnSuppressed) {
          throw new DaklySuppressedError(data.error || 'Recipient suppressed due to hard bounce.', {
            trackingId: data.trackingId,
            reason: data.reason,
            details: data,
          });
        }
      }

      return data;
    } catch (err) {
      if (timer) clearTimeout(timer);

      if (err.name === 'AbortError') {
        throw new DaklyError(`Request timed out after ${this.timeout}ms connecting to Dakly (${url}).`, {
          statusCode: 408,
          status: 'TIMEOUT',
        });
      }
      if (err instanceof DaklyError) {
        throw err;
      }
      throw new DaklyError(`Dakly Network Request Failed: ${err.message}`, {
        statusCode: 500,
        status: 'NETWORK_ERROR',
        details: err,
      });
    }
  }

  /**
   * Send an email (Custom HTML, Plaintext, OTP, or Template)
   * 
   * @param {object} options
   * @param {string} options.to - Recipient email address
   * @param {string} [options.subject] - Email subject line
   * @param {string} [options.html] - HTML content
   * @param {string} [options.text] - Plain text fallback
   * @param {string} [options.otp] - Quick 4-8 digit OTP code
   * @param {string} [options.template] - Pre-built template name ('otp', 'welcome', 'password_reset', 'notes', 'invoice')
   * @param {object} [options.vars] - Dynamic variables to inject into template
   * @param {Array<object>} [options.attachments] - Array of attachments ({ filename, path|content, contentType })
   * @returns {Promise<{ success: boolean, trackingId: string, status: string, messageId?: string, executionTimeMs?: number }>}
   */
  async send(options) {
    if (!options || typeof options !== 'object') {
      throw new DaklyValidationError('Options object is required for dakly.send().');
    }
    if (!options.to || typeof options.to !== 'string') {
      throw new DaklyValidationError('Recipient email address ("to") is required.');
    }

    const payload = {
      to: options.to.trim().toLowerCase(),
      subject: options.subject,
      html: options.html,
      text: options.text,
      otp: options.otp,
      template: options.template,
      vars: options.vars,
      attachments: options.attachments,
    };

    return this._request('/api/send', {
      method: 'POST',
      body: payload,
    });
  }

  /**
   * Send a high-priority OTP code with modern security card UI
   * 
   * @param {object|string} optionsOrTo - Options object or recipient email
   * @param {string} [codeIfPositional] - OTP code if first argument was email string
   * @param {string} [appNameIfPositional] - App name if using positional arguments
   * @returns {Promise<object>} Delivery result
   * 
   * @example
   * await dakly.sendOtp({ to: 'user@gmail.com', code: '849201', appName: 'MySaaS', expiresInMinutes: 10 });
   * // or positional:
   * await dakly.sendOtp('user@gmail.com', '849201', 'MySaaS');
   */
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
      throw new DaklyValidationError('Recipient email ("to") and verification code ("code") are required.');
    }

    if (!to) throw new DaklyValidationError('Recipient email ("to") is required.');
    if (!code) throw new DaklyValidationError('Verification code ("code") is required.');

    return this.send({
      to,
      subject: subject || `${code} is your ${appName} verification code`,
      template: 'otp',
      vars: {
        otp: String(code),
        appName,
        validity,
      },
    });
  }

  /**
   * Send a dynamic pre-built template email
   * 
   * @param {object} options
   * @param {string} options.to - Recipient email
   * @param {string} options.template - 'otp' | 'welcome' | 'password_reset' | 'notes' | 'invoice'
   * @param {object} options.vars - Variables object for the template
   * @param {string} [options.subject] - Optional custom subject override
   * @param {Array} [options.attachments] - Optional attachments
   * @returns {Promise<object>}
   */
  async sendTemplate(options) {
    if (!options || typeof options !== 'object') {
      throw new DaklyValidationError('Options object is required for dakly.sendTemplate().');
    }
    if (!options.to) throw new DaklyValidationError('Recipient email ("to") is required.');
    if (!options.template) throw new DaklyValidationError('Template identifier ("template") is required.');

    return this.send({
      to: options.to,
      template: options.template,
      vars: options.vars || {},
      subject: options.subject,
      attachments: options.attachments,
    });
  }

  /**
   * Send a Welcome / Onboarding Email
   * 
   * @param {object} options
   * @param {string} options.to - Recipient email
   * @param {string} [options.name] - User full name or first name
   * @param {string} [options.appName] - Product / Company name
   * @param {string} [options.loginUrl] - Direct dashboard / login link
   * @param {string} [options.supportEmail] - Support or help email
   * @param {string} [options.subject] - Optional custom subject
   * @returns {Promise<object>}
   */
  async sendWelcome(options) {
    if (!options?.to) throw new DaklyValidationError('Recipient email ("to") is required.');
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

  /**
   * Send a Password Reset Link Email
   * 
   * @param {object} options
   * @param {string} options.to - Recipient email
   * @param {string} options.resetUrl - Secure password reset URL with token
   * @param {string} [options.name] - User name
   * @param {number|string} [options.expiresInMinutes] - Expiry in minutes (default: 15)
   * @param {string} [options.subject] - Optional custom subject
   * @returns {Promise<object>}
   */
  async sendPasswordReset(options) {
    if (!options?.to) throw new DaklyValidationError('Recipient email ("to") is required.');
    if (!options?.resetUrl) throw new DaklyValidationError('Password reset link ("resetUrl") is required.');

    const validity = options.validity || (options.expiresInMinutes ? `${options.expiresInMinutes} minutes` : '15 minutes');

    return this.sendTemplate({
      to: options.to,
      template: 'password_reset',
      subject: options.subject,
      vars: {
        name: options.name || 'there',
        resetUrl: options.resetUrl,
        validity,
      },
    });
  }

  /**
   * Send a College Notes / Document Delivery Email with attachments
   * 
   * @param {object} options
   * @param {string} options.to - Student / recipient email
   * @param {string} options.subjectName - Course/Subject name (e.g. "Computer Networks")
   * @param {string} options.notesTitle - Title of the notes (e.g. "Unit 3 - TCP Congestion")
   * @param {string} [options.downloadUrl] - Cloud download or view link
   * @param {string} [options.studentName] - Student name
   * @param {string} [options.examNotice] - Important exam or quiz notice
   * @param {string} [options.professorName] - Instructor or department name
   * @param {Array} [options.attachments] - Array of PDF attachments
   * @returns {Promise<object>}
   */
  async sendNotes(options) {
    if (!options?.to) throw new DaklyValidationError('Recipient email ("to") is required.');
    if (!options?.subjectName) throw new DaklyValidationError('Subject name ("subjectName") is required.');
    if (!options?.notesTitle) throw new DaklyValidationError('Notes title ("notesTitle") is required.');

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
        examNotice: options.examNotice || 'Mid-term examinations start next week. Please review all units carefully.',
        professorName: options.professorName || 'Department Faculty',
      },
    });
  }

  /**
   * Send a Professional Invoice / Receipt Email
   * 
   * @param {object} options
   * @param {string} options.to - Client email
   * @param {string} options.invoiceNumber - Invoice number (e.g. "INV-2026-0042")
   * @param {string} options.amount - Total amount with currency (e.g. "$149.00" or "₹1,250")
   * @param {string} [options.dueDate] - Payment due date
   * @param {string} [options.downloadUrl] - PDF download link
   * @param {string} [options.clientName] - Client or business name
   * @param {string} [options.itemsSummary] - Items line summary
   * @param {Array} [options.attachments] - Optional invoice PDF attachment
   * @returns {Promise<object>}
   */
  async sendInvoice(options) {
    if (!options?.to) throw new DaklyValidationError('Recipient email ("to") is required.');
    if (!options?.invoiceNumber) throw new DaklyValidationError('Invoice number ("invoiceNumber") is required.');
    if (!options?.amount) throw new DaklyValidationError('Invoice amount ("amount") is required.');

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

  /**
   * Ping the Dakly service & test API Key credentials
   * Returns current project name, sender health, and quota status
   * 
   * @returns {Promise<{ success: boolean, project: string, capacity: object, activeSenders: Array }>}
   */
  async ping() {
    return this._request('/api/ping', { method: 'GET' });
  }

  /**
   * Fetch list of available pre-built email templates
   * 
   * @returns {Promise<{ success: boolean, total: number, templates: Array }>}
   */
  async getTemplates() {
    return this._request('/api/templates', { method: 'GET' });
  }

  /**
   * Query delivery audit logs with filters and pagination
   * 
   * @param {object} [params]
   * @param {number} [params.page=1] - Page number
   * @param {number} [params.limit=20] - Logs per page (max 100)
   * @param {string} [params.status] - 'DELIVERED' | 'FAILED' | 'BLOCKED_SUPPRESSED'
   * @param {string} [params.search] - Search by recipient or subject
   * @param {string} [params.template] - Filter by template name
   * @returns {Promise<{ success: boolean, logs: Array, pagination: object }>}
   */
  async getLogs(params = {}) {
    const query = new URLSearchParams();
    if (params.page) query.set('page', params.page);
    if (params.limit) query.set('limit', params.limit);
    if (params.status) query.set('status', params.status);
    if (params.search) query.set('search', params.search);
    if (params.template) query.set('template', params.template);

    const queryString = query.toString();
    return this._request(`/api/logs${queryString ? `?${queryString}` : ''}`, { method: 'GET' });
  }

  /**
   * Fetch real-time analytics, quota stats, open & click rates
   * 
   * @returns {Promise<{ success: boolean, stats: object }>}
   */
  async getStats() {
    return this._request('/api/stats', { method: 'GET' });
  }

  /**
   * Fetch public delivery status of an email by trackingId
   * 
   * @param {string} trackingId - Tracking identifier (e.g. "tr_...")
   * @returns {Promise<{ success: boolean, log: object }>}
   */
  async getStatus(trackingId) {
    if (!trackingId || typeof trackingId !== 'string') {
      throw new DaklyValidationError('Valid trackingId string is required.');
    }
    return this._request(`/api/status/${encodeURIComponent(trackingId.trim())}`, { method: 'GET' });
  }
}

// Named exports and CommonJS compatibility
module.exports = Dakly;
module.exports.Dakly = Dakly;
module.exports.DaklyError = DaklyError;
module.exports.DaklyAuthenticationError = DaklyAuthenticationError;
module.exports.DaklyRateLimitError = DaklyRateLimitError;
module.exports.DaklySuppressedError = DaklySuppressedError;
module.exports.DaklyValidationError = DaklyValidationError;
module.exports.default = Dakly;
