const mongoose = require('mongoose');

const attendanceSchema = new mongoose.Schema({
  student: {
    type: mongoose.Schema.Types.ObjectId,   // links to a Student
    ref: 'Student',
    required: true
  },
  date: {
    type: String,       // stored as "2026-03-31"
    required: true
  },
  status: {
    type: String,
    enum: ['present', 'absent'],
    required: true
  },
  markedBy: {
    type: mongoose.Schema.Types.ObjectId,   // which teacher marked it
    ref: 'User'
  },
  method: {
    type: String,
    enum: ['face', 'manual'],   // how was it marked
    default: 'manual'
  }
}, { timestamps: true });

module.exports = mongoose.model('Attendance', attendanceSchema);