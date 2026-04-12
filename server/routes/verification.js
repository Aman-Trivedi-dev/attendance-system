const express = require('express');
const router  = express.Router();
const ctrl    = require('../controllers/verificationController');
const { protect } = require('../middleware/authMiddleware');
const multer  = require('multer');

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 },
});

router.get('/:studentId/faces',                protect, ctrl.getFaceData);
router.post('/add-face',                       protect, ctrl.addFaceEmbedding);
router.delete('/:studentId/face/:embeddingId', protect, ctrl.deleteEmbedding);
router.post('/generate-otp',                   protect, ctrl.generateOTP);
router.post('/verify-otp',                     protect, ctrl.verifyOTP);
router.post('/verify-face',                    protect, ctrl.verifyFace);

// ZIP upload
router.post('/upload-zip', protect, upload.single('zipFile'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: 'No file uploaded' });

    let AdmZip;
    try {
      AdmZip = require('adm-zip');
    } catch {
      return res.status(500).json({ message: 'adm-zip not installed. Run: npm install adm-zip' });
    }

    const zip     = new AdmZip(req.file.buffer);
    const entries = zip.getEntries().filter(e => {
      const ext = e.entryName.toLowerCase();
      return ext.endsWith('.jpg') || ext.endsWith('.jpeg') || ext.endsWith('.png');
    });

    res.json({
      message: `ZIP processed: ${entries.length} images found`,
      files:   entries.map(e => ({ name: e.entryName, size: e.header.size }))
    });
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

module.exports = router;