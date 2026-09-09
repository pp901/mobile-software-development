const db = wx.cloud.database()
const photo = db.collection('photo')
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
    historyPhotos: [],
    avatarUrl: '',
    nickName: '',
    province: '',
    country: '',
    regionValue: [],
    desc: '',
    tempPaths: []
  },

  /**
   * 生命周期函数 -- 监听页面加载
   */
  onLoad: function (options) {
    // 初始化个人信息（按钮获取的信息 > 本地缓存的自填信息）
    this.initProfile()
    // 更新图片历史记录
    this.getHistoryPhotos()
  },

  /**
   * 自定义函数 -- 初始化个人信息
   * 有效信息直接回填到输入区，用户随时可以修改
   */
  initProfile: function () {
    var info = null

    if (app.isValidUserInfo()) {
      info = app.globalData.userInfo
    } else {
      var custom = wx.getStorageSync('customProfile')
      if (custom && custom.avatarUrl && custom.nickName) {
        // 写回全局，评论等其他页面也能使用
        app.globalData.userInfo = custom
        info = custom
      }
    }

    if (info) {
      this.setData({
        avatarUrl: info.avatarUrl,
        nickName: info.nickName,
        province: info.province || '',
        country: info.country || '',
        regionValue: info.province ? [info.province, '', ''] : []
      })
    }
    // 标记本次会话中头像是否被用户重新选过
    this.avatarDirty = false
  },

  /**
   * 自定义函数 -- 用户选择头像
   */
  onChooseAvatar: function (e) {
    this.avatarDirty = true
    this.setData({ avatarUrl: e.detail.avatarUrl })
  },

  /**
   * 自定义函数 -- 用户输入昵称
   */
  onNickInput: function (e) {
    this.setData({ nickName: e.detail.value })
  },

  /**
   * 自定义函数 -- 选择所在地区（省市区选择器）
   */
  onRegionChange: function (e) {
    var value = e.detail.value || []
    this.setData({
      province: value[0] || '',
      country: '中国',
      regionValue: value
    })
  },

  /**
   * 自定义函数 -- 输入图片文案
   */
  onDescInput: function (e) {
    this.setData({ desc: e.detail.value })
  },

  /**
   * 自定义函数 -- 选择要发布的图片（支持多选，最多 9 张）
   */
  chooseImage: function () {
    var that = this
    var remain = 9 - this.data.tempPaths.length
    if (remain <= 0) {
      wx.showToast({ title: '一次最多发布 9 张图片', icon: 'none' })
      return
    }

    wx.chooseImage({
      count: remain,
      sizeType: ['compressed'],
      sourceType: ['album', 'camera'],
      success: function (res) {
        that.setData({
          tempPaths: that.data.tempPaths.concat(res.tempFilePaths).slice(0, 9)
        })
      },
      fail: function (e) {
        // 用户主动取消选择不算错误，静默处理
        if (e && e.errMsg && e.errMsg.indexOf('cancel') > -1) return
        console.error(e)
      }
    })
  },

  /**
   * 自定义函数 -- 移除已选图片
   */
  removeOne: function (e) {
    var index = e.currentTarget.dataset.index
    var paths = this.data.tempPaths.slice()
    paths.splice(index, 1)
    this.setData({ tempPaths: paths })
  },

  /**
   * 自定义函数 -- 发布（整理用户信息 -> 上传云存储 -> 写入云数据库）
   */
  publish: function () {
    var that = this

    // 未选择图片
    if (!this.data.tempPaths.length) {
      wx.showToast({ title: '请先选择图片', icon: 'none' })
      return
    }

    // 头像昵称不完整
    if (!this.data.avatarUrl || !(this.data.nickName || '').trim()) {
      wx.showToast({ title: '请先设置头像和昵称', icon: 'none' })
      return
    }

    this.resolveProfile(function (profile) {
      if (!profile) {
        wx.showToast({ title: '头像处理失败，请重试', icon: 'none' })
        return
      }
      that.doUpload(that.data.tempPaths.slice(), profile)
    })
  },

  /**
   * 自定义函数 -- 整理发布使用的用户信息
   * 头像/昵称/地区任一有改动则重建资料并持久化
   */
  resolveProfile: function (callback) {
    var that = this
    var avatarUrl = this.data.avatarUrl
    var nickName = (this.data.nickName || '').trim()
    var province = this.data.province || ''
    var country = this.data.country || ''
    var info = app.isValidUserInfo() ? app.globalData.userInfo : null

    // 无任何改动：直接沿用已有信息
    if (!this.avatarDirty && info
      && info.nickName === nickName
      && (info.province || '') === province
      && (info.country || '') === country) {
      callback(info)
      return
    }

    var finish = function (avatarFileID) {
      that.saveProfile({
        avatarUrl: avatarFileID,
        nickName: nickName,
        country: country,
        province: province
      }, callback)
    }

    // 本次重选过头像：临时路径需要先上传云存储换取 fileID
    if (this.avatarDirty) {
      var cloudPath = 'avatar/' + Math.floor(Math.random() * 1000000) + avatarUrl.match(/\.[^.]+?$/)[0]
      wx.cloud.uploadFile({
        cloudPath: cloudPath,
        filePath: avatarUrl,
        success: function (res) {
          that.avatarDirty = false
          finish(res.fileID)
        },
        fail: function (e) {
          console.error(e)
          callback(null)
        }
      })
    } else {
      finish(avatarUrl)
    }
  },

  /**
   * 自定义函数 -- 将用户信息写回全局并持久化
   */
  saveProfile: function (profile, callback) {
    app.globalData.userInfo = profile
    wx.setStorageSync('customProfile', profile)
    callback(profile)
  },

  /**
   * 自定义函数 -- 逐张上传图片，全部完成后写入一条记录
   */
  doUpload: function (filePaths, profile) {
    var that = this
    var fileIds = []

    wx.showLoading({ title: '发布中' })

    var next = function (i) {
      if (i >= filePaths.length) {
        that.saveRecord(fileIds, profile)
        return
      }
      // 自定义云端的图片名称
      const cloudPath = Math.floor(Math.random() * 1000000) + filePaths[i].match(/\.[^.]+?$/)[0]
      wx.cloud.uploadFile({
        cloudPath: cloudPath,
        filePath: filePaths[i],
        success: function (res) {
          fileIds.push(res.fileID)
          next(i + 1)
        },
        fail: function (e) {
          console.error(e)
          wx.hideLoading()
          wx.showToast({ title: '第 ' + (i + 1) + ' 张上传失败', icon: 'none' })
        }
      })
    }
    next(0)
  },

  /**
   * 自定义函数 -- 往云数据集中添加一条记录
   */
  saveRecord: function (fileIds, profile) {
    var that = this
    photo.add({
      data: {
        // photoUrl 保留首图，兼容旧版展示；photoUrls 为完整图集
        photoUrl: fileIds[0],
        photoUrls: fileIds,
        avatarUrl: profile.avatarUrl,
        country: profile.country || '',
        province: profile.province || '',
        nickName: profile.nickName,
        desc: that.data.desc.trim(),
        addDate: formatDate(),
        // 毫秒级时间戳：排序用（addDate 只有天级精度，同一天会乱序）
        createTime: Date.now()
      },
      success: function () {
        wx.hideLoading()
        wx.showToast({ title: '发布成功', duration: 1500 })
        // 清空发布区并更新历史记录
        that.setData({
          tempPaths: [],
          desc: ''
        })
        that.getHistoryPhotos()
      },
      fail: function (e) {
        console.log(e)
        wx.hideLoading()
        wx.showToast({ title: '记录写入失败', icon: 'none' })
      }
    })
  },

  /**
   * 自定义函数 -- 获取已发布图片历史记录
   */
  getHistoryPhotos: function () {
    var that = this
    // 获取当前用户的 openid（启动时已预取，未取到则等待云函数返回）
    app.fetchOpenid(function (openid) {
      if (!openid) {
        wx.showToast({ title: '身份获取失败，请检查云函数', icon: 'none' })
        return
      }

      photo.where({
        _openid: openid
      }).orderBy('createTime', 'desc').get({
        success: function (res) {
          // 过滤掉没有图片地址的脏记录
          that.setData({
            historyPhotos: res.data.filter(function (item) {
              return item.photoUrl
            })
          })
        }
      })
    })
  },

  /**
   * 自定义函数 -- 全屏预览历史图片
   */
  previewHistory: function (e) {
    var urls = this.data.historyPhotos.map(function (item) {
      return item.photoUrl
    })
    wx.previewImage({
      current: e.currentTarget.dataset.url,
      urls: urls
    })
  },

  /**
   * 自定义函数 -- 长按删除历史图片（删除记录 + 删除云存储全部文件）
   */
  deleteHistory: function (e) {
    var that = this
    var id = e.currentTarget.dataset.id
    // 从历史记录数据中取出该条记录的全部云文件
    var record = null
    for (var i = 0; i < this.data.historyPhotos.length; i++) {
      if (this.data.historyPhotos[i]._id === id) {
        record = this.data.historyPhotos[i]
        break
      }
    }
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
        // 先删除云存储中的图片文件（删除失败不阻塞记录删除）
        wx.cloud.deleteFile({
          fileList: fileList,
          fail: function (err) {
            console.log(err)
          },
          complete: function () {
            // 再删除云数据库中的记录
            photo.doc(id).remove({
              success: function () {
                wx.hideLoading()
                wx.showToast({ title: '已删除' })
                that.getHistoryPhotos()
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
  }
})
