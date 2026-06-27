const Complaint = require('../models/Complaint');
const User = require('../models/User');
const { validationResult } = require('express-validator');
const { analyzeComplaintSubmission } = require('../utils/complaintFraudDetector');
const { storeUploadedFiles } = require('../utils/uploadService');
const { suggestCategory } = require('../utils/aiCategorizer');

const MAX_ATTACHMENTS = 3;
const MAX_ATTACHMENT_SIZE = 2 * 1024 * 1024; // 2MB

const normalizeAttachments = (attachments) => {
  if (!attachments) return [];
  if (typeof attachments === 'string') {
    try {
      attachments = JSON.parse(attachments);
    } catch {
      throw new Error('Attachments must be valid JSON');
    }
  }
  if (!Array.isArray(attachments)) {
    throw new Error('Attachments must be an array');
  }
  if (attachments.length > MAX_ATTACHMENTS) {
    throw new Error(`Maximum ${MAX_ATTACHMENTS} attachments allowed`);
  }

  return attachments.map((att, index) => {
    if (!att || typeof att.data !== 'string') {
      throw new Error(`Invalid attachment at position ${index + 1}`);
    }

    let type = typeof att.type === 'string' ? att.type : '';
    let dataUri = att.data;
    let base64 = att.data;

    if (dataUri.startsWith('data:')) {
      const match = dataUri.match(/^data:(.+);base64,(.*)$/);
      if (!match) {
        throw new Error(`Invalid attachment data at position ${index + 1}`);
      }
      type = type || match[1];
      base64 = match[2];
      dataUri = `data:${type};base64,${base64}`;
    } else {
      if (!type) {
        throw new Error(`Attachment type is required at position ${index + 1}`);
      }
      dataUri = `data:${type};base64,${base64}`;
    }

    if (!type.startsWith('image/')) {
      throw new Error(`Attachment ${index + 1} must be an image`);
    }

    const size = Buffer.from(base64, 'base64').length;
    if (size > MAX_ATTACHMENT_SIZE) {
      throw new Error(`Attachment ${index + 1} exceeds 2MB`);
    }

    return {
      name: att.name || `attachment_${index + 1}`,
      type,
      size,
      data: dataUri,
    };
  });
};

const parseCoordinates = ({ latitude, longitude, coordinates }) => {
  if (coordinates && typeof coordinates === 'object' && Array.isArray(coordinates.coordinates)) {
    const [lng, lat] = coordinates.coordinates.map(Number);
    if (Number.isFinite(lat) && Number.isFinite(lng)) {
      return { type: 'Point', coordinates: [lng, lat] };
    }
  }

  const lat = Number(latitude);
  const lng = Number(longitude);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return undefined;
  return { type: 'Point', coordinates: [lng, lat] };
};

const getBadges = (reputation = {}) => {
  const badges = new Set(reputation.badges || []);
  if ((reputation.reportsSubmitted || 0) >= 1) badges.add('First Reporter');
  if ((reputation.reportsSubmitted || 0) >= 5) badges.add('Community Hero');
  if ((reputation.verificationsGiven || 0) >= 3) badges.add('Verification Expert');
  if ((reputation.currentStreak || 0) >= 3) badges.add('Streak Builder');
  return [...badges];
};

const updateContributionStreak = (reputation = {}) => {
  const now = new Date();
  const last = reputation.lastContributionAt ? new Date(reputation.lastContributionAt) : null;
  const sameDay = last && now.toDateString() === last.toDateString();
  const yesterday = last && (now - last) <= 48 * 60 * 60 * 1000 && now.getDate() !== last.getDate();

  const currentStreak = sameDay
    ? reputation.currentStreak || 1
    : yesterday
      ? (reputation.currentStreak || 0) + 1
      : 1;

  return {
    currentStreak,
    longestStreak: Math.max(reputation.longestStreak || 0, currentStreak),
    lastContributionAt: now,
  };
};

const awardUserPoints = async (userId, updater) => {
  const user = await User.findById(userId);
  if (!user) return;

  const nextReputation = updater(user.reputation || {});
  user.reputation = {
    ...(user.reputation?.toObject ? user.reputation.toObject() : user.reputation || {}),
    ...nextReputation,
  };
  user.reputation.badges = getBadges(user.reputation);
  await user.save();
};

const formatComplaint = (complaint, viewerRole) => {
  const isAnonymous = Boolean(complaint.isAnonymous);
  const coords = complaint.coordinates?.coordinates;
  const base = {
    id: `#${String(complaint._id.toString().slice(-3)).padStart(3, '0')}`,
    _id: complaint._id,
    category: complaint.category,
    description: complaint.description,
    priority: complaint.priority,
    status: complaint.status,
    date: complaint.date.toISOString().split('T')[0],
    createdAt: complaint.createdAt,
    location: complaint.location || '',
    latitude: coords ? coords[1] : null,
    longitude: coords ? coords[0] : null,
    imageUrls: complaint.imageUrls || [],
    videoUrls: complaint.videoUrls || [],
    isAnonymous,
    handledBy: complaint.handledBy || '',
    attachmentCount:
      (complaint.attachments ? complaint.attachments.length : 0)
      + (complaint.imageUrls ? complaint.imageUrls.length : 0)
      + (complaint.videoUrls ? complaint.videoUrls.length : 0),
    verificationCount: complaint.verificationVotes ? complaint.verificationVotes.length : 0,
    verifiedBy: complaint.verifiedBy || [],
    verifiedAt: complaint.verifiedAt || null,
    aiCategorySuggestion: complaint.aiCategorySuggestion || {
      category: '',
      confidence: 0,
      reason: '',
      source: 'none',
    },
    moderation: complaint.moderation
      ? {
          status: complaint.moderation.status || 'clean',
          spamScore: complaint.moderation.spamScore || 0,
          abusiveScore: complaint.moderation.abusiveScore || 0,
          duplicateScore: complaint.moderation.duplicateScore || 0,
          reasons: complaint.moderation.reasons || [],
          duplicateComplaintIds: complaint.moderation.duplicateComplaintIds || [],
          detectedAt: complaint.moderation.detectedAt || null,
        }
      : {
          status: 'clean',
          spamScore: 0,
          abusiveScore: 0,
          duplicateScore: 0,
          reasons: [],
          duplicateComplaintIds: [],
          detectedAt: null,
        },
  };

  if (viewerRole === 'Admin') {
    if (isAnonymous) {
      return {
        ...base,
        userId: null,
        reportedBy: 'Anonymous',
      };
    }

    return {
      ...base,
      userId: complaint.userId,
      reportedBy: complaint.userId
        ? `${complaint.userId.name || 'User'}${complaint.userId.email ? ` (${complaint.userId.email})` : ''}`
        : 'User',
    };
  }

  return {
    ...base,
    userId: complaint.userId,
  };
};

// @desc    Submit a new complaint
// @route   POST /api/complaints
// @access  Private
exports.submitComplaint = async (req, res) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array(),
      });
    }

    const { category, description, priority, attachments, location, isAnonymous, latitude, longitude } = req.body;

    let normalizedAttachments = [];
    try {
      normalizedAttachments = normalizeAttachments(attachments);
    } catch (err) {
      return res.status(400).json({
        success: false,
        message: err.message || 'Invalid attachments',
      });
    }

    let storedUploads = { imageUrls: [], videoUrls: [] };
    try {
      storedUploads = await storeUploadedFiles(req.files || []);
    } catch (err) {
      return res.status(400).json({
        success: false,
        message: err.message || 'Invalid file upload',
      });
    }

    const imageDataUrls = normalizedAttachments
      .filter((att) => att.type.startsWith('image/'))
      .map((att) => att.data);
    const aiCategorySuggestion = await suggestCategory({ description, imageDataUrls });
    const finalCategory =
      aiCategorySuggestion.category && aiCategorySuggestion.confidence >= 72
        ? aiCategorySuggestion.category
        : category;
    const coordinates = parseCoordinates({ latitude, longitude });

    const recentComplaints = await Complaint.find({
      userId: req.user.id,
      createdAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
    })
      .select('_id category description location createdAt')
      .sort({ createdAt: -1 })
      .limit(15);

    const moderation = analyzeComplaintSubmission({
      category: finalCategory,
      description,
      location,
      attachments: normalizedAttachments,
      recentComplaints,
    });

    if (moderation.status === 'blocked') {
      return res.status(422).json({
        success: false,
        message: 'Complaint blocked by AI fraud/spam filter. Please revise and resubmit.',
        moderation,
      });
    }

    const complaint = await Complaint.create({
      category: finalCategory,
      description,
      priority: priority || 'Medium',
      userId: req.user.id,
      date: new Date(),
      attachments: normalizedAttachments,
      imageUrls: storedUploads.imageUrls,
      videoUrls: storedUploads.videoUrls,
      location: location || '',
      coordinates,
      isAnonymous: Boolean(isAnonymous),
      aiCategorySuggestion,
      moderation,
    });

    await awardUserPoints(req.user.id, (reputation) => {
      const streak = updateContributionStreak(reputation);
      const reportsSubmitted = (reputation.reportsSubmitted || 0) + 1;
      return {
        ...streak,
        reportsSubmitted,
        points: (reputation.points || 0) + 10,
      };
    });

    req.app.get('io')?.emit('complaint_created', formatComplaint(complaint, 'Admin'));

    res.status(201).json({
      success: true,
      message:
        moderation.status === 'flagged'
          ? 'Complaint submitted and flagged for review'
          : 'Complaint submitted successfully',
      data: formatComplaint(complaint, req.user.role),
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message || 'Server error',
    });
  }
};

// @desc    Get all complaints (Admin) or user's complaints (User)
// @route   GET /api/complaints
// @access  Private
exports.getComplaints = async (req, res) => {
  try {
    const { category, priority, status, date, search, lat, lng, radiusKm } = req.query;
    const isAdmin = req.user.role === 'Admin';

    // Build query
    let query = {};

    // If user is not admin, only show their complaints
    if (!isAdmin) {
      query.userId = req.user.id;
    }

    // Apply filters
    if (category) {
      query.category = category;
    }

    if (priority) {
      query.priority = priority;
    }

    if (status) {
      query.status = status;
    }

    if (date) {
      const startDate = new Date(date);
      startDate.setHours(0, 0, 0, 0);
      const endDate = new Date(date);
      endDate.setHours(23, 59, 59, 999);
      query.date = { $gte: startDate, $lte: endDate };
    }

    // Search in description
    if (search) {
      query.description = { $regex: search, $options: 'i' };
    }

    if (lat && lng) {
      query.coordinates = {
        $near: {
          $geometry: {
            type: 'Point',
            coordinates: [Number(lng), Number(lat)],
          },
          $maxDistance: Math.max(1, Number(radiusKm) || 5) * 1000,
        },
      };
    }

    const complaints = await Complaint.find(query)
      .populate('userId', 'name email')
      .sort({ createdAt: -1 });

    // Format response to match frontend expectations
    const formattedComplaints = complaints.map((complaint) =>
      formatComplaint(complaint, req.user.role)
    );

    res.status(200).json({
      success: true,
      count: formattedComplaints.length,
      data: formattedComplaints,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message || 'Server error',
    });
  }
};

// @desc    Get user's own complaints
// @route   GET /api/complaints/my
// @access  Private
exports.getMyComplaints = async (req, res) => {
  try {
    const { category, priority, status, date, search } = req.query;

    let query = { userId: req.user.id };

    // Apply filters
    if (category) {
      query.category = category;
    }

    if (priority) {
      query.priority = priority;
    }

    if (status) {
      query.status = status;
    }

    if (date) {
      const startDate = new Date(date);
      startDate.setHours(0, 0, 0, 0);
      const endDate = new Date(date);
      endDate.setHours(23, 59, 59, 999);
      query.date = { $gte: startDate, $lte: endDate };
    }

    if (search) {
      query.description = { $regex: search, $options: 'i' };
    }

    const complaints = await Complaint.find(query)
      .sort({ createdAt: -1 });

    const formattedComplaints = complaints.map((complaint) =>
      formatComplaint(complaint, req.user.role)
    );

    res.status(200).json({
      success: true,
      count: formattedComplaints.length,
      data: formattedComplaints,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message || 'Server error',
    });
  }
};

// @desc    Get single complaint by ID
// @route   GET /api/complaints/:id
// @access  Private
exports.getComplaintById = async (req, res) => {
  try {
    const complaint = await Complaint.findById(req.params.id).populate('userId', 'name email');

    if (!complaint) {
      return res.status(404).json({
        success: false,
        message: 'Complaint not found',
      });
    }

    // Check if user owns the complaint or is admin
    if (complaint.userId._id.toString() !== req.user.id && req.user.role !== 'Admin') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to access this complaint',
      });
    }

    const formatted = formatComplaint(complaint, req.user.role);
    res.status(200).json({
      success: true,
      data: {
        ...formatted,
        attachments: complaint.attachments || [],
        imageUrls: complaint.imageUrls || [],
        videoUrls: complaint.videoUrls || [],
        verificationVotes: complaint.verificationVotes || [],
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message || 'Server error',
    });
  }
};

// @desc    Update complaint status (Admin only)
// @route   PATCH /api/complaints/:id/status
// @access  Private/Admin
exports.updateStatus = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array(),
      });
    }

    const { status, handledBy } = req.body;

    if (!status && !handledBy) {
      return res.status(400).json({
        success: false,
        message: 'Status or handledBy must be provided',
      });
    }

    const complaint = await Complaint.findById(req.params.id);

    if (!complaint) {
      return res.status(404).json({
        success: false,
        message: 'Complaint not found',
      });
    }

    if (status) {
      complaint.status = status;
    }
    if (handledBy !== undefined) {
      complaint.handledBy = handledBy;
    }
    await complaint.save();

    req.app.get('io')?.emit('complaint_updated', formatComplaint(complaint, 'Admin'));

    res.status(200).json({
      success: true,
      message: 'Complaint updated successfully',
      data: formatComplaint(complaint, req.user.role),
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message || 'Server error',
    });
  }
};

// @desc    Add community verification vote
// @route   POST /api/complaints/:id/verify
// @access  Private
exports.verifyComplaint = async (req, res) => {
  try {
    const complaint = await Complaint.findById(req.params.id);

    if (!complaint) {
      return res.status(404).json({
        success: false,
        message: 'Complaint not found',
      });
    }

    if (complaint.userId.toString() === req.user.id) {
      return res.status(400).json({
        success: false,
        message: 'You cannot verify your own complaint',
      });
    }

    const alreadyVoted = complaint.verificationVotes.some(
      (vote) => vote.userId.toString() === req.user.id
    );

    if (alreadyVoted) {
      return res.status(409).json({
        success: false,
        message: 'You have already verified this issue',
      });
    }

    complaint.verificationVotes.push({ userId: req.user.id });
    complaint.verifiedBy = complaint.verificationVotes.map((vote) => vote.userId);
    if (complaint.verificationVotes.length >= 3 && !complaint.verifiedAt) {
      complaint.verifiedAt = new Date();
      await awardUserPoints(complaint.userId, (reputation) => ({
        reportsVerified: (reputation.reportsVerified || 0) + 1,
        points: (reputation.points || 0) + 25,
      }));
    }
    await complaint.save();

    await awardUserPoints(req.user.id, (reputation) => {
      const streak = updateContributionStreak(reputation);
      return {
        ...streak,
        verificationsGiven: (reputation.verificationsGiven || 0) + 1,
        points: (reputation.points || 0) + 5,
      };
    });

    const formatted = formatComplaint(complaint, req.user.role);
    req.app.get('io')?.emit('verification_added', formatted);

    res.status(200).json({
      success: true,
      message: 'Issue verified successfully',
      data: formatted,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message || 'Server error',
    });
  }
};

// @desc    Get complaints around coordinates
// @route   GET /api/complaints/nearby?lat=&lng=&radiusKm=
// @access  Private
exports.getNearbyComplaints = async (req, res) => {
  try {
    const lat = Number(req.query.lat);
    const lng = Number(req.query.lng);
    const radiusKm = Math.max(0.2, Number(req.query.radiusKm) || 2);

    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      return res.status(400).json({
        success: false,
        message: 'lat and lng query params are required',
      });
    }

    const complaints = await Complaint.find({
      coordinates: {
        $near: {
          $geometry: { type: 'Point', coordinates: [lng, lat] },
          $maxDistance: radiusKm * 1000,
        },
      },
    })
      .populate('userId', 'name email')
      .limit(50);

    res.status(200).json({
      success: true,
      count: complaints.length,
      data: complaints.map((complaint) => formatComplaint(complaint, req.user.role)),
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message || 'Server error',
    });
  }
};

// @desc    Preview AI category suggestion before submitting
// @route   POST /api/complaints/ai-category
// @access  Private
exports.previewCategorySuggestion = async (req, res) => {
  try {
    const { description, attachments } = req.body;
    const normalizedAttachments = normalizeAttachments(attachments);
    const imageDataUrls = normalizedAttachments
      .filter((att) => att.type.startsWith('image/'))
      .map((att) => att.data);
    const suggestion = await suggestCategory({ description, imageDataUrls });

    res.status(200).json({
      success: true,
      data: suggestion,
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message || 'Unable to analyze category',
    });
  }
};


