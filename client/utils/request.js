const app = getApp();

const request = (options) => {
  return new Promise((resolve, reject) => {
    const { url, method = 'GET', data = {}, header = {}, needAuth = true } = options;
    const fullUrl = app.globalData.baseUrl + url;

    // 默认请求头
    const defaultHeader = {
      'Content-Type': 'application/json'
    };

    // 如果需要认证，则添加 token
    if (needAuth) {
      const token = wx.getStorageSync('token');
      if (token) {
        defaultHeader['Authorization'] = `Bearer ${token}`; // 假设后端使用 Bearer Token
      } else {
        // 如果需要认证但没有 token，可以选择跳转到登录页或直接拒绝请求
        console.error('请求需要认证，但未找到 token');
        wx.reLaunch({ url: '/pages/login/login' });
        return reject('未登录');
      }
    }

    wx.request({
      url: fullUrl,
      method: method,
      data: data,
      header: { ...defaultHeader, ...header }, // 合并请求头
      success(res) {
        // 简单的状态码判断
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve(res.data);
        } else if (res.statusCode === 401) {
          // 处理未授权情况，例如 token 失效
          console.error('认证失败或 Token 失效', res);
          wx.removeStorageSync('token');
          wx.reLaunch({ url: '/pages/login/login' });
          reject('认证失败');
        } else {
          // 其他错误情况
          console.error(`请求失败 [${res.statusCode}]: ${url}`, res);
          reject(res.data || '请求失败');
        }
      },
      fail(err) {
        console.error(`请求失败: ${url}`, err);
        wx.showToast({
          title: '网络错误，请稍后重试',
          icon: 'none'
        });
        reject(err);
      }
    });
  });
};

module.exports = {
  request
}; 