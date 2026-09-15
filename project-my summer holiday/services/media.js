function persist(path) {
 return new Promise((resolve,reject)=>wx.saveFile({tempFilePath:path,success:res=>resolve(res.savedFilePath),fail:()=>reject(new Error('照片或声音未能保存，请检查存储空间'))}))
}
function chooseImages(count) {
 return new Promise((resolve,reject)=>wx.chooseMedia({count,mediaType:['image'],sourceType:['album','camera'],sizeType:require('./store').getSettings().saveOriginal?['original']:['compressed'],success:async res=>{const files=[];try{for(const file of res.tempFiles){const path=await persist(file.tempFilePath);files.push({id:'media-'+Date.now()+'-'+Math.random().toString(36).slice(2,7),type:'image',path})}resolve(files)}catch(error){files.forEach(file=>{if(wx.removeSavedFile)wx.removeSavedFile({filePath:file.path,fail(){}})});reject(error)}},fail:error=>error.errMsg&&error.errMsg.includes('cancel')?resolve([]):reject(new Error('无法打开相册，请检查授权'))}))
}
module.exports={persist,chooseImages}
