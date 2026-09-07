const store = require('../../../services/store')

Page({
  data: { id: '', chapter: null, moments: [], activeTab: '瞬间', visibleMoments: [], places: [], completion: 0 },
  onLoad(options) {
    const active = store.getActiveChapter()
    this.setData({ id: options.id || (active && active.id) || '' })
    if (this.data.id) this.load()
  },
  onShow() { if (this.data.id) this.load() },
  onPullDownRefresh() { this.load(); wx.stopPullDownRefresh() },
  load() {
    const chapter = store.getChapter(this.data.id)
    if (!chapter) return wx.showToast({ title: '这一章暂时找不到了', icon: 'none' })
    const moments = store.getMoments(chapter.id)
    const placeMap = {}
    moments.forEach(item => { if (item.location && !placeMap[item.location]) placeMap[item.location] = { name: item.location, image: item.image, count: moments.filter(one => one.location === item.location).length } })
    const places = Object.keys(placeMap).map(key => placeMap[key]).slice(0, 6)
    const completion = chapter.goalsTotal ? Math.round(chapter.goalsDone / chapter.goalsTotal * 100) : 0
    this.setData({ chapter, moments, visibleMoments: moments.slice(0, 8), places, completion })
  },
  back() { wx.navigateBack({ fail: () => wx.redirectTo({ url: '/pages/index/index' }) }) },
  changeTab(event) { this.setData({ activeTab: event.currentTarget.dataset.tab }) },
  openMoment(event) { wx.navigateTo({ url: `/pages/moment/detail/index?id=${event.detail.id}` }) },
  createMoment() { wx.navigateTo({ url: `/pages/moment/editor/index?chapterId=${this.data.chapter.id}` }) },
  openReview() { wx.navigateTo({ url: `/pages/review/index?id=${this.data.chapter.id}` }) },
  toggleGoal(event) { store.toggleGoal(this.data.chapter.id, event.currentTarget.dataset.id); this.load(); wx.showToast({ title: '进度已经记下', icon: 'none' }) },
  showAll() { this.setData({ visibleMoments: this.data.moments }) },
  more() {
    const chapter = this.data.chapter
    let actions
    if (chapter.status === 'ONGOING') actions = [
      { label: '设为当前 Chapter', key: 'active' }, { label: '编辑这一章', key: 'edit' },
      { label: '为这一章写下结尾', key: 'review' }, { label: '暂时归档', key: 'archive' },
      { label: '删除这一章', key: 'delete' }
    ]
    else if (chapter.status === 'COMPLETED') actions = [
      { label: '查看完整回望', key: 'review' }, { label: '编辑这一章', key: 'edit' },
      { label: '移入归档', key: 'archive' }, { label: '删除这一章', key: 'delete' }
    ]
    else actions = [
      { label: '重新继续这一章', key: 'restore' }, { label: '编辑这一章', key: 'edit' },
      { label: '删除这一章', key: 'delete' }
    ]
    wx.showActionSheet({
      itemList: actions.map(item => item.label),
      success: ({ tapIndex }) => {
        const key = actions[tapIndex].key
        if (key === 'active') { store.setActiveChapter(chapter.id); wx.showToast({ title: '已回到当下', icon: 'none' }) }
        if (key === 'edit') wx.navigateTo({ url: `/pages/chapter/editor/index?id=${chapter.id}` })
        if (key === 'review') this.openReview()
        if (key === 'archive') { store.setChapterStatus(chapter.id, 'ARCHIVED'); this.load(); wx.showToast({ title: '这一章已收进归档', icon: 'none' }) }
        if (key === 'restore') { store.setChapterStatus(chapter.id, 'ONGOING'); this.load(); wx.showToast({ title: '故事继续发生', icon: 'none' }) }
        if (key === 'delete') this.confirmDelete()
      }
    })
  },
  confirmDelete() {
    wx.showModal({ title: '删除整章故事？', content: '这一章里的 Moment 也会一起删除，且无法找回。', confirmText: '删除', confirmColor: '#D9907A', success: res => {
      if (res.confirm) { store.deleteChapter(this.data.chapter.id); wx.showToast({ title: '这一章已删除', icon: 'none' }); setTimeout(() => wx.redirectTo({ url: '/pages/history/index' }), 500) }
    } })
  },
  onShareAppMessage() { return { title: `${this.data.chapter.title}｜ongoing_`, path: `/pages/chapter/detail/index?id=${this.data.chapter.id}`, imageUrl: this.data.chapter.cover } }
})
