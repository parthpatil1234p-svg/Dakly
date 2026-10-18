const crypto = require('crypto');

// Algorithm: AES-256-GCM (Authenticated Encryption)
const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16; // 16 bytes for AES

/**
 * Get the 32-byte master encryption key from environment variable
 */
function getMasterKey() {
  const hexKey = process.env.ENCRYPTION_MASTER_KEY;
  if (!hexKey || hexKey.length !== 64) {
    throw new Error('ENCRYPTION_MASTER_KEY must be set in .env and must be exactly 64 hex characters (32 bytes)');
  }
  return Buffer.from(hexKey, 'hex');
}

/**
 * Encrypts sensitive text (e.g., Google App Password)
 * @param {string} plainText
 * @returns {{ encryptedData: string, iv: string, authTag: string }}
 */
function encrypt(plainText) {
  if (!plainText) return null;
  const key = getMasterKey();
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

  let encrypted = cipher.update(plainText, 'utf8', 'hex');
  encrypted += cipher.final('hex');

  const authTag = cipher.getAuthTag().toString('hex');

  return {
    encryptedData: encrypted,
    iv: iv.toString('hex'),
    authTag: authTag,
  };
}

/**
 * Decrypts encrypted text back to original plain text
 * @param {string} encryptedData 
 * @param {string} ivHex 
 * @param {string} authTagHex 
 * @returns {string} Decrypted plain text
 */
function decrypt(encryptedData, ivHex, authTagHex) {
  if (!encryptedData || !ivHex || !authTagHex) return null;
  const key = getMasterKey();
  const iv = Buffer.from(ivHex, 'hex');
  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);

  decipher.setAuthTag(Buffer.from(authTagHex, 'hex'));

  let decrypted = decipher.update(encryptedData, 'hex', 'utf8');
  decrypted += decipher.final('utf8');

  return decrypted;
}

/**
 * Generates a cryptographically secure API key for a project
 * @param {string} prefix - e.g. 'gkey_live_'
 * @returns {string}
 */
function generateApiKey(prefix = 'gkey_live_') {
  return `${prefix}${crypto.randomBytes(24).toString('hex')}`;
}

/**
 * Generates a unique tracking ID for each email
 * @returns {string}
 */
function generateTrackingId() {
  return `msg_${Date.now()}_${crypto.randomBytes(6).toString('hex')}`;
}

module.exports = {
  encrypt,
  decrypt,
  generateApiKey,
  generateTrackingId,
};
