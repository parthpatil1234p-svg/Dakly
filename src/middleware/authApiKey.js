const Project = require('../models/Project');
const { extractClientIp, isIpAllowed } = require('../utils/ipFilter');

/**
 * Middleware to authenticate requests using x-api-key header or query param
 * Loads all encrypted credentials needed for email dispatching
 */
async function authenticateApiKey(req, res, next) {
  const rawKey =
    req.headers['x-api-key'] ||
    (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')
      ? req.headers.authorization.slice(7)
      : null);

  if (!rawKey || typeof rawKey !== 'string') {
    return res.status(401).json({
      success: false,
      error: 'API Key is missing. Pass your project key in the "x-api-key" header.',
    });
  }

  const cleanApiKey = String(rawKey).trim();

  // Validate format to prevent NoSQL operator injection
  if (!/^gkey_[a-zA-Z0-9_-]+$/.test(cleanApiKey)) {
    return res.status(401).json({
      success: false,
      error: 'Invalid API Key format. Expected key starting with "gkey_".',
    });
  }

  try {
    // Select encryptedPassword, iv, authTag for both legacy and multi-sender pool
    const project = await Project.findOne({ apiKey: cleanApiKey, isActive: true }).select(
      '+encryptedPassword +iv +authTag +senders.encryptedPassword +senders.iv +senders.authTag'
    );

    if (!project) {
      return res.status(401).json({
        success: false,
        error: 'Invalid or inactive API Key. Please verify your project credentials.',
      });
    }

    const clientIp = extractClientIp(req);

    // IP Whitelist Security Enforcement
    if (project.ipWhitelistEnabled && project.ipWhitelist && project.ipWhitelist.length > 0) {
      if (!isIpAllowed(clientIp, project.ipWhitelist)) {
        return res.status(403).json({
          success: false,
          code: 'IP_NOT_WHITELISTED',
          error: `Access denied: Client IP (${clientIp}) is not permitted by this project's IP whitelist.`,
          clientIp,
        });
      }
    }

    req.project = project;

    // Asynchronously log inbound activity timestamp & caller IP without blocking request
    Project.updateOne(
      { _id: project._id },
      { $set: { lastApiCallAt: new Date(), lastClientIp: clientIp } }
    ).exec().catch(() => {});

    next();
  } catch (error) {
    console.error('Authentication Error:', error.message);
    res.status(500).json({
      success: false,
      error: 'Internal authentication error.',
    });
  }
}

async function optionalApiKey(req, res, next) {
  const rawKey =
    req.headers['x-api-key'] ||
    (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')
      ? req.headers.authorization.slice(7)
      : null);

  if (!rawKey || typeof rawKey !== 'string') {
    req.project = null;
    return next();
  }

  const cleanApiKey = String(rawKey).trim();
  if (!/^gkey_[a-zA-Z0-9_-]+$/.test(cleanApiKey)) {
    req.project = null;
    return next();
  }

  try {
    const project = await Project.findOne({ apiKey: cleanApiKey, isActive: true });
    req.project = project || null;
  } catch {
    req.project = null;
  }
  next();
}

authenticateApiKey.optional = optionalApiKey;

module.exports = authenticateApiKey;
