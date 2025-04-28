const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const config = require('../../../config/default');
const User = require('../../models/User');
const auth = require('../../middleware/auth');

// @route   POST api/users/register
// @desc    注册用户
// @access  Public
router.post('/register', async (req, res) => {
  const { username, email, password, firstname, lastname, phone } = req.body;

  try {
    // 检查用户是否已存在
    let user = await User.findOne({ email });
    if (user) {
      return res.status(400).json({ msg: '用户已存在' });
    }

    user = await User.findOne({ username });
    if (user) {
      return res.status(400).json({ msg: '用户名已被使用' });
    }

    // 创建新用户
    user = new User({
      username,
      email,
      password,
      firstname,
      lastname,
      phone,
      role: 'user' // 默认角色
    });

    await user.save();

    // 创建JWT令牌
    const payload = {
      user: {
        id: user.id,
        role: user.role
      }
    };

    jwt.sign(
      payload,
      config.jwtSecret,
      { expiresIn: config.jwtExpiration },
      (err, token) => {
        if (err) throw err;
        res.json({ token });
      }
    );
  } catch (err) {
    console.error(err.message);
    res.status(500).send('服务器错误');
  }
});

// @route   POST api/users/login
// @desc    用户登录 & 获取token
// @access  Public
router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  try {
    // 根据邮箱查找用户
    let user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ msg: '邮箱或密码无效' });
    }

    // 检查用户是否被禁用
    if (!user.isActive) {
      return res.status(401).json({ msg: '用户账户已被禁用' });
    }

    // 验证密码
    const isMatch = await user.matchPassword(password);
    if (!isMatch) {
      return res.status(400).json({ msg: '邮箱或密码无效' });
    }

    // 更新最后登录时间
    user.lastLogin = Date.now();
    await user.save();

    // 创建JWT令牌
    const payload = {
      user: {
        id: user.id,
        role: user.role
      }
    };

    jwt.sign(
      payload,
      config.jwtSecret,
      { expiresIn: config.jwtExpiration },
      (err, token) => {
        if (err) throw err;
        res.json({ token });
      }
    );
  } catch (err) {
    console.error(err.message);
    res.status(500).send('服务器错误');
  }
});

// @route   GET api/users/me
// @desc    获取当前用户信息
// @access  Private
router.get('/me', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password');
    if (!user) {
      return res.status(404).json({ msg: '未找到用户' });
    }
    res.json(user);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('服务器错误');
  }
});

// @route   PUT api/users/me
// @desc    更新当前用户信息
// @access  Private
router.put('/me', auth, async (req, res) => {
  const { firstname, lastname, phone, preferences } = req.body;

  // 构建更新对象
  const updateFields = {};
  if (firstname) updateFields.firstname = firstname;
  if (lastname) updateFields.lastname = lastname;
  if (phone) updateFields.phone = phone;
  if (preferences) updateFields.preferences = preferences;

  try {
    // 更新用户信息
    const user = await User.findByIdAndUpdate(
      req.user.id,
      { $set: updateFields },
      { new: true }
    ).select('-password');

    res.json(user);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('服务器错误');
  }
});

// @route   PUT api/users/password
// @desc    更改密码
// @access  Private
router.put('/password', auth, async (req, res) => {
  const { currentPassword, newPassword } = req.body;

  try {
    // 获取用户信息
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ msg: '未找到用户' });
    }

    // 验证当前密码
    const isMatch = await user.matchPassword(currentPassword);
    if (!isMatch) {
      return res.status(400).json({ msg: '当前密码不正确' });
    }

    // 更新密码
    user.password = newPassword;
    await user.save();

    res.json({ msg: '密码已更新' });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('服务器错误');
  }
});

// @route   GET api/users
// @desc    获取所有用户 (仅限管理员)
// @access  Private/Admin
router.get('/', auth, async (req, res) => {
  // 检查用户是否为管理员
  if (req.user.role !== 'admin') {
    return res.status(403).json({ msg: '没有权限访问此资源' });
  }

  try {
    const users = await User.find().select('-password').sort({ createdAt: -1 });
    res.json(users);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('服务器错误');
  }
});

// @route   PUT api/users/:id
// @desc    管理员更新用户 (仅限管理员)
// @access  Private/Admin
router.put('/:id', auth, async (req, res) => {
  // 检查用户是否为管理员
  if (req.user.role !== 'admin') {
    return res.status(403).json({ msg: '没有权限访问此资源' });
  }

  const { role, isActive } = req.body;

  // 构建更新对象
  const updateFields = {};
  if (role) updateFields.role = role;
  if (isActive !== undefined) updateFields.isActive = isActive;

  try {
    // 更新用户信息
    const user = await User.findByIdAndUpdate(
      req.params.id,
      { $set: updateFields },
      { new: true }
    ).select('-password');

    if (!user) {
      return res.status(404).json({ msg: '未找到用户' });
    }

    res.json(user);
  } catch (err) {
    console.error(err.message);
    if (err.kind === 'ObjectId') {
      return res.status(404).json({ msg: '未找到用户' });
    }
    res.status(500).send('服务器错误');
  }
});

module.exports = router; 