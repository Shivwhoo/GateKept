const { z } = require('zod');
const { Parcel, COURIER_ENUM } = require('../models/Parcel');
const User = require('../models/User');
const AuditLog = require('../models/AuditLog');
const { normalizePhone, isValidPhone } = require('../utils/phone');
const { generateCollectionCode } = require('../utils/code');
const { uploadImage, getSignature } = require('../services/cloudinary');
const { verifyTurnstile } = require('../utils/captcha');

const dropSchema = z.object({
  phone: z.string().refine(isValidPhone, 'Enter a valid 10-digit mobile number'),
  name: z.string().max(100).optional().default(''),
  courier: z.enum(COURIER_ENUM).default('Other'),
  photo: z.string().min(1, 'Parcel photo is required'),
  note: z.string().max(250).optional().default(''),
  captchaToken: z.string().optional().default(''),
  _hp: z.string().optional().default(''), // Honeypot field
});

/**
 * GET /api/drop/sign-upload
 * Returns signed params if direct Cloudinary upload is used
 */
function getUploadParams(req, res) {
  const params = getSignature();
  res.status(200).json(params);
}

/**
 * POST /api/drop
 * Public drop endpoint for delivery agents
 */
async function dropParcel(req, res, next) {
  try {
    const { phone, name, courier, photo, note, captchaToken, _hp } = req.body;

    // 1. Honeypot check
    if (_hp && _hp.trim().length > 0) {
      // Bot detected - reject silently or with error
      return res.status(400).json({
        error: {
          code: 'SPAM_DETECTED',
          message: 'Invalid submission.',
        },
      });
    }

    // 2. Captcha verification
    const remoteIp = req.ip || req.connection.remoteAddress;
    const isHuman = await verifyTurnstile(captchaToken, remoteIp);
    if (!isHuman) {
      return res.status(400).json({
        error: {
          code: 'CAPTCHA_FAILED',
          message: 'Security challenge failed. Please refresh and try again.',
        },
      });
    }

    // 3. Process photo upload (if base64 data)
    let photoUrl = photo;
    if (photo.startsWith('data:image/') || !photo.startsWith('http')) {
      const uploadResult = await uploadImage(photo);
      photoUrl = uploadResult.url;
    }

    // 4. Normalize phone and match student
    const normalizedPhone = normalizePhone(phone);
    const studentUser = await User.findOne({
      phone: normalizedPhone,
      role: 'student',
    });

    const status = studentUser ? 'awaiting_guard' : 'unmatched';
    const collectionCode = generateCollectionCode();

    // 5. Create Parcel record
    const parcel = await Parcel.create({
      student: studentUser ? studentUser._id : null,
      rawPhone: normalizedPhone,
      rawName: name ? name.trim() : (studentUser ? studentUser.name : ''),
      courier,
      photoUrl,
      note: note ? note.trim() : '',
      collectionCode,
      status,
      droppedAt: new Date(),
    });

    // 6. Write AuditLog
    await AuditLog.create({
      parcel: parcel._id,
      actor: null,
      actorRole: 'delivery',
      action: 'dropped',
      meta: {
        courier,
        rawPhone: normalizedPhone,
        matchedStudent: Boolean(studentUser),
        status,
        ip: remoteIp,
      },
    });

    // 7. Respond to delivery agent (Never reveal collectionCode!)
    res.status(201).json({
      success: true,
      message: 'Now hand this parcel to the guard at the desk.',
      parcel: {
        id: parcel._id,
        courier: parcel.courier,
        status: parcel.status,
        droppedAt: parcel.droppedAt,
        studentMatched: Boolean(studentUser),
        matchedStudentName: studentUser ? studentUser.name : null,
        hostel: studentUser ? studentUser.hostel : null,
        room: studentUser ? studentUser.room : null,
      },
    });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  dropSchema,
  dropParcel,
  getUploadParams,
};

