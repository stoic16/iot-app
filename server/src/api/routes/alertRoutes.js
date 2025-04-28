const express = require('express');
const router = express.Router();
const Alert = require('../../models/Alert');
const AlertRule = require('../../models/AlertRule');
const auth = require('../../middleware/auth');
const alertService = require('../../services/alertService');

// @route   GET api/alerts
// @desc    获取告警列表
// @access  Private
router.get('/', auth, async (req, res) => {
  const { status, severity, deviceId, limit = 50, skip = 0 } = req.query;

  try {
    // 构建查询条件
    const query = {};
    
    if (status) {
      query.status = status;
    }
    
    if (severity) {
      query.type = severity;
    }
    
    if (deviceId) {
      query.deviceIdentifier = deviceId;
    }
    
    // 查询告警并分页
    const alerts = await Alert.find(query)
      .sort({ timestamp: -1 })
      .limit(parseInt(limit))
      .skip(parseInt(skip))
      .populate('deviceId', 'name deviceId type')
      .populate('acknowledgedBy', 'username')
      .populate('resolvedBy', 'username')
      .populate('ruleId', 'name');
    
    // 获取总数
    const total = await Alert.countDocuments(query);
    
    res.json({
      alerts,
      total,
      page: Math.floor(skip / limit) + 1,
      pages: Math.ceil(total / limit)
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('服务器错误');
  }
});

// @route   GET api/alerts/:id
// @desc    获取单个告警详情
// @access  Private
router.get('/:id', auth, async (req, res) => {
  try {
    const alert = await Alert.findById(req.params.id)
      .populate('deviceId', 'name deviceId type')
      .populate('acknowledgedBy', 'username')
      .populate('resolvedBy', 'username')
      .populate('ruleId', 'name condition');
    
    if (!alert) {
      return res.status(404).json({ msg: '未找到告警' });
    }
    
    res.json(alert);
  } catch (err) {
    console.error(err.message);
    if (err.kind === 'ObjectId') {
      return res.status(404).json({ msg: '未找到告警' });
    }
    res.status(500).send('服务器错误');
  }
});

// @route   PUT api/alerts/:id/acknowledge
// @desc    确认告警
// @access  Private
router.put('/:id/acknowledge', auth, async (req, res) => {
  const { notes } = req.body;
  
  try {
    const alert = await Alert.findById(req.params.id);
    
    if (!alert) {
      return res.status(404).json({ msg: '未找到告警' });
    }
    
    if (alert.status !== 'active') {
      return res.status(400).json({ msg: '只能确认处于活动状态的告警' });
    }
    
    const updatedAlert = await alertService.updateAlertStatus(
      req.params.id,
      'acknowledged',
      req.user.id,
      notes
    );
    
    res.json(updatedAlert);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('服务器错误');
  }
});

// @route   PUT api/alerts/:id/resolve
// @desc    解决告警
// @access  Private
router.put('/:id/resolve', auth, async (req, res) => {
  const { notes } = req.body;
  
  try {
    const alert = await Alert.findById(req.params.id);
    
    if (!alert) {
      return res.status(404).json({ msg: '未找到告警' });
    }
    
    if (alert.status === 'resolved') {
      return res.status(400).json({ msg: '告警已经被解决' });
    }
    
    const updatedAlert = await alertService.updateAlertStatus(
      req.params.id,
      'resolved',
      req.user.id,
      notes
    );
    
    res.json(updatedAlert);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('服务器错误');
  }
});

// @route   GET api/alerts/rules
// @desc    获取告警规则列表
// @access  Private
router.get('/rules', auth, async (req, res) => {
  try {
    const rules = await AlertRule.find()
      .sort({ createdAt: -1 })
      .populate('deviceIds', 'name deviceId')
      .populate('createdBy', 'username');
    
    res.json(rules);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('服务器错误');
  }
});

// @route   POST api/alerts/rules
// @desc    创建告警规则
// @access  Private
router.post('/rules', auth, async (req, res) => {
  const {
    name,
    description,
    deviceType,
    deviceIds,
    condition,
    severity,
    actions,
    cooldownPeriod
  } = req.body;
  
  try {
    const newRule = new AlertRule({
      name,
      description,
      deviceType,
      deviceIds: deviceIds || [],
      condition,
      severity,
      actions: actions || [],
      cooldownPeriod,
      createdBy: req.user.id
    });
    
    const rule = await newRule.save();
    res.json(rule);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('服务器错误');
  }
});

// @route   PUT api/alerts/rules/:id
// @desc    更新告警规则
// @access  Private
router.put('/rules/:id', auth, async (req, res) => {
  const {
    name,
    description,
    deviceType,
    deviceIds,
    condition,
    severity,
    status,
    actions,
    cooldownPeriod
  } = req.body;
  
  // 构建规则对象
  const ruleFields = {};
  if (name) ruleFields.name = name;
  if (description !== undefined) ruleFields.description = description;
  if (deviceType) ruleFields.deviceType = deviceType;
  if (deviceIds) ruleFields.deviceIds = deviceIds;
  if (condition) ruleFields.condition = condition;
  if (severity) ruleFields.severity = severity;
  if (status) ruleFields.status = status;
  if (actions) ruleFields.actions = actions;
  if (cooldownPeriod) ruleFields.cooldownPeriod = cooldownPeriod;
  
  try {
    let rule = await AlertRule.findById(req.params.id);
    
    if (!rule) {
      return res.status(404).json({ msg: '未找到告警规则' });
    }
    
    // 更新规则
    rule = await AlertRule.findByIdAndUpdate(
      req.params.id,
      { $set: ruleFields },
      { new: true }
    ).populate('deviceIds', 'name deviceId');
    
    res.json(rule);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('服务器错误');
  }
});

// @route   DELETE api/alerts/rules/:id
// @desc    删除告警规则
// @access  Private
router.delete('/rules/:id', auth, async (req, res) => {
  try {
    const rule = await AlertRule.findById(req.params.id);
    
    if (!rule) {
      return res.status(404).json({ msg: '未找到告警规则' });
    }
    
    // 检查用户权限
    if (rule.createdBy && 
        rule.createdBy.toString() !== req.user.id && 
        req.user.role !== 'admin') {
      return res.status(401).json({ msg: '没有权限' });
    }
    
    await rule.remove();
    
    res.json({ msg: '告警规则已删除' });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('服务器错误');
  }
});

module.exports = router; 