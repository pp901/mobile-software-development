const store = require('../../../services/store')
const collaboration = require('../../../services/collaboration')

function keepFile(tempPath) {
  return new Promise(resolve => wx.saveFile({ tempFilePath: tempPath, success: res => resolve(res.savedFilePath), fail: () => resolve(tempPath) }))
}

Page({
  data: { momentId: '', moment: null, chapter: null, type: 'text', content: '', media: [], voicePath: '', voiceDuration: 0, recording: false, saving: false },
  onLoad(options) {
    this.setData({ momentId: options.momentId || '' })
    this.recorder = wx.getRecorderManager()
    this.recorder.onStop(res => keepFile(res.tempFilePath).then(path => this.setData({ voicePath: path, voiceDuration: Math.max(1, Math.round(res.duration / 1000)), recording: false })))
    this.recorder.onError(() => { this.setData({ recording: false }); wx.showToast({ title: '没有录到声音', icon: 'none' }) })
    if (options.chapterId) collaboration.pullChapter(options.chapterId).then(() => this.load())
    else this.load()
  },
  onUnload() { if (this.data.recording) this.recorder.stop() },
  load() {
    const moment = store.getMoment(this.data.momentId)
    const chapter = moment && store.getChapter(moment.chapterId)
    if (!moment || !chapter) return wx.showToast({ title: '这个 Moment 不存在', icon: 'none' })
    const current = store.getCurrentUser()
    const canContribute = chapter.status === 'ONGOING' && chapter.members.some(item => item.id === current.id) && moment.creatorId !== current.id
    this.setData({ moment, chapter, current, canContribute })
  },
  selectType(event) { this.setData({ type: event.currentTarget.dataset.type }) },
  inputContent(event) { this.setData({ content: event.detail.value }) },
  choosePhoto() { wx.chooseMedia({ count: 3, mediaType: ['image'], sourceType: ['album', 'camera'], sizeType: store.getSettings().saveOriginal ? ['original'] : ['compressed'], success: res => Promise.all(res.tempFiles.map(item => keepFile(item.tempFilePath))).then(paths => this.setData({ media: paths.map((path, index) => ({ id: `con-media-${Date.now()}-${index}`, type: 'image', path })) })) }) },
  startRecord() { this.setData({ recording: true }); this.recorder.start({ duration: 60000, format: 'mp3' }) },
  stopRecord() { if (this.data.recording) this.recorder.stop() },
  save() {
    if (!this.data.canContribute) return wx.showToast({ title: '当前身份不能补完', icon: 'none' })
    const valid = this.data.type === 'photo' ? this.data.media.length : this.data.type === 'voice' ? this.data.voicePath : this.data.content.trim()
    if (!valid) return wx.showToast({ title: '先留下一点内容', icon: 'none' })
    this.setData({ saving: true })
    const item = store.saveContribution({ momentId: this.data.momentId, type: this.data.type, content: this.data.content.trim(), media: this.data.media, voicePath: this.data.voicePath, voiceDuration: this.data.voiceDuration })
    if (!item) { this.setData({ saving: false }); return wx.showToast({ title: '补完失败', icon: 'none' }) }
    if (collaboration.enabled()) {
      const mediaUploads = (item.media || []).map(media => collaboration.upload(media.path, 'image').then(path => Object.assign({}, media, { path })))
      Promise.all([Promise.all(mediaUploads), collaboration.upload(item.voicePath, 'voice')]).then(([media, voicePath]) => collaboration.pushContribution(Object.assign({}, item, { media, voicePath })))
    }
    wx.showToast({ title: '记忆已补上', icon: 'success' })
    setTimeout(() => wx.navigateBack(), 500)
  }
})
