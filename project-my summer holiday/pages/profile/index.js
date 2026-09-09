const store = require('../../services/store')
const collaboration = require('../../services/collaboration')

Page({
  data: { profile: {}, chapterCount: 0, momentCount: 0, privateMode: true, saveOriginal: true, cloudEnabled: false },
  onShow() {
    const state = store.getState()
    const settings = store.getSettings()
    const chapters = store.getChapters()
    const chapterIds = chapters.map(item => item.id)
    this.setData({ profile: store.getCurrentUser(), chapterCount: chapters.length, momentCount: state.moments.filter(item => chapterIds.includes(item.chapterId)).length, privateMode: settings.privateMode, saveOriginal: settings.saveOriginal, cloudEnabled: collaboration.enabled() })
  },
  toggleSave(event) { this.setData({ saveOriginal: event.detail.value }); store.updateSettings({ saveOriginal: event.detail.value }) },
  chooseAvatar(event) {
    const tempPath = event.detail.avatarUrl
    wx.saveFile({ tempFilePath: tempPath, success: res => this.persistAvatar(res.savedFilePath), fail: () => this.persistAvatar(tempPath) })
  },
  persistAvatar(path) {
    store.saveProfile({ avatar: path }); this.onShow()
    collaboration.upload(path, 'image').then(avatar => { if (avatar && avatar !== path) store.saveProfile({ avatar }); collaboration.bootstrap() })
  },
  saveNickname(event) {
    const nickname = String(event.detail.value || '').trim()
    if (!nickname || nickname === this.data.profile.nickname) return
    store.saveProfile({ nickname }); collaboration.bootstrap(); this.onShow()
  },
  replayGuide() { wx.removeStorageSync('ongoing:onboarding:seen'); wx.redirectTo({ url: '/pages/onboarding/index' }) },
  resetDemo() {
    wx.showModal({ title: '重置示例内容？', content: '你的本地改动会被示例故事替换。', confirmText: '重新开始', confirmColor: '#D9907A', success: res => { if (res.confirm) { store.reset(); wx.showToast({ title: '故事已重新展开', icon: 'none' }); this.onShow() } } })
  }
})
