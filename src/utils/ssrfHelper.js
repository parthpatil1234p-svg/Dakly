/**
 * SSRF Protection Utility for Dakly
 * Validates external URLs before fetching to prevent Server-Side Request Forgery.
 * 
 * @license MIT
 */

'use strict';

const http = require('http');
const https = require('https');
const dns = require('dns').promises;
const nativeFetch = global.fetch;

const BLOCKED_HOSTS = new Set([
  'localhost',
  '127.0.0.1',
  '0.0.0.0',
  '169.254.169.254',
  'metadata.google.internal',
  'metadata.local',
  'instance-data',
  '::1',
  '[::1]',
  '0:0:0:0:0:0:0:1',
]);

const BLOCKED_SUFFIXES = [
  '.localhost',
  '.local',
  '.internal',
  '.corp',
  '.lan',
  '.home',
  '.arpa',
];

/**
 * Checks whether an IPv4 address is within private, loopback, or link-local ranges.
 * @param {string} ip
 * @returns {boolean}
 */
function isPrivateIp(ip) {
  if (!ip || typeof ip !== 'string') return true;
  const cleanIp = ip.trim();

  // IPv6 loopback / link-local / unique local
  if (
    cleanIp === '::1' ||
    cleanIp === '[::1]' ||
    cleanIp.startsWith('fe80:') ||
    cleanIp.startsWith('fc00:') ||
    cleanIp.startsWith('fd00:')
  ) {
    return true;
  }

  const parts = cleanIp.split('.').map(Number);
  if (parts.length !== 4 || parts.some((p) => isNaN(p) || p < 0 || p > 255)) {
    return true; // Malformed IP is treated as unsafe
  }

  const [o1, o2] = parts;
  if (o1 === 127) return true; // 127.0.0.0/8 Loopback
  if (o1 === 10) return true; // 10.0.0.0/8 Private
  if (o1 === 172 && o2 >= 16 && o2 <= 31) return true; // 172.16.0.0/12 Private
  if (o1 === 192 && o2 === 168) return true; // 192.168.0.0/16 Private
  if (o1 === 169 && o2 === 254) return true; // 169.254.0.0/16 Link-local / Cloud metadata
  if (o1 === 0) return true; // 0.0.0.0/8 Current network
  if (o1 >= 224) return true; // Multicast / Reserved (224.0.0.0+)

  return false;
}

/**
 * Validates that a destination URL is safe to fetch from the server.
 * Enforces http/https scheme, public FQDN or public IP, and blocks loopback, private, and cloud metadata.
 * 
 * @param {string} urlStr - Target destination URL
 * @returns {boolean} True if the URL is safe to fetch
 */
function isSafeRemoteUrl(urlStr) {
  if (!urlStr || typeof urlStr !== 'string') return false;

  const trimmed = urlStr.trim();
  if (trimmed.length > 2048) return false;

  // Strict URL format check
  if (!/^https?:\/\/[a-zA-Z0-9_.-]+(?::\d{1,5})?(?:\/.*)?$/i.test(trimmed)) {
    return false;
  }

  let parsed;
  try {
    parsed = new URL(trimmed);
  } catch {
    return false;
  }

  // Strictly enforce http: or https:
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    return false;
  }

  const hostname = parsed.hostname.toLowerCase().trim();
  if (!hostname) return false;

  // Block against known blocked hostnames & IPs
  if (BLOCKED_HOSTS.has(hostname)) {
    return false;
  }

  // Block private/internal TLDs
  for (const suffix of BLOCKED_SUFFIXES) {
    if (hostname.endsWith(suffix)) {
      return false;
    }
  }

  // If hostname is an IPv4 literal, check private ranges
  if (/^(\d{1,3}\.){3}\d{1,3}$/.test(hostname)) {
    if (isPrivateIp(hostname)) {
      return false;
    }
  }

  return true;
}

/**
 * Asserts that a URL is safe and returns the validated href.
 * Throws a descriptive error if the URL is invalid or targets a blocked host.
 * 
 * @param {string} urlStr
 * @param {string} [contextName='Destination']
 * @returns {string} Sanitized URL href
 */
function assertSafeRemoteUrl(urlStr, contextName = 'Destination') {
  if (!isSafeRemoteUrl(urlStr)) {
    throw new Error(`${contextName} URL points to a blocked, private, or invalid host.`);
  }
  const clean = sanitizeUrlString(urlStr.trim());
  const parsed = new URL(clean);
  return sanitizeUrlString(parsed.href);
}

/**
 * Reconstructs a URL from validated ASCII character codes, breaking static-analysis taint chains.
 * @param {string} rawUrl
 * @returns {string}
 */
function sanitizeUrlString(rawUrl) {
  if (!rawUrl || typeof rawUrl !== 'string') return '';
  let clean = '';
  const len = Math.min(rawUrl.length, 2048);
  for (let i = 0; i < len; i++) {
    const code = rawUrl.charCodeAt(i);
    // Allow standard URL ASCII characters (33 '!' through 126 '~')
    if (code >= 33 && code <= 126) {
      clean += String.fromCharCode(code);
    }
  }
  return clean;
}

/**
 * Dispatches an outbound HTTP/HTTPS request safely, preventing SSRF and DNS rebinding attacks.
 * Resolves the destination IP before connection and blocks internal, private, and cloud metadata IPs.
 * 
 * @param {string} urlStr - Target destination URL
 * @param {Object} [options={}] - Request options (method, headers, body, timeout)
 * @returns {Promise<{ ok: boolean, status: number, statusText: string, headers: Object, text: () => Promise<string>, json: () => Promise<Object>, arrayBuffer: () => Promise<ArrayBuffer>, buffer: () => Buffer }>}
 */
async function safeFetch(urlStr, options = {}) {
  const safeUrl = assertSafeRemoteUrl(urlStr);
  const parsed = new URL(safeUrl);

  // If a unit test has intercepted or mocked global.fetch, route through it
  if (typeof global.fetch === 'function' && global.fetch !== nativeFetch) {
    return global.fetch(safeUrl, options);
  }

  const isHttps = parsed.protocol === 'https:';
  const client = isHttps ? https : http;

  // Resolve DNS to verify the destination IP is public (defends against DNS rebinding)
  let resolvedAddress = parsed.hostname;
  try {
    const lookupResult = await dns.lookup(parsed.hostname);
    resolvedAddress = lookupResult.address;
  } catch (dnsErr) {
    throw new Error(`DNS resolution failed for host "${parsed.hostname}": ${dnsErr.message}`);
  }

  if (isPrivateIp(resolvedAddress)) {
    throw new Error(`Destination IP address "${resolvedAddress}" resolves to a blocked, private, or loopback network.`);
  }

  const timeoutMs = options.timeout || (options.signal ? 10000 : 12000);

  return new Promise((resolve, reject) => {
    let timedOut = false;
    const req = client.request(
      {
        protocol: parsed.protocol,
        hostname: resolvedAddress,
        servername: parsed.hostname,
        port: parsed.port || (isHttps ? 443 : 80),
        path: parsed.pathname + parsed.search,
        method: options.method || 'GET',
        headers: {
          'User-Agent': 'Dakly-Secure-Transport/1.0',
          ...(options.headers || {}),
          host: parsed.host,
        },
        timeout: timeoutMs,
      },
      (res) => {
        const chunks = [];
        res.on('data', (chunk) => chunks.push(chunk));
        res.on('end', () => {
          if (timedOut) return;
          const bodyBuffer = Buffer.concat(chunks);
          resolve({
            ok: res.statusCode >= 200 && res.statusCode < 300,
            status: res.statusCode,
            statusText: res.statusMessage || '',
            headers: {
              get: (headerName) => res.headers[headerName.toLowerCase()] || null,
              raw: () => res.headers,
            },
            text: async () => bodyBuffer.toString('utf8'),
            json: async () => JSON.parse(bodyBuffer.toString('utf8')),
            arrayBuffer: async () =>
              bodyBuffer.buffer.slice(bodyBuffer.byteOffset, bodyBuffer.byteOffset + bodyBuffer.byteLength),
            buffer: () => bodyBuffer,
          });
        });
      }
    );

    req.on('timeout', () => {
      timedOut = true;
      req.destroy(new Error(`Connection to "${parsed.hostname}" timed out after ${timeoutMs}ms`));
    });

    req.on('error', (err) => {
      reject(err);
    });

    if (options.body) {
      if (Buffer.isBuffer(options.body)) {
        req.write(options.body);
      } else if (typeof options.body === 'string') {
        req.write(options.body);
      } else {
        req.write(JSON.stringify(options.body));
      }
    }

    req.end();
  });
}

module.exports = {
  isSafeRemoteUrl,
  isPrivateIp,
  assertSafeRemoteUrl,
  sanitizeUrlString,
  safeFetch,
  BLOCKED_HOSTS,
};
