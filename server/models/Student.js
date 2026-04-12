const mongoose = require('mongoose');

const studentSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  rollNumber: {
    type: String,
    required: true,
    unique: true
  },
  class: {
    type: String,
    required: true
  },
  faceDescriptor: {
    type: [Number],
    default: []
  },
  faceRegistered: {
    type: Boolean,
    default: false        // ← this must exist
  },
  faceRegisteredAt: {
    type: Date,
    default: null         // ← this must exist
  },
  photo: {
    type: String,
    default: ''
  }
}, { timestamps: true });

module.exports = mongoose.model('Student', studentSchema);