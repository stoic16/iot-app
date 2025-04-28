const mqtt = require('mqtt');
const config = require('../../config/default');
const Device = require('../models/Device');
const DeviceData = require('../models/DeviceData');
const alertService = require('./alertService');

let client = null;

// 连接到MQTT代理
const connect = () => {
  try {
    client = mqtt.connect(config.mqttBroker, {
      clientId: `iot_platform_${Math.random().toString(16).substring(2, 10)}`,
      clean: true,
      connectTimeout: 4000,
      reconnectPeriod: 1000
    });

    // 连接事件处理
    client.on('connect', () => {
      console.log('已连接到MQTT代理');
      // 订阅设备主题
      client.subscribe('devices/#', (err) => {
        if (err) {
          console.error('订阅主题失败:', err);
        } else {
          console.log('已订阅设备主题');
        }
      });
    });

    // 消息处理
    client.on('message', async (topic, message) => {
      try {
        const topicParts = topic.split('/');
        if (topicParts.length < 3) return;

        const deviceIdStr = topicParts[1];
        const messageType = topicParts[2]; // 如 telemetry, attributes, status
        
        // 尝试解析消息
        let messageData;
        try {
          messageData = JSON.parse(message.toString());
        } catch (e) {
          console.error('无法解析消息:', e);
          return;
        }

        console.log(`从设备 ${deviceIdStr} 接收到 ${messageType} 数据:`, messageData);

        // 查找设备
        const device = await Device.findOne({ deviceId: deviceIdStr });
        if (!device) {
          console.warn(`未知设备: ${deviceIdStr}`);
          return;
        }

        // 更新设备状态
        if (messageType === 'status') {
          await Device.findByIdAndUpdate(device._id, {
            status: messageData.status,
            lastActivity: new Date()
          });
          return;
        }

        // 保存设备数据
        if (messageType === 'telemetry' || messageType === 'attributes') {
          const newData = new DeviceData({
            deviceId: device._id,
            deviceIdentifier: deviceIdStr,
            data: new Map(Object.entries(messageData)),
            dataType: messageType === 'telemetry' ? 'telemetry' : 'attribute',
            timestamp: new Date()
          });
          await newData.save();

          // 处理实时数据的告警检查
          if (messageType === 'telemetry') {
            await alertService.checkAlertRules(device._id, deviceIdStr, messageData);
          }
        }

      } catch (error) {
        console.error('处理MQTT消息时出错:', error);
      }
    });

    // 错误处理
    client.on('error', (err) => {
      console.error('MQTT客户端错误:', err);
    });

    client.on('close', () => {
      console.log('MQTT连接已关闭');
    });

    client.on('offline', () => {
      console.log('MQTT客户端离线');
    });

  } catch (error) {
    console.error('连接MQTT代理时出错:', error);
  }
};

// 发布消息到设备
const publishToDevice = (deviceId, messageType, data) => {
  if (!client || !client.connected) {
    console.error('MQTT客户端未连接');
    return false;
  }

  try {
    const topic = `devices/${deviceId}/${messageType}`;
    client.publish(topic, JSON.stringify(data), { qos: 1 });
    return true;
  } catch (error) {
    console.error('发布消息时出错:', error);
    return false;
  }
};

module.exports = {
  connect,
  publishToDevice
}; 