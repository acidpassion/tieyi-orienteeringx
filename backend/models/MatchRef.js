const mongoose = require('mongoose');

// Model for existing match_ref collection
const matchRefSchema = new mongoose.Schema({
  gameId: {
    type: String,
    required: true,
    trim: true
  },
  name: {
    type: String,
    required: true,
    trim: true
  }
  // All other fields from the external API data will be stored directly
}, {
  timestamps: true,
  collection: 'match_ref', // Explicitly specify collection name
  strict: false // Allow additional fields from API response
});

// Create compound index for duplication checking
matchRefSchema.index({ gameId: 1, name: 1 }, { unique: true });

module.exports = mongoose.model('MatchRef', matchRefSchema);