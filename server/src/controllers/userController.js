const asyncHandler = require('../utils/asyncHandler');
const User = require('../models/User');
const { ROLES } = require('../constants/roles');

// Return all users who have the Agent role
const listAgents = asyncHandler(async (_req, res) => {
  const agents = await User.find({ role: ROLES.AGENT }, '-password').sort({ name: 1 });
  const payload = agents.map((user) => ({
    id: user._id,
    name: user.name,
    email: user.email,
    role: user.role,
  }));

  res.json({ success: true, data: payload });
});

module.exports = { listAgents };



