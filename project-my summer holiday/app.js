const store = require('./services/store')
const collaboration = require('./services/collaboration')

App({
  onLaunch() {
    try { store.init() } catch (error) { wx.showModal({title:'无法读取记录',content:error.message,showCancel:false}); return }
    let cloudEnabled = false
    if (wx.cloud) {
      try {
        // 环境 ID 与 AppID 分别配置；数据库集合仍需在此环境中创建。
        wx.cloud.init({ env: 'cloud1-d3gkyt79x24b49e66', traceUser: true })
        cloudEnabled = true
      } catch (error) { cloudEnabled = false; this.globalData.cloudInitError = error.errMsg || error.message }
    }
    this.globalData.cloudEnabled = cloudEnabled
    if (wx.onNetworkStatusChange) wx.onNetworkStatusChange(event => { this.online = event.isConnected; if (event.isConnected && this.visible) this.syncVisible() })
  },
  onShow() {
    this.visible = true
    this.syncVisible()
    clearInterval(this.syncTimer)
    this.syncTimer = setInterval(() => this.syncVisible(), 30000)
  },
  onHide() { this.visible = false; clearInterval(this.syncTimer) },
  async syncVisible() {
    if (!this.globalData.cloudEnabled || this.online === false || this.syncing) return
    this.syncing = true
    try {
      await collaboration.refreshAll()
      if (!this.visible) return
      const pages = getCurrentPages()
      const page = pages[pages.length - 1]
      const readers = ['pages/index/index', 'pages/history/index', 'pages/profile/index', 'pages/chapter/detail/index', 'pages/chapter/members/index', 'pages/moment/detail/index', 'pages/review/index']
      if (page && readers.includes(page.route) && typeof page.load === 'function') page.load()
    } finally { this.syncing = false }
  },
  globalData: {
    brandName: 'ongoing_',
    version: '0.3.0',
    cloudEnabled: false
  }
})
