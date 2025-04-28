// Socket.io服务，用于实时数据传输和通知

let io = null;

// 初始化Socket.io实例
const init = (socketIo) => {
  io = socketIo;
  
  io.on('connection', (socket) => {
    console.log('新的客户端连接:', socket.id);
    
    // 用户认证
    socket.on('authenticate', (token) => {
      // 这里可以实现验证逻辑
      console.log('客户端认证:', socket.id);
    });
    
    // 订阅设备数据
    socket.on('subscribeToDevice', (deviceId) => {
      console.log(`客户端 ${socket.id} 订阅设备 ${deviceId}`);
      socket.join(`device:${deviceId}`);
    });
    
    // 取消订阅设备
    socket.on('unsubscribeFromDevice', (deviceId) => {
      console.log(`客户端 ${socket.id} 取消订阅设备 ${deviceId}`);
      socket.leave(`device:${deviceId}`);
    });
    
    // 订阅告警
    socket.on('subscribeToAlerts', () => {
      console.log(`客户端 ${socket.id} 订阅所有告警`);
      socket.join('alerts');
    });
    
    // 连接断开
    socket.on('disconnect', () => {
      console.log('客户端断开连接:', socket.id);
    });
  });
};

// 向特定设备的订阅者发送数据
const sendDeviceData = (deviceId, data) => {
  if (!io) return;
  
  io.to(`device:${deviceId}`).emit('deviceData', {
    deviceId,
    timestamp: new Date(),
    data
  });
};

// 向特定设备的订阅者发送状态更新
const sendDeviceStatus = (deviceId, status) => {
  if (!io) return;
  
  io.to(`device:${deviceId}`).emit('deviceStatus', {
    deviceId,
    timestamp: new Date(),
    status
  });
};

// 发送告警通知
const sendAlert = (alert) => {
  if (!io) return;
  
  io.to('alerts').emit('newAlert', alert);
  
  // 如果告警与特定设备相关，也发送给该设备的订阅者
  if (alert.deviceId) {
    io.to(`device:${alert.deviceId}`).emit('deviceAlert', alert);
  }
};

// 通用事件发送方法
const emitEvent = (eventName, data) => {
  if (!io) return;
  
  switch (eventName) {
    case 'newAlert':
      io.to('alerts').emit(eventName, data);
      if (data.deviceId) {
        io.to(`device:${data.deviceId}`).emit('deviceAlert', data);
      }
      break;
    case 'deviceData':
      if (data.deviceId) {
        io.to(`device:${data.deviceId}`).emit(eventName, data);
      }
      break;
    case 'alertStatusChanged':
      io.to('alerts').emit(eventName, data);
      break;
    default:
      // 广播给所有连接的客户端
      io.emit(eventName, data);
  }
};

module.exports = {
  init,
  sendDeviceData,
  sendDeviceStatus,
  sendAlert,
  emitEvent
}; 