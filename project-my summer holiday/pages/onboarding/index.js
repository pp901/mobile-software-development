Page({
  data: { current: 0 },
  onChange(event) { this.setData({ current: event.detail.current }) },
  next() { if (this.data.current < 2) this.setData({ current: this.data.current + 1 }); else this.enter() },
  enter() { wx.setStorageSync('ongoing:onboarding:seen', true); wx.redirectTo({ url: '/pages/index/index' }) }
})
