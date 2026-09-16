const cloud = require('wx-server-sdk')
const crypto = require('crypto')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()
const command = db.command
const tables = { users:'ongoing_users',chapters:'ongoing_chapters',moments:'ongoing_moments',contributions:'ongoing_contributions',invites:'ongoing_invites' }
const clean = value => { if (Array.isArray(value)) return value.map(clean); if (!value || typeof value !== 'object') return value; return Object.keys(value).reduce((next,key)=>{if(!['_id','_openid','favorite','syncState','accessRevoked'].includes(key))next[key]=clean(value[key]);return next},{}) }
const pick = (source,keys) => keys.reduce((next,key)=>{if(source[key]!==undefined)next[key]=source[key];return next},{})
const fail = code => { throw new Error(code) }
const validId = id => { if (typeof id !== 'string' || !/^[\w-]{1,100}$/.test(id)) fail('INVALID_ID'); return id }
async function one(table,id) { validId(id); const res=await db.collection(tables[table]).where({id}).limit(1).get(); return res.data[0]||null }
async function list(table,query) { const rows=[]; for(let offset=0;;offset+=100){const result=await db.collection(tables[table]).where(query).orderBy('_id','asc').skip(offset).limit(100).get();rows.push(...result.data);if(result.data.length<100)return rows} }
async function write(table,id,fields,existing) { if(existing)await db.collection(tables[table]).doc(existing._id).update({data:fields});else await db.collection(tables[table]).add({data:Object.assign({_id:id,id},fields)});return one(table,id) }
// Compare and update atomically. An identical retry acknowledges the original operation.
async function versioned(table,item,existing,operationId,baseVersion) {
  if(existing && existing.lastOperation === operationId)return clean(existing)
  if(existing && existing.deleted)fail('DELETED')
  const version=existing && existing.serverVersion || 0
  if(Number(baseVersion||0)!==version)fail('CONFLICT')
  const fields=Object.assign({},item,{serverVersion:version+1,lastOperation:operationId,updatedAt:new Date().toISOString()})
  if(existing){const query={_id:existing._id,serverVersion:existing.serverVersion===undefined?command.exists(false):version};const result=await db.collection(tables[table]).where(query).update({data:fields});if(!result.stats.updated)fail('CONFLICT')}
  else { try{await db.collection(tables[table]).add({data:Object.assign({_id:item.id},fields)})}catch(e){const current=await one(table,item.id);if(current&&current.lastOperation===operationId)return clean(current);fail('CONFLICT')} }
  return clean(await one(table,item.id))
}
async function requireChapter(id,user) { const c=await one('chapters',id);if(!c)fail('CHAPTER_NOT_FOUND');if(c.deleted)fail('DELETED');if(!(c.memberIds||[]).includes(user))fail('NOT_A_MEMBER');return c }
async function requireMoment(id,user) {
  const m=await one('moments',id);if(!m)fail('MOMENT_NOT_FOUND');if(m.deleted)fail('DELETED');if(m.status==='DRAFT')fail('NO_ACCESS')
  if(m.chapterId){const c=await one('chapters',m.chapterId);if(!c||c.deleted)fail('DELETED');if((c.memberIds||[]).includes(user))return m}
  if(m.creatorId===user && !m.chapterId || (m.participantIds||[]).includes(user))return m
  fail('NO_ACCESS')
}
async function withMedia(snapshot) {
  const paths = new Set()
  const visit = value => { if (typeof value === 'string' && value.startsWith('cloud://')) paths.add(value); else if (Array.isArray(value)) value.forEach(visit); else if (value && typeof value === 'object') Object.values(value).forEach(visit) }
  visit(snapshot)
  const mediaUrls = {}
  const all = Array.from(paths)
  for (let i=0;i<all.length;i+=50) {
    const result = await cloud.getTempFileURL({fileList:all.slice(i,i+50).map(fileID=>({fileID,maxAge:3600}))})
    ;(result.fileList||[]).forEach(file=>{ if(file.tempFileURL) mediaUrls[file.fileID]={url:file.tempFileURL,expiresAt:Date.now()+55*60000} })
  }
  return Object.assign(snapshot,{mediaUrls})
}
async function usersFor(ids) { const users=[];for(const id of new Set(ids)){const user=await one('users',id);if(user)users.push(pick(clean(user),['id','nickname','avatar']))}return users }
async function momentSnapshot(id,user) { const moment=await requireMoment(id,user);const rows=await list('contributions',{momentId:id});const contributions=rows.filter(x=>!x.deleted);return withMedia({moment:clean(moment),contributions:clean(contributions),deletedIds:rows.filter(x=>x.deleted).map(x=>x.id),users:await usersFor([moment.creatorId,...contributions.map(x=>x.creatorId)])}) }
async function chapterSnapshot(id,user) { const chapter=await requireChapter(id,user);const all=await list('moments',{chapterId:id});const moments=all.filter(x=>!x.deleted&&x.status!=='DRAFT');const ids=new Set(moments.map(x=>x.id));const rows=await list('contributions',{chapterId:id});const contributions=rows.filter(x=>!x.deleted&&ids.has(x.momentId));return withMedia({chapter:clean(chapter),moments:clean(moments),contributions:clean(contributions),deletedIds:all.concat(rows).filter(x=>x.deleted).map(x=>x.id),users:await usersFor([...(chapter.memberIds||[]),...moments.map(x=>x.creatorId),...contributions.map(x=>x.creatorId)])}) }
async function ensureUser(user,profile,update) { const existing=await one('users',user);if(existing&&!update)return clean(existing);const value=pick(profile||{},['nickname','avatar','bio']);value.nickname=String(value.nickname||existing&&existing.nickname||'共同记录者').slice(0,40);return clean(await write('users',user,Object.assign({id:user},value),existing)) }
async function saveChapter(user,event) { const input=event.chapter||{};const existing=await one('chapters',input.id);if(existing&&existing.ownerId!==user)fail('OWNER_ONLY');const item=pick(input,['id','title','description','cover','startDate','endDate','status','ending','endedAt','createdAt','goals','reviewPhotoIds']);item.title=String(item.title||'').trim().slice(0,80);if(!item.title)fail('EMPTY_CONTENT');if(!['ONGOING','COMPLETED','ARCHIVED'].includes(item.status))fail('INVALID_STATUS');if(!existing)Object.assign(item,{ownerId:user,memberIds:[user]});return versioned('chapters',item,existing,event.operationId,input.serverVersion) }
function content(input) { const item=pick(input,['id','content','media','voicePath','voiceDuration','location','latitude','longitude','localDateKey','createdAt']);if(Array.isArray(input.tags))item.tags=input.tags.filter(tag=>typeof tag==='string').map(tag=>tag.trim()).filter(Boolean).slice(0,8);item.content=String(item.content||'').slice(0,20000);item.media=(Array.isArray(item.media)?item.media:[]).slice(0,12).map(x=>pick(x,['id','type','path']));if(!item.content.trim()&&!item.media.length&&!item.voicePath)fail('EMPTY_CONTENT');item.type=item.media.length?'photo':item.voicePath?'voice':'text';return item }
async function saveMoment(user,event) {
  const input=event.moment||{};const existing=await one('moments',input.id);if(existing&&existing.creatorId!==user)fail('CREATOR_ONLY')
  if(input.status==='DRAFT')fail('DRAFT_PRIVATE');if(input.chapterId)await requireChapter(input.chapterId,user)
  if(existing&&existing.chapterId!==input.chapterId){const rows=await list('contributions',{momentId:input.id});if((existing.participantIds||[]).length||rows.some(x=>!x.deleted))fail('SHARED_MOVE_FORBIDDEN');if(existing.chapterId)await requireChapter(existing.chapterId,user)}
  const item=Object.assign(content(input),{creatorId:user,chapterId:input.chapterId||'',status:'PUBLISHED'})
  if(!existing)item.participantIds=[]
  return versioned('moments',item,existing,event.operationId,input.serverVersion)
}
async function saveContribution(user,event) { const input=event.contribution||{};const m=await requireMoment(input.momentId,user);const existing=await one('contributions',input.id);if(existing&&(existing.creatorId!==user||existing.momentId!==m.id))fail('CREATOR_ONLY');const item=Object.assign(content(input),{momentId:m.id,chapterId:m.chapterId,creatorId:user});return versioned('contributions',item,existing,event.operationId,input.serverVersion) }
async function deleteItem(user,kind,id) {
  const item=await one(kind,id);if(!item)return true
  if(kind==='chapters'){if(item.ownerId!==user)fail('OWNER_ONLY')}
  else if(kind==='moments'){if(item.creatorId!==user){const c=await requireChapter(item.chapterId,user);if(c.ownerId!==user)fail('CREATOR_ONLY')}}
  else if(item.creatorId!==user)fail('CREATOR_ONLY')
  await write(kind,id,{deleted:true,deletedAt:new Date().toISOString()},item)
  if(kind==='moments'){for(const row of await list('contributions',{momentId:id}))await write('contributions',row.id,{deleted:true},row)}
  // Chapter tombstone prevents every subsequent read and write, including in-flight child writes.
  return true
}
async function invitation(code,user) {
  if(typeof code!=='string'||code.length>100)fail('INVITE_INVALID');const rows=await db.collection(tables.invites).where({code}).limit(1).get();const invite=rows.data[0];if(!invite||invite.expiresAt<Date.now())fail('INVITE_INVALID');if(invite.memberId&&invite.memberId!==user)fail('INVITE_NOT_FOR_USER')
  const scope=invite.scope||'chapter';const target=await one(scope==='moment'?'moments':'chapters',scope==='moment'?invite.momentId:invite.chapterId);if(!target||target.deleted)fail('INVITE_INVALID');if(scope==='moment'&&target.chapterId){const c=await one('chapters',target.chapterId);if(!c||c.deleted)fail('INVITE_INVALID')}
  if((scope==='chapter'?target.ownerId:target.creatorId)!==invite.createdBy)fail('INVITE_INVALID')
  return {invite,target,scope}
}
async function createInvite(user,event) { const scope=event.scope==='moment'?'moment':'chapter';const target=scope==='moment'?await requireMoment(event.momentId,user):await requireChapter(event.chapterId,user);if((scope==='moment'?target.creatorId:target.ownerId)!==user)fail('OWNER_ONLY');const invite={id:'invite-'+crypto.randomBytes(16).toString('hex'),code:crypto.randomBytes(24).toString('hex'),scope,createdBy:user,expiresAt:Date.now()+7*86400000};invite[scope==='moment'?'momentId':'chapterId']=target.id;await write('invites',invite.id,invite);return clean(invite) }
async function peekInvite(user,event) { const {target,scope,invite}=await invitation(event.code,user);const owner=await one('users',invite.createdBy);return {scope,title:scope==='chapter'?target.title:'共同记录一个 Moment',inviter:owner&&owner.nickname||'一位朋友',expiresAt:invite.expiresAt} }
async function joinInvite(user,event) { const {target,scope}=await invitation(event.code,user);await db.collection(tables[scope==='moment'?'moments':'chapters']).doc(target._id).update({data:{[scope==='moment'?'participantIds':'memberIds']:command.addToSet(user)}});return scope==='moment'?momentSnapshot(target.id,user):chapterSnapshot(target.id,user) }
async function removeMember(user,event) { const c=await requireChapter(event.chapterId,user);if(event.memberId===c.ownerId)fail('OWNER_ONLY');if(c.ownerId!==user&&event.memberId!==user)fail('OWNER_ONLY');await db.collection(tables.chapters).doc(c._id).update({data:{memberIds:command.pull(event.memberId)}});return true }
async function listMine(user) { const chapters=(await list('chapters',{memberIds:user})).filter(x=>!x.deleted);const personal=(await list('moments',{creatorId:user})).filter(x=>!x.deleted&&!x.chapterId&&x.status!=='DRAFT');const invited=(await list('moments',{participantIds:user})).filter(x=>!x.deleted);return {chapterIds:chapters.map(x=>x.id),momentIds:[...new Set(personal.concat(invited).map(x=>x.id))]} }
exports.main=async event=>{try{const user=cloud.getWXContext().OPENID;if(!user)fail('UNAUTHENTICATED');const actions={ensureUser:()=>ensureUser(user,event.profile,event.update===true),saveChapter:()=>saveChapter(user,event),saveMoment:()=>saveMoment(user,event),saveContribution:()=>saveContribution(user,event),getChapter:()=>chapterSnapshot(event.chapterId,user),getMoment:()=>momentSnapshot(event.momentId,user),deleteChapter:()=>deleteItem(user,'chapters',event.chapterId),deleteMoment:()=>deleteItem(user,'moments',event.momentId),deleteContribution:()=>deleteItem(user,'contributions',event.contributionId),createInvite:()=>createInvite(user,event),peekInvite:()=>peekInvite(user,event),joinInvite:()=>joinInvite(user,event),removeMember:()=>removeMember(user,event),listMine:()=>listMine(user)};if(!actions[event.action])fail('UNKNOWN_ACTION');return {ok:true,data:clean(await actions[event.action]())}}catch(e){return {ok:false,error:e.message||'UNKNOWN_ERROR'}}}
