const users = [
  { id: 'user-owner', nickname: '夏天的记录者', avatar: '/assets/images/chapter-summer.webp', bio: '把平凡的日子，过成值得收藏的章节。' },
  { id: 'user-lin', nickname: '林一', avatar: '/assets/images/summer-friends.webp', bio: '喜欢海风，也喜欢把快乐拍下来。' },
  { id: 'user-chen', nickname: '陈昼', avatar: '/assets/images/quiet-reading.webp', bio: '偶尔安静，偶尔出发。' }
]

const chapters = [
  {
    id: 'summer-2026', title: '大二暑假', englishTitle: 'SUMMER 2026', type: '假期', status: 'ONGOING', statusText: '正在发生',
    startDate: '2026-07-01', endDate: '2026-09-20', description: '在出发与停留之间，长成更喜欢的样子。',
    cover: '/assets/images/chapter-summer.webp', theme: '#476354', modules: ['瞬间', '足迹', '目标', '回望'],
    ownerId: 'user-owner', memberIds: ['user-owner', 'user-lin', 'user-chen'], createdAt: '2026-07-01T09:00:00', endedAt: '',
    goals: [
      { id: 'goal-sunset', title: '看一次海边日落', done: true, createdBy: 'user-owner', completedAt: '2026-07-14T18:42:00' },
      { id: 'goal-books', title: '读完三本一直想读的书', done: true, createdBy: 'user-owner', completedAt: '2026-08-22T10:16:00' },
      { id: 'goal-cooking', title: '学会做一道拿手菜', done: false, createdBy: 'user-owner', completedAt: '' },
      { id: 'goal-app', title: '完成小程序的第一个版本', done: true, createdBy: 'user-owner', completedAt: '2026-09-06T20:08:00' },
      { id: 'goal-friends', title: '和很久不见的朋友见面', done: true, createdBy: 'user-lin', completedAt: '2026-08-16T16:35:00' },
      { id: 'goal-trip', title: '独自完成一次短途旅行', done: false, createdBy: 'user-owner', completedAt: '' }
    ],
    reviewPhotoIds: ['m01', 'm02', 'm06']
  },
  {
    id: 'qingdao-trip', title: '青岛三日', englishTitle: 'A SHORT ESCAPE', type: '旅行', status: 'COMPLETED', statusText: '已成章',
    startDate: '2026-05-02', endDate: '2026-05-04', description: '三天很短，海风记得我们走过的路。',
    cover: '/assets/images/island-road.webp', theme: '#C75E45', modules: ['瞬间', '足迹', '目标', '回望'],
    ownerId: 'user-owner', memberIds: ['user-owner', 'user-lin'], createdAt: '2026-05-01T20:00:00', endedAt: '2026-05-04T22:10:00',
    ending: '这一章，写完了。海风会替我们记得。', goals: []
  },
  {
    id: 'photo-practice', title: '胶片练习', englishTitle: 'LIGHT STUDIES', type: '目标', status: 'ARCHIVED', statusText: '已归档',
    startDate: '2026-03-01', endDate: '2026-04-15', description: '慢一点看光，也慢一点看生活。',
    cover: '/assets/images/reading-window.webp', theme: '#D5A33B', modules: ['瞬间', '足迹', '目标', '回望'],
    ownerId: 'user-owner', memberIds: ['user-owner'], createdAt: '2026-03-01T08:00:00', endedAt: '', goals: []
  }
]

const moments = [
  { id: 'm01', chapterId: 'summer-2026', creatorId: 'user-owner', type: 'photo', status: 'PUBLISHED', content: '傍晚的海风很温柔，和好朋友一起看了日落。原来快乐可以这么简单。', location: '青岛 · 小麦岛', latitude: 36.0562, longitude: 120.4071, tags: ['朋友', '日落'], mood: '开心', media: [{ id: 'media-m01', type: 'image', path: '/assets/images/moment-sunset.webp' }], createdAt: '2026-09-07T18:42:00', favorite: true, goalId: 'goal-sunset' },
  { id: 'm02', chapterId: 'summer-2026', creatorId: 'user-chen', type: 'photo', status: 'PUBLISHED', content: '给自己留了一个没有安排的上午，光落在纸上，时间也变得很慢。', location: '家里的窗边', tags: ['独处', '阅读'], mood: '平静', media: [{ id: 'media-m02', type: 'image', path: '/assets/images/reading-window.webp' }], createdAt: '2026-09-06T10:16:00', favorite: false },
  { id: 'm03', chapterId: 'summer-2026', creatorId: 'user-owner', type: 'text', status: 'PUBLISHED', content: '第一次把想了很久的页面真正做出来。小小的完成，也值得被记住。', location: '学校图书馆', latitude: 36.0671, longitude: 120.3826, tags: ['学习', '里程碑'], mood: '兴奋', media: [{ id: 'media-m03', type: 'image', path: '/assets/images/moment-study.webp' }], createdAt: '2026-09-06T20:08:00', favorite: false, goalId: 'goal-app' },
  { id: 'm04', chapterId: 'summer-2026', creatorId: 'user-lin', type: 'photo', status: 'PUBLISHED', content: '绕远路去买冰饮，意外看见一整片金色的云。', location: '沿海公路', latitude: 36.0454, longitude: 120.4202, tags: ['晚霞', '散步'], mood: '期待', media: [{ id: 'media-m04', type: 'image', path: '/assets/images/coastal-road.webp' }], createdAt: '2026-09-05T17:30:00', favorite: false },
  { id: 'm05', chapterId: 'summer-2026', creatorId: 'user-chen', type: 'text', status: 'DRAFT', content: '读到一句很喜欢的话，晚一点补上。', location: '', tags: ['阅读'], mood: '平静', media: [], createdAt: '2026-09-04T15:21:00', favorite: false },
  { id: 'm06', chapterId: 'summer-2026', creatorId: 'user-owner', type: 'photo', status: 'PUBLISHED', content: '和妈妈一起学做了番茄牛腩，味道比想象中更好。', location: '家', tags: ['家人', '美食'], mood: '开心', media: [{ id: 'media-m06', type: 'image', path: '/assets/images/home-cooking.webp' }], createdAt: '2026-09-03T12:02:00', favorite: false },
  { id: 'm07', chapterId: 'summer-2026', creatorId: 'user-lin', type: 'photo', status: 'PUBLISHED', content: '海边走了很久，最后谁也没有急着回去。', location: '石老人海水浴场', latitude: 36.0911, longitude: 120.4678, tags: ['朋友', '散步'], mood: '放松', media: [{ id: 'media-m07', type: 'image', path: '/assets/images/beach-walk.webp' }], createdAt: '2026-09-02T18:10:00', favorite: false },
  { id: 'm08', chapterId: 'summer-2026', creatorId: 'user-owner', type: 'voice', status: 'PUBLISHED', content: '天刚亮时的海是安静的蓝。第一次完整看完日出。', location: '海边', latitude: 36.0703, longitude: 120.4456, tags: ['日出'], mood: '兴奋', media: [{ id: 'media-m08', type: 'image', path: '/assets/images/sunlit-book.webp' }], createdAt: '2026-09-01T06:10:00', favorite: true },
  { id: 'q01', chapterId: 'qingdao-trip', creatorId: 'user-owner', type: 'photo', status: 'PUBLISHED', content: '第一眼看见海，旅程真正开始了。', location: '青岛站', latitude: 36.0635, longitude: 120.3127, tags: ['旅行'], mood: '期待', media: [{ id: 'media-q01', type: 'image', path: '/assets/images/island-road.webp' }], createdAt: '2026-05-02T10:20:00', favorite: false },
  { id: 'q02', chapterId: 'qingdao-trip', creatorId: 'user-lin', type: 'photo', status: 'PUBLISHED', content: '风很大，但我们还是在栈桥停了很久。', location: '栈桥', latitude: 36.0614, longitude: 120.3188, tags: ['朋友', '旅行'], mood: '开心', media: [{ id: 'media-q02', type: 'image', path: '/assets/images/summer-friends.webp' }], createdAt: '2026-05-03T16:40:00', favorite: false },
  { id: 'q03', chapterId: 'qingdao-trip', creatorId: 'user-owner', type: 'text', status: 'PUBLISHED', content: '最后一晚，把想说的话都留在了海边。', location: '小麦岛', latitude: 36.0562, longitude: 120.4071, tags: ['告别'], mood: '平静', media: [{ id: 'media-q03', type: 'image', path: '/assets/images/moment-sunset.webp' }], createdAt: '2026-05-04T20:35:00', favorite: true },
  { id: 'p01', chapterId: 'photo-practice', creatorId: 'user-owner', type: 'photo', status: 'PUBLISHED', content: '练习观察窗边的光。', location: '工作室', tags: ['摄影', '学习'], mood: '平静', media: [{ id: 'media-p01', type: 'image', path: '/assets/images/quiet-reading.webp' }], createdAt: '2026-03-12T14:20:00', favorite: false },
  { id: 'p02', chapterId: 'photo-practice', creatorId: 'user-owner', type: 'photo', status: 'PUBLISHED', content: '光从书页上走过去。', location: '图书馆', tags: ['摄影', '光影'], mood: '放松', media: [{ id: 'media-p02', type: 'image', path: '/assets/images/sunlit-book.webp' }], createdAt: '2026-04-10T11:08:00', favorite: false }
]

const contributions = [
  { id: 'contribution-1', momentId: 'm01', chapterId: 'summer-2026', creatorId: 'user-lin', type: 'text', content: '我记得那天我们一直坐到天完全暗下来。', media: [], voicePath: '', voiceDuration: 0, createdAt: '2026-09-07T21:04:00' },
  { id: 'contribution-2', momentId: 'm01', chapterId: 'summer-2026', creatorId: 'user-chen', type: 'photo', content: '这是我相机里的另一个角度。', media: [{ id: 'media-c02', type: 'image', path: '/assets/images/summer-friends.webp' }], voicePath: '', voiceDuration: 0, createdAt: '2026-09-07T21:20:00' },
  { id: 'contribution-3', momentId: 'm03', chapterId: 'summer-2026', creatorId: 'user-lin', type: 'text', content: '那天你说终于敢把想法做出来了。', media: [], voicePath: '', voiceDuration: 0, createdAt: '2026-09-06T22:10:00' }
]

module.exports = {
  version: 2, schemaVersion: 2, activeChapterId: 'summer-2026', currentUserId: 'user-owner',
  users, chapters, moments, contributions, invites: [], settings: { privateMode: true, saveOriginal: true, imageQuality: 'compressed' }, profile: users[0]
}
