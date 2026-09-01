// utils/store.js —— 通关进度本地存储
const KEY = 'boxgame_progress_v2'

// 读取进度：{ unlocked: 已解锁到第几关, stats: { 关卡号: { stars, best } } }
function getProgress() {
  let p = null
  try {
    p = wx.getStorageSync(KEY)
  } catch (e) {
    p = null
  }
  if (!p || typeof p.unlocked !== 'number') {
    p = { unlocked: 1, stats: {} }
  }
  if (!p.stats) {
    p.stats = {}
  }
  return p
}

// 记录一次通关，返回是否刷新最佳步数纪录
function recordWin(level, totalLevels, stars, steps) {
  const p = getProgress()
  const old = p.stats[level]
  let newBest = false
  if (!old) {
    p.stats[level] = { stars: stars, best: steps }
    newBest = true
  } else {
    if (stars > old.stars) {
      old.stars = stars
    }
    if (steps < old.best) {
      old.best = steps
      newBest = true
    }
  }
  if (level < totalLevels && p.unlocked < level + 1) {
    p.unlocked = level + 1
  }
  try {
    wx.setStorageSync(KEY, p)
  } catch (e) {}
  return newBest
}

module.exports = {
  getProgress: getProgress,
  recordWin: recordWin
}
