# MQTT设备通信协议

本文档详细说明了物联网设备与平台之间使用MQTT进行通信的协议规范。

## 1. 概述

平台使用MQTT协议与设备进行双向通信。设备通过发布消息到指定主题来上报数据，平台通过特定主题向设备发送命令。

## 2. 连接信息

- **MQTT代理地址**: `mqtt://服务器地址:1883`
- **用户名/密码**: 根据配置决定（可选）
- **TLS/SSL**: 支持（生产环境推荐）
- **QoS级别**: 
  - 设备上报数据: QoS 1（至少一次）
  - 平台下发命令: QoS 1（至少一次）

## 3. 主题结构

### 3.1 设备 → 平台（上行）

设备向以下主题发布消息：

- **遥测数据上报**: `devices/{deviceId}/telemetry`
- **属性上报**: `devices/{deviceId}/attributes`
- **状态上报**: `devices/{deviceId}/status`
- **事件上报**: `devices/{deviceId}/events`
- **命令响应**: `devices/{deviceId}/command/response`

其中 `{deviceId}` 是设备的唯一标识符。

### 3.2 平台 → 设备（下行）

设备需要订阅以下主题以接收平台的消息：

- **命令下发**: `devices/{deviceId}/command`
- **属性设置**: `devices/{deviceId}/attributes/set`
- **配置更新**: `devices/{deviceId}/config`

## 4. 消息格式

所有消息均使用JSON格式，UTF-8编码。

### 4.1 遥测数据上报

```json
{
  "temperature": 25.5,
  "humidity": 60,
  "pressure": 1013.2,
  "timestamp": 1618456789000
}
```

### 4.2 设备属性上报

```json
{
  "firmwareVersion": "1.2.3",
  "ipAddress": "192.168.1.100",
  "batteryLevel": 85,
  "lastBootTime": 1618456000000
}
```

### 4.3 设备状态上报

```json
{
  "status": "online",
  "timestamp": 1618456789000,
  "rssi": -65
}
```

### 4.4 设备事件上报

```json
{
  "eventType": "alert",
  "severity": "warning",
  "message": "温度超过警戒值",
  "data": {
    "temperature": 35.5,
    "threshold": 30
  },
  "timestamp": 1618456789000
}
```

### 4.5 命令下发

```json
{
  "command": "reboot",
  "params": {
    "delay": 10
  },
  "timestamp": 1618456789000,
  "messageId": "cmd-12345"
}
```

### 4.6 命令响应

```json
{
  "messageId": "cmd-12345",
  "status": "success",
  "result": {},
  "timestamp": 1618456799000
}
```

### 4.7 属性设置

```json
{
  "reportInterval": 60,
  "tempThreshold": 30,
  "enableAlerts": true,
  "messageId": "attr-12345"
}
```

## 5. 设备注册与认证

### 5.1 设备注册

设备需要在平台上预先注册，获取唯一的设备ID。

### 5.2 设备认证

设备连接MQTT代理时需要提供认证信息：

- 基于用户名/密码认证
- 基于证书认证（推荐用于生产环境）

## 6. 设备心跳

设备应定期（建议间隔为30-60秒）向 `devices/{deviceId}/status` 主题发送状态消息，以便平台知晓设备在线状态。

## 7. 数据类型

平台支持以下数据类型：

- **number**: 数值型（整数或浮点数）
- **string**: 字符串
- **boolean**: 布尔值（true/false）
- **object**: JSON对象
- **array**: JSON数组

## 8. 时间戳

所有消息中的时间戳应使用Unix时间戳（毫秒），UTC时区。

## 9. 设备命令列表

平台支持向设备发送以下命令：

| 命令名称 | 说明 | 参数 |
|---------|------|------|
| reboot | 重启设备 | delay: 延迟秒数（可选） |
| factoryReset | 恢复出厂设置 | keepNetwork: 是否保留网络配置（可选） |
| updateFirmware | 更新固件 | url: 固件下载地址 |
| setReportInterval | 设置上报间隔 | interval: 间隔秒数 |
| setConfig | 设置设备配置 | config: 配置对象 |
| getData | 立即获取数据 | keys: 数据点键名数组（可选） |

## 10. 错误处理

当设备无法执行命令时，应在命令响应中使用以下格式返回错误信息：

```json
{
  "messageId": "cmd-12345",
  "status": "error",
  "error": {
    "code": 404,
    "message": "参数无效"
  },
  "timestamp": 1618456799000
}
```

常见错误码：

- 400: 请求格式错误
- 401: 认证失败
- 403: 权限不足
- 404: 资源不存在
- 408: 操作超时
- 500: 内部错误

## 11. 消息大小限制

单条MQTT消息的有效载荷不应超过128KB。对于大量数据，建议分批发送。

## 12. 最佳实践

1. **设备唯一标识**: 使用设备序列号或MAC地址等唯一标识作为设备ID
2. **错误重试**:
   - 发送失败时，使用指数退避算法进行重试
   - 建议最多重试3次
3. **连接管理**:
   - 配置合理的keepalive（60-120秒）
   - 处理断线重连逻辑
4. **安全性**:
   - 生产环境使用TLS/SSL
   - 避免在设备中存储明文密码
5. **带宽优化**:
   - 仅发送变化的数据
   - 适当压缩大量数据
   - 优化发送频率

## 13. 示例代码

### Node.js示例 (设备端)

```javascript
const mqtt = require('mqtt');
const deviceId = 'device123';

// 连接MQTT服务器
const client = mqtt.connect('mqtt://broker.example.com:1883', {
  clientId: `device_${deviceId}`,
  username: 'deviceUser',
  password: 'devicePassword',
  clean: true
});

// 连接事件
client.on('connect', function () {
  console.log('已连接到MQTT服务器');
  
  // 订阅命令主题
  client.subscribe(`devices/${deviceId}/command`, function (err) {
    if (!err) {
      console.log('已订阅命令主题');
      
      // 发送状态
      publishStatus('online');
      
      // 每60秒发送一次遥测数据
      setInterval(publishTelemetry, 60000);
    }
  });
});

// 接收消息
client.on('message', function (topic, message) {
  console.log('收到消息:', topic, message.toString());
  
  if (topic === `devices/${deviceId}/command`) {
    try {
      const command = JSON.parse(message.toString());
      handleCommand(command);
    } catch (e) {
      console.error('解析命令失败:', e);
    }
  }
});

// 发送遥测数据
function publishTelemetry() {
  const data = {
    temperature: 25 + Math.random() * 10,
    humidity: 60 + Math.random() * 20,
    timestamp: Date.now()
  };
  
  client.publish(`devices/${deviceId}/telemetry`, JSON.stringify(data), { qos: 1 });
  console.log('已发送遥测数据:', data);
}

// 发送状态
function publishStatus(status) {
  const statusData = {
    status: status,
    timestamp: Date.now()
  };
  
  client.publish(`devices/${deviceId}/status`, JSON.stringify(statusData), { qos: 1 });
  console.log('已发送状态:', statusData);
}

// 处理命令
function handleCommand(command) {
  console.log('处理命令:', command);
  
  const response = {
    messageId: command.messageId,
    status: 'success',
    result: {},
    timestamp: Date.now()
  };
  
  switch (command.command) {
    case 'reboot':
      // 模拟重启
      console.log('设备即将重启...');
      response.result = { message: '重启成功' };
      break;
      
    default:
      response.status = 'error';
      response.error = {
        code: 404,
        message: '未知命令'
      };
  }
  
  // 发送命令响应
  client.publish(`devices/${deviceId}/command/response`, JSON.stringify(response), { qos: 1 });
}

// 错误处理
client.on('error', function (error) {
  console.error('MQTT错误:', error);
});

// 断线处理
client.on('offline', function () {
  console.log('MQTT连接已断开，尝试重连...');
});
``` 