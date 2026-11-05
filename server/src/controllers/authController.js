const bcrypt = require('bcryptjs');
const { z } = require('zod');
const User = require('../models/User');
const { Parcel } = require('../models/Parcel');
const AuditLog = require('../models/AuditLog');
const config = require('../config/env');
const { normalizePhone, isValidPhone } = require('../utils/phone');
const { sendVerificationOtp, verifyOtp } = require('../services/otp');
const { signToken, setAuthCookie, clearAuthCookie } = require('../middleware/auth');

// Zod validation schemas
const registerSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').max(100),
  email: z.string().email('Invalid email address').toLowerCase(),
  phone: z.string().refine(isValidPhone, 'Enter a valid 10-digit mobile number'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  hostel: z.string().min(1, 'Hostel is required'),
  room: z.string().min(1, 'Room number is required'),
});

const verifyOtpSchema = z.object({
  email: z.string().email().toLowerCase(),
  otp: z.string().min(1, 'OTP required').max(6),
});

const loginSchema = z.object({
  email: z.string().email().toLowerCase(),
  password: z.string().min(1, 'Password is required'),
});

const resendOtpSchema = z.object({
  email: z.string().email().toLowerCase(),
});

/**
 * Validates whether email matches allowed college email domain
 */
function isCollegeEmail(email) {
  if (!config.COLLEGE_EMAIL_DOMAIN || config.COLLEGE_EMAIL_DOMAIN === '*') {
    return true;
  }
  const emailDomain = email.split('@')[1]?.toLowerCase();
  if (!emailDomain) return false;

  const allowedDomains = config.COLLEGE_EMAIL_DOMAIN
    .split(',')
    .map((d) => d.trim().toLowerCase())
    .filter(Boolean);

  return allowedDomains.some((d) => emailDomain === d || emailDomain.endsWith('.' + d));
}

/**
 * POST /api/auth/register
 */
async function register(req, res, next) {
  try {
    const { name, email, phone, password, hostel, room } = req.body;

    // Check college domain restriction
    if (!isCollegeEmail(email)) {
      return res.status(400).json({
        error: {
          code: 'INVALID_EMAIL_DOMAIN',
          message: `Registration is restricted to college email domain (@${config.COLLEGE_EMAIL_DOMAIN}).`,
        },
      });
    }

    const normalizedPhone = normalizePhone(phone);

    // Check existing email
    const existingEmail = await User.findOne({ email });
    if (existingEmail) {
      if (!existingEmail.emailVerified) {
        // Unverified user trying to re-register: update credentials & send new OTP
        const salt = await bcrypt.genSalt(10);
        existingEmail.passwordHash = await bcrypt.hash(password, salt);
        existingEmail.name = name;
        existingEmail.phone = normalizedPhone;
        existingEmail.hostel = hostel;
        existingEmail.room = room;
        await existingEmail.save();

        const otpRes = await sendVerificationOtp(email);
        return res.status(200).json({
          success: true,
          message: 'Verification code resent. Please verify your email.',
          email,
          requiresVerification: true,
          otp: otpRes.otpCode,
        });
      }
      return res.status(409).json({
        error: {
          code: 'EMAIL_ALREADY_REGISTERED',
          message: 'This email is already registered. Please sign in.',
        },
      });
    }

    // Check existing phone
    const existingPhone = await User.findOne({ phone: normalizedPhone });
    if (existingPhone) {
      return res.status(409).json({
        error: {
          code: 'PHONE_ALREADY_REGISTERED',
          message: 'This phone number is already registered.',
        },
      });
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    // Create student user (unverified)
    const user = await User.create({
      name,
      email,
      phone: normalizedPhone,
      passwordHash,
      hostel,
      room,
      role: 'student',
      emailVerified: false,
    });

    // Send 6-digit OTP
    const otpRes = await sendVerificationOtp(email);

    res.status(201).json({
      success: true,
      message: 'Account created. Verification code generated.',
      email: user.email,
      requiresVerification: true,
      otp: otpRes.otpCode,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/auth/verify-otp
 */
async function verifyRegistrationOtp(req, res, next) {
  try {
    const { email, otp } = req.body;

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({
        error: {
          code: 'USER_NOT_FOUND',
          message: 'User account not found.',
        },
      });
    }

    if (user.emailVerified) {
      const token = signToken(user);
      setAuthCookie(res, token);
      return res.status(200).json({
        success: true,
        message: 'Email already verified.',
        user,
      });
    }

    // Check OTP
    const verification = await verifyOtp(email, otp);
    if (!verification.valid) {
      return res.status(400).json({
        error: {
          code: verification.code,
          message: verification.message,
        },
      });
    }

    // Mark email verified
    user.emailVerified = true;
    await user.save();

    // Claim any "unmatched" parcels matching student's phone number!
    const unmatchedParcels = await Parcel.find({
      status: 'unmatched',
      rawPhone: user.phone,
    });

    if (unmatchedParcels.length > 0) {
      for (const parcel of unmatchedParcels) {
        parcel.student = user._id;
        // If parcel was at gate or awaiting guard, update accordingly
        parcel.status = parcel.receivedAt ? 'at_gate' : 'awaiting_guard';
        await parcel.save();

        await AuditLog.create({
          parcel: parcel._id,
          actor: user._id,
          actorRole: 'student',
          action: 'unmatched_claimed_on_signup',
          meta: { studentId: user._id, phone: user.phone, newStatus: parcel.status },
        });
      }
    }

    // Issue auth token & cookie
    const token = signToken(user);
    setAuthCookie(res, token);

    res.status(200).json({
      success: true,
      message: 'Email verified successfully. Welcome to Gatekept!',
      user,
      claimedParcelsCount: unmatchedParcels.length,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/auth/resend-otp
 */
async function resendOtp(req, res, next) {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email });

    if (!user) {
      return res.status(404).json({
        error: {
          code: 'USER_NOT_FOUND',
          message: 'No account registered with this email.',
        },
      });
    }

    if (user.emailVerified) {
      return res.status(400).json({
        error: {
          code: 'ALREADY_VERIFIED',
          message: 'Account is already verified. Please sign in.',
        },
      });
    }

    const otpRes = await sendVerificationOtp(email);

    res.status(200).json({
      success: true,
      message: 'New verification code generated.',
      email,
      otp: otpRes.otpCode,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/auth/bypass-verify
 * Direct 1-click verification bypass for development or when email service is down
 */
async function bypassVerify(req, res, next) {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email: email.toLowerCase().trim() });

    if (!user) {
      return res.status(404).json({
        error: {
          code: 'USER_NOT_FOUND',
          message: 'User account not found.',
        },
      });
    }

    user.emailVerified = true;
    await user.save();

    // Claim any "unmatched" parcels matching student's phone number
    const unmatchedParcels = await Parcel.find({
      status: 'unmatched',
      rawPhone: user.phone,
    });

    for (const parcel of unmatchedParcels) {
      parcel.student = user._id;
      parcel.status = parcel.receivedAt ? 'at_gate' : 'awaiting_guard';
      await parcel.save();

      await AuditLog.create({
        parcel: parcel._id,
        actor: user._id,
        actorRole: 'student',
        action: 'unmatched_claimed_on_signup',
        meta: { studentId: user._id, phone: user.phone, newStatus: parcel.status },
      });
    }

    const token = signToken(user);
    setAuthCookie(res, token);

    res.status(200).json({
      success: true,
      message: 'Email verification bypassed. Account activated!',
      user,
      claimedParcelsCount: unmatchedParcels.length,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/auth/login
 */
async function login(req, res, next) {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({
        error: {
          code: 'INVALID_CREDENTIALS',
          message: 'Invalid email or password.',
        },
      });
    }

    if (!user.isActive) {
      return res.status(403).json({
        error: {
          code: 'ACCOUNT_DEACTIVATED',
          message: 'This account has been deactivated. Contact the hostel admin.',
        },
      });
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      return res.status(401).json({
        error: {
          code: 'INVALID_CREDENTIALS',
          message: 'Invalid email or password.',
        },
      });
    }

    // Check email verification for students
    if (user.role === 'student' && !user.emailVerified) {
      // Send fresh OTP and return OTP for toast
      const otpRes = await sendVerificationOtp(user.email);
      return res.status(403).json({
        error: {
          code: 'EMAIL_NOT_VERIFIED',
          message: 'Email not verified. Verification code has been sent.',
          email: user.email,
          otp: otpRes.otpCode,
        },
      });
    }

    const token = signToken(user);
    setAuthCookie(res, token);

    res.status(200).json({
      success: true,
      message: 'Signed in successfully.',
      user,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/auth/logout
 */
async function logout(req, res) {
  clearAuthCookie(res);
  res.status(200).json({
    success: true,
    message: 'Signed out successfully.',
  });
}

/**
 * GET /api/auth/me
 */
async function getMe(req, res) {
  res.status(200).json({
    success: true,
    user: req.user,
  });
}

module.exports = {
  registerSchema,
  verifyOtpSchema,
  loginSchema,
  resendOtpSchema,
  register,
  verifyRegistrationOtp,
  resendOtp,
  bypassVerify,
  login,
  logout,
  getMe,
};

