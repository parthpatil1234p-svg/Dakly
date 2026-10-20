const {
  detectDeviceType,
  injectTrackingPixel,
  rewriteLinksForClickTracking,
  processEmailHtmlForTracking,
  TRANSPARENT_GIF_BUFFER,
} = require('../src/utils/trackingHelper');
const assert = require('assert');

// 1. Buffer check
assert.strictEqual(TRANSPARENT_GIF_BUFFER.length, 42);
assert.strictEqual(TRANSPARENT_GIF_BUFFER.toString('ascii', 0, 6), 'GIF89a');

// 2. Device detection
assert.strictEqual(detectDeviceType('Mozilla/5.0 (iPhone; CPU iPhone OS 16_5 like Mac OS X)'), 'MOBILE');
assert.strictEqual(detectDeviceType('Mozilla/5.0 (Linux; Android 13; SM-S901B)'), 'MOBILE');
assert.strictEqual(detectDeviceType('Mozilla/5.0 (Windows NT 10.0; Win64; x64)'), 'DESKTOP');
assert.strictEqual(detectDeviceType('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)'), 'DESKTOP');
assert.strictEqual(detectDeviceType('curl/7.68.0'), 'OTHER');

// 3. Pixel injection
const htmlWithBody = '<html><body><h1>Hello</h1></body></html>';
const injected = injectTrackingPixel(htmlWithBody, 'track_123', 'https://api.dakly.dev');
assert(injected.includes('src="https://api.dakly.dev/api/track/open/track_123.png"'));
assert(injected.includes('</body>'));

// 4. Link click rewriting
const htmlWithLinks = '<p>Check <a href="https://example.com/verify?token=abc">Verify</a> or <a href="https://google.com">Google</a></p>';
const rewritten = rewriteLinksForClickTracking(htmlWithLinks, 'track_123', 'https://api.dakly.dev');
assert(rewritten.includes('https://api.dakly.dev/api/track/click/track_123?url=' + encodeURIComponent('https://example.com/verify?token=abc')));
assert(rewritten.includes('https://api.dakly.dev/api/track/click/track_123?url=' + encodeURIComponent('https://google.com')));

// 5. Combined tracking
const fullProcess = processEmailHtmlForTracking(htmlWithLinks, 'track_999', 'https://api.dakly.dev');
assert(fullProcess.includes('/api/track/click/track_999'));
assert(fullProcess.includes('/api/track/open/track_999.png'));

// 6. Selective tracking options
const noClickTrack = processEmailHtmlForTracking(htmlWithLinks, 'track_100', 'https://api.dakly.dev', { trackClicks: false });
assert(!noClickTrack.includes('/api/track/click/'));
assert(noClickTrack.includes('href="https://example.com/verify?token=abc"'));
assert(noClickTrack.includes('/api/track/open/track_100.png'));

const noOpenTrack = processEmailHtmlForTracking(htmlWithLinks, 'track_101', 'https://api.dakly.dev', { trackOpens: false });
assert(noOpenTrack.includes('/api/track/click/track_101'));
assert(!noOpenTrack.includes('/api/track/open/'));

const noTracking = processEmailHtmlForTracking(htmlWithLinks, 'track_102', 'https://api.dakly.dev', { tracking: false });
assert(!noTracking.includes('/api/track/'));
assert(noTracking.includes('href="https://example.com/verify?token=abc"'));

console.log('✅ ALL TRACKING UNIT TESTS PASSED SUCCESSFULLY!');
