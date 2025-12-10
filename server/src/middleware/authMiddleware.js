const User = require('../models/User');
const asyncHandler = require('../utils/asyncHandler');
const { verifyToken } = require('../utils/token');

const authMiddleware = asyncHandler(async (req, res, next) => {
  const authHeader = req.headers.authorization || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.split(' ')[1] : null;

  if (!token) {
    res.status(401);
    throw new Error('Authentication required');
  }

  const decoded = verifyToken(token);
  const user = await User.findById(decoded.id).lean();

  if (!user) {
    res.status(401);
    throw new Error('Invalid authentication token');
  }

  req.user = {
    id: user._id,
    name: user.name,
    email: user.email,
    role: user.role,
  };
  next();
});

module.exports = authMiddleware;


