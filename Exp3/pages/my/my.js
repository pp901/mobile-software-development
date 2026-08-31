// pages/my/my.js
var common = require('../../utils/common.js')
var store = require('../../utils/store.js')

Page({

  data: {
    // 登录状态
    isLogin: false,
    userId: '',            // 账号唯一标识（收藏/足迹按此隔离）
    nickName: '',
    avatarUrl: '',
    // 登录/编辑表单（新版头像昵称方案）
    tempAvatar: '',
    nicknameInput: '',
    editing: false,        // 已登录时进入"编辑资料"模式
    lastUser: null,        // 上次登录账号（退出后一键恢复）
    // 列表
    tab: 'fav',            // fav: 收藏 / history: 足迹
    favFolders: [],        // 收藏夹列表（含每夹数量）
    currentFolder: 'all',  // 'all' 或收藏夹 id
    favTotal: 0,           // 收藏总数（全部收藏夹）
    favList: [],
    historyGroups: [],   // 足迹按日期分组：[{label, items}]
    historyTotal: 0,
    // 左滑删除
    openId: ''
  },

  onLoad: function () {
    // 恢复登录状态（登录信息持久化，重启不丢失）
    let user = store.getUser()
    if (user && user.nickName) {
      this.setData({
        isLogin: true,
        userId: user.userId || '',
        nickName: user.nickName,
        avatarUrl: user.avatarUrl
      })
    }
    // 上次登录账号（退出后仍可一键恢复）
    this.setData({ lastUser: store.getLastUser() })
  },

  onShow: function () {
    // 每次显示刷新收藏与足迹
    if (this.data.isLogin) {
      this.getMyFavorites()
      this.getMyHistory()
    }
  },

  /* ================= 登录（新版头像昵称方案） ================= */

  // 选择微信头像
  onChooseAvatar: function (e) {
    this.setData({ tempAvatar: e.detail.avatarUrl })
  },

  // 昵称输入（input type=nickname，键盘会推荐微信昵称）
  onNicknameInput: function (e) {
    this.setData({ nicknameInput: e.detail.value })
  },

  // 确认登录 / 保存资料修改（复用同一表单）
  confirmLogin: function () {
    let editing = this.data.editing
    let avatarUrl = this.data.tempAvatar
    let nickName = (this.data.nicknameInput || '').trim()

    if (!nickName) {
      wx.showToast({ title: '请先填写昵称', icon: 'none' })
      return
    }
    if (!avatarUrl) {
      // 编辑时未换头像则保留原头像；新登录未选头像用校徽默认头像
      avatarUrl = editing ? this.data.avatarUrl : '/images/logo.png'
    }

    // 编辑资料：保持原 userId，数据不受影响
    // 新登录：生成新 userId，收藏/足迹从空白开始
    let saved = editing
      ? store.updateUser({ nickName: nickName, avatarUrl: avatarUrl })
      : store.setUser({ nickName: nickName, avatarUrl: avatarUrl })

    this.setData({
      isLogin: true,
      userId: saved.userId,
      nickName: saved.nickName,
      avatarUrl: saved.avatarUrl,
      tempAvatar: '',
      nicknameInput: '',
      editing: false,
      lastUser: { userId: saved.userId, nickName: saved.nickName, avatarUrl: saved.avatarUrl }
    })
    this.getMyFavorites()
    this.getMyHistory()
    wx.showToast({ title: editing ? '资料已更新' : '欢迎来到海大园', icon: 'none', duration: 900 })
  },

  // 进入编辑资料模式（预填当前昵称与头像）
  startEdit: function () {
    this.setData({
      editing: true,
      tempAvatar: this.data.avatarUrl,
      nicknameInput: this.data.nickName
    })
  },

  // 取消编辑
  cancelEdit: function () {
    this.setData({ editing: false, tempAvatar: '', nicknameInput: '' })
  },

  // 一键恢复上次登录账号（沿用原 userId 及其收藏/足迹）
  restoreLast: function () {
    let last = store.getLastUser()
    if (!last) return
    store.setUser(last)
    this.setData({
      isLogin: true,
      userId: last.userId,
      nickName: last.nickName,
      avatarUrl: last.avatarUrl,
      openId: '',
      lastUser: last
    })
    this.getMyFavorites()
    this.getMyHistory()
    wx.showToast({ title: '欢迎回来，' + last.nickName, icon: 'none', duration: 900 })
  },

  // 退出登录
  logout: function () {
    var that = this
    wx.showModal({
      title: '退出登录',
      content: '收藏与足迹会保留在该账号名下，可通过"一键恢复"找回，确定退出吗？',
      confirmColor: '#0A5BA8',
      success: function (res) {
        if (res.confirm) {
          store.clearUser()
          that.setData({
            isLogin: false,
            userId: '',
            nickName: '',
            avatarUrl: '',
            openId: '',
            editing: false,
            tempAvatar: '',
            nicknameInput: '',
            lastUser: store.getLastUser()
          })
        }
      }
    })
  },

  /* ================= 列表数据 ================= */

  // 刷新收藏夹与收藏列表（当前选中夹被删时自动回到全部）
  getMyFavorites: function () {
    let folders = store.getFolders()
    let counts = store.getFavFolderCounts()
    let favFolders = []
    let favTotal = 0
    for (let i = 0; i < folders.length; i++) {
      let count = counts[folders[i].id] || 0
      favFolders.push({ id: folders[i].id, name: folders[i].name, count: count })
      favTotal += count
    }
    let current = this.data.currentFolder
    let stillExist = current === 'all'
    for (let i = 0; i < favFolders.length; i++) {
      if (favFolders[i].id === current) { stillExist = true; break }
    }
    if (!stillExist) current = 'all'
    this.setData({
      favFolders: favFolders,
      favTotal: favTotal,
      currentFolder: current,
      favList: store.getFavorites(current === 'all' ? '' : current)
    })
  },

  // 更新浏览足迹列表（id -> 新闻数据，按日期分组展示）
  getMyHistory: function () {
    let entries = store.getHistory()
    let groups = []
    let groupIndex = {}
    let total = 0
    for (let i = 0; i < entries.length; i++) {
      let result = common.getNewsDetail(entries[i].id)
      if (result.code != '200') continue
      let art = result.news
      art.timeText = store.formatTs(entries[i].ts)
      let label = this.getDayLabel(entries[i].ts)
      if (groupIndex[label] === undefined) {
        groupIndex[label] = groups.length
        groups.push({ label: label, items: [] })
      }
      groups[groupIndex[label]].items.push(art)
      total++
    }
    this.setData({ historyGroups: groups, historyTotal: total })
  },

  // 足迹日期分组标签：今天 / 昨天 / 具体日期
  getDayLabel: function (ts) {
    let d = new Date(ts)
    let now = new Date()
    let todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()
    if (ts >= todayStart) return '今天'
    if (ts >= todayStart - 24 * 60 * 60 * 1000) return '昨天'
    return (d.getMonth() + 1) + '月' + d.getDate() + '日'
  },

  // 切换收藏 / 足迹
  switchTab: function (e) {
    this.setData({ tab: e.currentTarget.dataset.tab, openId: '' })
  },

  /* ================= 左滑删除 ================= */

  // 长按收藏卡片：移动到其他收藏夹
  onFavLongPress: function (e) {
    var that = this
    let id = e.currentTarget.dataset.id
    let item = null
    for (let i = 0; i < this.data.favList.length; i++) {
      if (this.data.favList[i].id === id) { item = this.data.favList[i]; break }
    }
    if (!item) return
    // 只列出该条当前所在夹以外的收藏夹
    let targets = []
    let items = []
    for (let i = 0; i < this.data.favFolders.length; i++) {
      if (this.data.favFolders[i].id !== item.folderId) {
        targets.push(this.data.favFolders[i])
        items.push(this.data.favFolders[i].name)
      }
    }
    if (!items.length) {
      wx.showToast({ title: '没有其他收藏夹可移动', icon: 'none' })
      return
    }
    wx.showActionSheet({
      itemList: items,
      success: function (res) {
        let target = targets[res.tapIndex]
        if (store.moveFavorite(id, target.id)) {
          that.getMyFavorites()
          wx.showToast({ title: '已移入「' + target.name + '」', icon: 'none', duration: 900 })
        }
      }
    })
  },

  onItemTouchStart: function (e) {
    this.touchStartX = e.touches[0].clientX
  },

  onItemTouchEnd: function (e) {
    let dx = e.changedTouches[0].clientX - this.touchStartX
    let id = e.currentTarget.dataset.id
    if (dx < -40) {
      this.setData({ openId: id })     // 左滑展开删除按钮
    } else if (dx > 40) {
      this.setData({ openId: '' })     // 右滑收起
    }
  },

  // 点击空白处收起删除按钮
  closeSwipe: function () {
    if (this.data.openId) this.setData({ openId: '' })
  },

  // 删除单条（收藏或足迹）
  deleteItem: function (e) {
    let id = e.currentTarget.dataset.id
    let type = e.currentTarget.dataset.type
    if (type === 'fav') {
      store.removeFavorite(id)
      this.getMyFavorites()
      wx.showToast({ title: '已取消收藏', icon: 'none', duration: 800 })
    } else {
      store.removeHistory(id)
      this.getMyHistory()
      wx.showToast({ title: '已删除足迹', icon: 'none', duration: 800 })
    }
    this.setData({ openId: '' })
  },

  // 一键清空浏览足迹
  clearAll: function () {
    var that = this
    let count = this.data.historyTotal
    if (!count) return
    wx.showModal({
      title: '提示',
      content: '确定清空全部浏览足迹吗？',
      confirmColor: '#FF6B6B',
      success: function (res) {
        if (res.confirm) {
          store.clearHistory()
          that.getMyHistory()
          that.setData({ openId: '' })
        }
      }
    })
  },

  /* ================= 收藏夹管理 ================= */

  // 切换收藏夹（'all' 为全部）
  switchFolder: function (e) {
    let folder = e.currentTarget.dataset.folder
    if (folder === this.data.currentFolder) return
    this.setData({ currentFolder: folder, openId: '' })
    this.getMyFavorites()
  },

  // 新建收藏夹
  createFolder: function () {
    var that = this
    wx.showModal({
      title: '新建收藏夹',
      editable: true,
      placeholderText: '输入收藏夹名称（最多12字）',
      confirmText: '创建',
      confirmColor: '#0A5BA8',
      success: function (res) {
        if (!res.confirm) return
        let name = (res.content || '').trim()
        if (!name) {
          wx.showToast({ title: '名称不能为空', icon: 'none' })
          return
        }
        if (store.createFolder(name)) {
          that.getMyFavorites()
          wx.showToast({ title: '已创建「' + name.slice(0, 12) + '」', icon: 'none', duration: 900 })
        } else {
          wx.showToast({ title: '名称为空或已存在', icon: 'none' })
        }
      }
    })
  },

  // 长按收藏夹：重命名 / 清空 / 删除
  onFolderLongPress: function (e) {
    var that = this
    let folder = this.data.favFolders[e.currentTarget.dataset.index]
    if (!folder) return
    let items = ['重命名', '清空收藏夹']
    if (folder.id !== store.DEFAULT_FOLDER_ID) items.push('删除收藏夹')
    wx.showActionSheet({
      itemList: items,
      success: function (res) {
        let action = items[res.tapIndex]
        if (action === '重命名') that.renameFolder(folder)
        else if (action === '清空收藏夹') that.confirmClearFolder(folder)
        else that.confirmDeleteFolder(folder)
      }
    })
  },

  // 重命名收藏夹
  renameFolder: function (folder) {
    var that = this
    wx.showModal({
      title: '重命名收藏夹',
      editable: true,
      placeholderText: folder.name,
      confirmText: '保存',
      confirmColor: '#0A5BA8',
      success: function (res) {
        if (!res.confirm) return
        if (store.renameFolder(folder.id, (res.content || '').trim())) {
          that.getMyFavorites()
          wx.showToast({ title: '已重命名', icon: 'none', duration: 800 })
        } else {
          wx.showToast({ title: '名称为空或已存在', icon: 'none' })
        }
      }
    })
  },

  // 清空当前选中的收藏夹（列表头部入口）
  clearCurrentFolder: function () {
    let folderId = this.data.currentFolder
    for (let i = 0; i < this.data.favFolders.length; i++) {
      if (this.data.favFolders[i].id === folderId) {
        this.confirmClearFolder(this.data.favFolders[i])
        return
      }
    }
  },

  // 清空当前收藏夹（仅删除夹内收藏，保留收藏夹）
  confirmClearFolder: function (folder) {
    var that = this
    if (!folder.count) {
      wx.showToast({ title: '该收藏夹已是空的', icon: 'none' })
      return
    }
    wx.showModal({
      title: '清空收藏夹',
      content: '确定清空「' + folder.name + '」中的 ' + folder.count + ' 条收藏吗？',
      confirmColor: '#FF6B6B',
      success: function (res) {
        if (res.confirm) {
          store.clearFolder(folder.id)
          that.getMyFavorites()
          that.setData({ openId: '' })
          wx.showToast({ title: '已清空「' + folder.name + '」', icon: 'none', duration: 900 })
        }
      }
    })
  },

  // 删除收藏夹（夹内收藏移入默认收藏夹）
  confirmDeleteFolder: function (folder) {
    var that = this
    wx.showModal({
      title: '删除收藏夹',
      content: '删除「' + folder.name + '」后，夹内 ' + folder.count + ' 条收藏将移入「默认收藏夹」',
      confirmColor: '#FF6B6B',
      success: function (res) {
        if (res.confirm) {
          store.deleteFolder(folder.id)
          that.getMyFavorites()
          wx.showToast({ title: '已删除收藏夹', icon: 'none', duration: 900 })
        }
      }
    })
  },

  /* ================= 跳转 ================= */

  goToDetail: function (e) {
    // 若删除按钮展开，先收起，不跳转
    if (this.data.openId) {
      this.setData({ openId: '' })
      return
    }
    let id = e.currentTarget.dataset.id
    if (!id) return
    // 防抖：避免连续点击造成重复路由
    if (this._navigating) return
    this._navigating = true
    var that = this
    wx.navigateTo({
      url: '../detail/detail?id=' + id,
      fail: function (err) {
        console.error('跳转失败', err)
        wx.showToast({ title: '页面打开失败，请重试', icon: 'none' })
      },
      complete: function () {
        setTimeout(function () { that._navigating = false }, 500)
      }
    })
  }
})
