Page({
  onReady() {
    this.timer = setTimeout(() => {
      const seen = wx.getStorageSync('ongoing:onboarding:seen')
      wx.redirectTo({ url: seen ? '/pages/index/index' : '/pages/onboarding/index' })
    }, 1050)
  },
  onUnload() { if (this.timer) clearTimeout(this.timer) }
})
