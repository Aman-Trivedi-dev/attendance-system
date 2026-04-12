const express    = require('express');
const router     = express.Router();
const Attendance = require('../models/Attendance');
const Student    = require('../models/Student');
const { protect } = require('../middleware/authMiddleware');

// POST mark attendance
router.post('/', protect, async (req, res) => {
  try {
    const { studentId, date, status, method } = req.body;
    const existing = await Attendance.findOne({ student: studentId, date });
    if (existing) {
      existing.status = status;
      existing.method = method || 'manual';
      await existing.save();
      return res.json(existing);
    }
    const record = await Attendance.create({
      student:  studentId,
      date,
      status,
      method:   method || 'manual',
      markedBy: req.user._id,
    });
    res.status(201).json(record);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// GET attendance by date
router.get('/date/:date', protect, async (req, res) => {
  try {
    const records = await Attendance.find({ date: req.params.date })
      .populate('student', 'name rollNumber class');
    res.json(records);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET attendance by date + class filter
router.get('/date/:date/class/:className', protect, async (req, res) => {
  try {
    const students = await Student.find({ class: req.params.className });
    const ids = students.map(s => s._id);
    const records = await Attendance.find({
      date:    req.params.date,
      student: { $in: ids }
    }).populate('student', 'name rollNumber class');
    res.json(records);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET today stats for dashboard
router.get('/stats/today', protect, async (req, res) => {
  try {
    const today   = new Date().toISOString().split('T')[0];
    const total   = await Student.countDocuments();
    const present = await Attendance.countDocuments({ date: today, status: 'present' });
    const absent  = await Attendance.countDocuments({ date: today, status: 'absent'  });
    res.json({ total, present, absent, date: today });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET weekly data for dashboard chart
router.get('/stats/weekly', protect, async (req, res) => {
  try {
    const days   = ['Mon','Tue','Wed','Thu','Fri','Sat','Today'];
    const result = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr  = d.toISOString().split('T')[0];
      const present  = await Attendance.countDocuments({ date: dateStr, status: 'present' });
      const absent   = await Attendance.countDocuments({ date: dateStr, status: 'absent'  });
      result.push({ day: i === 0 ? 'Today' : days[6 - i], date: dateStr, present, absent });
    }
    res.json(result);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET monthly report
router.get('/stats/monthly/:year/:month', protect, async (req, res) => {
  try {
    const { year, month } = req.params;
    const start = `${year}-${month.padStart(2,'0')}-01`;
    const end   = new Date(year, month, 0).toISOString().split('T')[0];
    const records = await Attendance.find({
      date: { $gte: start, $lte: end }
    }).populate('student', 'name rollNumber class');
    res.json(records);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET all dates that have attendance records
router.get('/dates', protect, async (req, res) => {
  try {
    const dates = await Attendance.distinct('date');
    res.json(dates.sort().reverse());
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;