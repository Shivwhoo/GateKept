const crypto = require('crypto');

/**
 * Generates a random 4-digit numeric collection code (0000-9999)
 * @returns {string}
 */
function generateCollectionCode() {
  const num = crypto.randomInt(0, 10000);
  return num.toString().padStart(4, '0');
}

/**
 * Generates a 6-digit numeric OTP for email verification (100000-999999)
 * @returns {string}
 */
function generateOtp() {
  const num = crypto.randomInt(100000, 1000000);
  return num.toString();
}

module.exports = {
  generateCollectionCode,
  generateOtp,
};
