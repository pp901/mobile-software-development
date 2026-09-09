const store = require('../../../services/store')
const collaboration = require('../../../services/collaboration')

Page({
  data: {
    id: '', chapter: null, moments: [], visibleMoments: [], activeTab: '瞬间',
    filter: 'all', filters: [], places: [], completion: 0, goalPanel: false,
    goalTitle: '', editingGoalId: ''
  },
  onLoad(options) {
    const active = store.getActiveChapter()
    this.setData({ id: options.id || (active && active.id) || '' })
    if (this.data.id) {
      this.load()
      collaboration.pullChapter(this.data.id).then(chapter => { if (chapter) this.load() })
    }
  },
  onShow() { if (this.data.id) this.load() },
  onPullDownRefresh() { collaboration.pullChapter(this.data.id).then(() => { this.load(); wx.stopPullDownRefresh() }) },
  load() {
    const chapter = store.getChapter(this.data.id)
    if (!chapter) return wx.showToast({ title: '这一章暂时找不到了', icon: 'none' })
    const current = store.getCurrentUser()
    const filters = [{ id: 'all', nickname: '全部' }, { id: 'mine', nickname: '我的' }].concat(chapter.members.map(item => ({ id: item.id, nickname: item.nickname, avatar: item.avatar })))
    const moments = store.getMoments(chapter.id, this.data.filter)
    const placeMap = {}
    moments.forEach(item => {
      if (!item.location) return
      if (!placeMap[item.location]) placeMap[item.location] = { name: item.location, image: item.image, count: 0 }
      placeMap[item.location].count += 1
      if (!placeMap[item.location].image && item.image) placeMap[item.location].image = item.image
    })
    this.setData({
      chapter, current, filters, moments, visibleMoments: moments.slice(0, 8),
      places: Object.keys(placeMap).map(key => placeMap[key]),
      completion: chapter.goalsTotal ? Math.round(chapter.goalsDone / chapter.goalsTotal * 100) : 0
    })
  },
  changeTab(event) { this.setData({ activeTab: event.currentTarget.dataset.tab }) },
  changeFilter(event) { this.setData({ filter: event.currentTarget.dataset.id }, () => this.load()) },
  openMoment(event) { wx.navigateTo({ url: `/pages/moment/detail/index?id=${event.detail.id}` }) },
  createMoment() {
    if (!this.data.chapter.canAddMoment) return wx.showToast({ title: this.data.chapter.status === 'ONGOING' ? '加入后才能共同记录' : '这一章已经结束', icon: 'none' })
    wx.navigateTo({ url: `/pages/moment/editor/index?quick=1&chapterId=${this.data.chapter.id}` })
  },
  openMembers() { wx.navigateTo({ url: `/pages/chapter/members/index?id=${this.data.id}` }) },
  openReview() { wx.navigateTo({ url: `/pages/review/index?id=${this.data.id}` }) },
  finishChapter() { wx.navigateTo({ url: `/pages/review/index?id=${this.data.id}&finish=1` }) },
  toggleGoal(event) {
    const result = store.toggleGoal(this.data.id, event.currentTarget.dataset.id)
    if (!result) return wx.showToast({ title: '当前不能更新目标', icon: 'none' })
    collaboration.pushGoal(this.data.id, result.goal.id, result.goal.done)
    this.load()
    wx.showToast({ title: result.justCompleted ? '完成了一个小目标' : '已恢复为未完成', icon: 'none' })
  },
  showGoalPanel() {
    if (!this.data.chapter.isOwner) return wx.showToast({ title: '创建者负责管理目标', icon: 'none' })
    this.setData({ goalPanel: true, goalTitle: '', editingGoalId: '' })
  },
  editGoal(event) {
    if (!this.data.chapter.isOwner) return
    const goal = this.data.chapter.goals.find(item => item.id === event.currentTarget.dataset.id)
    this.setData({ goalPanel: true, goalTitle: goal.title, editingGoalId: goal.id })
  },
  inputGoal(event) { this.setData({ goalTitle: event.detail.value }) },
  closeGoalPanel() { this.setData({ goalPanel: false }) },
  noop() {},
  saveGoal() {
    const title = this.data.goalTitle.trim()
    if (!title) return wx.showToast({ title: '先写下目标', icon: 'none' })
    store.saveGoal(this.data.id, { id: this.data.editingGoalId || undefined, title })
    collaboration.publishChapter(this.data.id)
    this.closeGoalPanel(); this.load()
  },
  deleteGoal() { store.deleteGoal(this.data.id, this.data.editingGoalId); collaboration.publishChapter(this.data.id); this.closeGoalPanel(); this.load() },
  showAll() { this.setData({ visibleMoments: this.data.moments }) },
  more() {
    const chapter = this.data.chapter
    const actions = chapter.isOwner
      ? (chapter.status === 'ONGOING'
        ? [{ label: '编辑这一章', key: 'edit' }, { label: '结束这一章', key: 'finish' }, { label: '设为当前 Chapter', key: 'active' }, { label: '删除这一章', key: 'delete' }]
        : [{ label: '查看完整回望', key: 'review' }, { label: '编辑这一章', key: 'edit' }, { label: '删除这一章', key: 'delete' }])
      : [{ label: '查看共同成员', key: 'members' }, { label: '退出这一章', key: 'leave' }]
    wx.showActionSheet({ itemList: actions.map(item => item.label), success: ({ tapIndex }) => this.runAction(actions[tapIndex].key) })
  },
  runAction(key) {
    const chapter = this.data.chapter
    if (key === 'edit') wx.navigateTo({ url: `/pages/chapter/editor/index?id=${chapter.id}` })
    if (key === 'finish') this.finishChapter()
    if (key === 'review') this.openReview()
    if (key === 'members') this.openMembers()
    if (key === 'active') { store.setActiveChapter(chapter.id); wx.showToast({ title: '已设为当前 Chapter', icon: 'none' }) }
    if (key === 'delete') wx.showModal({ title: '删除整章故事？', content: 'Chapter、Moment 和补完内容都会删除，无法找回。', confirmText: '删除', confirmColor: '#EC765F', success: res => { if (res.confirm && store.deleteChapter(chapter.id)) wx.redirectTo({ url: '/pages/history/index' }) } })
    if (key === 'leave') wx.showModal({ title: '退出这一章？', content: '你发布过的 Moment 会继续保留。', success: res => { if (res.confirm && store.removeMember(chapter.id, store.getCurrentUser().id)) wx.redirectTo({ url: '/pages/index/index' }) } })
  },
  onShareAppMessage() { return { title: `${this.data.chapter.title}｜一起记录这一章`, path: `/pages/chapter/detail/index?id=${this.data.id}`, imageUrl: this.data.chapter.cover } }
})
