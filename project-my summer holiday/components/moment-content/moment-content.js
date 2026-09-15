const focus = require('../../services/audio-focus')
Component({
 properties: { item: { type:Object, value:{} } },
 data: { playing:false, elapsed:0, failed:{} },
 observers: { 'item.id':function(){ this.setData({failed:{},elapsed:0}); if(this.audio)this.audio.stop() } },
 lifetimes: { detached(){ if(this.audio){focus.release(this.audio);this.audio.destroy()} } },
 pageLifetimes: { hide(){ if(this.audio)this.audio.pause() } },
 methods: {
  ensureAudio(){
   if(this.audio)return
   this.audio=wx.createInnerAudioContext()
   this.audio.onPause(()=>this.setData({playing:false}))
   this.audio.onEnded(()=>this.setData({playing:false,elapsed:0}))
   this.audio.onError(()=>{this.setData({playing:false});wx.showToast({title:'声音暂时无法播放',icon:'none'})})
   this.audio.onTimeUpdate(()=>this.setData({elapsed:Math.floor(this.audio.currentTime)}))
  },
  preview(e){const urls=(this.data.item.media||[]).filter(x=>x.type==='image').map(x=>x.displayPath||x.path);if(urls.length)wx.previewImage({urls,current:e.currentTarget.dataset.src})},
  imageError(e){this.setData({['failed.'+e.currentTarget.dataset.index]:true})},
  play(){this.ensureAudio();if(this.data.playing)this.audio.pause();else{focus.claim(this.audio);const path=this.data.item.displayVoicePath||this.data.item.voicePath;if(this.audio.src!==path)this.audio.src=path;this.audio.play();this.setData({playing:true})}}
 }
})
