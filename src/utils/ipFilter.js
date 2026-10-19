/**
 * IP Filter Utility for Dakly IP Whitelisting
 * Supports:
 * - Exact IPv4 & IPv6 matching
 * - Localhost alias matching (127.0.0.1, ::1, localhost)
 * - Wildcard subnet patterns (e.g., 192.168.1.*, 10.0.*.*)
 * - CIDR subnet ranges (e.g., 192.168.1.0/24, 10.0.0.0/8, 0.0.0.0/0)
 */

/**
 * Normalizes an IP string by stripping IPv6-mapped prefixes and mapping local loopbacks.
 * @param {string} ip
 * @returns {string}
 */
function normalizeIp(ip) {
  if (!ip || typeof ip !== 'string') return '';
  let clean = ip.trim();

  // Strip IPv4-mapped IPv6 prefix (::ffff:127.0.0.1 -> 127.0.0.1)
  if (clean.startsWith('::ffff:')) {
    clean = clean.replace('::ffff:', '');
  }

  // Normalize IPv6 localhost to IPv4 localhost
  if (clean === '::1' || clean.toLowerCase() === 'localhost') {
    clean = '127.0.0.1';
  }

  return clean;
}

/**
 * Converts an IPv4 string into a 32-bit unsigned integer.
 * @param {string} ip
 * @returns {number|null}
 */
function ipv4ToLong(ip) {
  const parts = ip.split('.').map(Number);
  if (parts.length !== 4 || parts.some((p) => isNaN(p) || p < 0 || p > 255)) {
    return null;
  }
  return ((parts[0] << 24) | (parts[1] << 16) | (parts[2] << 8) | parts[3]) >>> 0;
}

/**
 * Checks if an IPv4 address is contained within a CIDR subnet range.
 * @param {string} ip
 * @param {string} cidr - e.g. "192.168.1.0/24"
 * @returns {boolean}
 */
function matchCidr(ip, cidr) {
  if (!cidr || !cidr.includes('/')) return false;
  const [range, bitsStr] = cidr.split('/');
  const bits = parseInt(bitsStr, 10);
  if (isNaN(bits) || bits < 0 || bits > 32) return false;

  const ipLong = ipv4ToLong(ip);
  const rangeLong = ipv4ToLong(range.trim());
  if (ipLong === null || rangeLong === null) return false;

  if (bits === 0) return true; // 0.0.0.0/0 matches everything
  const mask = bits === 32 ? 0xffffffff : ((0xffffffff << (32 - bits)) >>> 0);
  return (ipLong & mask) === (rangeLong & mask);
}

/**
 * Checks if an IP matches a wildcard pattern (e.g. "192.168.1.*")
 * @param {string} ip
 * @param {string} pattern
 * @returns {boolean}
 */
function matchWildcard(ip, pattern) {
  if (!pattern || typeof pattern !== 'string' || !pattern.includes('*')) return false;
  const escaped = pattern.replace(/[.+?^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*');
  try {
    const regex = new RegExp('^' + escaped + '$');
    return regex.test(ip);
  } catch {
    return false;
  }
}

/**
 * Evaluates whether a client IP is authorized against a whitelist array.
 * If whitelist is empty, returns true (open access by default).
 * @param {string} clientIp
 * @param {string[]} whitelist
 * @returns {boolean}
 */
function isIpAllowed(clientIp, whitelist) {
  if (!whitelist || !Array.isArray(whitelist) || whitelist.length === 0) {
    return true; // No restrictions
  }

  const normalizedClient = normalizeIp(clientIp);
  if (!normalizedClient) return false;

  for (const rawEntry of whitelist) {
    if (!rawEntry || typeof rawEntry !== 'string') continue;
    const entry = rawEntry.trim();
    if (!entry) continue;

    // Universal allow-all rules
    if (entry === '*' || entry === '0.0.0.0/0') {
      return true;
    }

    const normalizedEntry = normalizeIp(entry);

    // Exact match (including localhost aliases)
    if (normalizedClient === normalizedEntry) {
      return true;
    }

    // CIDR range match
    if (entry.includes('/') && matchCidr(normalizedClient, entry)) {
      return true;
    }

    // Wildcard match
    if (entry.includes('*') && matchWildcard(normalizedClient, entry)) {
      return true;
    }
  }

  return false;
}

/**
 * Extracts and normalizes the client IP address from Express request headers.
 * Safely inspects x-forwarded-for (first proxy hop), x-real-ip, req.ip, and socket.
 * @param {object} req - Express request object
 * @returns {string}
 */
function extractClientIp(req) {
  if (!req) return '127.0.0.1';

  const forwarded = req.headers ? req.headers['x-forwarded-for'] : null;
  if (forwarded && typeof forwarded === 'string') {
    const firstHop = forwarded.split(',')[0].trim();
    if (firstHop) return normalizeIp(firstHop);
  }

  const realIp = req.headers ? req.headers['x-real-ip'] : null;
  if (realIp && typeof realIp === 'string') {
    const cleanReal = realIp.trim();
    if (cleanReal) return normalizeIp(cleanReal);
  }

  if (req.ip && typeof req.ip === 'string') {
    return normalizeIp(req.ip);
  }

  if (req.socket && req.socket.remoteAddress) {
    return normalizeIp(req.socket.remoteAddress);
  }

  return '127.0.0.1';
}

module.exports = {
  normalizeIp,
  ipv4ToLong,
  matchCidr,
  matchWildcard,
  isIpAllowed,
  extractClientIp,
};
