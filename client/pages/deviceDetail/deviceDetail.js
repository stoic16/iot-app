const { request } = require('../../utils/request.js');
import * as echarts from '../../components/ec-canvas/echarts'; // 引入 echarts

let chart = null;

// 初始化图表函数
function initChart(canvas, width, height, dpr) {
  chart = echarts.init(canvas, null, {
    width: width,
    height: height,
    devicePixelRatio: dpr // new
  });
  canvas.setChart(chart);

  const option = {
    tooltip: {
        trigger: 'axis'
    },
    legend: {
        data:[] // 动态设置
    },
    grid: {
        left: '3%',
        right: '4%',
        bottom: '3%',
        containLabel: true
    },
    xAxis: {
        type: 'time', // 使用时间轴
        boundaryGap: false,
    },
    yAxis: {
        type: 'value'
    },
    series: [] // 动态设置
  };

  chart.setOption(option);
  return chart;
}


Page({
  data: {
    deviceId: null,
    deviceInfo: null,
    latestData: null,
    historyData: [],
    isLoading: false,
    error: null,
    activeTab: 'info', // 'info', 'data', 'history', 'control'
    ec: {
      onInit: initChart
    },
    // 控制相关
    commandName: '',
    commandParams: '',
    telemetryUnits: {}, // 存储遥测数据点的单位信息
  },

  onLoad: function (options) {
    if (options.id) {
      this.setData({ deviceId: options.id });
      this.fetchAllData();
    } else {
      this.setData({ error: '缺少设备ID' });
      wx.showToast({ title: '缺少设备ID', icon: 'none' });
    }
  },

  // 获取所有数据
  fetchAllData() {
    this.fetchDeviceInfo();
    this.fetchLatestData();
    this.fetchHistoryData();
  },

  // 更新遥测数据点单位信息
  updateTelemetryUnits() {
    if (!this.data.deviceInfo || !this.data.deviceInfo.telemetry) return;
    
    const telemetryUnits = {};
    this.data.deviceInfo.telemetry.forEach(item => {
      if (item.key && item.unit) {
        telemetryUnits[item.key] = item.unit;
      }
    });
    
    this.setData({ telemetryUnits });
  },

  // 获取设备基本信息
  async fetchDeviceInfo() {
    if (!this.data.deviceId) return;
    this.setData({ isLoading: true, error: null });
    wx.showLoading({ title: '加载中...' });
    try {
      const deviceInfo = await request({ url: `/devices/${this.data.deviceId}` });
      this.setData({ deviceInfo, isLoading: false });
      this.updateTelemetryUnits(); // 更新遥测数据点单位信息
      wx.setNavigationBarTitle({ title: deviceInfo.name || '设备详情' }); // 更新导航栏标题
    } catch (err) {
      console.error('获取设备信息失败', err);
      this.setData({ error: '加载设备信息失败', isLoading: false });
      wx.showToast({ title: '加载失败', icon: 'none' });
    } finally {
      wx.hideLoading();
      wx.stopPullDownRefresh();
    }
  },

  // 获取设备最新数据
  async fetchLatestData() {
    if (!this.data.deviceId) return;
    try {
      const data = await request({ url: `/devices/${this.data.deviceId}/data` });
      // 简单处理，取第一条作为最新数据
      this.setData({ latestData: data && data.length > 0 ? data[0] : null });
    } catch (err) {
      console.error('获取最新数据失败', err);
    }
  },

  // 获取设备历史数据
  async fetchHistoryData() {
    if (!this.data.deviceId) return;
    try {
      const historyData = await request({ url: `/devices/${this.data.deviceId}/data/history?limit=50` }); // 获取最近50条
      this.setData({ historyData: historyData || [] });
      this.updateChart(historyData || []); // 更新图表
    } catch (err) {
      console.error('获取历史数据失败', err);
    }
  },

  // 更新图表数据
  updateChart(historyData) {
    if (!chart || !historyData || historyData.length === 0) {
      // 如果没有图表实例或没有数据，可以清空或显示提示
       if(chart) chart.setOption({ series: [] });
      return;
    }

    // 假设所有历史数据点都有相同的 key 结构
    const firstDataPoint = historyData[0].data;
    if (!firstDataPoint) return;

    const keys = Object.keys(firstDataPoint);
    const seriesData = keys.map(key => ({
      name: key,
      type: 'line',
      smooth: true,
      data: historyData.map(item => [
        new Date(item.timestamp).getTime(), // ECharts 时间轴需要时间戳
        item.data[key] !== undefined && item.data[key] !== null && !isNaN(parseFloat(item.data[key])) ? parseFloat(item.data[key]) : null // 转换为数字，无效值为 null
      ]).filter(point => point[1] !== null) // 过滤掉无效数据点
    }));

    chart.setOption({
        legend: {
            data: keys
        },
        series: seriesData
    });
  },

  // 切换 Tab
  switchTab(e) {
    const tab = e.currentTarget.dataset.tab;
    this.setData({ activeTab: tab });
    // 如果切换到历史数据tab且图表未初始化或数据为空，尝试加载
    if (tab === 'history' && (!chart || this.data.historyData.length === 0)) {
        this.fetchHistoryData();
    }
  },

  // 下拉刷新
  onPullDownRefresh: function () {
    this.fetchAllData();
  },

  // --- 控制相关 --- (根据后端 API_DOCUMENTATION.md)
  onCommandInput(e) {
    const { field } = e.currentTarget.dataset;
    this.setData({ [field]: e.detail.value });
  },

  async sendCommand() {
    const { deviceId, commandName, commandParams } = this.data;
    if (!commandName) {
      wx.showToast({ title: '请输入命令名称', icon: 'none' });
      return;
    }

    let paramsObj = {};
    if (commandParams) {
      try {
        paramsObj = JSON.parse(commandParams); // 尝试解析 JSON 参数
      } catch (e) {
        wx.showToast({ title: '参数格式无效 (应为 JSON)', icon: 'none' });
        return;
      }
    }

    wx.showLoading({ title: '发送中...' });
    try {
      const result = await request({
        url: `/devices/${deviceId}/command`,
        method: 'POST',
        data: {
          command: commandName,
          params: paramsObj
        }
      });
      wx.showToast({ title: result.msg || '命令已发送', icon: 'success' });
      this.setData({ commandName: '', commandParams: '' }); // 清空输入
    } catch (err) {
      console.error('发送命令失败', err);
      wx.showToast({ title: '发送失败，请重试', icon: 'none' });
    } finally {
      wx.hideLoading();
    }
  }
}); 