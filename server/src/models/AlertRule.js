const mongoose = require('mongoose');

const AlertRuleSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    trim: true
  },
  deviceType: {
    type: String,
    enum: ['sensor', 'controller', 'gateway', 'other', 'all'],
    default: 'all'
  },
  deviceIds: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Device'
  }],
  condition: {
    field: {
      type: String,
      required: true
    },
    operator: {
      type: String,
      enum: ['>', '<', '>=', '<=', '==', '!='],
      required: true
    },
    value: {
      type: mongoose.Schema.Types.Mixed,
      required: true
    }
  },
  severity: {
    type: String,
    enum: ['warning', 'critical', 'info'],
    default: 'warning'
  },
  status: {
    type: String,
    enum: ['active', 'inactive'],
    default: 'active'
  },
  actions: [{
    type: {
      type: String,
      enum: ['email', 'sms', 'notification', 'webhook'],
      required: true
    },
    config: {
      type: Map,
      of: mongoose.Schema.Types.Mixed,
      default: {}
    }
  }],
  cooldownPeriod: {
    type: Number,
    default: 300,  // 秒数，默认5分钟
    min: 0
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  lastTriggered: {
    type: Date
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('AlertRule', AlertRuleSchema); 