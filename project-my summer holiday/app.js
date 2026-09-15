const store = require('./services/store')
const collaboration = require('./services/collaboration')

App({
  onLaunch() {
    try { store.init() } catch (error) { wx.showModal({title:'无法读取记录',content:error.message,showCancel:false}); return }
    let cloudEnabled = false
    if (wx.cloud) {
      try {
        // 使用已验证的云环境；当前小程序 AppID 仍以 project.config.json 为准。
        wx.cloud.init({ env: 'cloud1-d3gkyt79x24b49e66', traceUser: true })
        cloudEnabled = true
      } catch (error) { cloudEnabled = false }
    }
    this.globalData.cloudEnabled = cloudEnabled
    if (cloudEnabled) collaboration.bootstrap().then(user => { if (user) collaboration.flush() })
    if (wx.onNetworkStatusChange) wx.onNetworkStatusChange(event => { if (event.isConnected) collaboration.flush() })
  },
  globalData: {
    brandName: 'ongoing_',
    version: '0.3.0',
    cloudEnabled: false
  }
})
