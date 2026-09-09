const db = wx.cloud.database()
const photo = db.collection('photo')
const comments = db.collection('comments')
const likes = db.collection('likes')
var app = getApp()

// 格式化当前日期
function formatDate() {
  var now = new Date()
  var year = now.getFullYear()
  var month = now.getMonth() + 1
  var day = now.getDate()

  if (month < 10) month = '0' + month
  if (day < 10) day = '0' + day

  return year + '-' + month + '-' + day
}

Page({
  data: {
    photo: null,
    liked: false,
    likeCount: 0,
    comments: [],
    commentContent: '',
    isMine: false,
    likePopping: false,
    swiperHeight: 400
  },

  /**
   * 生命周期函数 -- 监听页面加载
   */
  onLoad: function (options) {
    // 记录当前图片的 id
    this.photoId = options.id
    // 点赞操作锁，防止连点产生的重复请求
    this.likeBusy = false
    // 各张图片按屏幕宽度计算出的显示高度（多图轮播用）
    this.slideHeights = []
    this.slideCurrent = 0
    this.windowWidth = wx.getSystemInfoSync().windowWidth

    this.getPhoto()
    this.getComments()
    this.getLikeStatus()

    // 开启右上角菜单的分享按钮
    wx.showShareMenu()
  },

  /**
   * 自定义函数 -- 根据图片 id 获取云数据集中的图片记录
   */
  getPhoto: function () {
    var that = this
    photo.doc(this.photoId).get({
      success: function (res) {
        var p = res.data
        // 兼容旧记录：统一整理出 photoUrls 数组
        if (!p.photoUrls || !p.photoUrls.length) {
          p.photoUrls = [p.photoUrl]
        }
        that.setData({ photo: p, swiperHeight: that.slideHeights[0] || 400 })
        that.checkMine()
      },
      fail: function () {
        wx.showToast({ title: '图片不存在或已删除', icon: 'none' })
      }
    })
  },

  /**
   * 自定义函数 -- 图片加载完成：按实际比例计算该张轮播高度
   */
  onImgLoad: function (e) {
    var index = e.currentTarget.dataset.index
    var h = this.windowWidth * e.detail.height / e.detail.width
    this.slideHeights[index] = h
    // 当前显示的这张图加载完成时立即更新轮播高度
    if (index === this.slideCurrent) {
      this.setData({ swiperHeight: h })
    }
  },

  /**
   * 自定义函数 -- 轮播切换：同步轮播容器高度
   */
  onSlideChange: function (e) {
    this.slideCurrent = e.detail.current
    var h = this.slideHeights[this.slideCurrent]
    if (h) {
      this.setData({ swiperHeight: h })
    }
  },

  /**
   * 自定义函数 -- 判断当前图片是否为本人上传
   */
  checkMine: function () {
    var that = this
    app.fetchOpenid(function (openid) {
      if (openid && that.data.photo && that.data.photo._openid === openid) {
        that.setData({ isMine: true })
      }
    })
  },

  /**
   * 自定义函数 -- 获取点赞数量和当前用户是否已点赞
   * 点赞独立存放在 likes 集合中（每条点赞记录由点赞人创建，绕开"仅创建者可写"权限限制）
   */
  getLikeStatus: function () {
    var that = this

    app.fetchOpenid(function () {
      // 点赞总数
      likes.where({ photoId: that.photoId }).count({
        success: function (res) {
          that.setData({ likeCount: res.total })
        }
      })

      // 当前用户是否已点赞
      if (app.globalData.openid) {
        likes.where({
          photoId: that.photoId,
          _openid: app.globalData.openid
        }).count({
          success: function (res) {
            that.setData({ liked: res.total > 0 })
          }
        })
      }
    })
  },

  /**
   * 自定义函数 -- 点赞 / 取消点赞（带操作锁防连点）
   */
  likeTap: function () {
    var that = this

    // 操作进行中，忽略本次点击
    if (this.likeBusy) return

    app.fetchOpenid(function (openid) {
      if (!openid) {
        wx.showToast({ title: '身份获取中，请稍后再试', icon: 'none' })
        return
      }

      that.likeBusy = true
      // 心跳动画
      that.setData({ likePopping: true })
      setTimeout(function () {
        that.setData({ likePopping: false })
      }, 500)

      if (that.data.liked) {
        // 取消点赞：删除自己创建的点赞记录
        likes.where({
          photoId: that.photoId,
          _openid: openid
        }).get({
          success: function (res) {
            if (res.data.length > 0) {
              likes.doc(res.data[0]._id).remove({
                success: function () {
                  that.likeBusy = false
                  that.setData({
                    liked: false,
                    likeCount: that.data.likeCount - 1
                  })
                },
                fail: function () {
                  that.likeBusy = false
                }
              })
            } else {
              that.likeBusy = false
            }
          },
          fail: function () {
            that.likeBusy = false
          }
        })
      } else {
        // 点赞：添加一条点赞记录
        likes.add({
          data: { photoId: that.photoId },
          success: function () {
            that.likeBusy = false
            that.setData({
              liked: true,
              likeCount: that.data.likeCount + 1
            })
          },
          fail: function () {
            that.likeBusy = false
            wx.showToast({ title: '点赞失败', icon: 'none' })
          }
        })
      }
    })
  },

  /**
   * 自定义函数 -- 获取当前图片的评论列表（按时间升序）
   */
  getComments: function () {
    var that = this
    comments.where({ photoId: this.photoId }).orderBy('createTime', 'asc').get({
      success: function (res) {
        that.setData({ comments: res.data })
      }
    })
  },

  /**
   * 自定义函数 -- 评论内容输入
   */
  onCommentInput: function (e) {
    this.setData({ commentContent: e.detail.value })
  },

  /**
   * 自定义函数 -- 提交评论
   */
  submitComment: function () {
    var that = this
    var content = (this.data.commentContent || '').trim()
    if (!content) {
      wx.showToast({ title: '评论不能为空', icon: 'none' })
      return
    }

    // 整理评论者信息
    var info = app.globalData.userInfo || {}
    var avatarUrl = info.avatarUrl || ''
    var nickName = (info.nickName && info.nickName !== '微信用户') ? info.nickName : '微信用户'

    wx.showLoading({ title: '发送中' })
    comments.add({
      data: {
        photoId: this.photoId,
        content: content,
        nickName: nickName,
        avatarUrl: avatarUrl,
        addDate: formatDate(),
        createTime: Date.now()
      },
      success: function () {
        wx.hideLoading()
        that.setData({ commentContent: '' })
        that.getComments()
        wx.showToast({ title: '评论成功' })
      },
      fail: function (e) {
        console.log(e)
        wx.hideLoading()
        wx.showToast({ title: '评论失败', icon: 'none' })
      }
    })
  },

  /**
   * 自定义函数 -- 长按删除自己的评论
   */
  deleteComment: function (e) {
    var that = this
    var id = e.currentTarget.dataset.id
    var commentOpenid = e.currentTarget.dataset.openid

    app.fetchOpenid(function (openid) {
      if (commentOpenid !== openid) {
        wx.showToast({ title: '只能删除自己的评论', icon: 'none' })
        return
      }

      wx.showModal({
        title: '删除评论',
        content: '确定删除这条评论吗？',
        confirmColor: '#FF6B6B',
        success: function (res) {
          if (res.confirm) {
            comments.doc(id).remove({
              success: function () {
                wx.showToast({ title: '已删除' })
                that.getComments()
              }
            })
          }
        }
      })
    })
  },

  /**
   * 自定义函数 -- 下载图片到本地设备
   */
  downloadPhoto: function () {
    if (!this.data.photo) return

    // 从云存储中进行图片下载
    wx.cloud.downloadFile({
      fileID: this.data.photo.photoUrl,
      success: function (res) {
        // 保存图片到本地相册
        wx.saveImageToPhotosAlbum({
          filePath: res.tempFilePath,
          success: function () {
            wx.showToast({ title: '保存成功' })
          },
          fail: function (err) {
            // 用户拒绝授权时引导去设置页重新打开权限
            if (err.errMsg && err.errMsg.indexOf('auth') > -1) {
              wx.showModal({
                title: '需要相册权限',
                content: '请在设置中允许保存图片到相册',
                success: function (r) {
                  if (r.confirm) wx.openSetting()
                }
              })
            } else {
              wx.showToast({ title: '保存失败', icon: 'none' })
            }
          }
        })
      },
      fail: function (err) {
        console.log(err)
        wx.showToast({ title: '下载失败', icon: 'none' })
      }
    })
  },

  /**
   * 自定义函数 -- 全屏预览图片（多图时预览整个图集）
   */
  previewPhoto: function (e) {
    if (!this.data.photo) return
    var urls = this.data.photo.photoUrls
    var current = e && e.currentTarget && e.currentTarget.dataset.index !== undefined
      ? this.data.photo.photoUrls[e.currentTarget.dataset.index]
      : urls[0]
    wx.previewImage({
      current: current,
      urls: urls
    })
  },

  /**
   * 自定义函数 -- 跳转分享者个人主页
   */
  goToHomepage: function () {
    var p = this.data.photo
    if (!p || !p._openid || p._openid === 'undefined') {
      wx.showToast({ title: '该分享缺少作者信息', icon: 'none' })
      return
    }
    wx.navigateTo({
      url: '../homepage/homepage?id=' + p._openid
    })
  },

  /**
   * 自定义函数 -- 编辑图片描述（仅作者本人）
   */
  editDesc: function () {
    var that = this
    var p = this.data.photo

    wx.showModal({
      title: '编辑描述',
      editable: true,
      placeholderText: '输入图片描述（可留空清除）',
      content: p.desc || '',
      success: function (res) {
        if (!res.confirm) return
        var desc = (res.content || '').trim()
        photo.doc(that.photoId).update({
          data: { desc: desc },
          success: function () {
            wx.showToast({ title: '已保存' })
            that.getPhoto()
          },
          fail: function () {
            wx.showToast({ title: '保存失败', icon: 'none' })
          }
        })
      }
    })
  },

  /**
   * 自定义函数 -- 删除图片（仅作者本人，删除记录 + 删除云存储文件）
   */
  deletePhoto: function () {
    var that = this
    var p = this.data.photo

    wx.showModal({
      title: '删除图片',
      content: '删除后不可恢复，确定删除吗？',
      confirmColor: '#FF6B6B',
      success: function (res) {
        if (!res.confirm) return

        wx.showLoading({ title: '删除中' })
        // 该条记录包含的全部云文件（多图一起删除）
        var fileList = p.photoUrls && p.photoUrls.length ? p.photoUrls : [p.photoUrl]
        // 先删除云存储中的图片文件（删除失败不阻塞记录删除）
        wx.cloud.deleteFile({
          fileList: fileList,
          fail: function (err) {
            console.log(err)
          },
          complete: function () {
            // 再删除云数据库中的记录
            photo.doc(that.photoId).remove({
              success: function () {
                wx.hideLoading()
                wx.showToast({ title: '已删除' })
                // 删除完成后返回上一页；若从分享卡片直接进入则回首页
                setTimeout(function () {
                  wx.navigateBack({
                    fail: function () {
                      wx.reLaunch({ url: '/pages/index/index' })
                    }
                  })
                }, 600)
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
   * 用户点击右上角分享（或底部"分享"按钮）
   */
  onShareAppMessage: function () {
    var p = this.data.photo
    return {
      title: p ? (p.nickName + ' 分享了一张好看的图片') : '给你分享一张好看的图片',
      path: 'pages/detail/detail?id=' + this.photoId,
      imageUrl: p ? p.photoUrl : ''
    }
  }
})
