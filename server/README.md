# IoT应用平台后端

这是一个物联网设备管理平台的后端服务，提供设备管理、数据收集、实时监控和告警功能。

## 技术栈

- **Node.js/Express**: Web服务器框架
- **MongoDB/Mongoose**: 数据库和ODM
- **MQTT**: 物联网通信协议
- **Socket.IO**: 实时通信
- **JWT**: 用户认证

## 功能特性

- 设备管理（添加、更新、删除设备）
- 实时数据采集与存储
- 历史数据查询与分析
- 设备命令下发
- 基于规则的告警机制
- 用户认证与授权
- 实时数据推送

## 快速开始

### 前置条件

- Node.js (v14+)
- MongoDB
- MQTT代理（如Mosquitto）

### 安装步骤

1. 克隆仓库
```bash
git clone <仓库地址>
cd iot-app/server
```

2. 安装依赖
```bash
npm install
```

3. 配置环境变量
创建`.env`文件并添加以下内容：
```
PORT=5000
MONGO_URI=mongodb://localhost:27017/iot_platform
JWT_SECRET=your_jwt_secret
MQTT_BROKER=mqtt://localhost:1883
NODE_ENV=development
```

4. 启动服务
```bash
npm run dev
```

服务将在 http://localhost:5000 上运行。

## API文档

详细的API文档可在 [API_DOCUMENTATION.md](./API_DOCUMENTATION.md) 中查看。

主要API端点包括：

- `/api/devices` - 设备管理
- `/api/users` - 用户管理
- `/api/data` - 数据管理
- `/api/alerts` - 告警管理

## 项目结构

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

## 开发指南

### 添加新的设备类型

1. 在 `models/Device.js` 中更新设备类型枚举
2. 根据需要在前端添加对应的UI组件

### 添加新的API端点

1. 在 `api/routes` 中创建新的路由文件
2. 在 `app.js` 中注册路由
3. 更新API文档

## 部署

### 开发环境
```bash
npm run dev
```

### 生产环境
```bash
npm start
```

## 许可证

ISC License 