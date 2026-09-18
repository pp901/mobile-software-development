const store = require('../../../services/store')
const cloud = require('../../../services/collaboration')
const media = require('../../../services/media')
const date = require('../../../utils/date')
const audioFocus = require('../../../services/audio-focus')
Page({
 data:{id:'',momentId:'',contributionId:'',content:'',media:[],voicePath:'',voiceDuration:0,location:'',latitude:0,longitude:0,localDateKey:'',chapterId:'',chapter:null,chapters:[],isRecording:false,recordSeconds:0,saving:false,adding:false,canSave:false,keyboardHeight:0,error:'',recovered:false,showChapters:false,playing:false,tags:[],showTags:false,tagInput:'',draftStatus:'草稿仅自己可见'},
 onLoad(options){
  this.editorIdentity=store.getCurrentUser().id
  if(options.momentId&&!options.contributionId){const parent=store.getMoment(options.momentId);if(parent&&parent.myPerspectiveId){options=parent.canEdit?{id:parent.id}:Object.assign({},options,{contributionId:parent.myPerspectiveId})}}
  this.draftKey=store.getCurrentUser().id+':'+(options.contributionId?'perspective:'+options.contributionId:options.momentId?'perspective-new:'+options.momentId:options.id?'moment:'+options.id:'new')
  let existing=options.id?store.getMoment(options.id):null
  if(options.momentId){const parent=store.getMoment(options.momentId);if(!parent||!parent.canContribute)return this.blocked('这条记录暂时无法共同编辑');existing=options.contributionId?(parent.contributions||[]).find(x=>x.id===options.contributionId):null;if(options.contributionId&&(!existing||existing.creatorId!==store.getCurrentUser().id))return this.blocked('只能编辑自己的视角');this.setData({momentId:parent.id,contributionId:options.contributionId||'',chapterId:parent.chapterId,parentLabel:parent.content||parent.dateLabel})}
  else if(options.id&&(!existing||!existing.canEdit))return this.blocked('无法编辑这条记录')
  const draft=store.getEditorDraft(this.draftKey)
  const chapterId=existing?existing.chapterId:options.chapterId||this.data.chapterId||''
  const values=existing?{id:options.id||'',content:existing.content||'',tags:existing.tags||[],media:existing.media||[],voicePath:existing.voicePath||'',displayVoicePath:existing.displayVoicePath||'',voiceDuration:existing.voiceDuration||0,location:existing.location||'',latitude:existing.latitude||0,longitude:existing.longitude||0,localDateKey:existing.localDateKey||date.dateKey(existing.createdAt)}:{}
  const context=!existing&&!options.momentId&&options.chapterId?{chapterId:options.chapterId}:{}
  this.setData(Object.assign({chapterId,localDateKey:date.isDateKey(options.date)?options.date:date.today()},values,draft||{},context,{recovered:!!draft}),()=>{this.refreshChapters();this.validate()})
  this.recorder=wx.getRecorderManager()
  this.onStop=async result=>{
   clearInterval(this.recordTimer);const values=this.snapshot();if(!this.disposed)this.setData({isRecording:false,adding:true})
   try{const path=await media.persist(result.tempFilePath);const clip={voicePath:path,displayVoicePath:path,voiceDuration:Math.max(1,Math.round(result.duration/1000))};if(!this.disposed)this.setData(clip,()=>this.changed());else if(this.editorIdentity===store.getCurrentUser().id||/^(local-|user-)/.test(this.editorIdentity)){const key=store.getCurrentUser().id+this.draftKey.slice(this.draftKey.indexOf(':'));store.saveEditorDraft(key,Object.assign(values,clip))}}
   catch(error){if(!this.disposed)this.setData({error:error.message})}
   finally{if(!this.disposed)this.setData({adding:false});else if(this.recorder&&typeof this.recorder.offStop==='function')this.recorder.offStop(this.onStop)}
  }
  this.onRecordError=()=>{clearInterval(this.recordTimer);this.setData({isRecording:false,error:'录音未成功，请检查麦克风权限后重试'})}
  this.recorder.onStop(this.onStop);this.recorder.onError(this.onRecordError)
  this.onKeyboard=e=>this.setData({keyboardHeight:e.height||0});if(wx.onKeyboardHeightChange)wx.onKeyboardHeightChange(this.onKeyboard)
  this.audio=wx.createInnerAudioContext();this.audio.onPause(()=>this.setData({playing:false}));this.audio.onEnded(()=>this.setData({playing:false}));this.audio.onError(()=>this.setData({playing:false,error:'声音暂时无法播放'}))
 },
 onShow(){if(this.draftKey)this.refreshChapters()},
 onHide(){if(this.data.isRecording)this.recorder.stop();if(this.audio)this.audio.pause();this.setData({playing:false});this.flushDraft()},
 onUnload(){this.flushDraft();this.disposed=true;if(this.data.isRecording&&this.recorder)this.recorder.stop();clearTimeout(this.draftTimer);clearInterval(this.recordTimer);if(this.recorder){if(!this.data.isRecording&&!this.data.adding&&typeof this.recorder.offStop==='function')this.recorder.offStop(this.onStop);if(typeof this.recorder.offError==='function')this.recorder.offError(this.onRecordError)}if(this.audio){audioFocus.release(this.audio);this.audio.destroy()};if(wx.offKeyboardHeightChange)wx.offKeyboardHeightChange(this.onKeyboard)},
 sameAccount(){
  const current=store.getCurrentUser().id
  if(this.editorIdentity===current)return true
  if(/^(local-|user-)/.test(this.editorIdentity)){this.editorIdentity=current;return true}
  this.setData({blocked:true,error:'微信账号已切换，请返回后重新打开记录。原账号的草稿仍保留。'})
  return false
 },
 blocked(message){this.setData({error:message,blocked:true})},
 refreshChapters(){const chapters=store.getChapters().filter(x=>x.status!=='ARCHIVED');const chapter=this.data.chapterId?store.getChapter(this.data.chapterId):null;this.setData({chapters,chapter,audience:this.data.momentId?'这条 Moment 的共同记录者可见':chapter&&chapter.memberCount>1?chapter.memberCount+' 位 Chapter 成员可见':this.data.id&&store.getMoment(this.data.id)&&(store.getMoment(this.data.id).participantIds||[]).length?'这条 Moment 的受邀记录者可见':'仅自己可见'})},
 input(e){this.setData({content:e.detail.value});this.changed()},
 changed(){this.setData({draftStatus:'正在保存…'});this.validate();clearTimeout(this.draftTimer);this.draftTimer=setTimeout(()=>this.flushDraft(),300)},
 validate(){this.setData({canSave:store.hasContent(this.data)})},
 snapshot(){const d=this.data;return {content:d.content,tags:d.tags,media:d.media,voicePath:d.voicePath,voiceDuration:d.voiceDuration,location:d.location,latitude:d.latitude,longitude:d.longitude,localDateKey:d.localDateKey,chapterId:d.chapterId}},
 flushDraft(){if(!this.sameAccount())return false;if(this.committed||!this.draftKey||this.data.blocked)return true;this.draftKey=store.getCurrentUser().id+this.draftKey.slice(this.draftKey.indexOf(':'));const value=this.snapshot();const ok=store.saveEditorDraft(this.draftKey,store.hasContent(value)?value:null);if(!this.disposed)this.setData(ok?{draftStatus:store.hasContent(value)?'草稿已保存':'草稿仅自己可见'}:{error:store.getLastError(),draftStatus:'草稿未保存'});return !!ok},
 async addPhotos(){if(this.data.adding||this.data.media.length>=12)return;this.setData({adding:true,error:''});try{const files=await media.chooseImages(Math.min(9,12-this.data.media.length));this.setData({media:this.data.media.concat(files)},()=>this.changed())}catch(error){this.setData({error:error.message})}finally{this.setData({adding:false})}},
 removePhoto(e){this.setData({media:this.data.media.filter((x,i)=>i!==Number(e.currentTarget.dataset.index))},()=>this.changed())},
 preview(e){wx.previewImage({urls:this.data.media.map(x=>x.displayPath||x.path),current:e.currentTarget.dataset.src})},
 record(){if(this.data.isRecording){this.recorder.stop();return}const start=()=>{this.setData({isRecording:true,recordSeconds:0,error:''});this.recordTimer=setInterval(()=>this.setData({recordSeconds:this.data.recordSeconds+1}),1000);this.recorder.start({duration:60000,format:'mp3'})};if(this.data.voicePath)wx.showModal({title:'替换这段录音？',content:'新录音完成后会替换当前声音。',success:r=>{if(r.confirm)start()}});else start()},
 play(){if(this.data.playing){this.audio.pause();this.setData({playing:false})}else{if(this.audio.src!==(this.data.displayVoicePath||this.data.voicePath))this.audio.src=this.data.displayVoicePath||this.data.voicePath;audioFocus.claim(this.audio);this.audio.play();this.setData({playing:true})}},
 removeVoice(){this.audio.stop();this.setData({voicePath:'',voiceDuration:0,playing:false},()=>this.changed())},
 choosePlace(){wx.chooseLocation({success:r=>this.setData({location:r.name||r.address,latitude:r.latitude,longitude:r.longitude},()=>this.changed()),fail:e=>{if(!String(e.errMsg).includes('cancel'))this.setData({error:'无法获取地点，其他内容仍可保存'})}})},
 removePlace(){this.setData({location:'',latitude:0,longitude:0},()=>this.changed())},
 changeDate(e){this.setData({localDateKey:e.detail.value},()=>this.changed())},
 openTags(){wx.hideKeyboard();this.setData({showTags:true,tagInput:this.data.tags.join('，')})},closeTags(){this.setData({showTags:false})},inputTags(e){this.setData({tagInput:e.detail.value})},saveTags(){const tags=Array.from(new Set(this.data.tagInput.split(/[,，、\n#]+/).map(x=>x.trim()).filter(Boolean))).slice(0,8);this.setData({tags,showTags:false},()=>this.changed())},
 openChapters(){if(this.data.momentId)return;wx.hideKeyboard();this.setData({showChapters:true})},closeChapters(){this.setData({showChapters:false})},noop(){},
 chooseChapter(e){const id=e.currentTarget.dataset.id||'';const chapter=store.getChapter(id);const choose=()=>{this.setData({chapterId:id,showChapters:false});this.refreshChapters();this.changed()};if(chapter&&chapter.memberCount>1&&id!==this.data.chapterId)wx.showModal({title:'放入共同 Chapter？',content:chapter.memberCount+' 位成员将能看到保存后的内容。草稿仍仅你可见。',confirmText:'放入',success:r=>{if(r.confirm)choose()}});else choose()},
 createChapter(){this.setData({showChapters:false});wx.navigateTo({url:'/pages/chapter/editor/index?returnToComposer=1',events:{chapterCreated:chapter=>{this.setData({chapterId:chapter.id});this.refreshChapters();this.changed()}}})},
 handleBack(){if(!this.sameAccount()){wx.navigateBack({fail:()=>wx.redirectTo({url:'/pages/index/index'})});return}if(this.data.saving||this.data.adding)return;if(this.data.isRecording){this.recorder.stop();return}if(this.flushDraft())wx.navigateBack({fail:()=>wx.redirectTo({url:'/pages/index/index'})})},
 save(){
  if(!this.sameAccount()||this.committed||this.data.saving||this.data.adding||this.data.isRecording||!this.data.canSave||this.data.blocked)return
  this.setData({saving:true,error:''})
  const payload=Object.assign(this.snapshot(),{status:'PUBLISHED'})
  let result
  if(this.data.momentId){payload.momentId=this.data.momentId;if(this.data.contributionId)payload.id=this.data.contributionId;result=store.saveContribution(payload)}
  else{if(this.data.id)payload.id=this.data.id;else payload.createdAt=new Date().toISOString();result=store.saveMoment(payload)}
  if(!result){this.setData({saving:false,error:store.getLastError()||'无法保存，请确认内容归属和编辑权限'});return}
  this.committed=true;this.draftKey=store.getCurrentUser().id+this.draftKey.slice(this.draftKey.indexOf(':'));store.saveEditorDraft(this.draftKey,null)
  if(cloud.flush)cloud.flush()
  if(!this.data.momentId&&!this.data.id){
   wx.redirectTo({url:'/pages/moment/detail/index?id='+result.id+'&saved=1',fail:()=>{this.setData({saving:false,savedMomentId:result.id,error:'这一刻已保存，点击下方查看。'})}})
  }else{
   wx.showToast({title:this.data.momentId?'视角已留下':'已保存',icon:'success'})
   wx.navigateBack({fail:()=>wx.redirectTo({url:'/pages/moment/detail/index?id='+(this.data.momentId||result.id)})})
  }
 },
 openSaved(){if(this.data.savedMomentId)wx.redirectTo({url:'/pages/moment/detail/index?id='+this.data.savedMomentId+'&saved=1'})}
})
