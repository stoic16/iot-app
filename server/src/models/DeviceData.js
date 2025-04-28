const mongoose = require('mongoose');

const DeviceDataSchema = new mongoose.Schema({
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
  timestamp: {
    type: Date,
    default: Date.now,
    index: true
  },
  data: {
    type: Map,
    of: mongoose.Schema.Types.Mixed,
    required: true
  },
  dataType: {
    type: String,
    enum: ['telemetry', 'attribute', 'command', 'event'],
    default: 'telemetry'
  },
  metadata: {
    type: Map,
    of: mongoose.Schema.Types.Mixed,
    default: {}
  }
}, {
  timestamps: true
});

// 为时间和设备标识符创建复合索引
DeviceDataSchema.index({ deviceIdentifier: 1, timestamp: -1 });

// 创建TTL索引，自动删除30天前的数据（可根据需求调整）
DeviceDataSchema.index({ timestamp: 1 }, { expireAfterSeconds: 30 * 24 * 60 * 60 });

module.exports = mongoose.model('DeviceData', DeviceDataSchema); 