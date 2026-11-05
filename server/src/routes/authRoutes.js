const express = require('express');
const {
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
} = require('../controllers/authController');
const { validate } = require('../middleware/validate');
const { authenticate } = require('../middleware/auth');
const { authLimiter } = require('../middleware/rateLimiter');

const router = express.Router();

router.post('/register', authLimiter, validate(registerSchema), register);
router.post('/verify-otp', authLimiter, validate(verifyOtpSchema), verifyRegistrationOtp);
router.post('/bypass-verify', authLimiter, bypassVerify);
router.post('/resend-otp', authLimiter, validate(resendOtpSchema), resendOtp);
router.post('/login', authLimiter, validate(loginSchema), login);
router.post('/logout', logout);
router.get('/me', authenticate, getMe);

module.exports = router;

