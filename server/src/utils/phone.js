/**
 * Normalizes phone numbers to standard 10-digit Indian mobile format or standard digits.
 * Strips whitespace, hyphens, parentheses, and leading '+91' or '0'.
 * @param {string} phone
 * @returns {string} 10-digit string or sanitized phone digits
 */
function normalizePhone(phone) {
  if (!phone || typeof phone !== 'string') return '';
  // Remove non-digit characters
  let cleaned = phone.replace(/\D/g, '');
  
  // If starts with 91 and has 12 digits, strip 91
  if (cleaned.length === 12 && cleaned.startsWith('91')) {
    cleaned = cleaned.substring(2);
  } else if (cleaned.length === 11 && cleaned.startsWith('0')) {
    cleaned = cleaned.substring(1);
  }
  
  return cleaned;
}

/**
 * Validates whether the phone number is a valid 10-digit mobile number
 * @param {string} phone
 * @returns {boolean}
 */
function isValidPhone(phone) {
  const normalized = normalizePhone(phone);
  return /^[6-9]\d{9}$/.test(normalized);
}

module.exports = {
  normalizePhone,
  isValidPhone,
};
    