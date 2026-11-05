const express = require('express');
const {
  releaseSchema,
  manualEntrySchema,
  getIncomingParcels,
  getAtGateParcels,
  receiveParcel,
  releaseParcel,
  manualCreateParcel,
  getMyParcels,
} = require('../controllers/parcelController');
const { validate } = require('../middleware/validate');
const { authenticate, requireRole } = require('../middleware/auth');
const { apiLimiter } = require('../middleware/rateLimiter');

const router = express.Router();

// Student routes
router.get('/mine', authenticate, requireRole(['student']), getMyParcels);

// Guard & Admin routes
router.get('/incoming', authenticate, requireRole(['guard', 'admin']), getIncomingParcels);
router.get('/at-gate', authenticate, requireRole(['guard', 'admin']), getAtGateParcels);
router.post('/:id/receive', authenticate, requireRole(['guard', 'admin']), receiveParcel);
router.post(
  '/:id/release',
  authenticate,
  requireRole(['guard', 'admin']),
  apiLimiter,
  validate(releaseSchema),
  releaseParcel
);
router.post(
  '/',
  authenticate,
  requireRole(['guard', 'admin']),
  validate(manualEntrySchema),
  manualCreateParcel
);

module.exports = router;

