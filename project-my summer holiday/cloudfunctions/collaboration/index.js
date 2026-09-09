const cloud = require('wx-server-sdk')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })

const db = cloud.database()
const command = db.command
const TABLES = {
  users: 'ongoing_users',
  chapters: 'ongoing_chapters',
  moments: 'ongoing_moments',
  contributions: 'ongoing_contributions',
  invites: 'ongoing_invites'
}

function clean(value) {
  if (Array.isArray(value)) return value.map(clean)
  if (!value || typeof value !== 'object') return value
  const next = {}
  Object.keys(value).forEach(key => { if (key !== '_id' && key !== '_openid') next[key] = clean(value[key]) })
  return next
}

async function one(table, query) {
  const result = await db.collection(table).where(query).limit(1).get()
  return result.data[0] || null
}

async function list(table, query) {
  const result = await db.collection(table).where(query).limit(100).get()
  return result.data.map(clean)
}

async function upsert(table, id, value) {
  const existing = await one(table, { id })
  const data = clean(value)
  if (existing) await db.collection(table).doc(existing._id).set({ data })
  else await db.collection(table).add({ data })
  return data
}

async function ensureUser(openid, profile) {
  const existing = await one(TABLES.users, { id: openid })
  const user = Object.assign({ id: openid, nickname: '共同记录者', avatar: '', bio: '', createdAt: new Date().toISOString() }, clean(existing || {}), clean(profile || {}), { id: openid, updatedAt: new Date().toISOString() })
  await upsert(TABLES.users, openid, user)
  return user
}

async function requireChapter(chapterId, openid) {
  const chapter = await one(TABLES.chapters, { id: chapterId })
  if (!chapter) throw new Error('CHAPTER_NOT_FOUND')
  if (!(chapter.memberIds || []).includes(openid)) throw new Error('NOT_A_MEMBER')
  return chapter
}

async function snapshot(chapterId, openid) {
  const chapter = await requireChapter(chapterId, openid)
  const moments = await list(TABLES.moments, { chapterId })
  const contributions = await list(TABLES.contributions, { chapterId })
  const users = []
  for (const id of chapter.memberIds || []) {
    const user = await one(TABLES.users, { id })
    if (user) users.push(clean(user))
  }
  return { chapter: clean(chapter), moments, contributions, users }
}

async function upsertChapter(openid, incoming) {
  const chapter = clean(incoming.chapter)
  const existing = await one(TABLES.chapters, { id: chapter.id })
  if (existing && existing.ownerId !== openid) throw new Error('OWNER_ONLY')
  chapter.ownerId = openid
  chapter.memberIds = Array.from(new Set([...(chapter.memberIds || []), openid]))
  await upsert(TABLES.chapters, chapter.id, chapter)
  for (const user of incoming.users || []) await upsert(TABLES.users, user.id, user)
  for (const moment of incoming.moments || []) {
    const item = clean(moment)
    if (!item.creatorId) item.creatorId = openid
    await upsert(TABLES.moments, item.id, item)
  }
  for (const contribution of incoming.contributions || []) await upsert(TABLES.contributions, contribution.id, contribution)
  return snapshot(chapter.id, openid)
}

async function createInvite(openid, event) {
  const chapter = await requireChapter(event.chapterId, openid)
  if (chapter.ownerId !== openid) throw new Error('OWNER_ONLY')
  const invite = {
    id: `invite-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    code: Math.random().toString(36).slice(2, 10).toUpperCase(),
    chapterId: event.chapterId,
    memberId: event.memberId || '',
    createdBy: openid,
    createdAt: new Date().toISOString(),
    expiresAt: Date.now() + 7 * 86400000
  }
  await db.collection(TABLES.invites).add({ data: invite })
  return invite
}

async function joinInvite(openid, event) {
  const invite = await one(TABLES.invites, { code: event.code })
  if (!invite || invite.expiresAt < Date.now()) throw new Error('INVITE_INVALID')
  if (invite.memberId && invite.memberId !== openid) throw new Error('INVITE_NOT_FOR_USER')
  await ensureUser(openid, event.profile)
  const chapter = await one(TABLES.chapters, { id: invite.chapterId })
  if (!chapter) throw new Error('CHAPTER_NOT_FOUND')
  await db.collection(TABLES.chapters).doc(chapter._id).update({ data: { memberIds: command.addToSet(openid) } })
  return snapshot(invite.chapterId, openid)
}

async function saveMoment(openid, event) {
  const incoming = clean(event.moment)
  const chapter = await requireChapter(incoming.chapterId, openid)
  const existing = await one(TABLES.moments, { id: incoming.id })
  if (!existing && chapter.status !== 'ONGOING') throw new Error('CHAPTER_CLOSED')
  if (existing && existing.creatorId !== openid) throw new Error('CREATOR_ONLY')
  incoming.creatorId = openid
  incoming.updatedAt = new Date().toISOString()
  if (!incoming.createdAt) incoming.createdAt = incoming.updatedAt
  await upsert(TABLES.moments, incoming.id, incoming)
  return incoming
}

async function deleteMoment(openid, event) {
  const moment = await one(TABLES.moments, { id: event.momentId })
  if (!moment) return true
  const chapter = await requireChapter(moment.chapterId, openid)
  if (moment.creatorId !== openid && chapter.ownerId !== openid) throw new Error('NO_PERMISSION')
  await db.collection(TABLES.moments).doc(moment._id).remove()
  const related = await db.collection(TABLES.contributions).where({ momentId: event.momentId }).get()
  for (const item of related.data) await db.collection(TABLES.contributions).doc(item._id).remove()
  return true
}

async function saveContribution(openid, event) {
  const incoming = clean(event.contribution)
  const moment = await one(TABLES.moments, { id: incoming.momentId })
  if (!moment) throw new Error('MOMENT_NOT_FOUND')
  const chapter = await requireChapter(moment.chapterId, openid)
  if (chapter.status !== 'ONGOING') throw new Error('CHAPTER_CLOSED')
  if (moment.creatorId === openid) throw new Error('OTHER_MEMBERS_ONLY')
  incoming.chapterId = moment.chapterId
  incoming.creatorId = openid
  if (!incoming.createdAt) incoming.createdAt = new Date().toISOString()
  await upsert(TABLES.contributions, incoming.id, incoming)
  return incoming
}

async function deleteContribution(openid, event) {
  const item = await one(TABLES.contributions, { id: event.contributionId })
  if (!item) return true
  if (item.creatorId !== openid) throw new Error('CREATOR_ONLY')
  await db.collection(TABLES.contributions).doc(item._id).remove()
  return true
}

async function completeChapter(openid, event) {
  const chapter = await requireChapter(event.chapterId, openid)
  if (chapter.ownerId !== openid) throw new Error('OWNER_ONLY')
  const updated = Object.assign(clean(chapter), {
    status: 'COMPLETED', statusText: '已成章', ending: String(event.ending || chapter.ending || '这一章，写完了。').trim(),
    endDate: chapter.endDate || new Date().toISOString().slice(0, 10), endedAt: chapter.endedAt || new Date().toISOString()
  })
  await upsert(TABLES.chapters, chapter.id, updated)
  return updated
}

async function removeMember(openid, event) {
  const chapter = await requireChapter(event.chapterId, openid)
  if (event.memberId === chapter.ownerId) throw new Error('OWNER_CANNOT_LEAVE')
  if (openid !== chapter.ownerId && openid !== event.memberId) throw new Error('NO_PERMISSION')
  const memberIds = (chapter.memberIds || []).filter(id => id !== event.memberId)
  await db.collection(TABLES.chapters).doc(chapter._id).update({ data: { memberIds } })
  return true
}

async function toggleGoal(openid, event) {
  const chapter = await requireChapter(event.chapterId, openid)
  if (chapter.status !== 'ONGOING') throw new Error('CHAPTER_CLOSED')
  const goals = (chapter.goals || []).map(goal => goal.id === event.goalId ? Object.assign({}, goal, { done: !!event.done, completedAt: event.done ? new Date().toISOString() : '' }) : goal)
  if (!goals.some(goal => goal.id === event.goalId)) throw new Error('GOAL_NOT_FOUND')
  await db.collection(TABLES.chapters).doc(chapter._id).update({ data: { goals } })
  return goals.find(goal => goal.id === event.goalId)
}

exports.main = async event => {
  const { OPENID } = cloud.getWXContext()
  try {
    let data
    if (event.action === 'ensureUser') data = await ensureUser(OPENID, event.profile)
    else if (event.action === 'upsertChapter') data = await upsertChapter(OPENID, event.snapshot)
    else if (event.action === 'createInvite') data = await createInvite(OPENID, event)
    else if (event.action === 'joinInvite') data = await joinInvite(OPENID, event)
    else if (event.action === 'getChapter') data = await snapshot(event.chapterId, OPENID)
    else if (event.action === 'saveMoment') data = await saveMoment(OPENID, event)
    else if (event.action === 'deleteMoment') data = await deleteMoment(OPENID, event)
    else if (event.action === 'saveContribution') data = await saveContribution(OPENID, event)
    else if (event.action === 'deleteContribution') data = await deleteContribution(OPENID, event)
    else if (event.action === 'completeChapter') data = await completeChapter(OPENID, event)
    else if (event.action === 'removeMember') data = await removeMember(OPENID, event)
    else if (event.action === 'toggleGoal') data = await toggleGoal(OPENID, event)
    else throw new Error('UNKNOWN_ACTION')
    return { ok: true, data: clean(data) }
  } catch (error) {
    return { ok: false, error: error.message || 'UNKNOWN_ERROR' }
  }
}
