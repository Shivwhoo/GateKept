const express = require('express');
const { dropSchema, dropParcel, getUploadParams } = require('../controllers/dropController');
const { validate } = require('../middleware/validate');
const { dropLimiter } = require('../middleware/rateLimiter');

const router = express.Router();

router.get('/sign-upload', getUploadParams);
router.post('/', dropLimiter, validate(dropSchema), dropParcel);

module.exports = router;

