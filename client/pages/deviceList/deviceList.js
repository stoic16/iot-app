const { request } = require('../../utils/request.js');

Page({
  data: {
    devices: [],
    isLoading: false,
    error: null,
  },

  onLoad: function (options) {
    this.fetchDevices();
  },

  onShow: function() {
    // 页面显示时可以考虑刷新数据，特别是从详情页返回时
    // this.fetchDevices();
  },

  // 获取设备列表
  async fetchDevices() {
    if (this.data.isLoading) return;
    this.setData({ isLoading: true, error: null });
    wx.showLoading({ title: '加载中...' });

    try {
      const devices = await request({ url: '/devices' });
      this.setData({ devices: devices || [], isLoading: false });
    } catch (err) {
      console.error('获取设备列表失败', err);
      this.setData({
        error: '加载失败，请稍后重试',
        isLoading: false,
        devices: [] // 清空列表防止显示旧数据
      });
      wx.showToast({ title: '加载失败', icon: 'none' });
    } finally {
      wx.hideLoading();
      wx.stopPullDownRefresh(); // 停止下拉刷新动画
    }
  },

  // 下拉刷新
  onPullDownRefresh: function () {
    this.fetchDevices();
  },

  // 跳转到设备详情
  goToDetail: function (e) {
    const deviceId = e.currentTarget.dataset.id;
    wx.navigateTo({
      url: `/pages/deviceDetail/deviceDetail?id=${deviceId}`,
    });
  },

  // 可以在这里添加跳转到创建设备页面的逻辑（如果需要）
  // goToAddDevice() {
  //   wx.navigateTo({ url: '/pages/addDevice/addDevice' });
  // }
}); 