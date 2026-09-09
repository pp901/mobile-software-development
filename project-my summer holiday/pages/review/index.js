const store = require('../../services/store')
const collaboration = require('../../services/collaboration')

Page({
  data: {
    id: '', chapter: null, moments: [], photos: [], allPhotos: [], selectedPhotoIds: [], firstMoment: null,
    lastMoment: null, topTags: [], moods: [], places: [], busiestDay: null, sharedMoments: [], members: [],
    ending: '', composing: false, photoPanel: false, posterPath: '', generating: false
  },
  onLoad(options) {
    const active = store.getActiveChapter()
    this.setData({ id: options.id || (active && active.id) || '', composing: options.finish === '1' })
    if (this.data.id) this.load()
  },
  onShow() { if (this.data.id) this.load() },
  load() {
    const review = store.getReviewData(this.data.id)
    if (!review) return
    const maxMood = Math.max(1, ...review.moods.map(item => item.count))
    const selectedPhotoIds = review.photos.map(item => item.id)
    this.setData(Object.assign({}, review, {
      ending: review.chapter.ending || this.data.ending,
      selectedPhotoIds,
      allPhotos: review.allPhotos.map(item => Object.assign({}, item, { selected: selectedPhotoIds.includes(item.id) })),
      moods: review.moods.map(item => Object.assign({}, item, { percent: Math.round(item.count / maxMood * 100) }))
    }))
  },
  startEnding() { this.setData({ composing: true }) },
  inputEnding(event) { this.setData({ ending: event.detail.value }) },
  complete() {
    const chapter = this.data.chapter
    if (!chapter.isOwner) return wx.showToast({ title: '只有创建者可以结束 Chapter', icon: 'none' })
    const pending = chapter.pendingCount
    const isUpdate = chapter.status === 'COMPLETED'
    wx.showModal({
      title: isUpdate ? '更新这一章的结语？' : '结束这一章？',
      content: isUpdate ? '完成时间会保留，只更新回望中的结语。' : `${pending ? `仍有 ${pending} 个待补完 Moment。` : '所有 Moment 都已整理。'}结束后将停止新增记录，并生成完整回望。`,
      confirmText: isUpdate ? '保存结语' : '确认结束', confirmColor: '#173F2D',
      success: res => {
        if (!res.confirm) return
        const completed = store.completeChapter(this.data.id, this.data.ending)
        if (!completed) return wx.showToast({ title: '当前身份不能结束', icon: 'none' })
        collaboration.finishChapter(this.data.id, this.data.ending)
        this.setData({ composing: false }); this.load()
        wx.showToast({ title: '这一章，写完了。', icon: 'none', duration: 1800 })
      }
    })
  },
  openPhotoPanel() { this.setData({ photoPanel: true }) },
  closePhotoPanel() { this.setData({ photoPanel: false }) },
  noop() {},
  togglePosterPhoto(event) {
    const id = event.currentTarget.dataset.id
    let selected = this.data.selectedPhotoIds.slice()
    if (selected.includes(id)) selected = selected.filter(item => item !== id)
    else if (selected.length < 3) selected.push(id)
    else return wx.showToast({ title: '海报最多选择 3 张照片', icon: 'none' })
    this.setData({ selectedPhotoIds: selected, allPhotos: this.data.allPhotos.map(item => Object.assign({}, item, { selected: selected.includes(item.id) })) })
  },
  confirmPhotos() {
    if (!this.data.selectedPhotoIds.length) return wx.showToast({ title: '至少选择一张照片', icon: 'none' })
    store.setReviewPhotos(this.data.id, this.data.selectedPhotoIds)
    const photos = this.data.selectedPhotoIds.map(id => this.data.allPhotos.find(item => item.id === id)).filter(Boolean)
    this.setData({ photoPanel: false, photos }, () => this.generatePoster())
  },
  imageInfo(src) { return new Promise(resolve => wx.getImageInfo({ src, success: res => resolve(res.path), fail: () => resolve('') })) },
  generatePoster() {
    if (this.data.generating) return
    this.setData({ generating: true })
    const selected = this.data.photos.slice(0, 3)
    Promise.all(selected.map(item => this.imageInfo(item.image))).then(paths => {
      const ctx = wx.createCanvasContext('reviewPoster', this)
      const chapter = this.data.chapter
      ctx.setFillStyle('#F7F3EA'); ctx.fillRect(0, 0, 750, 1060)
      ctx.setFillStyle('#173F2D'); ctx.fillRect(0, 0, 750, 230)
      ctx.setFillStyle('#F2BD42'); ctx.fillRect(54, 52, 92, 12)
      ctx.setFillStyle('#FFFFFF'); ctx.setFontSize(28); ctx.fillText('ongoing_ · CHAPTER REVIEW', 54, 112)
      ctx.setFontSize(48); ctx.fillText(chapter.title.slice(0, 12), 54, 180)
      const valid = paths.filter(Boolean)
      if (valid[0]) ctx.drawImage(valid[0], 54, 270, 642, valid.length > 1 ? 330 : 460)
      if (valid[1]) ctx.drawImage(valid[1], 54, 615, 313, 220)
      if (valid[2]) ctx.drawImage(valid[2], 383, 615, 313, 220)
      ctx.setFillStyle('#26312B'); ctx.setFontSize(25); ctx.fillText(`${chapter.dayTotal} 天 · ${chapter.momentCount} 个瞬间 · ${chapter.memberCount} 人`, 54, 895)
      ctx.setFontSize(34); ctx.fillText('这一章，写完了。', 54, 958)
      ctx.setFillStyle('#EC765F'); ctx.fillRect(54, 993, 120, 9)
      ctx.draw(false, () => setTimeout(() => wx.canvasToTempFilePath({ canvasId: 'reviewPoster', width: 750, height: 1060, destWidth: 1125, destHeight: 1590, success: res => { this.setData({ posterPath: res.tempFilePath, generating: false }); wx.previewImage({ urls: [res.tempFilePath] }) }, fail: () => { this.setData({ generating: false }); wx.showToast({ title: '海报生成失败，请重试', icon: 'none' }) } }, this), 180))
    })
  },
  savePoster() {
    if (!this.data.posterPath) return this.openPhotoPanel()
    wx.saveImageToPhotosAlbum({ filePath: this.data.posterPath, success: () => wx.showToast({ title: '海报已保存', icon: 'success' }), fail: () => wx.showToast({ title: '请允许保存到相册', icon: 'none' }) })
  },
  openMoment(event) { wx.navigateTo({ url: `/pages/moment/detail/index?id=${event.currentTarget.dataset.id}` }) },
  onShareAppMessage() { return { title: `${this.data.chapter.title}｜${this.data.chapter.dayTotal} 天的共同故事`, path: `/pages/review/index?id=${this.data.id}`, imageUrl: this.data.posterPath || this.data.chapter.cover } }
})
