const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Name is required'],
    trim: true,
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    trim: true,
    match: [/^\S+@\S+\.\S+$/, 'Please provide a valid email'],
  },
  password: {
    type: String,
    required: [true, 'Password is required'],
    minlength: [6, 'Password must be at least 6 characters'],
    select: false, // Don't return password by default
  },
  role: {
    type: String,
    enum: ['User', 'Admin'],
    default: 'User',
  },
  phone: {
    type: String,
    default: '',
  },
  address: {
    type: String,
    default: '',
  },
  bio: {
    type: String,
    default: '',
  },
  reputation: {
    points: {
      type: Number,
      default: 0,
    },
    reportsSubmitted: {
      type: Number,
      default: 0,
    },
    reportsVerified: {
      type: Number,
      default: 0,
    },
    verificationsGiven: {
      type: Number,
      default: 0,
    },
    currentStreak: {
      type: Number,
      default: 0,
    },
    longestStreak: {
      type: Number,
      default: 0,
    },
    lastContributionAt: Date,
    badges: [
      {
        type: String,
        trim: true,
      },
    ],
  },
  refreshToken: String,
  resetPinHash: String,
  resetPinExpires: Date,
}, {
  timestamps: true,
});

// Hash password before saving
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) {
    return next();
  }
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// Method to compare password
userSchema.methods.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

module.exports = mongoose.model('User', userSchema);


