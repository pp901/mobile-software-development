const store = require('../../services/store')

Page({
  data: {
    active: 'ONGOING', chapters: [],
    tabs: [{ key: 'ONGOING', label: '正在发生' }, { key: 'COMPLETED', label: '已成章' }, { key: 'ARCHIVED', label: '已归档' }]
  },
  onShow() { this.load() },
  load() { this.setData({ chapters: store.getChapters(this.data.active) }) },
  changeTab(event) { this.setData({ active: event.currentTarget.dataset.key }, () => this.load()) },
  openChapter(event) { wx.navigateTo({ url: `/pages/chapter/detail/index?id=${event.detail.id}` }) },
  createChapter() { wx.navigateTo({ url: '/pages/chapter/editor/index' }) }
})
