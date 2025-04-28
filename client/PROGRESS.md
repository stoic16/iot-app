 # 小程序客户端开发进度

**最后更新时间:** 2025-4-28

## 整体状态

项目已启动，基础框架已搭建。目前已完成用户登录流程、设备列表展示功能和设备详情页面。

## 已完成功能/任务

1.  **项目初始化**:
    *   创建小程序项目结构。
2.  **API 工具封装 (`utils/request.js`)**:
    *   封装 `wx.request` 用于调用后端 API。
    *   实现自动添加 `Authorization` Token。
    *   包含基本的错误处理和 401 未授权跳转逻辑。
    *   添加了用户、设备、数据、告警等后端接口的调用函数。
3.  **用户认证**:
    *   创建登录页面 (`pages/login/login`) UI 和基础样式。
    *   实现登录逻辑，调用后端 `/users/login` 接口。
    *   成功登录后保存 JWT Token 到本地存储 (`wx.setStorageSync`)。
    *   在 `app.js` 中添加启动时检查 Token 的逻辑。
    *   实现未登录时自动跳转到登录页面的逻辑 (在 `pages/deviceList/deviceList` 的 `onShow` 中处理)。
4.  **设备列表 (`pages/deviceList/deviceList`)**:
    *   实现设备列表页面 UI 和基础样式。
    *   调用 `/api/devices` 接口获取设备列表数据。
    *   展示设备名称、ID、类型、位置和状态。
    *   根据设备状态 (`online`, `offline`, `error`, `maintenance`) 显示不同样式。
    *   实现加载中、加载失败、列表为空的提示状态。
    *   实现下拉刷新功能 (`onPullDownRefresh`)。
    *   添加 "添加设备" 按钮 (导航至设备添加页面)。
    *   列表项点击导航至设备详情页面。
5.  **设备详情页面 (`pages/deviceDetail/deviceDetail`)**:
    *   根据设备 ID 从列表页导航。
    *   调用 `/api/devices/:id` 获取设备详细信息并展示。
    *   调用 `/api/devices/:id/data` 获取设备最新数据并展示。
    *   实现设备数据历史记录展示。
    *   实现设备基本信息编辑功能。
    *   实现设备删除功能。
    *   实现设备控制命令发送功能。

## 进行中/下一步计划

1.  **创建设备添加页面 (`pages/deviceAdd/deviceAdd`)**:
    *   设计并实现添加设备表单 UI。
    *   调用 `/api/devices` (POST) 接口创建新设备。
    *   添加成功后返回列表页并刷新。
2.  **WebSocket 集成**:
    *   在 `app.js` 中尝试使用 `wx.cloud.connectContainer` 或原生 WebSocket 连接后端服务。
    *   处理连接、接收消息、断开连接等事件。
    *   根据收到的实时消息更新设备列表状态或设备详情页数据。
3.  **告警页面 (`pages/alertList/alertList`)**:
    *   创建告警列表页面。
    *   调用 `/api/alerts` 获取告警数据。
    *   实现告警确认功能 (`/api/alerts/:id/acknowledge`)。

## 待讨论/潜在问题

*   WebSocket 连接的稳定性和重连机制。
*   历史数据图表展示的 UI/UX 设计和库选择。
*   错误处理和用户提示的细节完善。