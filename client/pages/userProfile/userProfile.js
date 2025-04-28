// userProfile.js
const app = getApp()

Page({
  /**
   * 页面的初始数据
   */
  data: {
    userInfo: {},
    isLoggedIn: false,
  },

  /**
   * 生命周期函数--监听页面加载
   */
  onLoad: function (options) {
    this.checkLoginStatus();
  },

  /**
   * 生命周期函数--监听页面显示
   */
  onShow: function () {
    this.checkLoginStatus();
  },

  /**
   * 检查登录状态
   */
  checkLoginStatus: function () {
    const token = wx.getStorageSync('token');
    const userInfo = wx.getStorageSync('userInfo');
    
    if (token && userInfo) {
      this.setData({
        isLoggedIn: true,
        userInfo: userInfo
      });
    } else {
      this.setData({
        isLoggedIn: false,
        userInfo: {}
      });
    }
  },

  /**
   * 跳转到指定页面
   */
  navigateTo: function (e) {
    const url = e.currentTarget.dataset.url;
    wx.navigateTo({
      url: url
    });
  },

  /**
   * 编辑用户信息
   */
  editUserInfo: function () {
    // 弹出编辑信息选项
    wx.showActionSheet({
      itemList: ['修改头像', '修改昵称', '修改个性签名'],
      success: (res) => {
        const tapIndex = res.tapIndex;
        
        switch (tapIndex) {
          case 0: // 修改头像
            this.changeAvatar();
            break;
          case 1: // 修改昵称
            this.changeNickname();
            break;
          case 2: // 修改个性签名
            this.changeSignature();
            break;
        }
      }
    });
  },

  /**
   * 修改头像
   */
  changeAvatar: function () {
    wx.chooseImage({
      count: 1,
      sizeType: ['compressed'],
      sourceType: ['album', 'camera'],
      success: (res) => {
        const tempFilePaths = res.tempFilePaths;
        
        // 这里应该上传图片到服务器，然后更新用户头像
        // 这里仅示例本地更新
        const userInfo = this.data.userInfo;
        userInfo.avatarUrl = tempFilePaths[0];
        
        this.setData({
          userInfo: userInfo
        });
        
        wx.setStorageSync('userInfo', userInfo);
        
        wx.showToast({
          title: '头像已更新',
          icon: 'success'
        });
      }
    });
  },

  /**
   * 修改昵称
   */
  changeNickname: function () {
    wx.showModal({
      title: '修改昵称',
      editable: true,
      placeholderText: '请输入新昵称',
      content: this.data.userInfo.nickName || '',
      success: (res) => {
        if (res.confirm && res.content) {
          const userInfo = this.data.userInfo;
          userInfo.nickName = res.content;
          
          this.setData({
            userInfo: userInfo
          });
          
          wx.setStorageSync('userInfo', userInfo);
          
          wx.showToast({
            title: '昵称已更新',
            icon: 'success'
          });
        }
      }
    });
  },

  /**
   * 修改个性签名
   */
  changeSignature: function () {
    wx.showModal({
      title: '修改个性签名',
      editable: true,
      placeholderText: '请输入新的个性签名',
      content: this.data.userInfo.signature || '',
      success: (res) => {
        if (res.confirm) {
          const userInfo = this.data.userInfo;
          userInfo.signature = res.content;
          
          this.setData({
            userInfo: userInfo
          });
          
          wx.setStorageSync('userInfo', userInfo);
          
          wx.showToast({
            title: '签名已更新',
            icon: 'success'
          });
        }
      }
    });
  },

  /**
   * 退出登录
   */
  logout: function () {
    wx.showModal({
      title: '提示',
      content: '确定要退出登录吗？',
      success: (res) => {
        if (res.confirm) {
          // 清除登录信息
          wx.removeStorageSync('token');
          wx.removeStorageSync('userInfo');
          
          this.setData({
            isLoggedIn: false,
            userInfo: {}
          });
          
          wx.showToast({
            title: '已退出登录',
            icon: 'success'
          });
        }
      }
    });
  }
}) 