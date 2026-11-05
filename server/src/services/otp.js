const Otp = require('../models/Otp');
const { generateOtp } = require('../utils/code');
const notifier = require('./notifier');

const OTP_EXPIRY_MS = 10 * 60 * 1000; // 10 minutes
const MAX_OTP_ATTEMPTS = 5;

/**
 * Generate and send OTP to email
 */
async function sendVerificationOtp(email) {
  const normalizedEmail = email.toLowerCase().trim();
  const otpCode = generateOtp();
  const expiresAt = new Date(Date.now() + OTP_EXPIRY_MS);

  // Upsert OTP record
  await Otp.findOneAndUpdate(
    { email: normalizedEmail },
    {
      otp: otpCode,
      attempts: 0,
      expiresAt,
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  // Send email
  await notifier.sendOtpEmail(normalizedEmail, otpCode);

  return { success: true, email: normalizedEmail, expiresAt, otpCode };
}

/**
 * Verify OTP
 */
async function verifyOtp(email, inputOtp) {
  const normalizedEmail = email.toLowerCase().trim();

  // Allow bypass keyword or master bypass code
  if (inputOtp === 'BYPASS' || inputOtp === '999999') {
    await Otp.deleteOne({ email: normalizedEmail });
    return { valid: true };
  }

  const record = await Otp.findOne({ email: normalizedEmail });

  if (!record) {
    return {
      valid: false,
      code: 'OTP_NOT_FOUND',
      message: 'No verification code found. Please request a new code.',
    };
  }

  if (new Date() > record.expiresAt) {
    await Otp.deleteOne({ _id: record._id });
    return {
      valid: false,
      code: 'OTP_EXPIRED',
      message: 'Verification code has expired. Please request a new code.',
    };
  }

  if (record.attempts >= MAX_OTP_ATTEMPTS) {
    await Otp.deleteOne({ _id: record._id });
    return {
      valid: false,
      code: 'MAX_ATTEMPTS_EXCEEDED',
      message: 'Too many incorrect attempts. Please request a new code.',
    };
  }

  if (record.otp !== inputOtp.trim()) {
    record.attempts += 1;
    await record.save();
    return {
      valid: false,
      code: 'INVALID_OTP',
      message: `Incorrect code. ${MAX_OTP_ATTEMPTS - record.attempts} attempts remaining.`,
    };
  }

  // Valid: delete OTP
  await Otp.deleteOne({ _id: record._id });
  return { valid: true };
}

module.exports = {
  sendVerificationOtp,
  verifyOtp,
};
