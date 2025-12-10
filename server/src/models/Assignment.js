const mongoose = require('mongoose');

const assignmentSchema = new mongoose.Schema(
  {
    filePair: { type: mongoose.Schema.Types.ObjectId, ref: 'FilePair', required: true, index: true },
    assignedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    assignedByName: { type: String, required: true },
    assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    assignedToName: { type: String, required: true },
    teamTag: { type: String, enum: ['QA1', 'QA2'], required: true, index: true },
    status: { type: String, enum: ['Assigned', 'Completed'], default: 'Assigned', index: true },
    assignedAt: { type: Date, default: Date.now, index: true },
  },
  { timestamps: true }
);

assignmentSchema.index({ filePair: 1, assignedTo: 1 }, { unique: true });

module.exports =
  mongoose.models.Assignment || mongoose.model('Assignment', assignmentSchema);


