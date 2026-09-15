Component({
 options:{virtualHost:true}, properties:{active:{type:String,value:'now'}},
 methods:{openNow(){if(this.data.active!=='now')wx.redirectTo({url:'/pages/index/index'})},openHistory(){if(this.data.active!=='history')wx.redirectTo({url:'/pages/history/index'})},openCreate(){wx.navigateTo({url:'/pages/moment/editor/index'})}}
})
