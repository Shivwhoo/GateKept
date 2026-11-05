const express = require('express');
const {
  createUserSchema,
  updateUserSchema,
  getStats,
  getAllParcels,
  exportCsv,
  createUser,
  getUsers,
  updateUser,
  overrideLockedParcel,
} = require('../controllers/adminController');
const { validate } = require('../middleware/validate');
const { authenticate, requireRole } = require('../middleware/auth');

const router = express.Router();

// All routes require authenticated admin
router.use(authenticate, requireRole(['admin']));

router.get('/stats', getStats);
router.get('/parcels', getAllParcels);
router.get('/export.csv', exportCsv);
router.get('/users', getUsers);
router.post('/users', validate(createUserSchema), createUser);
router.patch('/users/:id', validate(updateUserSchema), updateUser);
router.post('/parcels/:id/override', overrideLockedParcel);

module.exports = router;

