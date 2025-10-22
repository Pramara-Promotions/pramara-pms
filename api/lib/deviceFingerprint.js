// api/lib/deviceFingerprint.js
const crypto = require('crypto');

/**
 * Generate a device fingerprint from request headers
 * @param {Object} req - Express request object
 * @returns {string} - Device fingerprint hash
 */
function generateDeviceFingerprint(req) {
  const userAgent = req.headers['user-agent'] || '';
  const acceptLanguage = req.headers['accept-language'] || '';
  const acceptEncoding = req.headers['accept-encoding'] || '';
  
  // Combine identifiable characteristics
  const fingerprintData = `${userAgent}|${acceptLanguage}|${acceptEncoding}`;
  
  // Create hash
  return crypto.createHash('sha256').update(fingerprintData).digest('hex');
}

/**
 * Parse user agent to extract device info
 * @param {string} userAgent
 * @returns {Object} - Parsed device info
 */
function parseUserAgent(userAgent) {
  if (!userAgent) return { browser: 'Unknown', os: 'Unknown', device: 'Unknown' };
  
  let browser = 'Unknown';
  let os = 'Unknown';
  let device = 'Desktop';
  
  // Detect OS
  if (/Windows NT 10/.test(userAgent)) os = 'Windows 10';
  else if (/Windows NT/.test(userAgent)) os = 'Windows';
  else if (/Mac OS X/.test(userAgent)) os = 'macOS';
  else if (/Linux/.test(userAgent)) os = 'Linux';
  else if (/Android/.test(userAgent)) { os = 'Android'; device = 'Mobile'; }
  else if (/iPhone|iPad|iPod/.test(userAgent)) { os = 'iOS'; device = 'Mobile'; }
  
  // Detect Browser
  if (/Edg\//.test(userAgent)) browser = 'Edge';
  else if (/Chrome\//.test(userAgent)) browser = 'Chrome';
  else if (/Firefox\//.test(userAgent)) browser = 'Firefox';
  else if (/Safari\//.test(userAgent) && !/Chrome/.test(userAgent)) browser = 'Safari';
  
  return { browser, os, device };
}

/**
 * Get client IP address from request
 * @param {Object} req - Express request object
 * @returns {string} - IP address
 */
function getClientIP(req) {
  return req.headers['x-forwarded-for']?.split(',')[0].trim() ||
         req.headers['x-real-ip'] ||
         req.connection?.remoteAddress ||
         req.socket?.remoteAddress ||
         req.ip ||
         'unknown';
}

module.exports = {
  generateDeviceFingerprint,
  parseUserAgent,
  getClientIP
};
