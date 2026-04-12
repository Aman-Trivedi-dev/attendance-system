const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true      // must be provided
  },
  email: {
    type: String,
    required: true,
    unique: true        // no two users with same email
  },
  password: {
    type: String,
    required: true      // will be hashed, never stored plain
  },
  role: {
    type: String,
    enum: ['admin', 'teacher', 'principal'],  // only these two values allowed
    default: 'teacher'
  }
}, { timestamps: true });   // auto-adds createdAt and updatedAt

module.exports = mongoose.model('User', userSchema);