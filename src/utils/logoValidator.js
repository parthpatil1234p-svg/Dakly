/**
 * Logo Validator & Anti-Piracy Guard for Dakly
 * 
 * Rules Enforced:
 * 1. Single 1:1 Square Image Only (Banners strictly rejected)
 * 2. Magic-byte binary verification (Blocks disguised torrents, executables, archives, pirated media)
 * 3. File size capped at 1.5MB (Eliminates large pirate media storage abuse)
 * 4. SVG sanitization (Blocks XSS, script payloads, XML bombs)
 */

const MAX_LOGO_SIZE_BYTES = 1.5 * 1024 * 1024; // 1.5 MB

/**
 * Checks for known malicious / pirated / executable binary signatures
 */
function checkForDisallowedMagicBytes(buffer) {
  if (buffer.length < 4) return true;

  // DOS/Windows PE executable ('MZ')
  if (buffer[0] === 0x4d && buffer[1] === 0x5a) {
    throw new Error('Security Violation: Executable binaries (.exe/.dll) are strictly prohibited.');
  }

  // Linux ELF binary
  if (buffer[0] === 0x7f && buffer[1] === 0x45 && buffer[2] === 0x4c && buffer[3] === 0x46) {
    throw new Error('Security Violation: ELF executable binaries are strictly prohibited.');
  }

  // Torrent file ('d8:announce')
  if (buffer.toString('utf8', 0, 11).startsWith('d8:announce')) {
    throw new Error('Anti-Piracy Violation: BitTorrent metadata files are strictly prohibited.');
  }

  // Zip Archive / Office Doc / APK ('PK\x03\x04')
  if (buffer[0] === 0x50 && buffer[1] === 0x4b && buffer[2] === 0x03 && buffer[3] === 0x04) {
    throw new Error('Security Violation: Compressed archives (.zip/.apk) are not allowed as logos.');
  }

  // RAR Archive ('Rar!')
  if (buffer.toString('ascii', 0, 4) === 'Rar!') {
    throw new Error('Security Violation: RAR archives are not allowed as logos.');
  }

  // 7-Zip Archive ('7z\xBC\xAF\x27\x1C')
  if (buffer[0] === 0x37 && buffer[1] === 0x7a && buffer[2] === 0xbc && buffer[3] === 0xaf) {
    throw new Error('Security Violation: 7-Zip archives are not allowed as logos.');
  }

  // Matroska / MKV Video ('\x1A\x45\xDF\xA3')
  if (buffer[0] === 0x1a && buffer[1] === 0x45 && buffer[2] === 0xdf && buffer[3] === 0xa3) {
    throw new Error('Anti-Piracy Violation: Video files (.mkv) are strictly prohibited.');
  }

  // MP4 / QuickTime Video (ftyp container)
  if (buffer.length >= 12 && buffer.toString('ascii', 4, 8) === 'ftyp') {
    throw new Error('Anti-Piracy Violation: Video media (.mp4/.mov) is strictly prohibited.');
  }

  // AVI Video ('RIFF' ... 'AVI ')
  if (buffer.toString('ascii', 0, 4) === 'RIFF' && buffer.toString('ascii', 8, 12) === 'AVI ') {
    throw new Error('Anti-Piracy Violation: Video media (.avi) is strictly prohibited.');
  }

  return false;
}

/**
 * Extracts dimensions from PNG
 */
function getPngDimensions(buffer) {
  // PNG Signature: 89 50 4E 47 0D 0A 1A 0A
  const isPng =
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47 &&
    buffer[4] === 0x0d &&
    buffer[5] === 0x0a &&
    buffer[6] === 0x1a &&
    buffer[7] === 0x0a;

  if (!isPng) return null;

  if (buffer.length < 24) {
    throw new Error('Corrupted or truncated PNG file.');
  }

  const width = buffer.readUInt32BE(16);
  const height = buffer.readUInt32BE(20);

  return { width, height, contentType: 'image/png' };
}

/**
 * Extracts dimensions from JPEG
 */
function getJpegDimensions(buffer) {
  // JPEG SOI: FF D8
  if (buffer[0] !== 0xff || buffer[1] !== 0xd8) {
    return null;
  }

  let offset = 2;
  while (offset < buffer.length) {
    if (buffer[offset] !== 0xff) {
      offset++;
      continue;
    }

    const marker = buffer[offset + 1];

    // SOF markers (Start Of Frame): C0 to C3, C5 to C7, C9 to CB, CD to CF
    const isSof =
      (marker >= 0xc0 && marker <= 0xc3) ||
      (marker >= 0xc5 && marker <= 0xc7) ||
      (marker >= 0xc9 && marker <= 0xcb) ||
      (marker >= 0xcd && marker <= 0xcf);

    if (isSof) {
      if (offset + 8 > buffer.length) break;
      const height = buffer.readUInt16BE(offset + 5);
      const width = buffer.readUInt16BE(offset + 7);
      return { width, height, contentType: 'image/jpeg' };
    }

    // Skip marker length
    if (offset + 3 < buffer.length) {
      const length = buffer.readUInt16BE(offset + 2);
      offset += 2 + length;
    } else {
      break;
    }
  }

  return null;
}

/**
 * Extracts dimensions from WebP
 */
function getWebpDimensions(buffer) {
  if (buffer.toString('ascii', 0, 4) !== 'RIFF' || buffer.toString('ascii', 8, 12) !== 'WEBP') {
    return null;
  }

  const chunkType = buffer.toString('ascii', 12, 16);

  // VP8 (Lossy)
  if (chunkType === 'VP8 ' && buffer.length >= 30) {
    const width = buffer.readUInt16LE(26) & 0x3fff;
    const height = buffer.readUInt16LE(28) & 0x3fff;
    return { width, height, contentType: 'image/webp' };
  }

  // VP8L (Lossless)
  if (chunkType === 'VP8L' && buffer.length >= 25) {
    const b1 = buffer[21];
    const b2 = buffer[22];
    const b3 = buffer[23];
    const b4 = buffer[24];
    const width = 1 + (((b2 & 0x3f) << 8) | b1);
    const height = 1 + (((b4 & 0x0f) << 10) | (b3 << 2) | ((b2 & 0xc0) >> 6));
    return { width, height, contentType: 'image/webp' };
  }

  // VP8X (Extended)
  if (chunkType === 'VP8X' && buffer.length >= 30) {
    const width = 1 + buffer.readUIntLE(24, 3);
    const height = 1 + buffer.readUIntLE(27, 3);
    return { width, height, contentType: 'image/webp' };
  }

  return null;
}

/**
 * Extracts and sanitizes SVG
 */
function getSvgDimensions(buffer) {
  const text = buffer.toString('utf8', 0, Math.min(buffer.length, 4096)).trim();

  // Must contain an <svg tag
  if (!text.includes('<svg')) {
    return null;
  }

  const fullText = buffer.toString('utf8');

  // Anti-Malware check for SVG: block script tags, javascript: uris, external entities, event handlers
  if (
    /<script[\s>]/i.test(fullText) ||
    /javascript:/i.test(fullText) ||
    /<!ENTITY/i.test(fullText) ||
    /\bon\w+\s*=/i.test(fullText)
  ) {
    throw new Error('Security Violation: SVG contains prohibited executable scripts or event handlers.');
  }

  // Check viewBox first
  const viewBoxMatch = fullText.match(/viewBox=["']\s*[\d.-]+\s+[\d.-]+\s+([\d.-]+)\s+([\d.-]+)\s*["']/i);
  if (viewBoxMatch) {
    const width = parseFloat(viewBoxMatch[1]);
    const height = parseFloat(viewBoxMatch[2]);
    if (width > 0 && height > 0) {
      return { width, height, contentType: 'image/svg+xml' };
    }
  }

  // Check width & height attributes
  const widthMatch = fullText.match(/width=["'](\d+(?:\.\d+)?)(?:px)?["']/i);
  const heightMatch = fullText.match(/height=["'](\d+(?:\.\d+)?)(?:px)?["']/i);

  if (widthMatch && heightMatch) {
    const width = parseFloat(widthMatch[1]);
    const height = parseFloat(heightMatch[1]);
    return { width, height, contentType: 'image/svg+xml' };
  }

  // If square viewBox not found, treat as 100x100 square vector if valid
  return { width: 100, height: 100, contentType: 'image/svg+xml' };
}

/**
 * Validates brand logo buffer or base64 string
 * Enforces:
 * 1. Single 1:1 Square Aspect Ratio (Banners prohibited)
 * 2. Magic-byte authenticity
 * 3. 1.5MB Max Size limit
 * 
 * @param {Buffer|string} input - Buffer or Base64 data URI
 * @returns {{ valid: boolean, width: number, height: number, contentType: string, sizeBytes: number, dataUri: string }}
 */
function validateLogoImage(input) {
  if (!input) {
    throw new Error('Please provide an image file or base64 string.');
  }

  let buffer;
  let declaredMime = null;

  if (Buffer.isBuffer(input)) {
    buffer = input;
  } else if (typeof input === 'string') {
    // Check if it is a data URI
    const dataUriMatch = input.match(/^data:([^;]+);base64,(.+)$/);
    if (dataUriMatch) {
      declaredMime = dataUriMatch[1].toLowerCase();
      buffer = Buffer.from(dataUriMatch[2], 'base64');
    } else {
      buffer = Buffer.from(input, 'base64');
    }
  } else {
    throw new Error('Invalid logo payload format.');
  }

  // 1. File Size Verification (Max 1.5MB)
  if (buffer.length > MAX_LOGO_SIZE_BYTES) {
    const sizeMb = (buffer.length / (1024 * 1024)).toFixed(2);
    throw new Error(`File size too large (${sizeMb} MB). Brand logo cannot exceed 1.5 MB.`);
  }

  if (buffer.length < 16) {
    throw new Error('File is too small or corrupted.');
  }

  // 2. Anti-Piracy & Anti-Malware Magic Bytes Check
  checkForDisallowedMagicBytes(buffer);

  // 3. Inspect genuine image magic bytes
  const info =
    getPngDimensions(buffer) ||
    getJpegDimensions(buffer) ||
    getWebpDimensions(buffer) ||
    getSvgDimensions(buffer);

  if (!info) {
    throw new Error(
      'Invalid file format. Only legitimate PNG, JPEG, WebP, or clean SVG image files are allowed.'
    );
  }

  const { width, height, contentType } = info;

  // 4. Strict 1:1 Aspect Ratio (Square Only)
  // Banners, landscape, or vertical rectangles are strictly prohibited
  const ratio = width / height;
  const isSquare = ratio >= 0.93 && ratio <= 1.07; // Allow minor 5-7% rounding variance for sub-pixel icons

  if (!isSquare) {
    throw new Error(
      `Banner / Rectangular image rejected! Logo MUST be 1:1 square (width = height, e.g. 256x256, 512x512). Your image dimensions are ${width}x${height} (ratio ${ratio.toFixed(2)}:1).`
    );
  }

  const dataUri = `data:${contentType};base64,${buffer.toString('base64')}`;

  return {
    valid: true,
    width: Math.round(width),
    height: Math.round(height),
    contentType,
    sizeBytes: buffer.length,
    dataUri,
  };
}

module.exports = {
  validateLogoImage,
  MAX_LOGO_SIZE_BYTES,
};
