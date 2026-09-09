const store = require('./services/store')
const collaboration = require('./services/collaboration')

App({
  onLaunch() {
    store.init()
    let cloudEnabled = false
    if (wx.cloud) {
      try {
        wx.cloud.init({ traceUser: true })
        cloudEnabled = true
      } catch (error) { cloudEnabled = false }
    }
    this.globalData.cloudEnabled = cloudEnabled
    if (cloudEnabled) collaboration.bootstrap().then(user => { if (!user) this.globalData.cloudEnabled = false })
  },
  globalData: {
    brandName: 'ongoing_',
    version: '0.2.0',
    cloudEnabled: false
  }
})
