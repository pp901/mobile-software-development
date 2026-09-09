const db = wx.cloud.database()
const _ = db.command
const photo = db.collection('photo')
const likes = db.collection('likes')
const comments = db.collection('comments')
var app = getApp()

Page({
  data: {
    profile: null,
    photoList: [],
    likeTotal: 0,
    commentTotal: 0
  },

  /**
   * 生命周期函数 -- 监听页面显示（每次进入刷新数据）
   */
  onShow: function () {
    this.initProfile()
    this.getMyPhotos()
  },

  /**
   * 自定义函数 -- 初始化当前用户资料
   * 优先按钮获取的信息，其次本地缓存的自填信息
   */
  initProfile: function () {
    if (app.isValidUserInfo()) {
      this.setData({ profile: app.globalData.userInfo })
      return
    }
    var custom = wx.getStorageSync('customProfile')
    if (custom && custom.avatarUrl && custom.nickName) {
      app.globalData.userInfo = {
        avatarUrl: custom.avatarUrl,
        nickName: custom.nickName,
        country: custom.country || '',
        province: custom.province || ''
      }
      this.setData({ profile: app.globalData.userInfo })
    } else {
      this.setData({ profile: null })
    }
  },

  /**
   * 自定义函数 -- 获取我的分享记录与获赞/评论统计
   */
  getMyPhotos: function () {
    var that = this
    app.fetchOpenid(function (openid) {
      if (!openid) return

      photo.where({
        _openid: openid
      }).orderBy('createTime', 'desc').get({
        success: function (res) {
          // 过滤掉没有图片地址的脏记录
          that.setData({
            photoList: res.data.filter(function (item) {
              return item.photoUrl
            })
          })
          that.getLikeTotal(that.data.photoList)
        }
      })

      // 我发出的评论数（只能查询自己创建的记录，符合权限设计）
      comments.where({
        _openid: openid
      }).count({
        success: function (res) {
          that.setData({ commentTotal: res.total })
        }
      })
    })
  },

  /**
   * 自定义函数 -- 汇总我的图片获赞总数（一次 count 查询）
   */
  getLikeTotal: function (photoList) {
    var that = this
    if (!photoList.length) {
      that.setData({ likeTotal: 0 })
      return
    }

    var ids = photoList.map(function (item) {
      return item._id
    })

    likes.where({
      photoId: _.in(ids)
    }).count({
      success: function (res) {
        that.setData({ likeTotal: res.total })
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
   * 自定义函数 -- 长按删除我的分享（删除记录 + 删除云存储文件）
   */
  deletePhoto: function (e) {
    var that = this
    var id = e.currentTarget.dataset.id
    var record = null
    for (var i = 0; i < this.data.photoList.length; i++) {
      if (this.data.photoList[i]._id === id) {
        record = this.data.photoList[i]
        break
      }
    }
    // 该条记录包含的全部云文件（多图一起删除）
    var fileList = (record && record.photoUrls && record.photoUrls.length)
      ? record.photoUrls
      : (record ? [record.photoUrl] : [])

    wx.showModal({
      title: '删除图片',
      content: '删除后不可恢复，确定删除吗？',
      confirmColor: '#FF6B6B',
      success: function (res) {
        if (!res.confirm) return

        wx.showLoading({ title: '删除中' })
        wx.cloud.deleteFile({
          fileList: fileList,
          fail: function (err) {
            console.log(err)
          },
          complete: function () {
            photo.doc(id).remove({
              success: function () {
                wx.hideLoading()
                wx.showToast({ title: '已删除' })
                that.getMyPhotos()
              },
              fail: function () {
                wx.hideLoading()
                wx.showToast({ title: '删除失败', icon: 'none' })
              }
            })
          }
        })
      }
    })
  },

  /**
   * 自定义函数 -- 去发布新分享
   */
  goPublish: function () {
    wx.navigateTo({
      url: '../add/add'
    })
  },

  /**
   * 自定义函数 -- 一键生成演示数据（调用 initData 云函数，可重复执行）
   */
  seedData: function () {
    var that = this
    wx.showModal({
      title: '生成演示数据',
      content: '将插入 4 位虚拟用户和 8 张示例图片（含评论和点赞），旧的演示数据会被重置。继续吗？',
      success: function (res) {
        if (!res.confirm) return

        wx.showLoading({ title: '生成中' })
        wx.cloud.callFunction({
          name: 'initData',
          success: function (r) {
            wx.hideLoading()
            var d = r.result || {}
            var msg = '已生成 ' + (d.photos || 0) + ' 张图片'
            if (d.commentError || d.likeError) {
              msg += '（评论/点赞需先创建对应集合）'
            }
            wx.showToast({ title: msg, icon: 'none', duration: 2500 })
            that.getMyPhotos()
          },
          fail: function (e) {
            console.log(e)
            wx.hideLoading()
            wx.showToast({ title: '生成失败，请先部署 initData 云函数', icon: 'none' })
          }
        })
      }
    })
  },

  /**
   * 自定义函数 -- 关于
   */
  showAbout: function () {
    wx.showModal({
      title: '图片分享社区',
      content: '小程序云开发综合实验：基于云数据库、云存储与云函数实现的图片分享社区。支持发布、浏览、搜索、点赞、评论与删除。',
      showCancel: false,
      confirmText: '知道了'
    })
  }
})
