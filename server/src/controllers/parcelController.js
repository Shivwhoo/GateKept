const { z } = require('zod');
const { Parcel, COURIER_ENUM } = require('../models/Parcel');
const User = require('../models/User');
const AuditLog = require('../models/AuditLog');
const { normalizePhone, isValidPhone } = require('../utils/phone');
const { generateCollectionCode } = require('../utils/code');
const { uploadImage } = require('../services/cloudinary');
const notifier = require('../services/notifier');

// Zod schemas
const releaseSchema = z.object({
  code: z.string().length(4, 'Collection code must be exactly 4 digits'),
});

const manualEntrySchema = z.object({
  phone: z.string().refine(isValidPhone, 'Enter a valid 10-digit mobile number'),
  name: z.string().max(100).optional().default(''),
  courier: z.enum(COURIER_ENUM).default('Other'),
  photo: z.string().optional().default(''),
  note: z.string().max(250).optional().default(''),
});

/**
 * Helper to strip collectionCode from parcel responses for security
 */
function sanitizeParcelForGuard(parcel) {
  const obj = parcel.toObject ? parcel.toObject() : { ...parcel };
  delete obj.collectionCode;
  return obj;
}

/**
 * GET /api/parcels/incoming
 * Guard view: parcels awaiting desk intake (status: awaiting_guard or unmatched)
 */
async function getIncomingParcels(req, res, next) {
  try {
    const parcels = await Parcel.find({
      status: { $in: ['awaiting_guard', 'unmatched'] },
    })
      .populate('student', 'name email phone hostel room')
      .sort({ droppedAt: -1 })
      .select('-collectionCode'); // NEVER return collection code

    res.status(200).json({
      success: true,
      count: parcels.length,
      parcels,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/parcels/at-gate
 * Guard view: parcels currently at desk (status: at_gate or locked) with search
 */
async function getAtGateParcels(req, res, next) {
  try {
    const { search } = req.query;

    let query = {
      status: { $in: ['at_gate', 'locked'] },
    };

    let parcels = await Parcel.find(query)
      .populate('student', 'name email phone hostel room')
      .populate('receivedBy', 'name')
      .sort({ receivedAt: -1, droppedAt: -1 })
      .select('-collectionCode'); // NEVER return collection code

    // Optional in-memory search for flexible matching on name, phone, room, or hostel
    if (search && search.trim()) {
      const q = search.trim().toLowerCase();
      parcels = parcels.filter((p) => {
        const studentName = p.student?.name?.toLowerCase() || '';
        const rawName = p.rawName?.toLowerCase() || '';
        const phone = p.rawPhone || '';
        const room = p.student?.room?.toLowerCase() || '';
        const hostel = p.student?.hostel?.toLowerCase() || '';
        const courier = p.courier?.toLowerCase() || '';
        const idLast6 = p._id?.toString().slice(-6).toLowerCase() || '';

        return (
          studentName.includes(q) ||
          rawName.includes(q) ||
          phone.includes(q) ||
          room.includes(q) ||
          hostel.includes(q) ||
          courier.includes(q) ||
          idLast6.includes(q)
        );
      });
    }

    res.status(200).json({
      success: true,
      count: parcels.length,
      parcels,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/parcels/:id/receive
 * Guard receives parcel at desk -> status becomes 'at_gate' -> student notified with code
 */
async function receiveParcel(req, res, next) {
  try {
    const { id } = req.params;
    const parcel = await Parcel.findById(id).populate('student');

    if (!parcel) {
      return res.status(404).json({
        error: {
          code: 'PARCEL_NOT_FOUND',
          message: 'Parcel not found.',
        },
      });
    }

    if (parcel.status === 'at_gate' || parcel.status === 'collected' || parcel.status === 'locked') {
      return res.status(400).json({
        error: {
          code: 'INVALID_STATUS_TRANSITION',
          message: `Parcel is already in status '${parcel.status}'.`,
        },
      });
    }

    // Update status
    parcel.status = 'at_gate';
    parcel.receivedAt = new Date();
    parcel.receivedBy = req.user._id;
    await parcel.save();

    // Write Audit Log
    await AuditLog.create({
      parcel: parcel._id,
      actor: req.user._id,
      actorRole: req.user.role,
      action: 'received',
      meta: {
        guardId: req.user._id,
        guardName: req.user.name,
      },
    });

    // Notify student via Email with photo, courier & 4-digit collection code
    if (parcel.student && parcel.student.email) {
      await notifier.sendParcelArrivedEmail({
        to: parcel.student.email,
        studentName: parcel.student.name,
        courier: parcel.courier,
        photoUrl: parcel.photoUrl,
        collectionCode: parcel.collectionCode,
        hostel: parcel.student.hostel,
        room: parcel.student.room,
      });
    }

    res.status(200).json({
      success: true,
      message: 'Parcel received at security desk. Student notified with collection code.',
      parcel: sanitizeParcelForGuard(parcel),
    });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/parcels/:id/release
 * Guard releases parcel to student against 4-digit code.
 * 5 wrong attempts lock the parcel!
 */
async function releaseParcel(req, res, next) {
  try {
    const { id } = req.params;
    const { code } = req.body;

    const parcel = await Parcel.findById(id).populate('student');

    if (!parcel) {
      return res.status(404).json({
        error: {
          code: 'PARCEL_NOT_FOUND',
          message: 'Parcel not found.',
        },
      });
    }

    if (parcel.status !== 'at_gate') {
      if (parcel.status === 'collected') {
        return res.status(400).json({
          error: {
            code: 'ALREADY_COLLECTED',
            message: 'This parcel has already been collected.',
          },
        });
      }

      if (parcel.status === 'locked') {
        return res.status(403).json({
          error: {
            code: 'PARCEL_LOCKED',
            message: 'Parcel is locked due to 5 failed code attempts. Requires hostel admin override.',
          },
        });
      }

      return res.status(400).json({
        error: {
          code: 'INVALID_STATUS',
          message: `Parcel must be received at desk ('at_gate') before release. Current status: '${parcel.status}'.`,
        },
      });
    }

    // Verify code
    if (parcel.collectionCode !== code.trim()) {
      parcel.codeAttempts += 1;

      if (parcel.codeAttempts >= 5) {
        parcel.status = 'locked';
        await parcel.save();

        await AuditLog.create({
          parcel: parcel._id,
          actor: req.user._id,
          actorRole: req.user.role,
          action: 'locked',
          meta: { attempts: parcel.codeAttempts, reason: '5_failed_attempts' },
        });

        return res.status(403).json({
          error: {
            code: 'PARCEL_LOCKED',
            message: 'Maximum code attempts exceeded. Parcel is now locked. Admin override required.',
          },
        });
      }

      await parcel.save();

      await AuditLog.create({
        parcel: parcel._id,
        actor: req.user._id,
        actorRole: req.user.role,
        action: 'release_attempt_failed',
        meta: { attempts: parcel.codeAttempts, enteredCode: code.replace(/./g, '*') },
      });

      const remaining = 5 - parcel.codeAttempts;
      return res.status(400).json({
        error: {
          code: 'INVALID_COLLECTION_CODE',
          message: `Incorrect collection code. ${remaining} attempt${remaining === 1 ? '' : 's'} remaining before lockout.`,
        },
      });
    }

    // Correct code: release parcel!
    parcel.status = 'collected';
    parcel.collectedAt = new Date();
    parcel.collectedBy = req.user._id;
    parcel.collectedByStudentVerified = true;
    await parcel.save();

    await AuditLog.create({
      parcel: parcel._id,
      actor: req.user._id,
      actorRole: req.user.role,
      action: 'released',
      meta: {
        guardId: req.user._id,
        guardName: req.user.name,
      },
    });

    res.status(200).json({
      success: true,
      message: 'Parcel verified and released to student successfully.',
      parcel: sanitizeParcelForGuard(parcel),
    });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/parcels
 * Guard manual entry when delivery agent skips the public form
 */
async function manualCreateParcel(req, res, next) {
  try {
    const { phone, name, courier, photo, note } = req.body;

    const normalizedPhone = normalizePhone(phone);
    const studentUser = await User.findOne({
      phone: normalizedPhone,
      role: 'student',
    });

    let photoUrl = photo;
    if (photo && (photo.startsWith('data:image/') || !photo.startsWith('http'))) {
      const uploadResult = await uploadImage(photo);
      photoUrl = uploadResult.url;
    } else if (!photoUrl) {
      photoUrl = 'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?auto=format&fit=crop&w=600&q=80';
    }

    const collectionCode = generateCollectionCode();
    // Guard already has the package in hand, so status is at_gate
    const status = studentUser ? 'at_gate' : 'unmatched';

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
      receivedAt: new Date(),
      receivedBy: req.user._id,
    });

    await AuditLog.create({
      parcel: parcel._id,
      actor: req.user._id,
      actorRole: req.user.role,
      action: 'guard_manual_entry',
      meta: {
        guardId: req.user._id,
        guardName: req.user.name,
        matchedStudent: Boolean(studentUser),
      },
    });

    // Notify student if matched
    if (studentUser && studentUser.email) {
      await notifier.sendParcelArrivedEmail({
        to: studentUser.email,
        studentName: studentUser.name,
        courier: parcel.courier,
        photoUrl: parcel.photoUrl,
        collectionCode: parcel.collectionCode,
        hostel: studentUser.hostel,
        room: studentUser.room,
      });
    }

    res.status(201).json({
      success: true,
      message: 'Parcel manually created and checked into desk.',
      parcel: sanitizeParcelForGuard(parcel),
    });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/parcels/mine
 * Student view: gets current student's parcels.
 * Includes collectionCode only for parcels owned by this authenticated student!
 */
async function getMyParcels(req, res, next) {
  try {
    const parcels = await Parcel.find({
      student: req.user._id,
    })
      .sort({ droppedAt: -1 });

    res.status(200).json({
      success: true,
      count: parcels.length,
      parcels,
    });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  releaseSchema,
  manualEntrySchema,
  getIncomingParcels,
  getAtGateParcels,
  receiveParcel,
  releaseParcel,
  manualCreateParcel,
  getMyParcels,
};

