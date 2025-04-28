const express = require('express');
const router = express.Router();
const DeviceData = require('../../models/DeviceData');
const Device = require('../../models/Device');
const auth = require('../../middleware/auth');

// @route   GET api/data/recent
// @desc    获取最近的设备数据
// @access  Private
router.get('/recent', auth, async (req, res) => {
  const { limit = 20 } = req.query;
  
  try {
    const recentData = await DeviceData.find({ dataType: 'telemetry' })
      .sort({ timestamp: -1 })
      .limit(parseInt(limit))
      .populate('deviceId', 'name deviceId type');
    
    res.json(recentData);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('服务器错误');
  }
});

// @route   GET api/data/device/:deviceId
// @desc    获取指定设备的数据
// @access  Private
router.get('/device/:deviceId', auth, async (req, res) => {
  const { from, to, limit = 100 } = req.query;
  
  try {
    // 首先查找设备
    const device = await Device.findOne({ deviceId: req.params.deviceId });
    
    if (!device) {
      return res.status(404).json({ msg: '未找到设备' });
    }
    
    // 创建查询条件
    const query = { 
      deviceIdentifier: req.params.deviceId,
      dataType: 'telemetry'
    };
    
    if (from && to) {
      query.timestamp = { 
        $gte: new Date(from),
        $lte: new Date(to)
      };
    } else if (from) {
      query.timestamp = { $gte: new Date(from) };
    } else if (to) {
      query.timestamp = { $lte: new Date(to) };
    }
    
    // 查询数据
    const deviceData = await DeviceData.find(query)
      .sort({ timestamp: -1 })
      .limit(parseInt(limit));
    
    res.json(deviceData);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('服务器错误');
  }
});

// @route   GET api/data/aggregate/device/:deviceId
// @desc    聚合设备的数据（用于图表等）
// @access  Private
router.get('/aggregate/device/:deviceId', auth, async (req, res) => {
  const { field, from, to, interval = 'hour' } = req.query;
  
  // 验证必要的参数
  if (!field) {
    return res.status(400).json({ msg: '缺少必要的参数: field' });
  }
  
  try {
    // 首先查找设备
    const device = await Device.findOne({ deviceId: req.params.deviceId });
    
    if (!device) {
      return res.status(404).json({ msg: '未找到设备' });
    }
    
    // 创建时间范围
    let timeRange = {};
    if (from && to) {
      timeRange = { 
        $gte: new Date(from),
        $lte: new Date(to)
      };
    } else if (from) {
      timeRange = { $gte: new Date(from) };
    } else if (to) {
      timeRange = { $lte: new Date(to) };
    } else {
      // 默认最近24小时
      timeRange = { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) };
    }
    
    // 确定时间分组格式
    let dateFormat;
    switch (interval) {
      case 'minute':
        dateFormat = { year: '$year', month: '$month', day: '$dayOfMonth', hour: '$hour', minute: '$minute' };
        break;
      case 'hour':
        dateFormat = { year: '$year', month: '$month', day: '$dayOfMonth', hour: '$hour' };
        break;
      case 'day':
        dateFormat = { year: '$year', month: '$month', day: '$dayOfMonth' };
        break;
      case 'month':
        dateFormat = { year: '$year', month: '$month' };
        break;
      default:
        dateFormat = { year: '$year', month: '$month', day: '$dayOfMonth', hour: '$hour' };
    }
    
    // 聚合查询
    const aggregatedData = await DeviceData.aggregate([
      {
        $match: {
          deviceIdentifier: req.params.deviceId,
          dataType: 'telemetry',
          timestamp: timeRange,
          [`data.${field}`]: { $exists: true }
        }
      },
      {
        $addFields: {
          fieldValue: { $toDouble: `$data.${field}` }
        }
      },
      {
        $group: {
          _id: {
            date: dateFormat
          },
          avgValue: { $avg: '$fieldValue' },
          minValue: { $min: '$fieldValue' },
          maxValue: { $max: '$fieldValue' },
          count: { $sum: 1 },
          lastTimestamp: { $max: '$timestamp' }
        }
      },
      {
        $sort: { 'lastTimestamp': 1 }
      },
      {
        $project: {
          _id: 0,
          date: '$_id.date',
          avgValue: 1,
          minValue: 1,
          maxValue: 1,
          count: 1,
          timestamp: '$lastTimestamp'
        }
      }
    ]);
    
    res.json(aggregatedData);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('服务器错误');
  }
});

// @route   POST api/data/manual
// @desc    手动添加设备数据（测试用）
// @access  Private/Admin
router.post('/manual', auth, async (req, res) => {
  // 验证用户是否为管理员
  if (req.user.role !== 'admin') {
    return res.status(403).json({ msg: '没有权限' });
  }
  
  const { deviceId, data, timestamp, dataType = 'telemetry' } = req.body;
  
  try {
    // 检查设备是否存在
    const device = await Device.findOne({ deviceId });
    
    if (!device) {
      return res.status(404).json({ msg: '未找到设备' });
    }
    
    // 创建新数据记录
    const newData = new DeviceData({
      deviceId: device._id,
      deviceIdentifier: deviceId,
      data: new Map(Object.entries(data)),
      dataType,
      timestamp: timestamp ? new Date(timestamp) : new Date()
    });
    
    const savedData = await newData.save();
    
    // 更新设备的最后活动时间
    await Device.findByIdAndUpdate(device._id, {
      lastActivity: new Date()
    });
    
    res.json(savedData);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('服务器错误');
  }
});

// @route   DELETE api/data/:id
// @desc    删除数据记录
// @access  Private/Admin
router.delete('/:id', auth, async (req, res) => {
  // 验证用户是否为管理员
  if (req.user.role !== 'admin') {
    return res.status(403).json({ msg: '没有权限' });
  }
  
  try {
    const data = await DeviceData.findById(req.params.id);
    
    if (!data) {
      return res.status(404).json({ msg: '未找到数据记录' });
    }
    
    await data.remove();
    
    res.json({ msg: '数据记录已删除' });
  } catch (err) {
    console.error(err.message);
    if (err.kind === 'ObjectId') {
      return res.status(404).json({ msg: '未找到数据记录' });
    }
    res.status(500).send('服务器错误');
  }
});

module.exports = router; 