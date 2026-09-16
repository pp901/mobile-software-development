const store = require('../../services/store')
const cloud = require('../../services/collaboration')
const poster = require('../../services/review-poster')
Page({
 data: { id: '', chapter: null, entries: [], limit: 8, hasMore: false, missing: false, composing: false, ending: '', generating: false, posterPath: '', error: '', expanded: false, coverFailed: false, featured: [], posterOpen: false, posterStep: 'select', photoChoices: [], selectedPhotos: [], selectedCount: 0, photoLimit: 30, savingPoster: false, albumDenied: false, posterError: '' },
 onLoad(options) { this.setData({ id: options.id || '', composing: options.finish === '1' }); this.load(); cloud.pullChapter(this.data.id).then(() => this.load()) },
 onShow() { if (this.data.id) this.load() },
 onUnload() { this.disposed = true },
 load() {
  const review = store.getReviewData(this.data.id)
  if (!review) return this.setData({ chapter: null, missing: true })
  const entries = review.moments.slice().sort((a, b) => a.localDateKey.localeCompare(b.localDateKey) || String(a.createdAt || '').localeCompare(String(b.createdAt || ''))).slice(0, this.data.limit).map((moment, index, array) => ({
   id: moment.id, moment, month: moment.localDateKey.slice(0, 7).replace('-', ' / '), startMonth: index === 0 || moment.localDateKey.slice(0, 7) !== array[index - 1].localDateKey.slice(0, 7), perspectives: store.getPerspectives(moment.id)
  }))
  this.setData({ chapter: review.chapter, featured: (review.photos.length ? review.photos : review.moments).slice(0, 3), entries, hasMore: review.moments.length > entries.length, missing: false, total: review.moments.length, ending: this.data.composing ? this.data.ending : review.chapter.ending || '' })
 },
 onReachBottom() { if (this.data.expanded && this.data.hasMore) { this.setData({ limit: this.data.limit + 8 }); this.load() } },
 coverError() { this.setData({ coverFailed: true }) },
 toggleEntries() { this.setData({ expanded: !this.data.expanded }) },
 openCard(e) { wx.navigateTo({ url: '/pages/moment/detail/index?id=' + e.detail.id }) },
 startEnding() { this.setData({ composing: true, ending: this.data.chapter.ending || '' }) },
 closeEnding() { this.setData({ composing: false }) },
 inputEnding(e) { this.setData({ ending: e.detail.value }) },
 complete() {
  if (!this.data.chapter.isOwner) return
  if (!store.completeChapter(this.data.id, this.data.ending)) return this.setData({ error: store.getLastError() || '无法保存' })
  cloud.flush(); this.setData({ composing: false }); this.load(); wx.showToast({ title: '已保存', icon: 'success' })
 },
 openMoment(e) { wx.navigateTo({ url: '/pages/moment/detail/index?id=' + e.currentTarget.dataset.id }) },
 goBack() { wx.navigateBack({ fail: () => wx.redirectTo({ url: '/pages/history/index' }) }) },
 noop() {},
 openPoster() {
  const review = store.getReviewData(this.data.id)
  if (!review) return this.setData({ error: '这一章暂时无法读取' })
  this.posterReview = review
  this.posterChoices = review.moments.reduce((all, moment) => all.concat((moment.media || []).filter(media => media.type === 'image').map(media => Object.assign({}, media, { key: moment.id + ':' + media.id, momentId: moment.id, content: moment.content, dateLabel: moment.dateLabel }))), [])
  const selectedKeys = review.photos.map(moment => this.posterChoices.find(item => item.momentId === moment.id)).filter(Boolean).map(item => item.key)
  this.setData({ posterOpen: true, posterStep: 'select', posterError: '', photoLimit: 30, posterPath: '', albumDenied: false, selectedKeys })
  this.updatePosterSelection()
 },
 updatePosterSelection() {
  const selected = this.data.selectedKeys.map(key => this.posterChoices.find(item => item.key === key)).filter(Boolean)
  const review = this.posterReview
  const excerpt = review.chapter.ending || (selected.find(item => item.content) || {}).content || (review.moments.find(item => item.content.trim()) || {}).content || review.chapter.description || '把平凡的日子，留成以后想念的样子。'
  this.setData({
   photoChoices: this.posterChoices.slice(0, this.data.photoLimit).map(item => Object.assign({}, item, { selected: this.data.selectedKeys.includes(item.key), order: this.data.selectedKeys.indexOf(item.key) + 1 })),
   photoHasMore: this.posterChoices.length > this.data.photoLimit,
   selectedPhotos: selected, selectedCount: selected.length,
   posterModel: { title: review.chapter.title, dateRange: review.chapter.dateRange, excerpt, momentCount: review.moments.length, recordedDayCount: review.chapter.recordedDayCount, sharedCount: review.moments.filter(item => item.participantCount > 1).length, ongoing: review.chapter.status === 'ONGOING' }
  })
 },
 selectPhoto(e) {
  if (this.data.generating) return
  const key = e.currentTarget.dataset.key
  let keys = this.data.selectedKeys.slice()
  if (keys.includes(key)) keys = keys.filter(item => item !== key)
  else if (keys.length < 3) keys.push(key)
  else return wx.showToast({ title: '最多选 3 张，先取消一张再选', icon: 'none' })
  this.setData({ selectedKeys: keys, posterPath: '', posterError: '' }); this.updatePosterSelection()
 },
 useTextPoster() { if (this.data.generating) return; this.setData({ selectedKeys: [], posterPath: '', posterError: '' }); this.updatePosterSelection() },
 morePosterPhotos() { this.setData({ photoLimit: this.data.photoLimit + 30 }); this.updatePosterSelection() },
 photoError(e) { const key = e.currentTarget.dataset.key; const item = this.posterChoices.find(photo => photo.key === key); if (item) { item.failed = true; this.updatePosterSelection() } },
 closePoster() { if (!this.data.generating && !this.data.savingPoster) this.setData({ posterOpen: false }) },
 changePosterSelection() { this.setData({ posterStep: 'select', posterError: '' }) },
 async generatePoster() {
  if (this.data.generating) return
  this.setData({ generating: true, posterError: '' })
  try {
   const path = await poster.generate(this, this.data.posterModel, this.data.selectedPhotos)
   if (this.disposed) return
   this.setData({ posterPath: path, posterStep: 'result' })
   if (this.data.chapter.isOwner && this.data.selectedPhotos.length) {
    const ids = Array.from(new Set(this.data.selectedPhotos.map(item => item.momentId)))
    if (store.setReviewPhotos(this.data.id, ids)) { cloud.flush(); this.load() }
   }
  } catch (error) { if (!this.disposed) this.setData({ posterError: error.message || '海报未生成，请重试' }) }
  finally { if (!this.disposed) this.setData({ generating: false }) }
 },
 previewPoster() { if (this.data.posterPath) wx.previewImage({ urls: [this.data.posterPath] }) },
 savePoster() {
  if (!this.data.posterPath || this.data.savingPoster) return
  this.setData({ savingPoster: true, posterError: '' })
  wx.saveImageToPhotosAlbum({
   filePath: this.data.posterPath,
   success: () => { this.setData({ albumDenied: false }); wx.showToast({ title: '已保存到相册', icon: 'success' }) },
   fail: error => { const denied = /auth|deny|denied|permission/i.test(error.errMsg || ''); this.setData({ albumDenied: denied, posterError: denied ? '需要允许保存到相册，海报已经为你保留。' : '这次没有保存成功，海报仍在，可再次保存。' }) },
   complete: () => this.setData({ savingPoster: false })
  })
 },
 openAlbumSettings() { wx.openSetting({ success: result => { if (result.authSetting['scope.writePhotosAlbum']) { this.setData({ albumDenied: false, posterError: '' }); this.savePoster() } } }) }
})
