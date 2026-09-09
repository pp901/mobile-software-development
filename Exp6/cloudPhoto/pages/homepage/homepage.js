const db = wx.cloud.database()
const _ = db.command
const photo = db.collection('photo')
const likes = db.collection('likes')

Page({
  data: {
    photoList: [],
    author: null,
    likeTotal: 0
  },

  /**
   * 生命周期函数 -- 监听页面加载
   */
  onLoad: function (options) {
    // 获取被点击用户的 openid（对手动导入的无效 id 做防护）
    this.authorOpenid = options.id
    if (!this.authorOpenid || this.authorOpenid === 'undefined') {
      wx.showToast({ title: '作者信息缺失', icon: 'none' })
      return
    }
    this.getPhotoList()
  },

  /**
   * 自定义函数 -- 获取该用户的图片分享记录与获赞数
   */
  getPhotoList: function () {
    var that = this

    wx.showLoading({ title: '数据加载中' })
    photo.orderBy('createTime', 'desc').where({
      _openid: this.authorOpenid
    }).get({
      complete: function () {
        wx.hideLoading()
      },
      success: function (res) {
        // 过滤掉没有图片地址的脏记录
        var list = res.data.filter(function (item) {
          return item.photoUrl
        })
        that.setData({
          photoList: list,
          author: list[0] || null
        })
        that.getLikeTotal(list)
      },
      fail: function (e) {
        console.log(e)
        wx.showToast({ title: '加载失败', icon: 'none' })
      }
    })
  },

  /**
   * 自定义函数 -- 汇总该用户所有图片的获赞总数
   * 一次 count 查询统计 likes 集合中指向这些图片的记录数
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
  }
})
