Component({
  options:{multipleSlots:true},
  properties:{
    title:{type:String,value:''}, background:{type:String,value:'#FAF7F1'},
    color:{type:String,value:'#30362e'}, back:{type:Boolean,value:true},
    show:{type:Boolean,value:true}, delta:{type:Number,value:1}
  },
  data:{statusHeight:24,barHeight:44,capsuleWidth:100},
  lifetimes:{attached(){
    const win=wx.getWindowInfo ? wx.getWindowInfo() : wx.getSystemInfoSync()
    const rect=wx.getMenuButtonBoundingClientRect()
    const statusHeight=win.statusBarHeight || 24
    this.setData({statusHeight,barHeight:rect.height ? Math.max(44,(rect.top-statusHeight)*2+rect.height) : 44,capsuleWidth:rect.left ? win.windowWidth-rect.left+8 : 100})
  }},
  methods:{back(){wx.navigateBack({delta:this.data.delta,fail:()=>wx.redirectTo({url:'/pages/index/index'})});this.triggerEvent('back')}}
})
