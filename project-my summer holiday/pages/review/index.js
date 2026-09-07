const store = require('../../services/store')

Page({
  data: { id: '', chapter: null, moments: [], photos: [], firstMoment: null, lastMoment: null, topTags: [], moods: [], places: [], ending: '', composing: false },
  onLoad(options) {
    const active = store.getActiveChapter()
    this.setData({ id: options.id || (active && active.id) || '' })
    if (this.data.id) this.load()
  },
  onShow() { if (this.data.id) this.load() },
  load() {
    const chapter = store.getChapter(this.data.id)
    const moments = store.getMoments(this.data.id)
    const tagCount = {}; const moodCount = {}; const places = []
    moments.forEach(item => {
      item.tags.forEach(tag => { tagCount[tag] = (tagCount[tag] || 0) + 1 })
      if (item.mood) moodCount[item.mood] = (moodCount[item.mood] || 0) + 1
      if (item.location && places.indexOf(item.location) < 0) places.push(item.location)
    })
    const topTags = Object.keys(tagCount).map(name => ({ name, count: tagCount[name] })).sort((a, b) => b.count - a.count).slice(0, 6)
    const moodMax = Math.max(1, ...Object.keys(moodCount).map(key => moodCount[key]))
    const moods = Object.keys(moodCount).map(name => ({ name, count: moodCount[name], percent: Math.round(moodCount[name] / moodMax * 100) })).sort((a, b) => b.count - a.count)
    this.setData({
      chapter, moments, photos: moments.filter(item => item.image).slice(0, 6),
      firstMoment: moments[moments.length - 1], lastMoment: moments[0], topTags, moods, places,
      ending: chapter.ending || this.data.ending, composing: this.data.composing || false
    })
  },
  startEnding() { this.setData({ composing: true }) },
  inputEnding(event) { this.setData({ ending: event.detail.value }) },
  complete() {
    const title = this.data.chapter.status === 'ONGOING' ? '让这一章成为过去吗？' : '更新这一章的结语？'
    wx.showModal({ title, content: '回望会被完整保留，你仍然可以随时回来翻看。', confirmText: '已成章', confirmColor: '#5B7F6A', success: res => {
      if (res.confirm) { store.completeChapter(this.data.id, this.data.ending); this.setData({ composing: false }); this.load(); wx.showToast({ title: '这一章，已成章', icon: 'none', duration: 1400 }) }
    } })
  },
  onShareAppMessage() { return { title: `${this.data.chapter.title}｜${this.data.chapter.dayTotal} 天的故事`, path: `/pages/review/index?id=${this.data.id}`, imageUrl: this.data.chapter.cover } }
})
