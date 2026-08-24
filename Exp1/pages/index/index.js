// index.js
Page({
  data: {
    isHello: true
  },

  onClick: function () {
    this.setData({
      isHello: !this.data.isHello
    })
  }
})
