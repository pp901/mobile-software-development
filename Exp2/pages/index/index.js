Page({
  onLoad() {
    wx.showShareMenu({
      menus: ['shareAppMessage']
    })

    this.prepareShareImage()
  },

  prepareShareImage() {
    const fileSystem = wx.getFileSystemManager()
    const shareImagePath = `${wx.env.USER_DATA_PATH}/pxl-card-cover.png`

    try {
      const imageData = fileSystem.readFileSync('img/toutu2.png')
      fileSystem.writeFileSync(shareImagePath, imageData)
      this.shareImagePath = shareImagePath
    } catch (error) {
      console.error('分享头图准备失败', error)
      this.shareImagePath = ''
    }
  },

  onShareAppMessage() {
    return {
      title: '彭湘莲的个人名片',
      path: '/pages/index/index',
      imageUrl: this.shareImagePath || 'img/toutu2.png'
    }
  }
})
