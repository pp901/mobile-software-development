const store = require('./services/store')
const collaboration = require('./services/collaboration')

App({
  onLaunch() {
    try { store.init(true) } catch (error) { wx.showModal({title:'无法读取记录',content:error.message,showCancel:false}); return }
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
    clearTimeout(this.resumeTimer)
    this.resumeTimer = setTimeout(() => this.syncVisible(), 120)
    clearInterval(this.syncTimer)
    this.syncTimer = setInterval(() => this.syncVisible(), 30000)
  },
  onHide() { this.visible = false; clearTimeout(this.resumeTimer); clearInterval(this.syncTimer) },
  async syncVisible() {
    if (!this.globalData.cloudEnabled || this.online === false || this.syncing) return
    this.syncing = true
    try {
      if (!await collaboration.bootstrap(true)) return
      let pages = getCurrentPages()
      let page = pages[pages.length - 1]
      const route = page && page.route || ''
      const chapterPage = ['pages/chapter/detail/index', 'pages/chapter/members/index', 'pages/review/index'].includes(route)
      if (chapterPage || route === 'pages/moment/detail/index') {
        await collaboration.flush()
        if (page.data.id) {
          if (chapterPage) await collaboration.pullChapter(page.data.id)
          else await collaboration.pullMoment(page.data.id)
        }
      } else await collaboration.refreshAll({ identityChecked: true })
      if (!this.visible) return
      pages = getCurrentPages()
      page = pages[pages.length - 1]
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
