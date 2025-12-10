const asyncHandler = require('../utils/asyncHandler');
const FilePair = require('../models/FilePair');
const Assignment = require('../models/Assignment');
const User = require('../models/User');
const { QA_TEAMS } = require('../constants/roles');
const { FILE_STATUSES } = require('../constants/statuses');

// List only "available" file pairs = not currently assigned to anyone
const listFilePairs = asyncHandler(async (req, res) => {
  const { status = '', search = '', page = 1, limit = 10 } = req.query;
  const filters = {};

  const effectiveStatus = status || FILE_STATUSES.PROCESSING;
  if (effectiveStatus) {
    filters.status = effectiveStatus;
  }

  if (search) {
    filters.baseName = { $regex: search, $options: 'i' };
  }

  // Exclude file pairs that already have an active assignment
  const activeAssignedFileIds = await Assignment.distinct('filePair', { status: 'Assigned' });
  if (activeAssignedFileIds.length) {
    filters._id = { $nin: activeAssignedFileIds };
  }

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

// Assign or reassign a file pair.
// - If no active assignment exists -> create a new "Assigned" record.
// - If an active assignment exists and file is still Processing -> reassign to another QA.
const assignFilePair = asyncHandler(async (req, res) => {
  const { filePairId, qaUserId } = req.body;

  if (!filePairId || !qaUserId) {
    res.status(400);
    throw new Error('filePairId and qaUserId are required');
  }

  const [filePair, qaUser] = await Promise.all([
    FilePair.findById(filePairId),
    User.findById(qaUserId),
  ]);

  if (!filePair) {
    res.status(404);
    throw new Error('File pair not found');
  }

  if (!qaUser || !QA_TEAMS.includes(qaUser.role)) {
    res.status(400);
    throw new Error('Selected user is not part of a QA team');
  }

  // Look for an active assignment on this file
  const activeAssignment = await Assignment.findOne({
    filePair: filePairId,
    status: 'Assigned',
  });

  // If file already fully reviewed, prevent any reassignment
  if (filePair.status === 'Completed' && activeAssignment) {
    res.status(400);
    throw new Error('Completed file pairs cannot be reassigned');
  }

  // Reassign existing record while still in Processing
  if (activeAssignment) {
    activeAssignment.assignedTo = qaUserId;
    activeAssignment.assignedToName = qaUser.name;
    activeAssignment.teamTag = qaUser.role;
    activeAssignment.assignedBy = req.user.id;
    activeAssignment.assignedByName = req.user.name;
    activeAssignment.assignedAt = new Date();
    await activeAssignment.save();

    return res.status(200).json({ success: true, assignment: activeAssignment, mode: 'reassigned' });
  }

  // First-time assignment
  const assignment = await Assignment.create({
    filePair: filePairId,
    assignedBy: req.user.id,
    assignedByName: req.user.name,
    assignedTo: qaUserId,
    assignedToName: qaUser.name,
    teamTag: qaUser.role,
  });

  res.status(201).json({ success: true, assignment, mode: 'created' });
});

const listAssignments = asyncHandler(async (req, res) => {
  const { teamTag = '', qaUserId = '', page = 1, limit = 10 } = req.query;
  const filters = {};

  if (teamTag && QA_TEAMS.includes(teamTag)) {
    filters.teamTag = teamTag;
  }

  if (qaUserId) {
    filters.assignedTo = qaUserId;
  }

  const skip = (Number(page) - 1) * Number(limit);

  const [items, total] = await Promise.all([
    Assignment.find(filters)
      .populate('filePair')
      .populate('assignedTo', 'name role')
      .populate('assignedBy', 'name role')
      .sort({ assignedAt: -1 })
      .skip(skip)
      .limit(Number(limit)),
    Assignment.countDocuments(filters),
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

const listQAUsers = asyncHandler(async (_req, res) => {
  const qaUsers = await User.find({ role: { $in: QA_TEAMS } }, 'name role email');
  const payload = qaUsers.map((user) => ({
    id: user._id,
    name: user.name,
    email: user.email,
    role: user.role,
  }));
  res.json({ success: true, data: payload });
});

module.exports = { listFilePairs, assignFilePair, listAssignments, listQAUsers };


