# IoT应用平台后端文档

## 项目概述

本项目是一个物联网设备管理平台的后端服务，基于Node.js和Express框架开发，使用MongoDB作为数据存储，MQTT协议与物联网设备通信，Socket.IO实现实时通信。

### 技术栈

- **Node.js/Express**: Web服务器框架
- **MongoDB/Mongoose**: 数据库和ODM
- **MQTT**: 物联网通信协议
- **Socket.IO**: 实时通信
- **JWT**: 用户认证

### 目录结构

```
server/
├── config/             # 配置文件
├── src/
│   ├── api/            # API路由
│   │   └── routes/     # 路由定义
│   ├── controllers/    # 控制器
│   ├── middleware/     # 中间件
│   ├── models/         # 数据模型
│   ├── services/       # 服务层
│   ├── utils/          # 工具函数
│   └── app.js          # 应用入口
└── package.json        # 项目依赖
```

## 数据模型

### Device 设备模型

```javascript
{
  name: String,           // 设备名称
  deviceId: String,       // 设备ID，唯一标识
  type: String,           // 设备类型：sensor, controller, gateway, other
  location: String,       // 设备位置
  status: String,         // 设备状态：online, offline, maintenance, error
  attributes: Map,        // 设备属性，键值对形式
  telemetry: [{           // 遥测数据点定义
    key: String,          // 数据点名称
    dataType: String,     // 数据类型：number, string, boolean, object
    unit: String          // 单位
  }],
  lastActivity: Date,     // 最后活动时间
  description: String,    // 设备描述
  owner: ObjectId,        // 设备所有者引用User模型
  createdAt: Date,        // 创建时间
  updatedAt: Date         // 更新时间
}
```

### DeviceData 设备数据模型

```javascript
{
  deviceId: ObjectId,     // 设备ID引用Device模型
  deviceIdentifier: String, // 设备标识符
  data: Map,              // 数据内容，键值对形式
  dataType: String,       // 数据类型：telemetry, attribute
  timestamp: Date         // 时间戳
}
```

### User 用户模型

```javascript
{
  name: String,           // 用户名称
  email: String,          // 电子邮件，唯一
  password: String,       // 密码（加密存储）
  role: String,           // 角色：admin, user
  createdAt: Date,        // 创建时间
  updatedAt: Date         // 更新时间
}
```

### Alert 告警模型

```javascript
{
  deviceId: ObjectId,     // 设备ID引用Device模型
  type: String,           // 告警类型
  severity: String,       // 严重程度：info, warning, critical
  message: String,        // 告警消息
  data: Object,           // 相关数据
  acknowledged: Boolean,  // 是否已确认
  timestamp: Date,        // 时间戳
  createdAt: Date,        // 创建时间
  updatedAt: Date         // 更新时间
}
```

### AlertRule 告警规则模型

```javascript
{
  name: String,           // 规则名称
  deviceId: ObjectId,     // 设备ID引用Device模型
  condition: {            // 触发条件
    key: String,          // 监控的数据点键名
    operator: String,     // 比较运算符：gt, lt, eq, neq, gte, lte
    value: Mixed          // 比较值
  },
  severity: String,       // 严重程度：info, warning, critical
  message: String,        // 告警消息模板
  enabled: Boolean,       // 是否启用
  createdAt: Date,        // 创建时间
  updatedAt: Date         // 更新时间
}
```

## API端点

### 设备管理 API

#### 获取所有设备
- **URL**: `/api/devices`
- **方法**: `GET`
- **权限**: 需要认证
- **描述**: 获取所有设备的列表
- **响应**: 设备对象数组

#### 获取单个设备
- **URL**: `/api/devices/:id`
- **方法**: `GET`
- **权限**: 需要认证
- **参数**: 
  - `id`: 设备ID
- **响应**: 设备对象

#### 创建设备
- **URL**: `/api/devices`
- **方法**: `POST`
- **权限**: 需要认证
- **请求体**: 
  ```json
  {
    "name": "设备名称",
    "deviceId": "设备唯一标识",
    "type": "设备类型",
    "location": "设备位置",
    "description": "设备描述",
    "attributes": {},
    "telemetry": []
  }
  ```
- **响应**: 创建的设备对象

#### 更新设备
- **URL**: `/api/devices/:id`
- **方法**: `PUT`
- **权限**: 需要认证
- **参数**: 
  - `id`: 设备ID
- **请求体**: 
  ```json
  {
    "name": "设备名称",
    "type": "设备类型",
    "location": "设备位置",
    "description": "设备描述",
    "status": "设备状态",
    "attributes": {},
    "telemetry": []
  }
  ```
- **响应**: 更新后的设备对象

#### 删除设备
- **URL**: `/api/devices/:id`
- **方法**: `DELETE`
- **权限**: 需要认证，只有设备所有者或管理员可删除
- **参数**: 
  - `id`: 设备ID
- **响应**: 
  ```json
  { "msg": "设备已删除" }
  ```

#### 获取设备最新数据
- **URL**: `/api/devices/:id/data`
- **方法**: `GET`
- **权限**: 需要认证
- **参数**: 
  - `id`: 设备ID
- **响应**: 最新20条设备数据

#### 获取设备历史数据
- **URL**: `/api/devices/:id/data/history`
- **方法**: `GET`
- **权限**: 需要认证
- **参数**: 
  - `id`: 设备ID
  - `start`: 开始时间（可选）
  - `end`: 结束时间（可选）
  - `limit`: 数据条数限制，默认100（可选）
- **响应**: 设备历史数据

#### 发送设备命令
- **URL**: `/api/devices/:id/command`
- **方法**: `POST`
- **权限**: 需要认证
- **参数**: 
  - `id`: 设备ID
- **请求体**: 
  ```json
  {
    "command": "命令名称",
    "params": {}
  }
  ```
- **响应**: 
  ```json
  { 
    "msg": "命令已发送", 
    "device": "设备ID", 
    "command": "命令名称" 
  }
  ```

### 用户管理 API

#### 用户注册
- **URL**: `/api/users/register`
- **方法**: `POST`
- **权限**: 公开
- **请求体**: 
  ```json
  {
    "name": "用户名",
    "email": "用户邮箱",
    "password": "密码"
  }
  ```
- **响应**: 
  ```json
  {
    "token": "JWT令牌"
  }
  ```

#### 用户登录
- **URL**: `/api/users/login`
- **方法**: `POST`
- **权限**: 公开
- **请求体**: 
  ```json
  {
    "email": "用户邮箱",
    "password": "密码"
  }
  ```
- **响应**: 
  ```json
  {
    "token": "JWT令牌"
  }
  ```

#### 获取当前用户信息
- **URL**: `/api/users/me`
- **方法**: `GET`
- **权限**: 需要认证
- **响应**: 用户对象（不包含密码）

### 数据管理 API

#### 获取所有设备的最新数据
- **URL**: `/api/data/latest`
- **方法**: `GET`
- **权限**: 需要认证
- **响应**: 所有设备的最新数据

#### 提交设备数据
- **URL**: `/api/data/submit`
- **方法**: `POST`
- **权限**: 需要认证
- **请求体**: 
  ```json
  {
    "deviceId": "设备ID",
    "data": {},
    "dataType": "telemetry"
  }
  ```
- **响应**: 保存的数据对象

### 告警管理 API

#### 获取所有告警
- **URL**: `/api/alerts`
- **方法**: `GET`
- **权限**: 需要认证
- **查询参数**:
  - `acknowledged`: 筛选已确认/未确认告警（可选）
  - `deviceId`: 按设备筛选（可选）
  - `severity`: 按严重程度筛选（可选）
- **响应**: 告警对象数组

#### 获取单个告警
- **URL**: `/api/alerts/:id`
- **方法**: `GET`
- **权限**: 需要认证
- **参数**: 
  - `id`: 告警ID
- **响应**: 告警对象

#### 确认告警
- **URL**: `/api/alerts/:id/acknowledge`
- **方法**: `PUT`
- **权限**: 需要认证
- **参数**: 
  - `id`: 告警ID
- **响应**: 更新后的告警对象

#### 创建告警规则
- **URL**: `/api/alerts/rules`
- **方法**: `POST`
- **权限**: 需要认证
- **请求体**: 
  ```json
  {
    "name": "规则名称",
    "deviceId": "设备ID",
    "condition": {
      "key": "数据点键名",
      "operator": "比较运算符",
      "value": "比较值"
    },
    "severity": "严重程度",
    "message": "告警消息模板",
    "enabled": true
  }
  ```
- **响应**: 创建的告警规则对象

#### 获取告警规则
- **URL**: `/api/alerts/rules`
- **方法**: `GET`
- **权限**: 需要认证
- **响应**: 告警规则对象数组

#### 更新告警规则
- **URL**: `/api/alerts/rules/:id`
- **方法**: `PUT`
- **权限**: 需要认证
- **参数**: 
  - `id`: 规则ID
- **请求体**: 告警规则对象属性
- **响应**: 更新后的告警规则对象

#### 删除告警规则
- **URL**: `/api/alerts/rules/:id`
- **方法**: `DELETE`
- **权限**: 需要认证
- **参数**: 
  - `id`: 规则ID
- **响应**: 
  ```json
  { "msg": "告警规则已删除" }
  ```

## 服务层

### MQTT服务

MQTT服务提供与物联网设备的通信功能。

#### 主要功能

- 连接到MQTT代理
- 订阅设备主题（devices/#）
- 处理设备发送的消息（遥测数据、属性更新、状态变更等）
- 向设备发送命令

#### MQTT主题结构

- `devices/{deviceId}/telemetry` - 设备遥测数据
- `devices/{deviceId}/attributes` - 设备属性
- `devices/{deviceId}/status` - 设备状态
- `devices/{deviceId}/command` - 设备命令

### Socket.IO服务

Socket.IO服务提供实时通信功能，向前端客户端推送更新。

#### 主要事件

- `device:update` - 设备信息更新
- `device:data` - 新设备数据
- `alert:new` - 新告警
- `alert:update` - 告警状态更新

### 告警服务

告警服务负责检查设备数据是否触发告警规则，并生成告警。

#### 主要功能

- 根据告警规则检查设备数据
- 创建新告警
- 处理告警确认
- 告警通知

## 安装与运行

1. 克隆仓库
2. 安装依赖：`npm install`
3. 配置环境变量（创建.env文件）：
   ```
   PORT=5000
   MONGO_URI=mongodb://localhost:27017/iot_platform
   JWT_SECRET=your_jwt_secret
   MQTT_BROKER=mqtt://localhost:1883
   NODE_ENV=development
   ```
4. 启动应用：`npm run dev`

## 环境变量

| 变量名 | 说明 | 默认值 |
|--------|------|--------|
| PORT | 服务器端口 | 5000 |
| MONGO_URI | MongoDB连接字符串 | mongodb://localhost:27017/iot_platform |
| JWT_SECRET | JWT密钥 | default_jwt_secret_key |
| MQTT_BROKER | MQTT代理地址 | mqtt://localhost:1883 |
| NODE_ENV | 环境（development/production） | development | 