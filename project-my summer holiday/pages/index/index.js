const store = require('../../services/store')
const date = require('../../utils/date')

Page({
  data: { chapter: null, moments: [], greeting: '', ongoingCount: 0, currentUser: null, echo: null },
  onShow() { this.load() },
  onPullDownRefresh() { this.load(); wx.stopPullDownRefresh() },
  load() {
    const chapter = store.getActiveChapter()
    const ongoing = store.getChapters('ONGOING')
    this.setData({ chapter, moments: chapter ? store.getMoments(chapter.id).slice(0, 3) : [], greeting: date.greeting(), ongoingCount: ongoing.length, currentUser: store.getCurrentUser(), echo: store.getEchoMoment() })
  },
  openChapter() { wx.navigateTo({ url: `/pages/chapter/detail/index?id=${this.data.chapter.id}` }) },
  openMoment(event) { const id = event.detail && event.detail.id ? event.detail.id : event.currentTarget.dataset.id; wx.navigateTo({ url: `/pages/moment/detail/index?id=${id}` }) },
  openSearch() { wx.navigateTo({ url: '/pages/search/index' }) },
  openProfile() { wx.navigateTo({ url: '/pages/profile/index' }) },
  createChapter() { wx.navigateTo({ url: '/pages/chapter/editor/index' }) },
  quickRecord(event) { wx.navigateTo({ url: `/pages/moment/editor/index?quick=1&type=${event.currentTarget.dataset.type}` }) },
  switchChapter() {
    const chapters = store.getChapters('ONGOING')
    if (chapters.length < 2) return this.createChapter()
    wx.showActionSheet({ itemList: chapters.map(item => item.title), success: ({ tapIndex }) => { store.setActiveChapter(chapters[tapIndex].id); this.load() } })
  },
  onShareAppMessage() {
    const chapter = this.data.chapter
    return chapter ? { title: `${chapter.title}｜一段正在发生的故事`, path: `/pages/chapter/detail/index?id=${chapter.id}`, imageUrl: chapter.cover } : { title: 'ongoing_｜把生活写成章节', path: '/pages/index/index' }
  }
})
