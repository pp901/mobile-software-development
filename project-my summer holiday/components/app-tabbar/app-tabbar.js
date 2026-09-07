const store = require('../../services/store')
Component({
  properties: { active: { type: String, value: 'now' } },
  data: { choosing: false, choices: [
    { key:'photo', icon:'camera', title:'拍一张照片', copy:'定格此刻', tone:'sage' },
    { key:'text', icon:'pencil', title:'写点文字', copy:'记录心情', tone:'sand' },
    { key:'voice', icon:'mic', title:'语音记录', copy:'用声音留存', tone:'rose' },
    { key:'place', icon:'pin', title:'标记地点', copy:'让足迹有迹可循', tone:'sage' },
    { key:'progress', icon:'check', title:'记录进展', copy:'靠近一个目标', tone:'sand' }
  ] },
  methods: {
    openNow() { if (this.data.active !== 'now') wx.redirectTo({ url:'/pages/index/index' }) },
    openHistory() { if (this.data.active !== 'history') wx.redirectTo({ url:'/pages/history/index' }) },
    openCreate() { this.setData({choosing:true}) },
    closeCreate() { this.setData({choosing:false}) },
    noop() {},
    choose(event) {
      this.closeCreate()
      const type=event.currentTarget.dataset.type
      wx.navigateTo({url:store.getActiveChapter() ? '/pages/moment/editor/index?type='+type : '/pages/chapter/editor/index'})
    }
  }
})
