const mongoose = require('mongoose');

const pointSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ['Point'],
    required: true,
  },
  coordinates: {
    type: [Number],
    required: true,
    validate: {
      validator(value) {
        return (
          value.length === 2 &&
          value[0] >= -180 &&
          value[0] <= 180 &&
          value[1] >= -90 &&
          value[1] <= 90
        );
      },
      message: 'Coordinates must be [longitude, latitude]',
    },
  },
}, { _id: false });

const complaintSchema = new mongoose.Schema({
  category: {
    type: String,
    required: [true, 'Category is required'],
    enum: [
      'Technical',
      'Technical - LMS Issue',
      'Technical - WebKiosk Down',
      'Technical - E-Ticket Issue',
      'Technical - Email Access',
      'Technical - Wi-Fi/Network',
      'Technical - Portal Login Issue',
      'Technical - Software Installation',
      'Technical - Hardware Fault',
      'Technical - Lab System Issue',
      'Technical - Other',
      'Billing',
      'Billing - Fee Payment',
      'Billing - Receipt Correction',
      'Billing - Scholarship/Refund',
      'Billing - Hostel Fee',
      'Billing - Library Fine',
      'Billing - Other',
      'Service',
      'Service - Mess/Cafeteria',
      'Service - Housekeeping',
      'Service - Transport/Bus',
      'Service - Security',
      'Service - Medical',
      'Service - Other',
      'Infrastructure',
      'Infrastructure - Classroom',
      'Infrastructure - Lab',
      'Infrastructure - Washroom',
      'Infrastructure - Hostel Room',
      'Infrastructure - Power/Electricity',
      'Infrastructure - Water Supply',
      'Infrastructure - Parking',
      'Infrastructure - Other',
      'Other',
      'Other - Suggestion',
      'Other - General Query',
    ],
  },
  description: {
    type: String,
    required: [true, 'Description is required'],
    minlength: [10, 'Description must be at least 10 characters'],
    trim: true,
  },
  priority: {
    type: String,
    required: [true, 'Priority is required'],
    enum: ['Low', 'Medium', 'High'],
    default: 'Medium',
  },
  status: {
    type: String,
    enum: ['Pending', 'In Progress', 'Resolved'],
    default: 'Pending',
  },
  date: {
    type: Date,
    default: Date.now,
  },
  location: {
    type: String,
    default: '',
    trim: true,
  },
  coordinates: {
    type: pointSchema,
    default: undefined,
  },
  imageUrls: [
    {
      type: String,
      trim: true,
    },
  ],
  videoUrls: [
    {
      type: String,
      trim: true,
    },
  ],
  isAnonymous: {
    type: Boolean,
    default: false,
  },
  handledBy: {
    type: String,
    default: '',
    trim: true,
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  attachments: [
    {
      name: { type: String, default: '' },
      type: { type: String, default: '' },
      size: { type: Number, default: 0 },
      data: { type: String, default: '' },
    },
  ],
  aiCategorySuggestion: {
    category: {
      type: String,
      default: '',
      trim: true,
    },
    confidence: {
      type: Number,
      default: 0,
      min: 0,
      max: 100,
    },
    reason: {
      type: String,
      default: '',
      trim: true,
    },
    source: {
      type: String,
      enum: ['heuristic', 'openai', 'none'],
      default: 'none',
    },
  },
  verificationVotes: [
    {
      userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
      },
      votedAt: {
        type: Date,
        default: Date.now,
      },
    },
  ],
  verifiedBy: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
  ],
  verifiedAt: Date,
  moderation: {
    status: {
      type: String,
      enum: ['clean', 'flagged', 'blocked'],
      default: 'clean',
    },
    spamScore: {
      type: Number,
      default: 0,
    },
    abusiveScore: {
      type: Number,
      default: 0,
    },
    duplicateScore: {
      type: Number,
      default: 0,
    },
    reasons: [
      {
        type: String,
        trim: true,
      },
    ],
    duplicateComplaintIds: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Complaint',
      },
    ],
    detectedAt: {
      type: Date,
      default: Date.now,
    },
  },
}, {
  timestamps: true,
});

// Index for better query performance
complaintSchema.index({ userId: 1, createdAt: -1 });
complaintSchema.index({ status: 1 });
complaintSchema.index({ category: 1 });
complaintSchema.index({ date: -1 });
complaintSchema.index({ location: 1 });
complaintSchema.index({ coordinates: '2dsphere' });
complaintSchema.index({ 'verificationVotes.userId': 1 });
complaintSchema.index({ userId: 1, category: 1, createdAt: -1 });
complaintSchema.index({ 'moderation.status': 1, createdAt: -1 });

module.exports = mongoose.model('Complaint', complaintSchema);


