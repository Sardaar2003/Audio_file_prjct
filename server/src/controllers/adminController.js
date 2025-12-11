const asyncHandler = require('../utils/asyncHandler');
const User = require('../models/User');
const FilePair = require('../models/FilePair');
const Assignment = require('../models/Assignment');
const Review = require('../models/Review');
const { deleteFromS3 } = require('../services/s3Service');
const { ROLES } = require('../constants/roles');

const getStats = asyncHandler(async (_req, res) => {
  const [totalUsers, totalFilePairs, processingCount, completedReviews] = await Promise.all([
    User.countDocuments(),
    FilePair.countDocuments(),
    FilePair.countDocuments({ status: 'Processing' }),
    FilePair.countDocuments({ status: 'Completed' }),
  ]);

  const [recentUploads, recentAssignments, recentReviews] = await Promise.all([
    FilePair.find().sort({ uploadedAt: -1 }).limit(20),
    Assignment.find().sort({ assignedAt: -1 }).limit(20).populate('assignedTo', 'name role').populate('assignedBy', 'name role'),
    Review.find().sort({ reviewedAt: -1 }).limit(20).populate('reviewer', 'name role'),
  ]);

  res.json({
    success: true,
    analytics: {
      totalUsers,
      totalFilePairs,
      processingCount,
      completedReviews,
    },
    uploads: recentUploads,
    assignments: recentAssignments,
    reviews: recentReviews,
  });
});

const listUsers = asyncHandler(async (_req, res) => {
  const users = await User.find({}, '-password').sort({ createdAt: -1 });
  const payload = users.map((user) => ({
    id: user._id,
    name: user.name,
    email: user.email,
    role: user.role,
  }));
  res.json({ success: true, data: payload });
});

const updateUserRole = asyncHandler(async (req, res) => {
  const { userId } = req.params;
  const { role } = req.body;

  if (!role || !Object.values(ROLES).includes(role)) {
    res.status(400);
    throw new Error('Invalid role selected');
  }

  const user = await User.findById(userId);
  if (!user) {
    res.status(404);
    throw new Error('User not found');
  }

  user.role = role;
  await user.save();

  res.json({ success: true, user: { id: user._id, name: user.name, email: user.email, role: user.role } });
});

const deleteUser = asyncHandler(async (req, res) => {
  const { userId } = req.params;

  const user = await User.findById(userId);
  if (!user) {
    res.status(404);
    throw new Error('User not found');
  }

  await user.deleteOne();
  res.json({ success: true });
});

const listFilePairs = asyncHandler(async (req, res) => {
  const { page = 1, limit = 10, status = '', search = '', soldStatus = '' } = req.query;
  const filters = {};

  if (status) filters.status = status;
  if (soldStatus) filters.soldStatus = soldStatus;
  if (search) filters.baseName = { $regex: search, $options: 'i' };

  const skip = (Number(page) - 1) * Number(limit);
  const [items, total] = await Promise.all([
    FilePair.find(filters).sort({ uploadedAt: -1 }).skip(skip).limit(Number(limit)),
    FilePair.countDocuments(filters),
  ]);

  res.json({
    success: true,
    data: items,
    pagination: {
      total,
      page: Number(page),
      pages: Math.ceil(total / Number(limit)) || 1,
    },
  });
});

const deleteFilePair = asyncHandler(async (req, res) => {
  const { filePairId } = req.params;
  const filePair = await FilePair.findById(filePairId);

  if (!filePair) {
    res.status(404);
    throw new Error('File pair not found');
  }

  // Remove linked assets in background best-effort
  await Promise.all([
    deleteFromS3(filePair.audioS3Key),
    deleteFromS3(filePair.textS3Key),
    deleteFromS3(filePair.reviewTextS3Key),
  ]);

  // Clean up relational data to avoid orphans
  await Promise.all([Assignment.deleteMany({ filePair: filePair._id }), Review.deleteMany({ filePair: filePair._id })]);

  await filePair.deleteOne();
  res.json({ success: true });
});

module.exports = { getStats, listUsers, updateUserRole, deleteUser, listFilePairs, deleteFilePair };


