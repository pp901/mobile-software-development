const store = require('../../services/store')

Page({
  data: { profile: {}, chapterCount: 0, momentCount: 0, privateMode: true, saveOriginal: true },
  onShow() {
    const state = store.getState()
    this.setData({ profile: state.profile, chapterCount: state.chapters.length, momentCount: state.moments.length })
  },
  togglePrivate(event) { this.setData({ privateMode: event.detail.value }) },
  toggleSave(event) { this.setData({ saveOriginal: event.detail.value }) },
  replayGuide() { wx.removeStorageSync('ongoing:onboarding:seen'); wx.redirectTo({ url: '/pages/onboarding/index' }) },
  resetDemo() {
    wx.showModal({ title: '重置示例内容？', content: '你的本地改动会被示例故事替换。', confirmText: '重新开始', confirmColor: '#D9907A', success: res => { if (res.confirm) { store.reset(); wx.showToast({ title: '故事已重新展开', icon: 'none' }); this.onShow() } } })
  },
  notReady() { wx.showToast({ title: '这页仍在继续书写', icon: 'none' }) }
})
