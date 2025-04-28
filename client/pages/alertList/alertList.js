const { request } = require('../../utils/request')
const app = getApp()

Page({
  data: {
    alerts: [],
    loading: true,
    error: null,
    filter: { // 筛选条件
      acknowledged: false, // 默认显示未确认
      severity: '' // 严重程度: '', 'info', 'warning', 'critical'
    },
    severityOptions: [
      { value: '', label: '全部严重性' },
      { value: 'info', label: '信息' },
      { value: 'warning', label: '警告' },
      { value: 'critical', label: '严重' }
    ],
    severityIndex: 0 // 当前选中的严重性索引
  },

  onLoad() {
    // 计算初始severityIndex
    this.updateSeverityIndex();
    
    this.loadAlerts()
    
    // 订阅WebSocket告警消息
    app.globalData.wsClient.addMessageHandler(this.handleWebSocketMessage)
  },
  
  onUnload() {
    // 取消订阅WebSocket消息
    app.globalData.wsClient.removeMessageHandler(this.handleWebSocketMessage)
  },
  
  onPullDownRefresh() {
    this.loadAlerts()
  },
  
  handleWebSocketMessage(data) {
    if (data.type === 'alert') {
      // 收到新告警，添加到列表开头
      const alerts = [data.alert, ...this.data.alerts]
      this.setData({ alerts })
    }
  },

  async loadAlerts() {
    this.setData({ loading: true, error: null })
    
    try {
      const alerts = await request({
        url: '/api/alerts',
        method: 'GET'
      })
      
      this.setData({ alerts })
    } catch (error) {
      console.error('加载告警失败:', error)
      this.setData({ 
        error: '加载告警失败，请重试'
      })
    } finally {
      this.setData({ loading: false })
      wx.stopPullDownRefresh()
    }
  },

  // 更新严重性索引
  updateSeverityIndex() {
    const severityIndex = this.data.severityOptions.findIndex(item => item.value === this.data.filter.severity);
    this.setData({ 
      severityIndex: severityIndex >= 0 ? severityIndex : 0 
    });
  },

  async handleAcknowledge(e) {
    const alertId = e.currentTarget.dataset.id
    
    wx.showLoading({
      title: '处理中...',
    })
    
    try {
      await request({
        url: `/api/alerts/${alertId}/acknowledge`,
        method: 'POST'
      })
      
      // 更新告警状态
      const alerts = this.data.alerts.map(alert => {
        if (alert.id === alertId) {
          return { ...alert, acknowledged: true }
        }
        return alert
      })
      
      this.setData({ alerts })
      
      wx.showToast({
        title: '已确认',
        icon: 'success'
      })
    } catch (error) {
      console.error('确认告警失败:', error)
      wx.showToast({
        title: '确认失败',
        icon: 'error'
      })
    } finally {
      wx.hideLoading()
    }
  },

  // 切换确认状态筛选
  toggleAcknowledgedFilter() {
    this.setData({
      'filter.acknowledged': !this.data.filter.acknowledged
    });
    this.loadAlerts(); // 重新获取数据
  },

  // 更改严重性筛选
  onSeverityChange(e) {
    const index = e.detail.value;
    this.setData({
      'filter.severity': this.data.severityOptions[index].value,
      severityIndex: index
    });
    this.loadAlerts(); // 重新获取数据
  },
}); 