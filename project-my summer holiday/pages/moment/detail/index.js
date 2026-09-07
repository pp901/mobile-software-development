const store = require('../../../services/store')

Page({
  data: { id: '', moment: null, chapter: null, playing: false, related: [] },
  onLoad(options) { this.setData({ id: options.id }); this.audio = wx.createInnerAudioContext(); this.audio.onEnded(() => this.setData({ playing: false })) },
  onShow() { this.load() },
  onUnload() { if (this.audio) this.audio.destroy() },
  load() {
    const moment = store.getMoment(this.data.id)
    if (!moment) return
    this.setData({ moment, chapter: store.getChapter(moment.chapterId), related: store.getMoments(moment.chapterId).filter(item => item.id !== moment.id && item.image).slice(0, 3) })
  },
  preview() { if (this.data.moment.image) wx.previewImage({ urls: [this.data.moment.image], current: this.data.moment.image }) },
  toggleFavorite() { const moment = store.toggleFavorite(this.data.id); this.setData({ moment }); wx.showToast({ title: moment.favorite ? '已收藏这个片刻' : '已取消收藏', icon: 'none' }) },
  playVoice() {
    const path = this.data.moment.voicePath
    if (!path) return
    if (this.data.playing) { this.audio.pause(); this.setData({ playing: false }) }
    else { this.audio.src = path; this.audio.play(); this.setData({ playing: true }) }
  },
  openChapter() { wx.navigateTo({ url: `/pages/chapter/detail/index?id=${this.data.chapter.id}` }) },
  openRelated(event) { wx.redirectTo({ url: '/pages/moment/detail/index?id=' + event.currentTarget.dataset.id }) },
  addRelated() { wx.navigateTo({ url: '/pages/moment/editor/index?chapterId=' + this.data.moment.chapterId }) },
  more() {
    wx.showActionSheet({ itemList: ['编辑这个 Moment', '删除这个 Moment'], itemColor: '#30312F', success: ({ tapIndex }) => {
      if (tapIndex === 0) wx.navigateTo({ url: `/pages/moment/editor/index?id=${this.data.id}` })
      if (tapIndex === 1) this.confirmDelete()
    } })
  },
  confirmDelete() {
    wx.showModal({ title: '让这个片刻离开吗？', content: '删除后将不能找回。', confirmText: '删除', confirmColor: '#D9907A', success: res => {
      if (res.confirm) { store.deleteMoment(this.data.id); wx.showToast({ title: '这个片刻已离开', icon: 'none' }); setTimeout(() => wx.navigateBack(), 500) }
    } })
  },
  onShareAppMessage() { return { title: `${this.data.moment.content.slice(0, 24)}…｜ongoing_`, path: `/pages/moment/detail/index?id=${this.data.id}`, imageUrl: this.data.moment.image || this.data.chapter.cover } }
})
