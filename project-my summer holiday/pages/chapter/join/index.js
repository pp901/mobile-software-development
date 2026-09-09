const collaboration = require('../../../services/collaboration')

Page({
  data: { code: '', joining: false, error: '' },
  onLoad(options) { this.setData({ code: options.code || '' }) },
  join() {
    if (!this.data.code || this.data.joining) return
    this.setData({ joining: true, error: '' })
    collaboration.joinInvite(this.data.code).then(chapter => {
      if (!chapter) return this.setData({ joining: false, error: '邀请已失效，或这份邀请不在当前设备中。请让创建者重新分享。' })
      wx.showToast({ title: '已经加入这一章', icon: 'success' })
      setTimeout(() => wx.redirectTo({ url: `/pages/chapter/detail/index?id=${chapter.id}` }), 500)
    })
  }
})
