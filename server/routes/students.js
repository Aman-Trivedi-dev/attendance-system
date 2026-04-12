const express = require('express');
const router  = express.Router();
const Student = require('../models/Student');
const { protect } = require('../middleware/authMiddleware');

// GET all students
router.get('/', protect, async (req, res) => {
  try {
    const students = await Student.find().sort({ createdAt: -1 });
    res.json(students);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST add new student
router.post('/', protect, async (req, res) => {
  try {
    const { name, rollNumber, class: className } = req.body;
    const exists = await Student.findOne({ rollNumber });
    if (exists) {
      return res.status(400).json({ message: 'Roll number already exists' });
    }
    const student = await Student.create({ name, rollNumber, class: className });
    res.status(201).json(student);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// PUT update face descriptor
router.put('/:id/face', protect, async (req, res) => {
  try {
    const { faceDescriptor } = req.body;

    console.log('📥 Face save request for ID:', req.params.id);
    console.log('📦 Descriptor length:', faceDescriptor?.length);

    if (!faceDescriptor || !Array.isArray(faceDescriptor)) {
      return res.status(400).json({ message: 'Invalid face descriptor' });
    }

    const student = await Student.findByIdAndUpdate(
      req.params.id,
      {
        $set: {
          faceDescriptor:   faceDescriptor,
          faceRegistered:   true,
          faceRegisteredAt: new Date(),
        }
      },
      { new: true, runValidators: true }
    );

    if (!student) {
      console.log('❌ Student not found:', req.params.id);
      return res.status(404).json({ message: 'Student not found' });
    }

    console.log('✅ Face saved! faceRegistered:', student.faceRegistered);
    res.json(student);
  } catch (err) {
    console.error('❌ Face save error:', err.message);
    res.status(400).json({ message: err.message });
  }
});

// DELETE face only
router.delete('/:id/face', protect, async (req, res) => {
  try {
    const student = await Student.findByIdAndUpdate(
      req.params.id,
      {
        faceDescriptor:   [],
        faceRegistered:   false,
        faceRegisteredAt: null,
      },
      { new: true }
    );
    if (!student) return res.status(404).json({ message: 'Student not found' });
    res.json({ message: 'Face data deleted', student });
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// DELETE student completely
router.delete('/:id', protect, async (req, res) => {
  try {
    const student = await Student.findByIdAndDelete(req.params.id);
    if (!student) return res.status(404).json({ message: 'Student not found' });
    res.json({ message: 'Student deleted successfully' });
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

module.exports = router;