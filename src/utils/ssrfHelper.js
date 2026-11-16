/**
 * SSRF Protection Utility for Dakly
 * Validates external URLs before fetching to prevent Server-Side Request Forgery.
 * 
 * @license MIT
 */

'use strict';

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
  return new URL(urlStr.trim()).href;
}

module.exports = {
  isSafeRemoteUrl,
  isPrivateIp,
  assertSafeRemoteUrl,
  BLOCKED_HOSTS,
};
