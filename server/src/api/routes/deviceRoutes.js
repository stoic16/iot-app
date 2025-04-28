const express = require('express');
const router = express.Router();
const Device = require('../../models/Device');
const DeviceData = require('../../models/DeviceData');
const auth = require('../../middleware/auth');
const mqttService = require('../../services/mqttService');

// @route   GET api/devices
// @desc    获取所有设备
// @access  Private
router.get('/', auth, async (req, res) => {
  try {
    const devices = await Device.find().sort({ createdAt: -1 });
    res.json(devices);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('服务器错误');
  }
});

// @route   GET api/devices/:id
// @desc    根据ID获取设备
// @access  Private
router.get('/:id', auth, async (req, res) => {
  try {
    const device = await Device.findById(req.params.id);
    
    if (!device) {
      return res.status(404).json({ msg: '未找到设备' });
    }
    
    res.json(device);
  } catch (err) {
    console.error(err.message);
    if (err.kind === 'ObjectId') {
      return res.status(404).json({ msg: '未找到设备' });
    }
    res.status(500).send('服务器错误');
  }
});

// @route   POST api/devices
// @desc    创建新设备
// @access  Private
router.post('/', auth, async (req, res) => {
  const {
    name,
    deviceId,
    type,
    location,
    description,
    attributes,
    telemetry
  } = req.body;
  
  try {
    // 检查设备ID是否已存在
    let existingDevice = await Device.findOne({ deviceId });
    if (existingDevice) {
      return res.status(400).json({ msg: '设备ID已存在' });
    }
    
    const newDevice = new Device({
      name,
      deviceId,
      type,
      location,
      description,
      owner: req.user.id,
      attributes: attributes ? new Map(Object.entries(attributes)) : new Map(),
      telemetry: telemetry || []
    });
    
    const device = await newDevice.save();
    res.json(device);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('服务器错误');
  }
});

// @route   PUT api/devices/:id
// @desc    更新设备
// @access  Private
router.put('/:id', auth, async (req, res) => {
  const {
    name,
    type,
    location,
    description,
    status,
    attributes,
    telemetry
  } = req.body;
  
  // 构建设备对象
  const deviceFields = {};
  if (name) deviceFields.name = name;
  if (type) deviceFields.type = type;
  if (location) deviceFields.location = location;
  if (description) deviceFields.description = description;
  if (status) deviceFields.status = status;
  if (attributes) deviceFields.attributes = new Map(Object.entries(attributes));
  if (telemetry) deviceFields.telemetry = telemetry;
  
  try {
    let device = await Device.findById(req.params.id);
    
    if (!device) {
      return res.status(404).json({ msg: '未找到设备' });
    }
    
    // 更新设备
    device = await Device.findByIdAndUpdate(
      req.params.id,
      { $set: deviceFields },
      { new: true }
    );
    
    res.json(device);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('服务器错误');
  }
});

// @route   DELETE api/devices/:id
// @desc    删除设备
// @access  Private
router.delete('/:id', auth, async (req, res) => {
  try {
    const device = await Device.findById(req.params.id);
    
    if (!device) {
      return res.status(404).json({ msg: '未找到设备' });
    }
    
    // 检查用户权限
    if (device.owner.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(401).json({ msg: '没有权限' });
    }
    
    await device.remove();
    
    res.json({ msg: '设备已删除' });
  } catch (err) {
    console.error(err.message);
    if (err.kind === 'ObjectId') {
      return res.status(404).json({ msg: '未找到设备' });
    }
    res.status(500).send('服务器错误');
  }
});

// @route   GET api/devices/:id/data
// @desc    获取设备的最新数据
// @access  Private
router.get('/:id/data', auth, async (req, res) => {
  try {
    const device = await Device.findById(req.params.id);
    
    if (!device) {
      return res.status(404).json({ msg: '未找到设备' });
    }
    
    // 获取设备的最新数据
    const latestData = await DeviceData.find({ 
      deviceId: req.params.id,
      dataType: 'telemetry'
    })
    .sort({ timestamp: -1 })
    .limit(20);
    
    res.json(latestData);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('服务器错误');
  }
});

// @route   GET api/devices/:id/data/history
// @desc    获取设备的历史数据
// @access  Private
router.get('/:id/data/history', auth, async (req, res) => {
  const { start, end, limit = 100 } = req.query;
  
  try {
    const device = await Device.findById(req.params.id);
    
    if (!device) {
      return res.status(404).json({ msg: '未找到设备' });
    }
    
    // 构建查询条件
    const query = { deviceId: req.params.id, dataType: 'telemetry' };
    
    if (start && end) {
      query.timestamp = {
        $gte: new Date(start),
        $lte: new Date(end)
      };
    } else if (start) {
      query.timestamp = { $gte: new Date(start) };
    } else if (end) {
      query.timestamp = { $lte: new Date(end) };
    }
    
    // 获取设备的历史数据
    const historyData = await DeviceData.find(query)
      .sort({ timestamp: -1 })
      .limit(parseInt(limit));
    
    res.json(historyData);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('服务器错误');
  }
});

// @route   POST api/devices/:id/command
// @desc    向设备发送命令
// @access  Private
router.post('/:id/command', auth, async (req, res) => {
  const { command, params } = req.body;
  
  try {
    const device = await Device.findById(req.params.id);
    
    if (!device) {
      return res.status(404).json({ msg: '未找到设备' });
    }
    
    // 发送命令到设备
    const success = mqttService.publishToDevice(
      device.deviceId,
      'command',
      {
        command,
        params,
        timestamp: new Date(),
        sender: req.user.id
      }
    );
    
    if (success) {
      res.json({ msg: '命令已发送', device: device.deviceId, command });
    } else {
      res.status(500).json({ msg: '发送命令失败' });
    }
  } catch (err) {
    console.error(err.message);
    res.status(500).send('服务器错误');
  }
});

module.exports = router; 