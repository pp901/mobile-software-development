App({

  /**
   * 当小程序初始化完成时，会触发 onLaunch（全局只触发一次）
   */
  onLaunch: function () {
    // 清理旧版本（无用户 ID 隔离）的遗留收藏/足迹数据
    try {
      var info = wx.getStorageInfoSync()
      info.keys.forEach(function (k) {
        if (k === 'fav_ids' || k === 'fav_folders' || k === 'history' ||
            k.indexOf('news_') === 0) {
          wx.removeStorageSync(k)
        }
      })
    } catch (e) { }
  },

  /**
   * 当小程序启动，或从后台进入前台显示，会触发 onShow
   */
  onShow: function (options) {
    
  },

  /**
   * 当小程序从前台进入后台，会触发 onHide
   */
  onHide: function () {
    
  },

  /**
   * 当小程序发生脚本错误，或者 api 调用失败时，会触发 onError 并带上错误信息
   * 本地留存最近 20 条错误日志（key: error_logs），便于真机联调时在 Storage 面板排查
   */
  onError: function (msg) {
    try {
      var logs = wx.getStorageSync('error_logs') || []
      logs.unshift({
        time: Date.now(),
        msg: String(msg).slice(0, 500)
      })
      wx.setStorageSync('error_logs', logs.slice(0, 20))
    } catch (e) {
      // 存储异常时静默失败，避免二次报错
    }
  }
})
