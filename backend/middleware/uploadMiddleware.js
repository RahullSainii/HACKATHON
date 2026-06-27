const multer = require('multer');
const {
  IMAGE_TYPES,
  VIDEO_TYPES,
  MAX_IMAGE_SIZE,
  MAX_VIDEO_SIZE,
} = require('../utils/uploadService');

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    files: 5,
    fileSize: MAX_VIDEO_SIZE,
  },
  fileFilter(req, file, cb) {
    if (!IMAGE_TYPES.has(file.mimetype) && !VIDEO_TYPES.has(file.mimetype)) {
      return cb(new Error('Only JPG, PNG, WEBP, MP4, WEBM, and MOV uploads are allowed'));
    }

    if (IMAGE_TYPES.has(file.mimetype) && Number(file.size || 0) > MAX_IMAGE_SIZE) {
      return cb(new Error('Images must be under 5MB'));
    }

    return cb(null, true);
  },
});

module.exports = upload;
