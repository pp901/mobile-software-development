const store = require('./services/store')

App({
  onLaunch() {
    store.init()
  },
  globalData: {
    brandName: 'ongoing_',
    version: '0.1.0'
  }
})
