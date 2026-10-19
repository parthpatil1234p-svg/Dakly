const Project = require('../models/Project');

/**
 * Middleware to authenticate requests using x-api-key header or query param
 * Loads all encrypted credentials needed for email dispatching
 */
async function authenticateApiKey(req, res, next) {
  const apiKey = req.headers['x-api-key'] || req.query.apiKey;

  if (!apiKey) {
    return res.status(401).json({
      success: false,
      error: 'API Key is missing. Pass your project key in the "x-api-key" header.',
    });
  }

  try {
    // Select encryptedPassword, iv, authTag for both legacy and multi-sender pool
    const project = await Project.findOne({ apiKey, isActive: true }).select(
      '+encryptedPassword +iv +authTag +senders.encryptedPassword +senders.iv +senders.authTag'
    );

    if (!project) {
      return res.status(401).json({
        success: false,
        error: 'Invalid or inactive API Key. Please verify your project credentials.',
      });
    }

    req.project = project;

    // Asynchronously log inbound activity timestamp & caller IP without blocking request
    const clientIp = req.headers['x-forwarded-for']?.split(',')[0].trim() || req.socket.remoteAddress || 'unknown';
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
  const apiKey = req.headers['x-api-key'] || req.query.apiKey;
  if (!apiKey) {
    req.project = null;
    return next();
  }
  try {
    const project = await Project.findOne({ apiKey, isActive: true });
    req.project = project || null;
  } catch {
    req.project = null;
  }
  next();
}

authenticateApiKey.optional = optionalApiKey;

module.exports = authenticateApiKey;
