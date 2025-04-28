const { request } = require('../../utils/request.js');
const app = getApp();

Page({
  data: {
    email: '',
    password: '',
    isRegister: false // 切换登录和注册状态
  },

  // 输入框更新
  onInput(e) {
    const { field } = e.currentTarget.dataset;
    this.setData({ [field]: e.detail.value });
  },

  // 切换登录/注册
  toggleRegister() {
    this.setData({ isRegister: !this.data.isRegister });
  },

  // 提交表单
  async submitForm() {
    const { email, password, isRegister } = this.data;

    // 简单校验
    if (!email || !password) {
      wx.showToast({ title: '请输入邮箱和密码', icon: 'none' });
      return;
    }

    wx.showLoading({ title: isRegister ? '注册中...' : '登录中...' });

    try {
      let res;
      if (isRegister) {
        // 调用注册接口
        res = await request({
          url: '/users/register',
          method: 'POST',
          data: { email, password, name: email }, // 暂时用 email 作为 name
          needAuth: false // 注册不需要认证
        });
      } else {
        // 调用登录接口
        res = await request({
          url: '/users/login',
          method: 'POST',
          data: { email, password },
          needAuth: false // 登录不需要认证
        });
      }

      // 登录/注册成功
      if (res && res.token) {
        wx.setStorageSync('token', res.token);
        app.globalData.token = res.token;
        wx.showToast({ title: isRegister ? '注册成功' : '登录成功', icon: 'success' });

        // 获取用户信息 (可选)
        // try {
        //   const userInfo = await request({ url: '/users/me' });
        //   app.globalData.userInfo = userInfo;
        // } catch (userErr) {
        //   console.error('获取用户信息失败', userErr);
        // }

        // 跳转到设备列表页
        wx.reLaunch({ url: '/pages/deviceList/deviceList' });
      } else {
        throw new Error('无效的响应');
      }
    } catch (err) {
      console.error(isRegister ? '注册失败' : '登录失败', err);
      wx.showToast({
        title: (typeof err === 'string' ? err : (isRegister ? '注册失败' : '登录失败')) + '，请重试',
        icon: 'none'
      });
    } finally {
      wx.hideLoading();
    }
  }
}); 