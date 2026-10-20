/**
 * Dakly Email Tracking & Analytics Helper
 * Provides 1x1 transparent open tracking pixel injection, link click rewriting,
 * and user-agent client/device detection.
 */

// 42-byte 1x1 transparent GIF binary buffer
const TRANSPARENT_GIF_BUFFER = Buffer.from(
  'R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7',
  'base64'
);

/**
 * Detects device category from user-agent string
 * @param {string} userAgent
 * @returns {'MOBILE' | 'DESKTOP' | 'OTHER'}
 */
function detectDeviceType(userAgent = '') {
  if (!userAgent || typeof userAgent !== 'string') return 'OTHER';
  const ua = userAgent.toLowerCase();

  // Mobile patterns
  if (
    ua.includes('mobile') ||
    ua.includes('android') ||
    ua.includes('iphone') ||
    ua.includes('ipad') ||
    ua.includes('ipod') ||
    ua.includes('blackberry') ||
    ua.includes('windows phone')
  ) {
    return 'MOBILE';
  }

  // Desktop patterns
  if (
    ua.includes('windows') ||
    ua.includes('macintosh') ||
    ua.includes('mac os x') ||
    ua.includes('linux') ||
    ua.includes('cros')
  ) {
    return 'DESKTOP';
  }

  return 'OTHER';
}

/**
 * Injects a 1x1 invisible open tracking pixel into HTML
 * @param {string} html - HTML email body
 * @param {string} trackingId - Unique delivery tracking ID
 * @param {string} baseUrl - Engine base URL (e.g. https://dakly-engin.vercel.app)
 * @returns {string} HTML with injected tracking pixel
 */
function injectTrackingPixel(html, trackingId, baseUrl = 'https://dakly-engin.vercel.app') {
  if (!html || !trackingId) return html;

  let cleanBase = String(baseUrl || 'https://dakly-engin.vercel.app').trim();
  while (cleanBase.endsWith('/')) {
    cleanBase = cleanBase.slice(0, -1);
  }
  const pixelUrl = `${cleanBase}/api/track/open/${trackingId}.png`;
  const pixelHtml = `<img src="${pixelUrl}" width="1" height="1" alt="" style="display:none!important;width:1px!important;height:1px!important;max-height:0!important;max-width:0!important;opacity:0!important;border:none!important;outline:none!important;mso-hide:all;" />`;

  if (html.includes('</body>')) {
    return html.replace('</body>', `${pixelHtml}</body>`);
  }

  return `${html}\n${pixelHtml}`;
}

/**
 * Rewrites http/https links to track clicks via Dakly redirect engine
 * @param {string} html - HTML email body
 * @param {string} trackingId - Unique delivery tracking ID
 * @param {string} baseUrl - Engine base URL
 * @returns {string} HTML with click tracking URLs
 */
function rewriteLinksForClickTracking(html, trackingId, baseUrl = 'https://dakly-engin.vercel.app') {
  if (!html || !trackingId) return html;

  let cleanBase = String(baseUrl || 'https://dakly-engin.vercel.app').trim();
  while (cleanBase.endsWith('/')) {
    cleanBase = cleanBase.slice(0, -1);
  }
  const trackingEndpointPrefix = `${cleanBase}/api/track/`;

  // Matches <a ... href="http..." ...>
  const linkRegex = /<a\b([^>]*?)\bhref=["'](https?:\/\/[^"'>]+)["']([^>]*)>/gi;

  return html.replace(linkRegex, (match, beforeHref, targetUrl, afterHref) => {
    // Avoid double-wrapping our own tracking links or internal anchors
    if (targetUrl.startsWith(trackingEndpointPrefix)) {
      return match;
    }

    const clickUrl = `${cleanBase}/api/track/click/${trackingId}?url=${encodeURIComponent(targetUrl)}`;
    return `<a${beforeHref}href="${clickUrl}"${afterHref}>`;
  });
}

/**
 * Processes full HTML email body to enable both Open & Click tracking
 * @param {string} html - Raw or template-compiled HTML
 * @param {string} trackingId - Message tracking ID
 * @param {string} baseUrl - API host URL
 * @param {Object} [options={}] - Optional tracking controls ({ trackClicks, trackOpens, tracking })
 * @returns {string} Fully instrumented HTML email
 */
function processEmailHtmlForTracking(html, trackingId, baseUrl, options = {}) {
  if (!html || typeof html !== 'string') return html;

  const shouldTrackClicks = options.trackClicks !== false && options.tracking !== false;
  const shouldTrackOpens = options.trackOpens !== false && options.tracking !== false;

  let instrumented = html;
  if (shouldTrackClicks) {
    instrumented = rewriteLinksForClickTracking(instrumented, trackingId, baseUrl);
  }
  if (shouldTrackOpens) {
    instrumented = injectTrackingPixel(instrumented, trackingId, baseUrl);
  }
  return instrumented;
}

module.exports = {
  TRANSPARENT_GIF_BUFFER,
  detectDeviceType,
  injectTrackingPixel,
  rewriteLinksForClickTracking,
  processEmailHtmlForTracking,
};
