const bcrypt = require('bcryptjs');
const { z } = require('zod');
const { Parcel, COURIER_ENUM, STATUS_ENUM } = require('../models/Parcel');
const User = require('../models/User');
const AuditLog = require('../models/AuditLog');
const { normalizePhone, isValidPhone } = require('../utils/phone');
const { generateCollectionCode } = require('../utils/code');

const createUserSchema = z.object({
  name: z.string().min(2),
  email: z.string().email().toLowerCase(),
  phone: z.string().refine(isValidPhone, 'Valid 10-digit phone required'),
  password: z.string().min(6),
  hostel: z.string().default('Main Gate'),
  room: z.string().default('Desk 1'),
  role: z.enum(['guard', 'admin', 'student']).default('guard'),
});

const updateUserSchema = z.object({
  isActive: z.boolean().optional(),
  role: z.enum(['guard', 'admin', 'student']).optional(),
  name: z.string().optional(),
  hostel: z.string().optional(),
  room: z.string().optional(),
});

/**
 * GET /api/admin/stats
 * Stats strip: today's drops, pending, avg time-to-collect (in minutes/hours), unmatched count, escalated count
 */
async function getStats(req, res, next) {
  try {
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    const [
      todayDrops,
      pendingAtGate,
      unmatchedCount,
      escalatedCount,
      lockedCount,
      collectedParcels,
    ] = await Promise.all([
      Parcel.countDocuments({ droppedAt: { $gte: startOfToday } }),
      Parcel.countDocuments({ status: 'at_gate' }),
      Parcel.countDocuments({ status: 'unmatched' }),
      Parcel.countDocuments({ escalatedAt: { $ne: null }, status: 'at_gate' }),
      Parcel.countDocuments({ status: 'locked' }),
      Parcel.find({
        status: 'collected',
        collectedAt: { $ne: null },
        receivedAt: { $ne: null },
      }).select('receivedAt collectedAt'),
    ]);

    // Calculate average time-to-collect in minutes
    let avgTimeToCollectMinutes = 0;
    if (collectedParcels.length > 0) {
      const totalMinutes = collectedParcels.reduce((acc, p) => {
        const diffMs = new Date(p.collectedAt) - new Date(p.receivedAt);
        return acc + Math.max(0, Math.floor(diffMs / (1000 * 60)));
      }, 0);
      avgTimeToCollectMinutes = Math.round(totalMinutes / collectedParcels.length);
    }

    res.status(200).json({
      success: true,
      stats: {
        todayDrops,
        pendingAtGate,
        unmatchedCount,
        escalatedCount,
        lockedCount,
        totalCollected: collectedParcels.length,
        avgTimeToCollectMinutes,
      },
    });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/admin/parcels
 * All parcels with filtering (status, courier, hostel, date range, search)
 */
async function getAllParcels(req, res, next) {
  try {
    const { status, courier, hostel, startDate, endDate, search, limit = 200 } = req.query;

    const query = {};

    if (status && STATUS_ENUM.includes(status)) {
      query.status = status;
    }

    if (courier && COURIER_ENUM.includes(courier)) {
      query.courier = courier;
    }

    if (startDate || endDate) {
      query.droppedAt = {};
      if (startDate) query.droppedAt.$gte = new Date(startDate);
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        query.droppedAt.$lte = end;
      }
    }

    let parcels = await Parcel.find(query)
      .populate('student', 'name email phone hostel room')
      .populate('receivedBy', 'name')
      .populate('collectedBy', 'name')
      .sort({ droppedAt: -1 })
      .select('-collectionCode') // Never expose collectionCode
      .limit(parseInt(limit, 10));

    // Optional hostel filter
    if (hostel) {
      parcels = parcels.filter(
        (p) => p.student?.hostel?.toLowerCase() === hostel.toLowerCase()
      );
    }

    // Optional free text search
    if (search && search.trim()) {
      const q = search.trim().toLowerCase();
      parcels = parcels.filter((p) => {
        const sName = p.student?.name?.toLowerCase() || '';
        const rName = p.rawName?.toLowerCase() || '';
        const phone = p.rawPhone || '';
        const room = p.student?.room?.toLowerCase() || '';
        const idLast6 = p._id?.toString().slice(-6).toLowerCase() || '';
        return (
          sName.includes(q) ||
          rName.includes(q) ||
          phone.includes(q) ||
          room.includes(q) ||
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
 * GET /api/admin/export.csv
 * Exports all parcels as CSV log
 */
async function exportCsv(req, res, next) {
  try {
    const parcels = await Parcel.find({})
      .populate('student', 'name email phone hostel room')
      .populate('receivedBy', 'name')
      .populate('collectedBy', 'name')
      .sort({ droppedAt: -1 });

    const headers = [
      'Parcel ID',
      'Dropped At',
      'Courier',
      'Status',
      'Recipient Name',
      'Phone',
      'Hostel',
      'Room',
      'Received At',
      'Received By Guard',
      'Collected At',
      'Collected By Guard',
      'Duration (Mins)',
      'Escalated',
    ];

    const escapeCsv = (val) => {
      if (val === null || val === undefined) return '""';
      const str = String(val).replace(/"/g, '""');
      return `"${str}"`;
    };

    const rows = parcels.map((p) => {
      let durationMins = '';
      if (p.receivedAt && p.collectedAt) {
        durationMins = Math.round((new Date(p.collectedAt) - new Date(p.receivedAt)) / 60000);
      }

      return [
        escapeCsv(p._id.toString()),
        escapeCsv(p.droppedAt ? new Date(p.droppedAt).toISOString() : ''),
        escapeCsv(p.courier),
        escapeCsv(p.status),
        escapeCsv(p.student?.name || p.rawName || 'Unregistered'),
        escapeCsv(p.rawPhone),
        escapeCsv(p.student?.hostel || ''),
        escapeCsv(p.student?.room || ''),
        escapeCsv(p.receivedAt ? new Date(p.receivedAt).toISOString() : ''),
        escapeCsv(p.receivedBy?.name || ''),
        escapeCsv(p.collectedAt ? new Date(p.collectedAt).toISOString() : ''),
        escapeCsv(p.collectedBy?.name || ''),
        escapeCsv(durationMins),
        escapeCsv(p.escalatedAt ? 'YES' : 'NO'),
      ].join(',');
    });

    const csvContent = [headers.join(','), ...rows].join('\r\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="gatekept_parcel_log_${new Date().toISOString().split('T')[0]}.csv"`
    );
    res.status(200).send(csvContent);
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/admin/users
 * Admin creates new guards or administrators
 */
async function createUser(req, res, next) {
  try {
    const { name, email, phone, password, hostel, room, role } = req.body;

    const normalizedPhone = normalizePhone(phone);

    const existing = await User.findOne({
      $or: [{ email }, { phone: normalizedPhone }],
    });
    if (existing) {
      return res.status(409).json({
        error: {
          code: 'USER_ALREADY_EXISTS',
          message: 'A user with this email or phone number already exists.',
        },
      });
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    const user = await User.create({
      name,
      email,
      phone: normalizedPhone,
      passwordHash,
      hostel,
      room,
      role,
      emailVerified: true, // admin created users are pre-verified
    });

    res.status(201).json({
      success: true,
      message: `${role.toUpperCase()} account created successfully.`,
      user,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/admin/users
 * Lists users for admin management
 */
async function getUsers(req, res, next) {
  try {
    const { role } = req.query;
    const query = role ? { role } : {};
    const users = await User.find(query).sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: users.length,
      users,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * PATCH /api/admin/users/:id
 * Deactivates or updates user
 */
async function updateUser(req, res, next) {
  try {
    const { id } = req.params;
    const updates = req.body;

    const user = await User.findByIdAndUpdate(id, updates, { new: true });
    if (!user) {
      return res.status(404).json({
        error: {
          code: 'USER_NOT_FOUND',
          message: 'User not found.',
        },
      });
    }

    res.status(200).json({
      success: true,
      message: 'User updated successfully.',
      user,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/admin/parcels/:id/override
 * Admin override for locked parcels: unlocks parcel, resets attempts, generates new code or releases directly
 */
async function overrideLockedParcel(req, res, next) {
  try {
    const { id } = req.params;
    const { action = 'unlock' } = req.body; // 'unlock' | 'release'

    const parcel = await Parcel.findById(id).populate('student');
    if (!parcel) {
      return res.status(404).json({
        error: {
          code: 'PARCEL_NOT_FOUND',
          message: 'Parcel not found.',
        },
      });
    }

    if (action === 'release') {
      parcel.status = 'collected';
      parcel.collectedAt = new Date();
      parcel.collectedBy = req.user._id;
      parcel.collectedByStudentVerified = true;
      await parcel.save();

      await AuditLog.create({
        parcel: parcel._id,
        actor: req.user._id,
        actorRole: req.user.role,
        action: 'admin_override_release',
        meta: { adminId: req.user._id, adminName: req.user.name },
      });

      const sanitized = parcel.toObject ? parcel.toObject() : { ...parcel };
      delete sanitized.collectionCode;

      return res.status(200).json({
        success: true,
        message: 'Parcel released via administrative override.',
        parcel: sanitized,
      });
    }

    // Default: unlock parcel & generate fresh code
    parcel.status = 'at_gate';
    parcel.codeAttempts = 0;
    parcel.collectionCode = generateCollectionCode();
    await parcel.save();

    await AuditLog.create({
      parcel: parcel._id,
      actor: req.user._id,
      actorRole: req.user.role,
      action: 'admin_override_unlock',
      meta: {
        adminId: req.user._id,
        adminName: req.user.name,
        newCodeGenerated: true,
      },
    });

    const sanitized = parcel.toObject ? parcel.toObject() : { ...parcel };
    delete sanitized.collectionCode;

    res.status(200).json({
      success: true,
      message: 'Parcel unlocked and new collection code issued.',
      parcel: sanitized,
    });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  createUserSchema,
  updateUserSchema,
  getStats,
  getAllParcels,
  exportCsv,
  createUser,
  getUsers,
  updateUser,
  overrideLockedParcel,
};

