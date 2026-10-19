/**
 * SSRF Protection Utility for Dakly
 * Validates external URLs before fetching to prevent Server-Side Request Forgery.
 */

const BLOCKED_HOSTS = new Set([
  'localhost',
  '127.0.0.1',
  '0.0.0.0',
  '169.254.169.254',
  'metadata.google.internal',
  'instance-data',
  '::1',
  '[::1]',
]);

/**
 * Checks whether an IPv4 address is within private, loopback, or link-local ranges.
 * @param {string} ip
 * @returns {boolean}
 */
function isPrivateIp(ip) {
  const parts = ip.split('.').map(Number);
  if (parts.length !== 4 || parts.some((p) => isNaN(p) || p < 0 || p > 255)) {
    return true; // Malformed IP is treated as unsafe
  }

  const [o1, o2] = parts;
  if (o1 === 127) return true; // Loopback
  if (o1 === 10) return true; // 10.0.0.0/8
  if (o1 === 172 && o2 >= 16 && o2 <= 31) return true; // 172.16.0.0/12
  if (o1 === 192 && o2 === 168) return true; // 192.168.0.0/16
  if (o1 === 169 && o2 === 254) return true; // 169.254.0.0/16 Link-local / Cloud metadata
  if (o1 === 0) return true; // 0.0.0.0/8

  return false;
}

/**
 * Determines whether a URL is safe to fetch from the server.
 * Disallows non-HTTP(S) schemes, localhost, private IP ranges, and cloud metadata endpoints.
 * @param {string} urlStr
 * @returns {boolean}
 */
function isSafeRemoteUrl(urlStr) {
  if (!urlStr || typeof urlStr !== 'string') return false;

  try {
    const parsed = new URL(urlStr);

    // Strictly enforce HTTP/HTTPS
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return false;
    }

    const hostname = parsed.hostname.toLowerCase().trim();
    if (!hostname) return false;

    // Check against known blocked hostnames
    if (BLOCKED_HOSTS.has(hostname)) {
      return false;
    }

    // Block private/internal domains
    if (
      hostname.endsWith('.localhost') ||
      hostname.endsWith('.local') ||
      hostname.endsWith('.internal') ||
      hostname.endsWith('.corp') ||
      hostname.endsWith('.home')
    ) {
      return false;
    }

    // If hostname is an IPv4 address, check if it's private
    const isIpv4 = /^(\d{1,3}\.){3}\d{1,3}$/.test(hostname);
    if (isIpv4 && isPrivateIp(hostname)) {
      return false;
    }

    return true;
  } catch {
    return false;
  }
}

module.exports = {
  isSafeRemoteUrl,
  isPrivateIp,
};
