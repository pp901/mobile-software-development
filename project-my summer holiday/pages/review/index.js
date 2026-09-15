const store = require('../../services/store')
const cloud = require('../../services/collaboration')
Page({
 data:{id:'',chapter:null,entries:[],limit:8,hasMore:false,missing:false,composing:false,ending:'',generating:false,posterPath:'',error:''},
 onLoad(options){this.setData({id:options.id||'',composing:options.finish==='1'});this.load();cloud.pullChapter(this.data.id).then(()=>this.load())},
 onShow(){if(this.data.id)this.load()},
 load(){const review=store.getReviewData(this.data.id);if(!review)return this.setData({chapter:null,missing:true});const entries=review.moments.slice().sort((a,b)=>a.localDateKey.localeCompare(b.localDateKey)||a.createdAt.localeCompare(b.createdAt)).slice(0,this.data.limit).map((moment,index,array)=>({id:moment.id,moment,month:moment.localDateKey.slice(0,7).replace('-',' / '),startMonth:index===0||moment.localDateKey.slice(0,7)!==array[index-1].localDateKey.slice(0,7),perspectives:store.getPerspectives(moment.id)}));this.setData({chapter:review.chapter,entries,hasMore:review.moments.length>entries.length,missing:false,total:review.moments.length,ending:this.data.composing?this.data.ending:review.chapter.ending||''})},
 onReachBottom(){if(this.data.hasMore){this.setData({limit:this.data.limit+8});this.load()}},
 startEnding(){this.setData({composing:true,ending:this.data.chapter.ending||''})},
 closeEnding(){this.setData({composing:false})},
 inputEnding(e){this.setData({ending:e.detail.value})},
 complete(){if(!this.data.chapter.isOwner)return;const chapter=store.completeChapter(this.data.id,this.data.ending);if(!chapter)return this.setData({error:store.getLastError()||'无法保存'});cloud.flush();this.setData({composing:false});this.load();wx.showToast({title:'已保存',icon:'success'})},
 openMoment(e){wx.navigateTo({url:'/pages/moment/detail/index?id='+e.currentTarget.dataset.id})},
 goBack(){wx.navigateBack({fail:()=>wx.redirectTo({url:'/pages/history/index'})})},noop(){},
 imageInfo(src){return new Promise(resolve=>{if(!src)return resolve(null);wx.getImageInfo({src,success:resolve,fail:()=>resolve(null)})})},
 async generatePoster(){
  if(this.data.generating)return
  this.setData({generating:true,error:''})
  try{
   const review=store.getReviewData(this.data.id);const chapter=review.chapter
   const photo=review.moments.reduce((all,m)=>all.concat(m.media||[]),[])[0]
   const info=await this.imageInfo(photo&&(photo.displayPath||photo.path))
   if(photo&&!info)throw new Error('照片暂时无法读取，请稍后重试')
   const ctx=wx.createCanvasContext('reviewPoster',this)
   ctx.setFillStyle('#f8f9fb');ctx.fillRect(0,0,750,1100);ctx.setFillStyle('#202124')
   const wrap=(text,x,y,width,size,lineHeight,maxLines)=>{ctx.setFontSize(size);let line='',lines=0;const chars=Array.from(text||'');for(let i=0;i<chars.length;i++){const char=chars[i];if(char==='\n'||ctx.measureText(line+char).width>width){if(lines===maxLines-1){ctx.fillText(line.slice(0,-1)+'…',x,y);return y+lineHeight}ctx.fillText(line,x,y);y+=lineHeight;line=char==='\n'?'':char;lines++}else line+=char}if(line){ctx.fillText(line,x,y);y+=lineHeight}return y}
   ctx.setFontSize(24);ctx.fillText('ongoing_',48,60)
   let y=wrap(chapter.title,48,128,654,46,58,3)
   ctx.setFillStyle('#60646c');ctx.setFontSize(23);ctx.fillText(chapter.startDate+' — '+(chapter.status==='ONGOING'?'进行中':chapter.endDate||'已结束'),48,y+12);y+=52
   if(info){const width=654,height=Math.min(480,width*info.height/info.width);const scale=Math.min(width/info.width,height/info.height);const w=info.width*scale,h=info.height*scale;ctx.drawImage(info.path,48+(width-w)/2,y,w,h);y+=height+40}
   ctx.setFillStyle('#202124')
   const written=review.moments.find(m=>m.content.trim());const excerpt=chapter.ending||(written&&written.content)||chapter.description||''
   wrap(excerpt,48,y+12,654,30,46,Math.max(1,Math.floor((1000-y)/46)))
   ctx.setFillStyle('#60646c');ctx.setFontSize(21);ctx.fillText(chapter.status==='ONGOING'?'进行中':'已结束',48,1052)
   await new Promise(resolve=>ctx.draw(false,resolve))
   const result=await new Promise((resolve,reject)=>wx.canvasToTempFilePath({canvasId:'reviewPoster',width:750,height:1100,destWidth:1125,destHeight:1650,success:resolve,fail:reject},this))
   this.setData({posterPath:result.tempFilePath});wx.previewImage({urls:[result.tempFilePath]})
  }catch(e){this.setData({error:e.message||'导出未完成，请重试'})}finally{this.setData({generating:false})}
 },
 savePoster(){wx.saveImageToPhotosAlbum({filePath:this.data.posterPath,success:()=>wx.showToast({title:'已保存到相册'}),fail:()=>this.setData({error:'未保存到相册，请检查相册权限后重试'})})}
})
