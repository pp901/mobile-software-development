// 云函数：initData —— 一键生成演示数据（虚拟用户 + 图片 + 评论 + 点赞）
// 可重复执行：会先清除旧的 mock- 开头数据再重新插入
const cloud = require('wx-server-sdk')

cloud.init()
const db = cloud.database()
const _ = db.command

// 虚拟用户（openid 以 mock- 开头，与真实用户天然隔离）
const mockUsers = [
  { openid: 'mock-lin',  nickName: '林小满', avatarUrl: 'https://i.pravatar.cc/200?img=47', province: '浙江', country: '中国' },
  { openid: 'mock-chen', nickName: '陈晚风', avatarUrl: 'https://i.pravatar.cc/200?img=12', province: '四川', country: '中国' },
  { openid: 'mock-su',   nickName: '苏打绿', avatarUrl: 'https://i.pravatar.cc/200?img=32', province: '广东', country: '中国' },
  { openid: 'mock-yuan', nickName: '远方',   avatarUrl: 'https://i.pravatar.cc/200?img=59', province: '云南', country: '中国' }
]

// 虚拟图片（picsum 按 seed 稳定出图）
const mockPhotos = [
  { user: 0, seed: 'cp-mount',   desc: '清晨的雪山，云海就在脚下', addDate: '2026-09-07' },
  { user: 1, seed: 'cp-sea',     desc: '下班路上的海，风是咸的',   addDate: '2026-09-06' },
  { user: 2, seed: 'cp-cafe',    desc: '街角咖啡店睡着一只猫',     addDate: '2026-09-06' },
  { user: 3, seed: 'cp-lake',    desc: '泸沽湖的水面像一面镜子',   addDate: '2026-09-05' },
  { user: 0, seed: 'cp-city',    desc: '城市深夜的霓虹与车流',     addDate: '2026-09-04' },
  { user: 1, seed: 'cp-forest',  desc: '雨后的森林会呼吸',         addDate: '2026-09-03' },
  { user: 2, seed: 'cp-dessert', desc: '周末自己烤的小蛋糕',       addDate: '2026-09-02' },
  { user: 3, seed: 'cp-road',    desc: '318 国道上永远有惊喜',     addDate: '2026-09-01' }
]

// 预置评论（按 photo 顺序挂到前几张图上）
const mockComments = [
  { photo: 0, user: 1, content: '这也太美了吧，求位置！' },
  { photo: 0, user: 2, content: '构图绝了，学到了' },
  { photo: 1, user: 3, content: '下班还能看到海，羡慕' },
  { photo: 2, user: 0, content: '猫猫好乖，想rua' },
  { photo: 3, user: 1, content: '镜面湖水，收藏了' }
]

// 预置点赞（给前 5 张图各 1-2 个赞）
const mockLikes = [
  { photo: 0, user: 1 }, { photo: 0, user: 2 }, { photo: 0, user: 3 },
  { photo: 1, user: 0 }, { photo: 1, user: 3 },
  { photo: 2, user: 0 },
  { photo: 3, user: 1 }, { photo: 3, user: 2 },
  { photo: 4, user: 3 }
]

// 云函数入口
exports.main = async () => {
  const result = { photos: 0, comments: 0, likes: 0 }
  // 演示数据基准时间：按 addDate 从新到旧排列
  const baseTime = Date.now()

  // 1. 清除旧的演示数据（保证可重复执行）
  try {
    await db.collection('photo').where({
      _openid: db.RegExp({ regexp: '^mock-' })
    }).remove()
    await db.collection('comments').where({
      _openid: db.RegExp({ regexp: '^mock-' })
    }).remove()
    await db.collection('likes').where({
      _openid: db.RegExp({ regexp: '^mock-' })
    }).remove()
  } catch (e) {
    // 集合不存在等情况，继续尝试插入
  }

  // 2. 插入虚拟图片记录（服务端写入，显式指定 _openid 与排序时间戳）
  const photoIds = []
  for (let i = 0; i < mockPhotos.length; i++) {
    const item = mockPhotos[i]
    const u = mockUsers[item.user]
    const res = await db.collection('photo').add({
      data: {
        _openid: u.openid,
        photoUrl: 'https://picsum.photos/seed/' + item.seed + '/800/600',
        photoUrls: ['https://picsum.photos/seed/' + item.seed + '/800/600'],
        avatarUrl: u.avatarUrl,
        country: u.country,
        province: u.province,
        nickName: u.nickName,
        desc: item.desc,
        addDate: item.addDate,
        // 越靠前的越新：每条间隔 12 小时
        createTime: baseTime - (mockPhotos.length - 1 - i) * 12 * 3600 * 1000
      }
    })
    photoIds.push(res._id)
    result.photos++
  }

  // 3. 插入虚拟评论
  try {
    for (const c of mockComments) {
      const u = mockUsers[c.user]
      await db.collection('comments').add({
        data: {
          _openid: u.openid,
          photoId: photoIds[c.photo],
          content: c.content,
          nickName: u.nickName,
          avatarUrl: u.avatarUrl,
          addDate: '2026-09-07',
          createTime: baseTime - 24 * 3600 * 1000 + c.photo * 3600 * 1000
        }
      })
      result.comments++
    }
  } catch (e) {
    result.commentError = 'comments 集合不存在或不可写'
  }

  // 4. 插入虚拟点赞
  try {
    for (const l of mockLikes) {
      await db.collection('likes').add({
        data: {
          _openid: mockUsers[l.user].openid,
          photoId: photoIds[l.photo]
        }
      })
      result.likes++
    }
  } catch (e) {
    result.likeError = 'likes 集合不存在或不可写'
  }

  return result
}
