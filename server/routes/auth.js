const express = require('express');
const router  = express.Router();
const {
  registerUser,
  loginUser,
  updateEmail,
  updatePassword,
  updateName
} = require('../controllers/authController');
const { protect } = require('../middleware/authMiddleware');

router.post('/register',         registerUser);
router.post('/login',            loginUser);
router.put('/update-email',    protect, updateEmail);
router.put('/update-password', protect, updatePassword);
router.put('/update-name',     protect, updateName);

module.exports = router;