const FaceData  = require('../models/FaceData');
const Student   = require('../models/Student');
const crypto    = require('crypto');

// GET face data for a student
exports.getFaceData = async (req, res) => {
  try {
    const faceData = await FaceData.findOne({ student: req.params.studentId });
    if (!faceData) return res.json({ registered: false, embeddings: [] });
    res.json({
      registered: faceData.embeddings.length > 0,
      embeddings: faceData.embeddings,
      count:      faceData.embeddings.length,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// POST add face embedding(s)
exports.addFaceEmbedding = async (req, res) => {
  try {
    const { studentId, descriptor, label, quality } = req.body;

    let faceData = await FaceData.findOne({ student: studentId });
    if (!faceData) {
      faceData = new FaceData({ student: studentId, embeddings: [] });
    }

    // Check duplicate embedding
    const THRESHOLD = 0.45;
    for (const existing of faceData.embeddings) {
      const dist = euclideanDistance(descriptor, existing.descriptor);
      if (dist < THRESHOLD) {
        return res.status(400).json({
          message: 'This face is already registered',
          duplicate: true,
          existingLabel: existing.label
        });
      }
    }

    faceData.embeddings.push({ descriptor, label: label || `face_${faceData.embeddings.length + 1}`, quality: quality || 0.8 });
    await faceData.save();

    // Also update Student model
    await Student.findByIdAndUpdate(studentId, {
      faceRegistered:   true,
      faceRegisteredAt: new Date(),
      faceDescriptor:   descriptor, // primary descriptor
    });

    res.json({
      message:  'Face embedding saved',
      count:    faceData.embeddings.length,
      embeddings: faceData.embeddings
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// DELETE a specific face embedding
exports.deleteEmbedding = async (req, res) => {
  try {
    const { studentId, embeddingId } = req.params;
    const faceData = await FaceData.findOne({ student: studentId });
    if (!faceData) return res.status(404).json({ message: 'No face data found' });

    faceData.embeddings = faceData.embeddings.filter(e => e._id.toString() !== embeddingId);

    if (faceData.embeddings.length === 0) {
      await Student.findByIdAndUpdate(studentId, {
        faceRegistered:   false,
        faceRegisteredAt: null,
        faceDescriptor:   [],
      });
    }

    await faceData.save();
    res.json({ message: 'Embedding deleted', count: faceData.embeddings.length });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// POST generate OTP for 2-step verification
exports.generateOTP = async (req, res) => {
  try {
    const { studentId } = req.body;
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 min

    let faceData = await FaceData.findOne({ student: studentId });
    if (!faceData) faceData = new FaceData({ student: studentId, embeddings: [] });

    faceData.otp          = crypto.createHash('sha256').update(otp).digest('hex');
    faceData.otpExpiresAt = expiresAt;
    await faceData.save();

    // In production: send OTP via SMS/email
    // For demo: return in response (remove in production)
    console.log(`OTP for student ${studentId}: ${otp}`);
    res.json({ message: 'OTP generated', otp, expiresAt }); // remove otp in production
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// POST verify OTP
exports.verifyOTP = async (req, res) => {
  try {
    const { studentId, otp } = req.body;
    const faceData = await FaceData.findOne({ student: studentId });

    if (!faceData || !faceData.otp) {
      return res.status(400).json({ message: 'No OTP found. Request a new one.' });
    }

    if (new Date() > faceData.otpExpiresAt) {
      return res.status(400).json({ message: 'OTP expired. Request a new one.' });
    }

    const hashedInput = crypto.createHash('sha256').update(otp).digest('hex');
    if (hashedInput !== faceData.otp) {
      return res.status(400).json({ message: 'Invalid OTP' });
    }

    faceData.otp          = null;
    faceData.otpExpiresAt = null;
    faceData.verifiedAt   = new Date();
    await faceData.save();

    res.json({ message: 'Verification successful', verifiedAt: faceData.verifiedAt });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// POST verify face against stored embeddings
exports.verifyFace = async (req, res) => {
  try {
    const { studentId, descriptor } = req.body;
    const faceData = await FaceData.findOne({ student: studentId });

    if (!faceData || faceData.embeddings.length === 0) {
      return res.status(404).json({
        verified: false,
        message: 'Registered face is not valid'
      });
    }

    const THRESHOLD = 0.5;
    let bestMatch = null;
    let bestDistance = Infinity;

    for (const embedding of faceData.embeddings) {
      const dist = euclideanDistance(descriptor, embedding.descriptor);
      if (dist < bestDistance) {
        bestDistance = dist;
        bestMatch = embedding;
      }
    }

    if (bestDistance < THRESHOLD) {
      res.json({
        verified:   true,
        confidence: Math.round((1 - bestDistance) * 100),
        matchedFace: bestMatch.label,
        message:    'Face verified successfully'
      });
    } else {
      res.json({
        verified:   false,
        confidence: Math.round((1 - bestDistance) * 100),
        message:    'Registered face is not valid'
      });
    }
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Helper
function euclideanDistance(a, b) {
  return Math.sqrt(a.reduce((sum, val, i) => sum + Math.pow(val - b[i], 2), 0));
}