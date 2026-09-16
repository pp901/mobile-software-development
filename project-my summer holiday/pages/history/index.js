const store = require('../../services/store')
const cloud = require('../../services/collaboration')
const date = require('../../utils/date')

Page({
  data: {
    reading: 'moments', active: 'all', chapters: [], months: [],
    totalMoments: 0, totalChapters: 0, limit: 15, hasMore: false,
    tabs: [{ key: 'all', label: '全部' }, { key: 'ONGOING', label: '进行中' }, { key: 'COMPLETED', label: '已结束' }]
  },
  onLoad(options) {
    // Old review links still open the complete timeline, including unfiled Moments.
    this.setData({ reading: options.view === 'chapters' ? 'chapters' : 'moments' })
  },
  onShow() { this.load(); cloud.refreshAll({ passive: true }).then(() => this.load()) },
  load() {
    const chapters = store.getChapters()
    const visibleChapters = this.data.active === 'all' ? chapters : chapters.filter(chapter =>
      this.data.active === 'ONGOING' ? chapter.status === 'ONGOING' : chapter.status !== 'ONGOING')
    const all = store.getMoments().sort((a, b) =>
      String(b.localDateKey || '').localeCompare(String(a.localDateKey || '')) ||
      date.timestamp(b.createdAt) - date.timestamp(a.createdAt))
    const months = []
    all.slice(0, this.data.limit).forEach(moment => {
      const key = (moment.localDateKey || '').slice(0, 7)
      let group = months[months.length - 1]
      if (!group || group.key !== key) {
        group = { key, label: date.displayMonth(key) || '日期未记录', days: [] }
        months.push(group)
      }
      let day = group.days[group.days.length - 1]
      if (!day || day.key !== moment.localDateKey) {
        const naturalDate = date.localDate(moment.localDateKey)
        day = { key: moment.localDateKey || 'unknown', label: moment.localDateKey ? String(naturalDate.getDate()).padStart(2, '0') : '—', weekday: moment.localDateKey ? '周' + '日一二三四五六'[naturalDate.getDay()] : '', moments: [] }
        group.days.push(day)
      }
      // The album needs only a short preview; full content and all photos stay in Detail.
      day.moments.push({
        id: moment.id, content: moment.content.slice(0, 180), media: moment.media.slice(0, 4),
        image: moment.image, imageCount: moment.imageCount, dateLabel: moment.dateLabel,
        voicePath: moment.voicePath, voiceDuration: moment.voiceDuration, location: moment.location,
        creator: moment.creator, canEdit: moment.canEdit, participantCount: moment.participantCount
      })
    })
    this.setData({
      chapters: visibleChapters, months, totalMoments: all.length,
      totalChapters: chapters.length, hasMore: all.length > this.data.limit
    })
  },
  onReachBottom() {
    if (this.data.reading === 'moments' && this.data.hasMore) {
      this.setData({ limit: this.data.limit + 15 })
      this.load()
    }
  },
  onPullDownRefresh() {
    cloud.refreshAll().finally(() => { this.load(); wx.stopPullDownRefresh() })
  },
  changeReading(e) { this.setData({ reading: e.currentTarget.dataset.value }) },
  changeTab(e) { this.setData({ active: e.currentTarget.dataset.key }); this.load() },
  openChapter(e) { wx.navigateTo({ url: '/pages/chapter/detail/index?id=' + e.detail.id }) },
  openMoment(e) { wx.navigateTo({ url: '/pages/moment/detail/index?id=' + e.detail.id }) },
  openSearch() { wx.navigateTo({ url: '/pages/search/index' }) },
  joinShared() { wx.navigateTo({ url: '/pages/chapter/join/index' }) },
  createChapter() { wx.navigateTo({ url: '/pages/chapter/editor/index' }) },
  createMoment() { wx.navigateTo({ url: '/pages/moment/editor/index' }) }
})
