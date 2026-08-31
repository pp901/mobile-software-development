// pages/detail/detail.js
var common = require('../../utils/common.js')
var store = require('../../utils/store.js')

// 正文字号档位（Aa 按钮循环切换）
const FONT_SIZES = [28, 32, 38]

Page({

  data: {
    article: {},
    paragraphs: [],
    relatedNews: [],   // 相关阅读（同栏目推荐）
    isLogin: false,    // 登录状态（未登录收藏时引导去登录）
    isAdd: false,
    fontSize: 32,
    favPopping: false   // 收藏心跳动画开关
  },

  onLoad: function (options) {
    let id = options.id

    // 获取新闻内容
    let result = common.getNewsDetail(id)
    if (result.code == '200') {
      let article = result.news
      this.setData({
        article: article,
        // 正文按段落拆分，排版更清晰
        paragraphs: article.content.split('\n').filter(function (p) { return p.trim() }),
        // 相关阅读：同栏目其他新闻
        relatedNews: common.getRelatedNews(id, 4)
      })
      // 登录后才记录浏览足迹（足迹按账号隔离）
      let user = store.getUser()
      if (user && user.nickName) {
        this.setData({ isLogin: true })
        store.addHistory(article)
      }
      // 动态设置导航栏标题为新闻所属栏目
      wx.setNavigationBarTitle({ title: article.categoryName || '新闻详情' })
    } else {
      wx.showToast({ title: '新闻不存在', icon: 'none' })
      setTimeout(function () { wx.navigateBack() }, 800)
      return
    }

    // 检查当前新闻是否在收藏夹中
    this.setData({
      isAdd: this.data.isLogin && store.isFavorite(id),
      fontSize: store.getFontSize()
    })
  },

  // 从"我的"页返回时刷新登录态（引导登录后回来可直接收藏）
  onShow: function () {
    if (!this.data.article.id) return
    let user = store.getUser()
    let logged = !!(user && user.nickName)
    this.setData({
      isLogin: logged,
      isAdd: logged && store.isFavorite(this.data.article.id)
    })
  },

  // 收藏按钮统一入口（根据当前状态调用收藏/取消）
  toggleFavorite: function () {
    // 未登录：引导前往"我的"页登录
    if (!this.data.isLogin) {
      wx.showModal({
        title: '尚未登录',
        content: '登录后才能收藏新闻到你的收藏夹，去登录一下？',
        confirmText: '去登录',
        confirmColor: '#0A5BA8',
        success: function (res) {
          if (res.confirm) wx.switchTab({ url: '/pages/my/my' })
        }
      })
      return
    }
    if (this.data.isAdd) {
      this.cancelFavorites()
    } else {
      this.addFavorites()
    }
  },

  // 添加收藏：先选择目标收藏夹（可现场新建）
  addFavorites: function () {
    var that = this
    let folders = store.getFolders()
    let items = []
    for (let i = 0; i < folders.length; i++) items.push(folders[i].name)
    items.push('＋ 新建收藏夹')
    wx.showActionSheet({
      itemList: items,
      success: function (res) {
        if (res.tapIndex === folders.length) {
          that.promptNewFolder()
        } else {
          that.doAddFavorite(folders[res.tapIndex])
        }
      },
      fail: function () { /* 用户取消 */ }
    })
  },

  // 新建收藏夹并直接收藏当前新闻
  promptNewFolder: function () {
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
        if (name.length > 12) name = name.slice(0, 12)
        let folder = store.createFolder(name)
        if (!folder) {
          wx.showToast({ title: '该名称已被使用', icon: 'none' })
          return
        }
        that.doAddFavorite(folder)
      }
    })
  },

  // 收藏到指定收藏夹
  doAddFavorite: function (folder) {
    let article = this.data.article
    store.addFavorite(article, folder.id)
    this.setData({ isAdd: true })
    this.playFavAnim()
    wx.vibrateShort({ type: 'light' })
    wx.showToast({ title: '已收藏到「' + folder.name + '」', icon: 'none', duration: 900 })
  },

  // 取消收藏
  cancelFavorites: function () {
    let article = this.data.article
    store.removeFavorite(article.id)
    this.setData({ isAdd: false })
    wx.showToast({ title: '已取消收藏', icon: 'none', duration: 900 })
  },

  // 收藏心跳动画
  playFavAnim: function () {
    var that = this
    this.setData({ favPopping: true })
    setTimeout(function () {
      that.setData({ favPopping: false })
    }, 500)
  },

  // 切换正文字号（Aa 按钮循环：标准 → 大 → 特大 → 标准）
  cycleFont: function () {
    let sizes = FONT_SIZES
    let idx = sizes.indexOf(this.data.fontSize)
    if (idx === -1) idx = 0
    let size = sizes[(idx + 1) % sizes.length]
    store.setFontSize(size) // 记忆字号
    this.setData({ fontSize: size })
  },

  // 分享
  onShareAppMessage: function () {
    let article = this.data.article
    return {
      title: article.title,
      path: '/pages/detail/detail?id=' + article.id,
      imageUrl: article.poster
    }
  },

  // 点击头图全屏预览
  previewPoster: function () {
    if (!this.data.article.poster) return
    wx.previewImage({ urls: [this.data.article.poster] })
  },

  // 点击相关阅读跳转
  goToDetail: function (e) {
    let id = e.currentTarget.dataset.id
    if (!id || id == this.data.article.id) return
    if (this._navigating) return
    this._navigating = true
    var that = this
    wx.navigateTo({
      url: 'detail?id=' + id,
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
