const store = require('../../../services/store')
const collaboration = require('../../../services/collaboration')

function saveLocalFile(tempPath) {
  return new Promise(resolve => {
    wx.saveFile({ tempFilePath: tempPath, success: res => resolve(res.savedFilePath), fail: () => resolve(tempPath) })
  })
}

Page({
  data: {
    id: '', quick: false, type: 'text', chapterId: '', chapter: null, content: '', media: [], location: '', latitude: 0, longitude: 0,
    mood: '', tags: [], voicePath: '', voiceDuration: 0, isRecording: false, showDetails: false, saving: false, canSave: false,
    autoFocus: false, status: 'PUBLISHED', currentUser: null,
    types: [
      { key: 'photo', title: '照片', icon: 'camera', copy: '定格眼前' },
      { key: 'text', title: '一句话', icon: 'pencil', copy: '记下念头' },
      { key: 'voice', title: '语音', icon: 'mic', copy: '留住声音' }
    ],
    moods: ['开心', '平静', '兴奋', '疲惫', '期待', '放松'],
    availableTags: ['朋友', '日落', '学习', '旅行', '美食', '独处', '夏天', '里程碑'].map(name => ({ name, selected: false }))
  },

  onLoad(options) {
    this.setupRecorder()
    const currentUser = store.getCurrentUser()
    const active = store.getActiveChapter()
    let chapterId = options.chapterId || (active && active.id) || ''
    let chapter = chapterId ? store.getChapter(chapterId) : null
    const quick = options.quick === '1'
    const type = ['photo', 'text', 'voice'].includes(options.type) ? options.type : 'text'
    const next = { quick, type, chapterId, chapter, currentUser, autoFocus: type === 'text' }

    if (options.id) {
      const moment = store.getMoment(options.id)
      if (!moment) return this.showMissing()
      chapterId = moment.chapterId
      chapter = store.getChapter(chapterId)
      Object.assign(next, {
        id: moment.id, quick: false, type: moment.type || 'text', chapterId, chapter, content: moment.content || '',
        media: moment.media || [], location: moment.location || '', latitude: moment.latitude || 0, longitude: moment.longitude || 0,
        mood: moment.mood || '', tags: moment.tags || [], voicePath: moment.voicePath || '', voiceDuration: moment.voiceDuration || 0,
        showDetails: true, autoFocus: false, status: moment.status || 'PUBLISHED',
        availableTags: this.data.availableTags.map(item => Object.assign({}, item, { selected: (moment.tags || []).includes(item.name) }))
      })
    }

    this.setData(next, () => this.validate())
    if (!chapter) {
      wx.showModal({ title: '先开启一个 Chapter', content: 'Moment 需要有一个正在发生的章节。', confirmText: '去创建', success: res => { if (res.confirm) wx.redirectTo({ url: '/pages/chapter/editor/index' }); else wx.navigateBack() } })
      return
    }
    if (!options.id && chapter.status !== 'ONGOING') {
      wx.showToast({ title: '这一章已经结束', icon: 'none' })
      return
    }
    if (!options.id && quick && type === 'photo') setTimeout(() => this.choosePhoto(), 260)
  },

  onUnload() {
    if (this.data.isRecording && this.recorder) this.recorder.stop()
    if (this.recorder && this.recorder.offStop) this.recorder.offStop(this.handleStop)
    if (this.recorder && this.recorder.offError) this.recorder.offError(this.handleRecordError)
  },

  showMissing() {
    wx.showModal({ title: 'Moment 不见了', content: '这条记录可能已经被删除。', showCancel: false, success: () => wx.navigateBack() })
  },

  setupRecorder() {
    this.recorder = wx.getRecorderManager()
    this.handleStop = res => {
      saveLocalFile(res.tempFilePath).then(path => {
        this.setData({ voicePath: path, isRecording: false, voiceDuration: Math.max(1, Math.round(res.duration / 1000)) }, () => this.validate())
      })
    }
    this.handleRecordError = () => {
      this.setData({ isRecording: false })
      wx.showToast({ title: '没有录到声音，请重试', icon: 'none' })
    }
    this.recorder.onStop(this.handleStop)
    this.recorder.onError(this.handleRecordError)
  },

  selectType(event) {
    const type = event.currentTarget.dataset.type
    this.setData({ type, autoFocus: type === 'text' }, () => this.validate())
    if (type === 'photo' && !this.data.media.length) this.choosePhoto()
  },

  inputContent(event) { this.setData({ content: event.detail.value }, () => this.validate()) },
  toggleDetails() { this.setData({ showDetails: !this.data.showDetails }) },

  choosePhoto() {
    const remain = Math.max(1, 6 - this.data.media.length)
    wx.chooseMedia({ count: remain, mediaType: ['image'], sourceType: ['album', 'camera'], sizeType: store.getSettings().saveOriginal ? ['original'] : ['compressed'], success: res => {
      Promise.all(res.tempFiles.map(item => saveLocalFile(item.tempFilePath))).then(paths => {
        const media = this.data.media.concat(paths.map(path => ({ id: `media-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`, type: 'image', path }))).slice(0, 6)
        this.setData({ media }, () => this.validate())
      })
    } })
  },

  removePhoto(event) {
    const index = Number(event.currentTarget.dataset.index)
    this.setData({ media: this.data.media.filter((item, itemIndex) => itemIndex !== index) }, () => this.validate())
  },

  choosePlace() {
    wx.chooseLocation({
      success: res => this.setData({ location: res.name || res.address, latitude: res.latitude, longitude: res.longitude }, () => this.validate()),
      fail: error => { if (!error.errMsg || error.errMsg.indexOf('cancel') < 0) wx.showToast({ title: '请在设置中允许位置权限', icon: 'none' }) }
    })
  },
  removePlace() { this.setData({ location: '', latitude: 0, longitude: 0 }, () => this.validate()) },

  startRecord() {
    if (this.data.isRecording) return
    this.setData({ isRecording: true })
    if (wx.vibrateShort) wx.vibrateShort({ type: 'light' })
    this.recorder.start({ duration: 60000, format: 'mp3' })
  },
  stopRecord() {
    if (!this.data.isRecording) return
    if (wx.vibrateShort) wx.vibrateShort({ type: 'light' })
    this.recorder.stop()
  },
  removeVoice() { this.setData({ voicePath: '', voiceDuration: 0 }, () => this.validate()) },

  chooseMood(event) {
    const mood = event.currentTarget.dataset.mood
    this.setData({ mood: this.data.mood === mood ? '' : mood })
  },
  toggleTag(event) {
    const tag = event.currentTarget.dataset.tag
    const availableTags = this.data.availableTags.map(item => item.name === tag ? Object.assign({}, item, { selected: !item.selected }) : item)
    this.setData({ availableTags, tags: availableTags.filter(item => item.selected).map(item => item.name) })
  },

  validate() {
    const valid = this.data.type === 'photo' ? this.data.media.length > 0 : (this.data.type === 'voice' ? !!this.data.voicePath : !!this.data.content.trim())
    this.setData({ canSave: valid })
  },

  saveDraft() { this.saveRecord('DRAFT') },
  savePublished() {
    if (!this.data.canSave) return wx.showToast({ title: '先留下这一刻的主要内容', icon: 'none' })
    this.saveRecord('PUBLISHED')
  },

  saveRecord(status) {
    if (this.data.saving) return
    if (!this.data.chapterId) return wx.showToast({ title: '请先开启 Chapter', icon: 'none' })
    this.setData({ saving: true })
    const original = this.data.id ? store.getMoment(this.data.id) : null
    const payload = {
      id: this.data.id || undefined,
      chapterId: this.data.chapterId,
      type: this.data.type,
      status,
      content: this.data.content.trim(),
      media: this.data.media,
      location: this.data.location,
      latitude: this.data.latitude,
      longitude: this.data.longitude,
      mood: this.data.mood,
      tags: this.data.tags,
      voicePath: this.data.voicePath,
      voiceDuration: this.data.voiceDuration,
      createdAt: original ? original.createdAt : new Date().toISOString()
    }
    const moment = store.saveMoment(payload)
    if (!moment) {
      this.setData({ saving: false })
      return wx.showToast({ title: '当前身份不能修改这条记录', icon: 'none' })
    }
    this.syncMoment(moment)
    wx.showToast({ title: status === 'DRAFT' ? '已存为待补完' : 'Moment 已保存', icon: 'none', duration: 900 })
    setTimeout(() => wx.navigateBack({ fail: () => wx.redirectTo({ url: '/pages/index/index' }) }), 420)
  },

  syncMoment(moment) {
    if (!collaboration.enabled()) return
    const imageUploads = (moment.media || []).map(item => collaboration.upload(item.path, 'image').then(path => Object.assign({}, item, { path })))
    const voiceUpload = collaboration.upload(moment.voicePath, 'voice')
    Promise.all([Promise.all(imageUploads), voiceUpload]).then(([media, voicePath]) => {
      const remote = {
        id: moment.id, chapterId: moment.chapterId, type: moment.type, status: moment.status, content: moment.content,
        media, location: moment.location, latitude: moment.latitude, longitude: moment.longitude, mood: moment.mood,
        tags: moment.tags, voicePath, voiceDuration: moment.voiceDuration, favorite: moment.favorite,
        createdAt: moment.createdAt, updatedAt: moment.updatedAt, goalId: moment.goalId
      }
      store.saveMoment(remote)
      collaboration.pushMoment(remote)
    })
  }
})
