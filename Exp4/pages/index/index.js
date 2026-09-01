// pages/index/index.js —— 选关首页
const data = require('../../utils/data.js')
const store = require('../../utils/store.js')

Page({
  data: {
    levels: [],
    totalStars: 0,
    maxStars: data.levels.length * 3
  },

  onShow() {
    this.refreshLevels()
  },

  // 从本地存储刷新关卡卡片数据（星级 / 最佳步数 / 解锁状态）
  refreshLevels() {
    const prog = store.getProgress()
    const levels = data.levels.map((lv, i) => {
      const n = i + 1
      const st = prog.stats[n]
      return {
        n: n,
        name: lv.name,
        par: lv.par,
        locked: n > prog.unlocked,
        stars: st ? st.stars : 0,
        starsArr: [0, 1, 2].map(k => (st ? k < st.stars : false)),
        best: st ? st.best : 0
      }
    })
    this.setData({
      levels: levels,
      totalStars: levels.reduce((s, l) => s + l.stars, 0)
    })
  },

  // 点击关卡卡片
  onTapLevel(e) {
    const n = e.currentTarget.dataset.n
    const item = this.data.levels[n - 1]
    if (!item) return
    if (item.locked) {
      wx.showToast({ title: '先通过上一关吧', icon: 'none' })
      return
    }
    wx.navigateTo({
      url: '/pages/game/game?level=' + n
    })
  },

  // 分享
  onShareAppMessage() {
    return {
      title: '推箱子 · 帮红色小鸟把箱子推给小猪',
      path: '/pages/index/index'
    }
  },

  onShareTimeline() {
    return {
      title: '推箱子 · 帮红色小鸟把箱子推给小猪'
    }
  }
})
