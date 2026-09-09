const store = require('../../services/store')
Component({
  properties: { active: { type: String, value: 'now' } },
  data: { choosing: false, choices: [
    { key:'photo', icon:'camera', title:'拍照', copy:'定格眼前', tone:'forest' },
    { key:'text', icon:'pencil', title:'写一句', copy:'记下念头', tone:'coral' },
    { key:'voice', icon:'mic', title:'语音', copy:'留住声音', tone:'sun' }
  ] },
  methods: {
    openNow() { if (this.data.active !== 'now') wx.redirectTo({ url:'/pages/index/index' }) },
    openHistory() { if (this.data.active !== 'history') wx.redirectTo({ url:'/pages/history/index' }) },
    openCreate() { if (wx.vibrateShort) wx.vibrateShort({ type: 'light' }); this.setData({choosing:true}) },
    closeCreate() { this.setData({choosing:false}) },
    noop() {},
    choose(event) {
      this.closeCreate()
      const type=event.currentTarget.dataset.type
      wx.navigateTo({url:store.getActiveChapter() ? '/pages/moment/editor/index?quick=1&type='+type : '/pages/chapter/editor/index'})
    }
  }
})
