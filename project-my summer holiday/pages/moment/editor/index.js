const store = require('../../../services/store')
const date = require('../../../utils/date')

Page({
  data: {
    id: '', chapterId: '', chapterIndex: 0, chapters: [], selectedChapterTitle: '', content: '', image: '', location: '', latitude: 0, longitude: 0,
    mood: '', tags: [], momentDate: '', momentTime: '', voicePath: '', voiceDuration: 0, isRecording: false, saving: false, canSave: false,
    activeType: 'text', autoFocus: false,
    momentTypes: [
      { key: 'photo', title: '一个画面', icon: 'camera' }, { key: 'text', title: '一句话', icon: 'pencil' },
      { key: 'voice', title: '一段声音', icon: 'mic' }, { key: 'place', title: '一个地方', icon: 'pin' },
      { key: 'progress', title: '一个进展', icon: 'check' }
    ],
    moods: [{ name: '开心', emoji: '●' }, { name: '平静', emoji: '◐' }, { name: '兴奋', emoji: '✦' }, { name: '疲惫', emoji: '◌' }, { name: '期待', emoji: '◒' }, { name: '放松', emoji: '≈' }],
    availableTags: ['朋友', '日落', '学习', '旅行', '美食', '独处', '夏天', '里程碑'].map(name => ({ name, selected: false }))
  },
  onLoad(options) {
    this.recorder = wx.getRecorderManager()
    this.recorder.onStop(res => {
      wx.saveFile({ tempFilePath: res.tempFilePath, success: saved => this.setData({ voicePath: saved.savedFilePath, isRecording: false, voiceDuration: Math.max(1, Math.round(res.duration / 1000)) }, () => this.validate()), fail: () => this.setData({ voicePath: res.tempFilePath, isRecording: false }, () => this.validate()) })
    })
    this.recorder.onError(() => { this.setData({ isRecording: false }); wx.showToast({ title: '暂时没有录到声音', icon: 'none' }) })
    const chapters = store.getChapters('ONGOING')
    let chapterId = options.chapterId || (store.getActiveChapter() || {}).id || ''
    let chapterIndex = Math.max(0, chapters.findIndex(item => item.id === chapterId))
    if (options.id) {
      const moment = store.getMoment(options.id)
      if (moment) {
        chapterId = moment.chapterId
        if (!chapters.some(item => item.id === chapterId)) {
          const targetChapter = store.getChapter(chapterId)
          if (targetChapter) chapters.unshift(targetChapter)
        }
        chapterIndex = Math.max(0, chapters.findIndex(item => item.id === chapterId))
        this.setData({
          id: moment.id, content: moment.content, image: moment.image, location: moment.location, mood: moment.mood,
          tags: moment.tags || [], momentDate: moment.createdAt.slice(0, 10), momentTime: moment.time,
          voicePath: moment.voicePath || '', availableTags: this.data.availableTags.map(item => Object.assign(item, { selected: (moment.tags || []).indexOf(item.name) > -1 }))
        })
      }
    }
    const activeType = options.type || (options.id ? 'text' : 'text')
    this.setData({ chapters, chapterId, chapterIndex, selectedChapterTitle: chapters[chapterIndex] ? chapters[chapterIndex].title : '', activeType, momentDate: this.data.momentDate || date.today(), momentTime: this.data.momentTime || date.timeNow(), autoFocus: false }, () => this.validate())
    if (!chapters.length && !options.id) wx.showToast({ title: '请先开启一个 Chapter', icon: 'none' })
    if (!options.id && activeType === 'photo') setTimeout(() => this.choosePhoto(), 350)
    if (!options.id && activeType === 'place') setTimeout(() => this.choosePlace(), 350)
  },
  onUnload() { if (this.data.isRecording && this.recorder) this.recorder.stop() },
  selectType(event) {
    const type = event.currentTarget.dataset.type
    this.setData({ activeType: type, autoFocus: type === 'text' })
    if (type === 'photo' && !this.data.image) this.choosePhoto()
    if (type === 'place' && !this.data.location) this.choosePlace()
  },
  inputContent(event) { this.setData({ content: event.detail.value }, () => this.validate()) },
  chooseChapter(event) { const chapterIndex = Number(event.detail.value); this.setData({ chapterIndex, chapterId: this.data.chapters[chapterIndex].id, selectedChapterTitle: this.data.chapters[chapterIndex].title }) },
  chooseDate(event) { this.setData({ momentDate: event.detail.value }) },
  chooseTime(event) { this.setData({ momentTime: event.detail.value }) },
  chooseMood(event) { const mood = event.currentTarget.dataset.mood; this.setData({ mood: this.data.mood === mood ? '' : mood }) },
  toggleTag(event) {
    const name = event.currentTarget.dataset.tag
    const availableTags = this.data.availableTags.map(item => item.name === name ? Object.assign(item, { selected: !item.selected }) : item)
    this.setData({ availableTags, tags: availableTags.filter(item => item.selected).map(item => item.name) })
  },
  choosePhoto() {
    wx.chooseMedia({ count: 1, mediaType: ['image'], sourceType: ['album', 'camera'], success: res => {
      const tempPath = res.tempFiles[0].tempFilePath
      wx.saveFile({ tempFilePath: tempPath, success: saved => this.setData({ image: saved.savedFilePath }, () => this.validate()), fail: () => this.setData({ image: tempPath }, () => this.validate()) })
    } })
  },
  removePhoto() { this.setData({ image: '' }, () => this.validate()) },
  choosePlace() {
    wx.chooseLocation({ success: res => this.setData({ location: res.name || res.address, latitude: res.latitude, longitude: res.longitude }, () => this.validate()) })
  },
  removePlace() { this.setData({ location: '', latitude: 0, longitude: 0 }, () => this.validate()) },
  startRecord() {
    if (this.data.isRecording) return
    this.setData({ isRecording: true })
    this.recorder.start({ duration: 60000, format: 'mp3' })
  },
  stopRecord() { if (this.data.isRecording) this.recorder.stop() },
  removeVoice() { this.setData({ voicePath: '', voiceDuration: 0 }, () => this.validate()) },
  validate() { this.setData({ canSave: !!(this.data.content.trim() || this.data.image || this.data.location || this.data.voicePath) }) },
  save() {
    if (!this.data.canSave || this.data.saving) return
    if (!this.data.chapterId) return wx.showToast({ title: '请先开启一个 Chapter', icon: 'none' })
    this.setData({ saving: true })
    const payload = {
      chapterId: this.data.chapterId, content: this.data.content.trim(), image: this.data.image,
      imageCount: this.data.image ? 1 : 0, location: this.data.location, latitude: this.data.latitude,
      longitude: this.data.longitude, mood: this.data.mood, tags: this.data.tags,
      voicePath: this.data.voicePath, voiceDuration: this.data.voiceDuration,
      createdAt: `${this.data.momentDate}T${this.data.momentTime}:00`, dateLabel: date.displayDate(this.data.momentDate), time: this.data.momentTime
    }
    if (this.data.id) payload.id = this.data.id
    store.saveMoment(payload)
    wx.showToast({ title: '这个片刻已经留下', icon: 'none', duration: 1100 })
    setTimeout(() => wx.navigateBack({ fail: () => wx.redirectTo({ url: '/pages/index/index' }) }), 650)
  }
})
