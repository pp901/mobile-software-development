const store = require('../../services/store')
const date = require('../../utils/date')
Page({
 data: { reviewMode: false, reading: 'months', active: 'all', chapters: [], months: [], limit: 30, hasMore: false, tabs: [{ key: 'all', label: '全部' }, { key: 'ONGOING', label: '进行中' }, { key: 'COMPLETED', label: '已结束' }] },
 onLoad(options) { this.setData({ reviewMode: options.view === 'review', reading:options.view === 'review' ? 'months' : 'chapters' }) },
 onShow() { this.load() },
 load() {
  let chapters = store.getChapters()
  if (this.data.active !== 'all') chapters = chapters.filter(x => this.data.active === 'COMPLETED' ? x.status !== 'ONGOING' : x.status === 'ONGOING')
  const all = store.getMoments().sort((a, b) => b.localDateKey.localeCompare(a.localDateKey) || String(b.createdAt || '').localeCompare(String(a.createdAt || '')))
  const groups = []
  all.slice(0, this.data.limit).forEach(moment => {
   const key = moment.localDateKey.slice(0, 7) || 'unknown'
   let group = groups.find(item => item.key === key)
   if (!group) { group = { key, label: date.displayMonth(key) || '日期未记录', moments: [] }; groups.push(group) }
   group.moments.push(moment)
  })
  this.setData({ chapters, months: groups, totalMoments: all.length, hasMore: all.length > this.data.limit })
 },
 onReachBottom() { if (this.data.reviewMode && this.data.reading === 'months' && this.data.hasMore) { this.setData({ limit: this.data.limit + 30 }); this.load() } },
 changeReading(e) { const reading=e.currentTarget.dataset.value; this.setData({ reading, reviewMode:reading === 'months' }) },
 changeTab(e) { this.setData({ active: e.currentTarget.dataset.key }); this.load() },
 openChapter(e) { wx.navigateTo({ url: (this.data.reviewMode ? '/pages/review/index?id=' : '/pages/chapter/detail/index?id=') + e.detail.id }) },
 openMoment(e) { wx.navigateTo({ url: '/pages/moment/detail/index?id=' + e.detail.id }) },
 openSearch() { wx.navigateTo({ url: '/pages/search/index' }) },
 createChapter() { wx.navigateTo({ url: '/pages/chapter/editor/index' }) },
 createMoment() { wx.navigateTo({ url: '/pages/moment/editor/index' }) }
})
