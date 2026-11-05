const mongoose = require('mongoose');

const auditLogSchema = new mongoose.Schema({
  parcel: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Parcel',
    required: true,
    index: true,
  },
  actor: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null,
  },
  actorRole: {
    type: String,
    enum: ['student', 'guard', 'admin', 'delivery', 'system'],
    default: 'system',
  },
  action: {
    type: String,
    required: true,
    index: true,
  },
  meta: {
    type: mongoose.Schema.Types.Mixed,
    default: {},
  },
  at: {
    type: Date,
    default: Date.now,
    index: true,
  },
});


// model 
module.exports = mongoose.model('AuditLog', auditLogSchema);





