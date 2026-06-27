const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const complaintController = require('../controllers/complaintController');
const authMiddleware = require('../middleware/authMiddleware');
const adminMiddleware = require('../middleware/adminMiddleware');
const upload = require('../middleware/uploadMiddleware');

// Validation rules
const complaintValidation = [
  body('category')
    .isIn([
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
    ])
    .withMessage('Invalid category'),
  body('location')
    .trim()
    .notEmpty()
    .withMessage('Location is required'),
  body('latitude')
    .optional({ values: 'falsy' })
    .isFloat({ min: -90, max: 90 })
    .withMessage('Latitude must be between -90 and 90'),
  body('longitude')
    .optional({ values: 'falsy' })
    .isFloat({ min: -180, max: 180 })
    .withMessage('Longitude must be between -180 and 180'),
  body('description')
    .trim()
    .notEmpty()
    .withMessage('Description is required')
    .isLength({ min: 10 })
    .withMessage('Description must be at least 10 characters'),
  body('priority')
    .optional()
    .isIn(['Low', 'Medium', 'High'])
    .withMessage('Invalid priority'),
  body('isAnonymous')
    .optional()
    .isBoolean()
    .withMessage('isAnonymous must be true or false')
    .toBoolean(),
];

const statusValidation = [
  body('status')
    .optional()
    .isIn(['Pending', 'In Progress', 'Resolved'])
    .withMessage('Invalid status'),
  body('handledBy')
    .optional()
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Handled by must be between 2 and 100 characters'),
  body().custom((value, { req }) => {
    if (!req.body.status && !req.body.handledBy) {
      throw new Error('Status or handledBy must be provided');
    }
    return true;
  }),
];

// Routes
router.post('/ai-category', authMiddleware, complaintController.previewCategorySuggestion);
router.post('/', authMiddleware, upload.array('files', 5), complaintValidation, complaintController.submitComplaint);
router.get('/my', authMiddleware, complaintController.getMyComplaints);
router.get('/nearby', authMiddleware, complaintController.getNearbyComplaints);
router.get('/', authMiddleware, complaintController.getComplaints);
router.get('/:id', authMiddleware, complaintController.getComplaintById);
router.post('/:id/verify', authMiddleware, complaintController.verifyComplaint);
router.patch('/:id/status', authMiddleware, adminMiddleware, statusValidation, complaintController.updateStatus);

module.exports = router;


