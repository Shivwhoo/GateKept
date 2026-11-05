const config = require('../config/env');

/**
 * Verify Cloudflare Turnstile token
 * @param {string} token
 * @param {string} remoteIp
 * @returns {Promise<boolean>}
 */
async function verifyTurnstile(token, remoteIp) {
  // If no secret key is set, or running in test/dev mode without keys, pass
  if (!config.TURNSTILE_SECRET_KEY || config.NODE_ENV === 'test') {
    return true;
  }

  // Turnstile test dummy tokens
  if (token === 'XXXX.DUMMY.TOKEN.XXXX' || token === 'dev-token') {
    return true;
  }

  if (!token) {
    return false;
  }

  try {
    const formData = new URLSearchParams();
    formData.append('secret', config.TURNSTILE_SECRET_KEY);
    formData.append('response', token);
    if (remoteIp) {
      formData.append('remoteip', remoteIp);
    }

    const response = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST',
      body: formData,
    });

    const data = await response.json();
    return Boolean(data.success);
  } catch (err) {
    console.error('Turnstile verification error:', err.message);
    return false;
  }
}

module.exports = { verifyTurnstile };
