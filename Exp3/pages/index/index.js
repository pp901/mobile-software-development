// pages/index/index.js
var common = require('../../utils/common.js')
var store = require('../../utils/store.js')

Page({

  data: {
    // 栏目胶囊
    categories: [],
    currentCategory: 'all',
    // 时间筛选
    timeFilters: [],
    currentTime: 'all',
    // 轮播（取最新4条要闻）
    swiperNews: [],
    // 新闻列表
    newsList: [],
    skeleton: true,
    // 搜索
    searchKeyword: '',
    inSearch: false,        // 是否处于搜索结果视图
    searchResults: [],
    searchDone: false,      // 是否已执行过搜索（区分"历史词"与"结果"视图）
    searchHistory: []
  },

  onLoad: function (options) {
    this.setData({
      categories: common.getCategories(),
      timeFilters: common.getTimeFilters(),
      searchHistory: store.getSearchHistory()
    })
    this.loadNews()
    // 骨架屏短暂展示，模拟加载
    var that = this
    setTimeout(function () {
      that.setData({ skeleton: false })
    }, 400)
  },

  // 加载新闻列表（按当前栏目 + 时间组合筛选）
  loadNews: function () {
    let list = common.getNewsList(this.data.currentCategory, this.data.currentTime)
    this.setData({
      newsList: list,
      // 轮播取全站最新4条
      swiperNews: common.getNewsList('all').slice(0, 4)
    })
  },

  // 下拉刷新：模拟拉取最新资讯
  onPullDownRefresh: function () {
    var that = this
    setTimeout(function () {
      that.loadNews()
      wx.stopPullDownRefresh()
      wx.showToast({ title: '已更新', icon: 'success', duration: 800 })
    }, 600)
  },

  // 切换栏目
  switchCategory: function (e) {
    let id = e.currentTarget.dataset.id
    this.setData({ currentCategory: id })
    this.loadNews()
  },

  // 切换时间筛选
  switchTime: function (e) {
    let id = e.currentTarget.dataset.id
    this.setData({ currentTime: id })
    this.loadNews()
  },

  // 点击新闻跳转详情
  goToDetail: function (e) {
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
  },

  /* ================= 搜索相关 ================= */

  // 输入即搜（带回结果视图）
  onSearchInput: function (e) {
    let keyword = e.detail.value
    this.setData({ searchKeyword: keyword })
    if (!keyword.trim()) {
      // 清空则退出搜索视图
      this.setData({ inSearch: false, searchDone: false, searchResults: [] })
      return
    }
    this.setData({
      inSearch: true,
      searchResults: common.searchNews(keyword),
      searchDone: true
    })
  },

  // 确认搜索（记录搜索历史词）
  doSearch: function (e) {
    let keyword = (e.detail && e.detail.value) || this.data.searchKeyword
    if (!keyword.trim()) return
    store.addSearchHistory(keyword)
    this.setData({
      searchKeyword: keyword,
      inSearch: true,
      searchDone: true,
      searchResults: common.searchNews(keyword),
      searchHistory: store.getSearchHistory()
    })
  },

  // 点击历史词直接搜索
  tapHistoryWord: function (e) {
    let keyword = e.currentTarget.dataset.word
    this.setData({ searchKeyword: keyword })
    this.doSearch({ detail: { value: keyword } })
  },

  // 清空输入框，退出搜索视图
  clearSearch: function () {
    this.setData({
      searchKeyword: '',
      inSearch: false,
      searchDone: false,
      searchResults: []
    })
  },

  // 清空搜索历史
  clearSearchHistory: function () {
    var that = this
    wx.showModal({
      title: '提示',
      content: '确定清空搜索历史吗？',
      success: function (res) {
        if (res.confirm) {
          store.clearSearchHistory()
          that.setData({ searchHistory: [] })
        }
      }
    })
  }
})
