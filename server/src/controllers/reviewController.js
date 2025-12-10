const asyncHandler = require('../utils/asyncHandler');
const Assignment = require('../models/Assignment');
const Review = require('../models/Review');
const FilePair = require('../models/FilePair');
const { REVIEW_STATUSES, SOLD_STATUSES, FILE_STATUSES } = require('../constants/statuses');

const getAssignmentsForQA = asyncHandler(async (req, res) => {
  const assignments = await Assignment.find({
    assignedTo: req.user.id,
    status: 'Assigned',
  })
    .populate('filePair')
    .sort({ assignedAt: -1 });

  res.json({ success: true, data: assignments });
});

const submitReview = asyncHandler(async (req, res) => {
  const { assignmentId, soldStatus, reviewStatus, comment = '' } = req.body;

  if (!assignmentId || !soldStatus || !reviewStatus) {
    res.status(400);
    throw new Error('assignmentId, soldStatus, and reviewStatus are required');
  }

  if (!SOLD_STATUSES.includes(soldStatus)) {
    res.status(400);
    throw new Error('Invalid sold status');
  }

  if (!REVIEW_STATUSES.includes(reviewStatus)) {
    res.status(400);
    throw new Error('Invalid review status');
  }

  const assignment = await Assignment.findById(assignmentId).populate('filePair').populate('assignedBy');

  if (!assignment) {
    res.status(404);
    throw new Error('Assignment not found');
  }

  if (assignment.assignedTo.toString() !== req.user.id.toString()) {
    res.status(403);
    throw new Error('You are not authorized to review this assignment');
  }

  if (assignment.status === 'Completed') {
    res.status(400);
    throw new Error('This assignment has already been completed');
  }

  const review = await Review.create({
    filePair: assignment.filePair._id,
    reviewer: req.user.id,
    reviewerName: req.user.name,
    teamTag: assignment.teamTag,
    status: reviewStatus,
    soldStatus,
    comment,
    assignedManager: assignment.assignedBy?._id,
    assignedManagerName: assignment.assignedByName,
  });

  assignment.status = 'Completed';
  await assignment.save();

  assignment.filePair.status = FILE_STATUSES.COMPLETED;
  assignment.filePair.completedAt = new Date();
  await assignment.filePair.save();

  res.json({ success: true, review });
});

const listReviews = asyncHandler(async (req, res) => {
  const filters = { reviewer: req.user.id };
  const reviews = await Review.find(filters).populate('filePair');
  res.json({ success: true, data: reviews });
});

module.exports = { getAssignmentsForQA, submitReview, listReviews };


