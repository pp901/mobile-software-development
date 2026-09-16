Component({
  options: { virtualHost: true, styleIsolation: 'apply-shared' },
  properties: {
    active: { type: String, value: 'now' },
    showCreate: { type: Boolean, value: false }
  },
  methods: {
    openNow() { if (this.data.active !== 'now') wx.redirectTo({ url: '/pages/index/index' }) },
    openChapters() { if (this.data.active !== 'chapters' && this.data.active !== 'history') wx.redirectTo({ url: '/pages/history/index' }) },
    createMoment() { wx.navigateTo({ url: '/pages/moment/editor/index' }) },
    openProfile() { if (this.data.active !== 'profile') wx.redirectTo({ url: '/pages/profile/index' }) }
  }
})
