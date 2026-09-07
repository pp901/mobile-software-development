const store = require('../../services/store')
const date = require('../../utils/date')

Page({
  data: { chapter: null, moments: [], greeting: '', ongoingCount: 0 },
  onShow() { this.load() },
  onPullDownRefresh() { this.load(); wx.stopPullDownRefresh() },
  load() {
    const chapter = store.getActiveChapter()
    const ongoing = store.getChapters('ONGOING')
    this.setData({ chapter, moments: chapter ? store.getMoments(chapter.id).slice(0, 3) : [], greeting: date.greeting(), ongoingCount: ongoing.length })
  },
  openChapter() { wx.navigateTo({ url: `/pages/chapter/detail/index?id=${this.data.chapter.id}` }) },
  openMoment(event) { wx.navigateTo({ url: `/pages/moment/detail/index?id=${event.detail.id}` }) },
  openSearch() { wx.navigateTo({ url: '/pages/search/index' }) },
  openProfile() { wx.navigateTo({ url: '/pages/profile/index' }) },
  createChapter() { wx.navigateTo({ url: '/pages/chapter/editor/index' }) },
  quickRecord(event) { wx.navigateTo({ url: `/pages/moment/editor/index?type=${event.currentTarget.dataset.type}` }) },
  switchChapter() {
    const chapters = store.getChapters('ONGOING')
    if (chapters.length < 2) return this.createChapter()
    wx.showActionSheet({ itemList: chapters.map(item => item.title), success: ({ tapIndex }) => { store.setActiveChapter(chapters[tapIndex].id); this.load() } })
  },
  onShareAppMessage() { return { title: `${this.data.chapter.title}｜一段正在发生的故事`, path: `/pages/chapter/detail/index?id=${this.data.chapter.id}`, imageUrl: this.data.chapter.cover } }
})
