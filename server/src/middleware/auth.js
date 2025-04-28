const jwt = require('jsonwebtoken');
const config = require('../../config/default');
const User = require('../models/User');

module.exports = async function(req, res, next) {
  // 从请求头获取token
  const token = req.header('x-auth-token');

  // 检查是否有token
  if (!token) {
    return res.status(401).json({ msg: '没有提供令牌，授权失败' });
  }

  try {
    // 验证token
    const decoded = jwt.verify(token, config.jwtSecret);
    
    // 将用户信息添加到请求对象
    req.user = decoded.user;
    
    // 如果需要，可以从数据库获取完整的用户信息
    const user = await User.findById(req.user.id).select('-password');
    if (!user) {
      return res.status(401).json({ msg: '无效的用户令牌' });
    }
    
    // 检查用户是否被禁用
    if (!user.isActive) {
      return res.status(401).json({ msg: '用户账户已被禁用' });
    }
    
    // 更新用户的角色信息
    req.user.role = user.role;
    
    next();
  } catch (err) {
    console.error('令牌验证失败:', err.message);
    res.status(401).json({ msg: '令牌无效' });
  }
}; 