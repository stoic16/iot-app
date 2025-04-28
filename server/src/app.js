const express = require('express');
const cors = require('cors');
const http = require('http');
const socketIo = require('socket.io');
const mongoose = require('mongoose');
const path = require('path');
const config = require('../config/default');
require('dotenv').config();

// 初始化Express应用
const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

// 中间件
app.use(cors());
app.use(express.json());

// 数据库连接
mongoose.connect(config.mongoURI)
  .then(() => console.log('MongoDB 连接成功'))
  .catch(err => {
    console.error('MongoDB 连接失败:', err.message);
    process.exit(1);
  });

// 导入路由
const deviceRoutes = require('./api/routes/deviceRoutes');
const userRoutes = require('./api/routes/userRoutes');
const dataRoutes = require('./api/routes/dataRoutes');
const alertRoutes = require('./api/routes/alertRoutes');

// 路由中间件
app.use('/api/devices', deviceRoutes);
app.use('/api/users', userRoutes);
app.use('/api/data', dataRoutes);
app.use('/api/alerts', alertRoutes);

// 静态文件服务
if (config.environment === 'production') {
  app.use(express.static(path.join(__dirname, '../client/build')));
  app.get('*', (req, res) => {
    res.sendFile(path.resolve(__dirname, '../client', 'build', 'index.html'));
  });
}

// Socket.io 连接处理
const socketService = require('./services/socketService');
socketService.init(io);

// 初始化 MQTT 服务
const mqttService = require('./services/mqttService');
mqttService.connect();

// 错误处理中间件
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ message: '服务器错误' });
});

// 启动服务器
const PORT = config.port;
server.listen(PORT, () => console.log(`服务器运行在端口 ${PORT}`));

module.exports = { app, server, io }; 