const store = require('../../services/store')
const cloud = require('../../services/collaboration')

function greeting(now) {
  const hour = now.getHours()
  if (hour < 6) return '夜深了'
  if (hour < 11) return '早上好'
  if (hour < 14) return '中午好'
  if (hour < 18) return '下午好'
  return '晚上好'
}

Page({
  data: {
    chapters: [], moments: [], chapterIndex: 0, limit: 3,
    expanded: false, hasMore: false, avatarFailed: false, echo: null, echoImageFailed: false, selectedChapterId: ''
  },
  onShow() {
    this.load()
    cloud.refreshAll().then(() => this.load())
  },
  load() {
    const now = new Date()
    const all = store.getMoments()
    const chapters = store.getChapters('ONGOING').map(chapter => {
      const recentPhoto = all.find(moment => moment.chapterId === chapter.id && moment.image)
      const customCover = chapter.cover && chapter.cover !== '/assets/images/chapter-summer.webp'
      return Object.assign({}, chapter, {
        homeCover: customCover ? chapter.displayCover || chapter.cover : recentPhoto ? recentPhoto.image : chapter.displayCover || chapter.cover || '',
        yearLabel: String(chapter.startDate || '').slice(0, 4),
        shortStart: this.shortDate(chapter.startDate),
        shortEnd: this.shortDate(chapter.endDate)
      })
    })
    const selectedId = this.data.selectedChapterId || (store.getActiveChapter() || {}).id
    const selectedIndex = chapters.findIndex(chapter => chapter.id === selectedId)
    const chapterIndex = this.showingNew ? chapters.length : selectedIndex >= 0 ? selectedIndex : 0
    const current = chapters[chapterIndex]
    const recent = current ? all.filter(moment => moment.chapterId === current.id) : chapters.length ? [] : all
    this.setData({
      chapters,
      chapterIndex,
      selectedChapterId: current ? current.id : '',
      moments: recent.slice(0, this.data.limit),
      total: recent.length,
      hasMore: recent.length > this.data.limit,
      echo: store.getEchoMoment(),
      profile: store.getCurrentUser(),
      today: `${now.getMonth() + 1}月${now.getDate()}日  周${'日一二三四五六'[now.getDay()]}`,
      greeting: greeting(now),
      draft: store.getEditorDraft(store.getCurrentUser().id + ':new')
    })
  },
  shortDate(value) {
    const parts = String(value || '').split('-')
    return parts.length === 3 ? `${Number(parts[1])}月${Number(parts[2])}日` : ''
  },
  onReachBottom() {
    if (this.data.expanded && this.data.hasMore) {
      this.setData({ limit: this.data.limit + 15 })
      this.load()
    }
  },
  onPullDownRefresh() {
    cloud.refreshAll().finally(() => { this.load(); wx.stopPullDownRefresh() })
  },
  changeChapter(event) {
    const chapterIndex = event.detail.current
    const chapter = this.data.chapters[chapterIndex]
    this.showingNew = !chapter
    this.setData({ chapterIndex, selectedChapterId: chapter ? chapter.id : '', expanded: false, limit: 3 })
    if (chapter) store.setActiveChapter(chapter.id)
    this.load()
  },
  coverError(event) { this.setData({ [`chapters[${event.currentTarget.dataset.index}].homeCover`]: '' }) },
  avatarError() { this.setData({ avatarFailed: true }) },
  openChapter(event) { wx.navigateTo({ url: '/pages/chapter/detail/index?id=' + event.currentTarget.dataset.id }) },
  openMoment(event) { wx.navigateTo({ url: '/pages/moment/detail/index?id=' + event.detail.id }) },
  createChapter() { wx.navigateTo({ url: '/pages/chapter/editor/index' }) },
  createMoment() { const chapter = this.data.chapters[this.data.chapterIndex]; wx.navigateTo({ url: '/pages/moment/editor/index' + (chapter ? '?chapterId=' + chapter.id : '') }) },
  resumeDraft() { wx.navigateTo({ url: '/pages/moment/editor/index' }) },
  openEcho() { wx.navigateTo({ url: this.data.echo ? '/pages/moment/detail/index?id=' + this.data.echo.id : '/pages/history/index?view=review' }) },
  echoImageError() { this.setData({ echoImageFailed: true }) },
  openSearch() { wx.navigateTo({ url: '/pages/search/index' }) },
  openProfile() { wx.navigateTo({ url: '/pages/profile/index' }) },
  toggleRecent() {
    const expanded = !this.data.expanded
    this.setData({ expanded, limit: expanded ? 18 : 3 })
    this.load()
  }
})
