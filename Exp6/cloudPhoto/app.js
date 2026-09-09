App({
  onLaunch: function () {
    if (!wx.cloud) {
      console.error('请使用 2.2.3 或以上的基础库以使用云能力')
    } else {
      // 云环境初始化（完整环境ID见云开发控制台-概览）
      wx.cloud.init({
        env: 'cloud1-d3gkyt79x24b49e66',
        traceUser: true
      })
    }

    this.globalData = {
      // 用户基础信息（昵称、头像、地区等）
      userInfo: null,
      // 当前用户 openid
      openid: null
    }

    // 启动时预取一次 openid，保证用户未点首页按钮时其他页面也能拿到身份
    this.fetchOpenid()
  },

  /**
   * 获取 openid（带缓存），callback(openid)
   */
  fetchOpenid: function (callback) {
    var that = this
    if (this.globalData.openid) {
      if (callback) callback(this.globalData.openid)
      return
    }
    wx.cloud.callFunction({
      name: 'getOpenid',
      complete: function (res) {
        if (res.result && res.result.openid) {
          that.globalData.openid = res.result.openid
        }
        if (callback) callback(that.globalData.openid)
      }
    })
  },

  /**
   * 判断缓存的用户信息是否有效
   * （新版基础库 open-type='getUserInfo' 可能返回"微信用户"匿名信息，需要兜底）
   */
  isValidUserInfo: function () {
    var u = this.globalData.userInfo
    return !!(u && u.nickName && u.nickName !== '微信用户' && u.avatarUrl)
  }
})
