const store = require('../../../services/store')
const collaboration = require('../../../services/collaboration')

Page({
  data: { id: '', chapter: null, members: [], invite: null, preparing: false },
  onLoad(options) { this.setData({ id: options.id || '' }); this.load() },
  onShow() { this.load() },
  load() {
    const chapter = store.getChapter(this.data.id)
    if (!chapter) return wx.showToast({ title: 'Chapter 不存在', icon: 'none' })
    const moments = store.getMoments(chapter.id)
    const members = chapter.members.map(member => Object.assign({}, member, {
      isOwner: member.id === chapter.ownerId,
      isMe: member.id === store.getCurrentUser().id,
      momentCount: moments.filter(item => item.creatorId === member.id).length
    }))
    this.setData({ chapter, members, memberPreview: members.slice(0, 5) })
    if (chapter.isOwner && !this.data.invite) this.prepareInvite()
  },
  prepareInvite() {
    if (this.data.preparing) return
    this.setData({ preparing: true })
    collaboration.createInvite(this.data.id).then(invite => this.setData({ invite, preparing: false }))
  },
  removeMember(event) {
    const member = this.data.members.find(item => item.id === event.currentTarget.dataset.id)
    if (!member || member.isOwner || !this.data.chapter.isOwner) return
    wx.showModal({ title: `移除 ${member.nickname}？`, content: '对方已经发布的 Moment 会继续保留。', confirmText: '移除', confirmColor: '#EC765F', success: res => {
      if (!res.confirm) return
      if (store.removeMember(this.data.id, member.id)) { collaboration.removeMember(this.data.id, member.id); this.load() }
    } })
  },
  leave() {
    wx.showModal({ title: '退出共同 Chapter？', content: '你发布过的 Moment 会继续保留。', success: res => {
      if (res.confirm && store.removeMember(this.data.id, store.getCurrentUser().id)) wx.redirectTo({ url: '/pages/index/index' })
    } })
  },
  onShareAppMessage() {
    const invite = this.data.invite
    return {
      title: `来和我一起记录「${this.data.chapter.title}」`,
      path: invite ? `/pages/chapter/join/index?code=${invite.code}` : `/pages/chapter/detail/index?id=${this.data.id}`,
      imageUrl: this.data.chapter.cover
    }
  }
})
