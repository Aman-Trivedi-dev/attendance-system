const jwt = require('jsonwebtoken');
const User = require('../models/User');

const protect = async (req, res, next) => {
  let token;

  // Check if token exists in request header
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    try {
      // Extract token (header looks like: "Bearer eyJhbGci...")
      token = req.headers.authorization.split(' ')[1];

      // Verify the token is valid and not expired
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      // Attach user info to the request (so routes can use it)
      req.user = await User.findById(decoded.id).select('-password');

      next(); // move on to the actual route
    } catch (error) {
      res.status(401).json({ message: 'Not authorized, token failed' });
    }
  }

  if (!token) {
    res.status(401).json({ message: 'Not authorized, no token' });
  }
};

module.exports = { protect };