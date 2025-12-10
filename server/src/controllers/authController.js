const asyncHandler = require('../utils/asyncHandler');
const User = require('../models/User');
const { signToken } = require('../utils/token');
const { ROLES } = require('../constants/roles');

const signup = asyncHandler(async (req, res) => {
  const { name, email, password, confirmPassword } = req.body;

  if (!name || !email || !password || !confirmPassword) {
    res.status(400);
    throw new Error('All fields are required');
  }

  if (password !== confirmPassword) {
    res.status(400);
    throw new Error('Password and confirm password must match');
  }

  const existing = await User.findOne({ email });
  if (existing) {
    res.status(409);
    throw new Error('Email already registered');
  }

  const user = await User.create({ name, email, password, role: ROLES.USER });
  const token = signToken({ id: user._id, role: user.role });

  res.status(201).json({
    success: true,
    token,
    user: { id: user._id, name: user.name, email: user.email, role: user.role },
  });
});

const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    res.status(400);
    throw new Error('Email and password are required');
  }

  const user = await User.findOne({ email });
  if (!user) {
    res.status(401);
    throw new Error('Invalid credentials');
  }

  const isValid = await user.comparePassword(password);
  if (!isValid) {
    res.status(401);
    throw new Error('Invalid credentials');
  }

  const token = signToken({ id: user._id, role: user.role });
  res.json({
    success: true,
    token,
    user: { id: user._id, name: user.name, email: user.email, role: user.role },
  });
});

const currentUser = asyncHandler(async (req, res) => {
  res.json({ success: true, user: req.user });
});

module.exports = { signup, login, currentUser };


