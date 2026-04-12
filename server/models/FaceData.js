const mongoose = require('mongoose');

const faceDataSchema = new mongoose.Schema({
  student: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Student',
    required: true
  },
  embeddings: [{
    descriptor:  { type: [Number], required: true }, // 128-float vector
    label:       { type: String, default: 'primary' }, // primary/secondary/etc
    addedAt:     { type: Date, default: Date.now },
    quality:     { type: Number, default: 0 }, // 0-1 confidence score
  }],
  otp:          { type: String, default: null },
  otpExpiresAt: { type: Date,   default: null },
  verifiedAt:   { type: Date,   default: null },
  loginAttempts:{ type: Number, default: 0 },
  lockedUntil:  { type: Date,   default: null },
}, { timestamps: true });

module.exports = mongoose.model('FaceData', faceDataSchema);