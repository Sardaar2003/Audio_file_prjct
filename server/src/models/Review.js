const mongoose = require('mongoose');
const { REVIEW_STATUSES, SOLD_STATUSES } = require('../constants/statuses');

const reviewSchema = new mongoose.Schema(
  {
    filePair: { type: mongoose.Schema.Types.ObjectId, ref: 'FilePair', required: true, index: true },
    reviewer: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    reviewerName: { type: String, required: true },
    teamTag: { type: String, enum: ['QA1', 'QA2'], required: true, index: true },
    status: { type: String, enum: REVIEW_STATUSES, required: true, index: true },
    soldStatus: { type: String, enum: SOLD_STATUSES, required: true },
    comment: { type: String, default: '' },
    assignedManager: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true },
    assignedManagerName: { type: String },
    reviewedAt: { type: Date, default: Date.now, index: true },
  },
  { timestamps: true }
);

reviewSchema.index({ teamTag: 1, reviewedAt: -1 });
reviewSchema.index({ status: 1 });

module.exports = mongoose.models.Review || mongoose.model('Review', reviewSchema);


