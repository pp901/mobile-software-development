const store = require('../../services/store')
const cloud = require('../../services/collaboration')

Page({
  data: { chapters: [], moments: [], limit: 3, expanded: false, hasMore: false, echo: null, echoImageFailed: false },
  onShow() { this.load(); cloud.refreshAll().then(() => this.load()) },
  load() {
    const now = new Date()
    const all = store.getMoments()
    const stats = store.getLifeStats()
    const echo = store.getEchoMoment()
    const chapters = store.getChapters('ONGOING').map(chapter => {
      const recentPhoto = all.find(moment => moment.chapterId === chapter.id && moment.image)
      return Object.assign({}, chapter, { homeCover: chapter.displayCover || (recentPhoto && recentPhoto.image) || '' })
    })
    this.setData({
      chapters, moments: all.slice(0, this.data.limit), total: all.length, hasMore: all.length > this.data.limit,
      echo, echoImageFailed: this.data.echo && echo && this.data.echo.id === echo.id ? this.data.echoImageFailed : false,
      todayDay: String(now.getDate()).padStart(2, '0'), todayMonth: now.getFullYear() + '年 ' + (now.getMonth() + 1) + '月',
      weekday: '星期' + '日一二三四五六'[now.getDay()], todayCount: stats.todayMomentCount,
      draft: store.getEditorDraft(store.getCurrentUser().id + ':new')
    })
  },
  onReachBottom() { if (this.data.expanded && this.data.hasMore) { this.setData({ limit: this.data.limit + 15 }); this.load() } },
  onPullDownRefresh() { cloud.refreshAll().finally(() => { this.load(); wx.stopPullDownRefresh() }) },
  coverError(event) { this.setData({ ['chapters[' + event.currentTarget.dataset.index + '].homeCover']: '' }) },
  openChapter(event) { wx.navigateTo({ url: '/pages/chapter/detail/index?id=' + event.currentTarget.dataset.id }) },
  openMoment(event) { wx.navigateTo({ url: '/pages/moment/detail/index?id=' + event.detail.id }) },
  createChapter() { wx.navigateTo({ url: '/pages/chapter/editor/index' }) },
  createMoment() { wx.navigateTo({ url: '/pages/moment/editor/index' }) },
  resumeDraft() { this.createMoment() },
  openEcho() { if (this.data.echo) wx.navigateTo({ url: '/pages/moment/detail/index?id=' + this.data.echo.id + '&echo=1' }) },
  echoImageError() { this.setData({ echoImageFailed: true }) },
  openSearch() { wx.navigateTo({ url: '/pages/search/index' }) },
  toggleRecent() { const expanded = !this.data.expanded; this.setData({ expanded, limit: expanded ? 18 : 3 }); this.load() }
})
