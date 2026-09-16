Component({
  options:{multipleSlots:true,styleIsolation:'apply-shared'},
  properties:{
    title:{type:String,value:''}, background:{type:String,value:'#F7F7F2'},
    color:{type:String,value:'#2D3D36'}, back:{type:Boolean,value:true},
    home:{type:Boolean,value:false},
    show:{type:Boolean,value:true}, delta:{type:Number,value:1},
    interceptBack:{type:Boolean,value:false}
  },
  data:{statusHeight:24,barHeight:44,capsuleWidth:96},
  lifetimes:{attached(){
    let win={}
    let rect={}
    try { win=wx.getWindowInfo ? wx.getWindowInfo() : wx.getSystemInfoSync() } catch(error) { console.warn('Window info unavailable',error) }
    try { rect=wx.getMenuButtonBoundingClientRect ? wx.getMenuButtonBoundingClientRect() : {} } catch(error) { console.warn('Menu button info unavailable',error) }
    const statusHeight=Number(win.statusBarHeight) || 24
    const windowWidth=Number(win.windowWidth) || 375
    const validRect=Number(rect.width)>0&&Number(rect.height)>0&&Number(rect.left)>0&&Number(rect.top)>=statusHeight
    const topGap=validRect ? Math.max(0,Number(rect.top)-statusHeight) : 4
    const barHeight=validRect ? Math.max(44,topGap*2+Number(rect.height)) : 44
    const capsuleWidth=validRect ? Math.max(88,windowWidth-Number(rect.left)+8) : 96
    this.setData({statusHeight,barHeight,capsuleWidth})
  }},
  methods:{back(){
    if(this.data.interceptBack){this.triggerEvent('back');return}
    wx.navigateBack({delta:this.data.delta,fail:()=>wx.redirectTo({url:'/pages/index/index'})})
  }}
})
