const mongoose = require('mongoose');

const documentSchema = new mongoose.Schema({
  filename: {
    type: String,
    required: true
  },
  originalName: {
    type: String,
    required: true
  },
  mimeType: {
    type: String,
    required: true,
    enum: [
      'image/jpeg',
      'image/png', 
      'image/gif',
      'image/webp',
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ]
  },
  fileSize: {
    type: Number,
    required: true,
    max: 5 * 1024 * 1024 // 5MB limit
  },
  data: {
    type: Buffer,
    required: true
  },
  uploadedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  uploadedAt: {
    type: Date,
    default: Date.now
  },
  description: {
    type: String,
    maxlength: 200
  }
}, {
  timestamps: true
});

// Index for faster queries
documentSchema.index({ uploadedBy: 1, uploadedAt: -1 });

module.exports = mongoose.model('Document', documentSchema);