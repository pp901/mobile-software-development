const store = require('../../../services/store')
const cloud = require('../../../services/collaboration')
Page({
 data: { id: '', moment: null, perspectives: [], missing: false, loading: false, invitePanel: false, invite: null, error: '', imageIndex: 0, failedImages: {}, headline: '', showReceipt: false, echo: null, organizePanel: false, organizeError: '', readError: '', pendingHere: false },
 onLoad(options) {
  this.setData({ id: options.id || '', showReceipt: options.saved === '1' })
  this.fromEcho = options.echo === '1'
  this.load()
 },
 onShow() {
  if (!this.data.id) return
  if (this.hasShown) this.load()
  this.hasShown = true
  this.refreshMoment()
 },
 async refreshMoment() {
  if (this.refreshing) return
  this.refreshing = true
  this.setData({ loading: !this.data.moment, readError: '' })
  try {
   // A newly saved local Moment may not exist remotely until its queued write finishes.
   const local = store.getMoment(this.data.id)
   if (local && local.syncState === 'pending') {
    await cloud.flush()
    const latest = store.getMoment(this.data.id)
    if (!latest || latest.syncState === 'pending') return
   }
   const snapshot = await cloud.pullMoment(this.data.id)
   this.setData({ readError: snapshot ? '' : cloud.getLastError() })
  } finally { this.refreshing = false; this.setData({ loading: false }); this.load() }
 },
 load() {
  const moment = store.getMoment(this.data.id)
  const echo = this.fromEcho ? store.getEchoMoment() : null
  this.setData({
   pendingHere: !!moment && (moment.syncState === 'pending' || moment.contributions.some(item => item.syncState === 'pending')),
   syncStatus: cloud.getSyncStatus ? cloud.getSyncStatus() : {}, moment, perspectives: moment ? store.getPerspectives(moment.id).filter(item => !item.isOriginal) : [],
   headline: moment ? moment.media.length ? '这一刻的画面' : moment.voicePath ? '把声音留给以后' : '记下这一刻' : '',
   imageIndex: moment ? Math.min(this.data.imageIndex, Math.max(0, moment.media.length - 1)) : 0,
   chapter: moment ? store.getChapter(moment.chapterId) : null, missing: !moment, currentId: store.getCurrentUser().id,
   stats: store.getLifeStats(), echo: echo && echo.id === this.data.id ? echo : null
  })
 },
 async retrySync() { await cloud.flush(); await this.refreshMoment() },
 dismissReceipt() { this.setData({ showReceipt: false }) },
 changeImage(e) { this.setData({ imageIndex: e.detail.current }) },
 imageError(e) { this.setData({ ['failedImages.' + e.currentTarget.dataset.index]: true }) },
 preview(e) { const urls = this.data.moment.media.filter(x => x.type === 'image').map(x => x.displayPath || x.path); if (urls.length) wx.previewImage({ urls, current: e.currentTarget.dataset.src }) },
 onPullDownRefresh() { this.refreshMoment().finally(() => wx.stopPullDownRefresh()) },
 perspectiveMore(e) {
  wx.showActionSheet({ itemList: ['编辑我的视角', '删除我的视角'], success: result => {
   if (result.tapIndex === 0) this.edit(e)
   else this.deletePerspective(e)
  } })
 },
 edit(e) { const original = e.currentTarget.dataset.original; const id = e.currentTarget.dataset.id; wx.navigateTo({ url: original ? '/pages/moment/editor/index?id=' + this.data.id : '/pages/moment/editor/index?momentId=' + this.data.id + '&contributionId=' + id }) },
 contribute() {
  const moment = this.data.moment
  if (!moment || !moment.canContribute) return
  const url = moment.canEdit ? '/pages/moment/editor/index?id=' + moment.id : '/pages/moment/editor/index?momentId=' + moment.id + (moment.myPerspectiveId ? '&contributionId=' + moment.myPerspectiveId : '')
  wx.navigateTo({ url })
 },
 openChapter() { if (this.data.chapter) wx.navigateTo({ url: '/pages/chapter/detail/index?id=' + this.data.chapter.id }) },
 openOrganize() { if (!this.data.moment.canOrganize) return; this.setData({ organizePanel: true, organizeError: '', chapters: store.getChapters().filter(item => item.status !== 'ARCHIVED') }) },
 closeOrganize() { this.setData({ organizePanel: false }) },
 organize(e) {
  const chapter = store.getChapter(e.currentTarget.dataset.id)
  const moment = store.getMoment(this.data.id)
  if (!chapter || !moment || !moment.canOrganize) return this.setData({ organizeError: '记录的共享状态已变化，请重新打开后再试。' })
  const save = () => {
   const saved = store.saveMoment({ id: moment.id, chapterId: chapter.id })
   if (!saved) return this.setData({ organizeError: store.getLastError() || '暂时无法整理，请重试。' })
   this.setData({ organizePanel: false }); this.load(); cloud.flush()
   wx.showToast({ title: '已放入这一章', icon: 'success' })
  }
  if (chapter.memberCount > 1) wx.showModal({ title: '放入共同 Chapter？', content: chapter.memberCount + ' 位成员将能看到这一刻。', confirmText: '放入', success: result => { if (result.confirm) save() } })
  else save()
 },
 createChapter() { this.setData({ organizePanel: false }); wx.navigateTo({ url: '/pages/chapter/editor/index' }) },
 favorite() { if (store.toggleFavorite(this.data.id)) this.load() },
 async invite() {
  this.setData({ invitePanel: true, error: '' })
  if (this.data.invite && this.data.invite.expiresAt > Date.now() + 60000) return
  this.setData({ invite: null })
  try { const invite = await cloud.createMomentInvite(this.data.id); if (!invite) throw new Error('暂时无法创建邀请，请检查连接后重试'); this.setData({ invite }) }
  catch (error) { this.setData({ error: error.message }) }
 },
 copyInvite() {
  if (!this.data.invite) return
  wx.setClipboardData({ data: cloud.inviteText(this.data.invite, '邀请你留下这个 Moment 的视角'), fail: () => this.setData({ error: '复制未成功，请重试' }) })
 },
 closeInvite() { this.setData({ invitePanel: false }) },
 noop() {},
 more() {
  const m = this.data.moment
  const names = m.canEdit ? ['编辑 Moment', '删除 Moment'] : m.canDelete ? ['删除 Moment'] : []
  if (!names.length) return
  wx.showActionSheet({ itemList: names, success: ({ tapIndex }) => {
   if (names[tapIndex] === '编辑 Moment') wx.navigateTo({ url: '/pages/moment/editor/index?id=' + m.id })
   else wx.showModal({ title: '删除这个 Moment？', content: '其中的共同视角也会删除。', confirmText: '删除', confirmColor: '#b73336', success: r => {
    if (r.confirm) {
     if (!store.deleteMoment(m.id)) return wx.showToast({ title: store.getLastError() || '无法删除', icon: 'none' })
     cloud.flush(); this.goBack()
    }
   } })
  } })
 },
 deletePerspective(e) { const id = e.currentTarget.dataset.id; wx.showModal({ title: '删除自己的这段记录？', confirmText: '删除', success: r => { if (r.confirm) { if (store.deleteContribution(id)) { cloud.flush(); this.load() } else wx.showToast({ title: store.getLastError() || '无法删除', icon: 'none' }) } } }) },
 goBack() { wx.navigateBack({ fail: () => wx.redirectTo({ url: '/pages/index/index' }) }) },
 goHome() { wx.reLaunch({ url: '/pages/index/index' }) },
 onShareAppMessage() { return this.data.invite ? { title: '在你的记忆里，这一刻是什么样的？', path: '/pages/chapter/join/index?scope=moment&code=' + this.data.invite.code } : { title: 'ongoing_', path: '/pages/index/index' } }
})
