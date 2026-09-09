const store = require('../../../services/store')
const collaboration = require('../../../services/collaboration')

Page({
  data: { id: '', moment: null, chapter: null, related: [], playingPath: '', inviteTarget: null, sharePanel: false, contributorCount: 0, loadingRemote: false },
  onLoad(options) {
    this.setData({ id: options.id || '' })
    this.audio = wx.createInnerAudioContext()
    this.audio.onEnded(() => this.setData({ playingPath: '' }))
    if (options.chapterId && !store.getMoment(options.id)) {
      this.setData({ loadingRemote: true })
      collaboration.pullChapter(options.chapterId).then(() => { this.setData({ loadingRemote: false }); this.load() })
    }
  },
  onShow() { if (!this.data.loadingRemote) this.load() },
  onUnload() { if (this.audio) this.audio.destroy() },
  load() {
    const moment = store.getMoment(this.data.id)
    if (!moment) return wx.showModal({ title: 'Moment 不见了', content: '它可能已经被删除。', showCancel: false, success: () => wx.navigateBack() })
    const chapter = store.getChapter(moment.chapterId)
    const people = Array.from(new Set([moment.creatorId].concat(moment.contributions.map(item => item.creatorId))))
    this.setData({ moment, chapter, current: store.getCurrentUser(), contributorCount: people.length, related: store.getMoments(moment.chapterId).filter(item => item.id !== moment.id && item.image).slice(0, 3) })
  },
  preview(event) { const current = event.currentTarget.dataset.src || this.data.moment.image; const urls = this.data.moment.media.filter(item => item.type === 'image').map(item => item.path); if (urls.length) wx.previewImage({ urls, current }) },
  previewContribution(event) { const contribution = this.data.moment.contributions.find(item => item.id === event.currentTarget.dataset.id); if (contribution && contribution.image) wx.previewImage({ urls: contribution.media.map(item => item.path), current: contribution.image }) },
  toggleFavorite() { const moment = store.toggleFavorite(this.data.id); this.setData({ moment }) },
  play(event) {
    const path = event.currentTarget.dataset.path
    if (!path) return
    if (this.data.playingPath === path) { this.audio.pause(); this.setData({ playingPath: '' }) }
    else { this.audio.src = path; this.audio.play(); this.setData({ playingPath: path }) }
  },
  openChapter() { wx.navigateTo({ url: `/pages/chapter/detail/index?id=${this.data.chapter.id}` }) },
  openRelated(event) { wx.redirectTo({ url: `/pages/moment/detail/index?id=${event.currentTarget.dataset.id}` }) },
  contribute() { wx.navigateTo({ url: `/pages/moment/contribute/index?momentId=${this.data.id}` }) },
  prepareInvite() {
    if (this.data.chapter.status !== 'ONGOING') return wx.showToast({ title: '已结束的章节不能再补完', icon: 'none' })
    const choices = this.data.chapter.members.filter(item => item.id !== this.data.moment.creatorId)
    if (!choices.length) return wx.showToast({ title: '先邀请朋友加入 Chapter', icon: 'none' })
    wx.showActionSheet({ itemList: choices.map(item => `邀请 ${item.nickname}`), success: ({ tapIndex }) => this.setData({ inviteTarget: choices[tapIndex], sharePanel: true }) })
  },
  closeSharePanel() { this.setData({ sharePanel: false }) },
  noop() {},
  more() {
    const actions = []
    if (this.data.moment.canEdit) actions.push({ label: '编辑这个 Moment', key: 'edit' })
    if (this.data.moment.canDelete) actions.push({ label: '删除这个 Moment', key: 'delete' })
    if (!actions.length) return wx.showToast({ title: '只能管理自己的 Moment', icon: 'none' })
    wx.showActionSheet({ itemList: actions.map(item => item.label), success: ({ tapIndex }) => {
      if (actions[tapIndex].key === 'edit') wx.navigateTo({ url: `/pages/moment/editor/index?id=${this.data.id}` })
      else this.confirmDelete()
    } })
  },
  confirmDelete() { wx.showModal({ title: '删除这个片刻？', content: '补完内容也会一并删除，无法找回。', confirmText: '删除', confirmColor: '#EC765F', success: res => { if (res.confirm && store.deleteMoment(this.data.id)) { collaboration.removeMoment(this.data.id); wx.navigateBack() } } }) },
  onShareAppMessage(event) {
    if (event.from === 'button' && this.data.inviteTarget) return { title: `${this.data.moment.creator.nickname} 邀请你补充这一刻`, path: `/pages/moment/contribute/index?momentId=${this.data.id}&chapterId=${this.data.chapter.id}&memberId=${this.data.inviteTarget.id}`, imageUrl: this.data.moment.image || this.data.chapter.cover }
    return { title: `${this.data.moment.content.slice(0, 24) || '一个共同 Moment'}｜ongoing_`, path: `/pages/moment/detail/index?id=${this.data.id}&chapterId=${this.data.chapter.id}`, imageUrl: this.data.moment.image || this.data.chapter.cover }
  }
})
