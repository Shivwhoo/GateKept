const mongoose = require('mongoose');

const COURIER_ENUM = [
  'Amazon',
  'Flipkart',
  'Swiggy',
  'Zomato',
  'Blinkit',
  'Myntra',
  'Meesho',
  'Other',
];

const STATUS_ENUM = [
  'awaiting_guard',
  'at_gate',
  'collected',
  'unmatched',
  'locked',
];

const parcelSchema = new mongoose.Schema(
  {
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
      index: true,
    },
    rawPhone: {
      type: String,
      required: [true, 'Phone number is required'],
      trim: true,
      index: true,
    },
    rawName: {
      type: String,
      trim: true,
      default: '',
    },
    courier: {
      type: String,
      enum: COURIER_ENUM,
      default: 'Other',
    },
    photoUrl: {
      type: String,
      required: [true, 'Parcel photo is required'],
    },
    note: {
      type: String,
      trim: true,
      default: '',
    },
    collectionCode: {
      type: String,
      required: true,
      length: 4,
    },
    codeAttempts: {
      type: Number,
      default: 0,
    },
    status: {
      type: String,
      enum: STATUS_ENUM,
      default: 'awaiting_guard',
      index: true,
    },
    droppedAt: {
      type: Date,
      default: Date.now,
      index: true,
    },
    receivedAt: {
      type: Date,
      default: null,
    },
    receivedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    collectedAt: {
      type: Date,
      default: null,
    },
    collectedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    collectedByStudentVerified: {
      type: Boolean,
      default: false,
    },
    remindersSent: {
      type: Number,
      default: 0,
    },
    escalatedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// Compound index for querying active parcels efficiently
parcelSchema.index({ status: 1, droppedAt: -1 });

module.exports = {
  Parcel: mongoose.model('Parcel', parcelSchema),
  COURIER_ENUM,
  STATUS_ENUM,
};
