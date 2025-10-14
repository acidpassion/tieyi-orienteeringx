const mongoose = require('mongoose');

// Model for existing match_result collection
const matchResultSchema = new mongoose.Schema({
    gameId: {
        type: String,
        required: true,
        trim: true
    },
    id: {
        type: String,
        required: true,
        trim: true
    }
    // All other fields from the external API data will be stored directly
}, {
    timestamps: true,
    collection: 'match_result', // Explicitly specify collection name
    strict: false // Allow additional fields from API response
});

// Create compound index for duplication checking
matchResultSchema.index({ gameId: 1, id: 1 }, { unique: true });

module.exports = mongoose.model('MatchResult', matchResultSchema);