const store = require('./services/store')
const collaboration = require('./services/collaboration')

App({
  onLaunch() {
    try { store.init() } catch (error) { wx.showModal({title:'无法读取记录',content:error.message,showCancel:false}); return }
    let cloudEnabled = false
    if (wx.cloud) {
      try {
        wx.cloud.init({ traceUser: true })
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
