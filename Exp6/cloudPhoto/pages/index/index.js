const db = wx.cloud.database()
const _ = db.command
const photo = db.collection('photo')
var app = getApp()

Page({
  data: {
    photoList: [],
    swiperList: [],
    loading: true,
    searchKeyword: '',
    inSearch: false,
    searchResults: []
  },

  /**
   * 生命周期函数 -- 监听页面显示（返回首页时刷新列表）
   */
  onShow: function () {
    if (!this.data.inSearch) {
      this.getPhotoList()
    }
  },

  /**
   * 自定义函数 -- 下拉刷新
   */
  onPullDownRefresh: function () {
    if (this.data.inSearch) {
      // 搜索视图中下拉：重新执行当前搜索
      this.doSearch()
    } else {
      this.getPhotoList()
    }
  },

  /**
   * 自定义函数 -- 获取图片列表（按添加日期降序）
   */
  getPhotoList: function () {
    var that = this
    photo.orderBy('createTime', 'desc').get({
      success: function (res) {
        // 过滤掉没有图片地址的脏记录（如控制台手动添加的测试数据）
        var list = res.data.filter(function (item) {
          return item.photoUrl
        })
        that.setData({
          photoList: list,
          // 最新 3 条作为精选轮播
          swiperList: list.slice(0, 3),
          loading: false
        })
        wx.stopPullDownRefresh()
      },
      fail: function (e) {
        console.log(e)
        that.setData({ loading: false })
        wx.stopPullDownRefresh()
        wx.showToast({ title: '加载失败，请检查数据库', icon: 'none' })
      }
    })
  },

  /**
   * 自定义函数 -- 跳转图片详情页
   */
  goToDetail: function (e) {
    wx.navigateTo({
      url: '../detail/detail?id=' + e.currentTarget.dataset.id
    })
  },

  /**
   * 自定义函数 -- 跳转分享者个人主页（头像区域点击）
   */
  goToHomepage: function (e) {
    var openid = e.currentTarget.dataset.openid
    // 手动导入的记录可能没有 _openid 字段，做防护
    if (!openid || openid === 'undefined') {
      wx.showToast({ title: '该分享缺少作者信息', icon: 'none' })
      return
    }
    wx.navigateTo({
      url: '../homepage/homepage?id=' + openid
    })
  },

  /**
   * 自定义函数 -- 发布引导横幅：进入发布页
   */
  goToPublish: function () {
    wx.navigateTo({
      url: '../add/add'
    })
  },

  /* ================= 搜索相关 ================= */

  /**
   * 自定义函数 -- 搜索词输入（清空时自动退出搜索视图）
   */
  onSearchInput: function (e) {
    var keyword = e.detail.value
    this.setData({
      searchKeyword: keyword,
      inSearch: keyword.trim() ? this.data.inSearch : false
    })
  },

  /**
   * 自定义函数 -- 执行搜索（匹配图片描述或分享者昵称）
   */
  doSearch: function () {
    var that = this
    var keyword = (this.data.searchKeyword || '').trim()
    if (!keyword) {
      this.setData({ inSearch: false })
      return
    }

    // 转义正则特殊字符，避免搜索报错
    var safe = keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    var reg = db.RegExp({ regexp: safe, options: 'i' })

    wx.showLoading({ title: '搜索中' })
    photo.where(_.or([
      { desc: reg },
      { nickName: reg }
    ])).orderBy('createTime', 'desc').get({
      success: function (res) {
        wx.hideLoading()
        that.setData({
          inSearch: true,
          searchResults: res.data.filter(function (item) {
            return item.photoUrl
          })
        })
      },
      fail: function (e) {
        console.log(e)
        wx.hideLoading()
        wx.showToast({ title: '搜索失败', icon: 'none' })
      }
    })
  },

  /**
   * 自定义函数 -- 清空搜索并返回社区视图
   */
  clearSearch: function () {
    this.setData({
      searchKeyword: '',
      inSearch: false,
      searchResults: []
    })
  },

  /* ================= 发布入口 ================= */

  /**
   * 自定义函数 -- 获取用户个人信息并进入发布页
   */
  getUserInfo: function (e) {
    // 将用户个人信息存放到全局变量 userInfo 中
    if (e.detail && e.detail.userInfo) {
      app.globalData.userInfo = e.detail.userInfo
    }

    // 检测是否已经获取过了用户 openid 信息
    if (app.globalData.openid == null) {
      // 如果是第一次登录，则使用云函数获取用户 openid
      wx.cloud.callFunction({
        name: 'getOpenid',
        complete: function (res) {
          if (res.result && res.result.openid) {
            app.globalData.openid = res.result.openid
          }
        }
      })
    }

    // 跳转发布页
    wx.navigateTo({
      url: '../add/add'
    })
  }
})
