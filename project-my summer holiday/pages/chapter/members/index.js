const store = require('../../../services/store')
const cloud = require('../../../services/collaboration')
Page({
 data: { id: '', chapter: null, members: [], invite: null, preparing: false, loading: true, error: '', busy: false },
 onLoad(options) { this.setData({ id: options.id || '' }); if (wx.hideShareMenu) wx.hideShareMenu() },
 onShow() { this.load(); this.refresh() },
 load() {
  const chapter = store.getChapter(this.data.id)
  this.setData({ chapter, members: chapter ? chapter.members.map(member => Object.assign({}, member, { isOwner: member.id === chapter.ownerId, isMe: member.id === store.getCurrentUser().id })) : [] })
 },
 async refresh() {
  this.setData({ loading: true, error: '' })
  const result = await cloud.pullChapter(this.data.id)
  this.load()
  this.setData({ loading: false, error: result ? '' : cloud.getLastError() })
 },
 async prepareInvite() {
  if (this.data.preparing) return
  if (this.data.invite && this.data.invite.expiresAt > Date.now() + 60000) return
  this.setData({ preparing: true, invite: null, error: '' })
  try { this.setData({ invite: await cloud.createInvite(this.data.id) }) }
  catch (error) { this.setData({ error: error.message }) }
  finally { this.setData({ preparing: false }) }
 },
 async copyInvite() {
  await this.prepareInvite()
  if (!this.data.invite) return
  wx.setClipboardData({ data: cloud.inviteText(this.data.invite, '一起记录「' + this.data.chapter.title + '」'), fail: () => this.setData({ error: '复制未成功，请重试' }) })
 },
 removeMember(e) {
  const member = this.data.members.find(item => item.id === e.currentTarget.dataset.id)
  if (!member || member.isOwner || !this.data.chapter.isOwner || this.data.busy) return
  wx.showModal({ title: '移除 ' + member.nickname + '？', content: '对方发布的记录会保留，已接受的单个 Moment 邀请不受影响。', confirmText: '移除',
   success: result => { if (result.confirm) this.changeMembership(member.id) } })
 },
 leave() {
  if (this.data.busy) return
  wx.showModal({ title: '退出这个 Chapter？', content: '你留下的共同记录会保留。', confirmText: '退出',
   success: result => { if (result.confirm) this.changeMembership(store.getCurrentUser().id) } })
 },
 async changeMembership(memberId) {
  this.setData({ busy: true, error: '' })
  const leaving = memberId === store.getCurrentUser().id
  const ok = await cloud.removeMember(this.data.id, memberId)
  this.setData({ busy: false })
  if (!ok) return this.setData({ error: cloud.getLastError() || '操作未完成，请重试' })
  if (leaving) wx.redirectTo({ url: '/pages/history/index?view=chapters' })
  else { this.load(); wx.showToast({ title: '成员已移除', icon: 'success' }) }
 },
 avatarError(e) { this.setData({ ['members[' + e.currentTarget.dataset.index + '].avatar']: '' }) },
 onPullDownRefresh() { this.refresh().finally(() => wx.stopPullDownRefresh()) },
 goHome() { wx.redirectTo({ url: '/pages/history/index?view=chapters' }) },
 onShareAppMessage() {
  const invite = this.data.invite
  return invite ? { title: '一起记录「' + this.data.chapter.title + '」', path: '/pages/chapter/join/index?code=' + invite.code, imageUrl: '/assets/images/logo.webp' } : { title: 'ongoing_', path: '/pages/index/index' }
 }
})
