const mongoose = require('mongoose');

const AlertSchema = new mongoose.Schema({
  deviceId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Device',
    required: true
  },
  deviceIdentifier: {
    type: String,
    required: true,
    index: true
  },
  type: {
    type: String,
    enum: ['warning', 'critical', 'info'],
    default: 'warning'
  },
  status: {
    type: String,
    enum: ['active', 'acknowledged', 'resolved'],
    default: 'active'
  },
  message: {
    type: String,
    required: true
  },
  details: {
    type: Map,
    of: mongoose.Schema.Types.Mixed,
    default: {}
  },
  triggerValue: {
    type: mongoose.Schema.Types.Mixed
  },
  thresholdValue: {
    type: mongoose.Schema.Types.Mixed
  },
  ruleId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'AlertRule'
  },
  timestamp: {
    type: Date,
    default: Date.now,
    index: true
  },
  acknowledgedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  acknowledgedAt: {
    type: Date
  },
  resolvedAt: {
    type: Date
  },
  resolvedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  notes: {
    type: String
  }
}, {
  timestamps: true
});

AlertSchema.index({ deviceIdentifier: 1, timestamp: -1, status: 1 });

module.exports = mongoose.model('Alert', AlertSchema); 