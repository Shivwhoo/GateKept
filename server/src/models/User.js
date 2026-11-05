const mongoose = require('mongoose');

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
      maxlength: 100,
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    phone: {
      type: String,
      required: [true, 'Phone number is required'],
      unique: true,
      trim: true,
      index: true,
    },
    passwordHash: {
      type: String,
      required: [true, 'Password hash is required'],
    },
    hostel: {
      type: String,
      required: [true, 'Hostel is required'],
      trim: true,
    },
    room: {
      type: String,
      required: [true, 'Room is required'],
      trim: true,
    },
    role: {
      type: String,
      enum: ['student', 'guard', 'admin'],
      default: 'student',
      index: true,
    },
    emailVerified: {
      type: Boolean,
      default: false,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
    toJSON: {
      transform: (doc, ret) => {
        delete ret.passwordHash;
        delete ret.__v;
        return ret;
      },
    },
    toObject: {
      transform: (doc, ret) => {
        delete ret.passwordHash;
        delete ret.__v;
        return ret;
      },
    },
  }
);

module.exports = mongoose.model('User', userSchema);
