// app.js
App({
  onLaunch() {
    // 检查登录状态
    const token = wx.getStorageSync('token');
    if (!token) {
      // 如果没有 token，跳转到登录页
      wx.reLaunch({ // 使用 reLaunch 关闭所有页面，打开到应用内的某个页面
        url: '/pages/login/login'
      });
    }
    // 可以添加全局数据
    this.globalData = {
      userInfo: null,
      token: token,
      // 后端 API 基础 URL，请根据实际情况修改
      baseUrl: 'http://localhost:5000/api' // 示例 URL
    };
  },
  globalData: {
    userInfo: null,
    token: null,
    baseUrl: 'http://localhost:5000/api' // 示例 URL
  }
}); 