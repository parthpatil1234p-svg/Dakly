/**
 * Attachment Helper for Dakly
 * Handles Remote URLs (S3, Firebase, Cloudinary), Base64 data, and file buffers
 * Enforces a strict 15MB size limit to prevent SMTP timeouts and memory exhaustion.
 */

const { isSafeRemoteUrl } = require('./ssrfHelper');

const MAX_SINGLE_FILE_SIZE = 15 * 1024 * 1024; // 15 MB
const MAX_TOTAL_ATTACHMENT_SIZE = 20 * 1024 * 1024; // 20 MB
const FETCH_TIMEOUT_MS = 12000; // 12 seconds

/**
 * Extracts a clean filename from a URL or fallback
 */
function extractFilenameFromUrl(urlStr, fallback = 'attachment.pdf') {
  try {
    const parsed = new URL(urlStr);
    const pathname = parsed.pathname;
    const base = pathname.split('/').filter(Boolean).pop();
    if (base && base.includes('.')) {
      return decodeURIComponent(base);
    }
  } catch {
    // ignore
  }
  return fallback;
}

/**
 * Normalizes and validates an array of attachments for Nodemailer
 * @param {Array<Object>} attachments
 * @returns {Promise<Array<Object>>} Formatted Nodemailer attachments
 */
async function processAttachments(attachments = []) {
  if (!Array.isArray(attachments) || attachments.length === 0) {
    return [];
  }

  const processed = [];
  let totalBytes = 0;

  for (let i = 0; i < attachments.length; i++) {
    const item = attachments[i];

    if (!item || typeof item !== 'object') {
      throw new Error(`Attachment at index ${i} is invalid. Expected an object.`);
    }

    let { filename, url, path, content, contentType, encoding } = item;

    // 1. Handle Remote URL (via url or path starting with http:// or https://)
    const remoteUrl = url || (typeof path === 'string' && /^https?:\/\//i.test(path) ? path : null);

    if (remoteUrl) {
      if (!isSafeRemoteUrl(remoteUrl)) {
        throw new Error(`Attachment "${filename || i}": URL is not allowed or points to an unsafe/private address.`);
      }

      filename = filename || extractFilenameFromUrl(remoteUrl, `attachment_${i + 1}.pdf`);

      let response;
      try {
        response = await fetch(remoteUrl, {
          signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
          headers: {
            'User-Agent': 'Dakly-Email-Engine/1.0',
          },
        });
      } catch (err) {
        throw new Error(`Failed to download attachment "${filename}" from URL: ${err.message}`);
      }

      if (!response.ok) {
        throw new Error(`Remote attachment "${filename}" returned HTTP ${response.status}: ${response.statusText}`);
      }

      // Check Content-Length header if available
      const contentLength = response.headers.get('content-length');
      if (contentLength && parseInt(contentLength, 10) > MAX_SINGLE_FILE_SIZE) {
        throw new Error(`Attachment "${filename}" exceeds the 15MB limit (${(parseInt(contentLength, 10) / (1024 * 1024)).toFixed(2)} MB).`);
      }

      const arrayBuf = await response.arrayBuffer();
      const buffer = Buffer.from(arrayBuf);

      if (buffer.length > MAX_SINGLE_FILE_SIZE) {
        throw new Error(`Attachment "${filename}" exceeds the 15MB limit (${(buffer.length / (1024 * 1024)).toFixed(2)} MB).`);
      }

      totalBytes += buffer.length;
      if (totalBytes > MAX_TOTAL_ATTACHMENT_SIZE) {
        throw new Error(`Total size of email attachments exceeds the 20MB limit.`);
      }

      const inferredType = contentType || response.headers.get('content-type') || 'application/octet-stream';

      processed.push({
        filename,
        content: buffer,
        contentType: inferredType,
      });

      continue;
    }

    // 2. Handle Base64 Data or Data URIs
    if (content) {
      filename = filename || `attachment_${i + 1}.pdf`;
      let buffer;

      if (typeof content === 'string') {
        // Handle Data URI e.g. "data:application/pdf;base64,JVBERi..."
        const dataUriMatch = content.match(/^data:([^;]+);base64,(.+)$/i);
        if (dataUriMatch) {
          contentType = contentType || dataUriMatch[1];
          const rawBase64 = dataUriMatch[2];
          buffer = Buffer.from(rawBase64, 'base64');
        } else if (encoding === 'base64' || /^[A-Za-z0-9+/=\r\n]+$/.test(content.slice(0, 100))) {
          // Plain base64 string
          buffer = Buffer.from(content, 'base64');
        } else {
          // Plain UTF-8 string content
          buffer = Buffer.from(content, 'utf-8');
        }
      } else if (Buffer.isBuffer(content)) {
        buffer = content;
      } else {
        throw new Error(`Attachment "${filename}": "content" must be a string or Buffer.`);
      }

      if (buffer.length > MAX_SINGLE_FILE_SIZE) {
        throw new Error(`Attachment "${filename}" exceeds the 15MB limit (${(buffer.length / (1024 * 1024)).toFixed(2)} MB).`);
      }

      totalBytes += buffer.length;
      if (totalBytes > MAX_TOTAL_ATTACHMENT_SIZE) {
        throw new Error(`Total size of email attachments exceeds the 20MB limit.`);
      }

      processed.push({
        filename,
        content: buffer,
        contentType: contentType || 'application/octet-stream',
      });

      continue;
    }

    // 3. Fallback: Local filesystem path (if provided as regular local path)
    if (path) {
      filename = filename || path.split(/[/\\]/).pop();
      processed.push({
        filename,
        path,
        contentType: contentType || undefined,
      });
      continue;
    }

    throw new Error(`Attachment at index ${i} must provide either "url", "content", or "path".`);
  }

  return processed;
}

module.exports = {
  processAttachments,
  MAX_SINGLE_FILE_SIZE,
  MAX_TOTAL_ATTACHMENT_SIZE,
};
