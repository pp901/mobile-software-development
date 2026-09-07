const chapters = [
  {
    id: 'summer-2026', title: '大二暑假', englishTitle: '2026 SUMMER', type: '假期',
    status: 'ONGOING', statusText: '正在发生', startDate: '2026-07-01', endDate: '2026-08-31',
    dateRange: '7月1日 — 8月31日', dayCurrent: 38, dayTotal: 62, progress: 61,
    description: '在出发与停留之间，我正在长成我喜欢的样子。',
    cover: '/assets/images/chapter-summer.webp', theme: '#5B7F6A', momentCount: 16,
    placeCount: 5, goalsDone: 4, goalsTotal: 6, modules: ['瞬间', '足迹', '目标', '回望'],
    goals: [
      { id: 'g1', title: '看一次海边日落', done: true },
      { id: 'g2', title: '读完三本一直想读的书', done: true },
      { id: 'g3', title: '学会做一道拿手菜', done: false },
      { id: 'g4', title: '完成小程序的第一个版本', done: true },
      { id: 'g5', title: '和很久不见的朋友见面', done: true },
      { id: 'g6', title: '独自完成一次短途旅行', done: false }
    ]
  },
  {
    id: 'qingdao-trip', title: '青岛三日', englishTitle: 'A SHORT ESCAPE', type: '旅行',
    status: 'COMPLETED', statusText: '已成章', startDate: '2026-05-02', endDate: '2026-05-04',
    dateRange: '5月2日 — 5月4日', dayCurrent: 3, dayTotal: 3, progress: 100,
    description: '三天很短，海风记得我们走过的路。', cover: '/assets/images/moment-sunset.webp',
    theme: '#D9907A', momentCount: 9, placeCount: 4, goalsDone: 3, goalsTotal: 3,
    modules: ['瞬间', '地图', '路线', '回望'], goals: []
  },
  {
    id: 'photo-practice', title: '胶片练习', englishTitle: 'LIGHT STUDIES', type: '目标',
    status: 'ARCHIVED', statusText: '已归档', startDate: '2026-03-01', endDate: '2026-04-15',
    dateRange: '3月1日 — 4月15日', dayCurrent: 46, dayTotal: 46, progress: 100,
    description: '慢一点看光，也慢一点看生活。', cover: '/assets/images/moment-study.webp',
    theme: '#F3C98B', momentCount: 12, placeCount: 3, goalsDone: 5, goalsTotal: 5,
    modules: ['瞬间', '进度', '里程碑', '回望'], goals: []
  }
]

const baseMoments = [
  ['m01', '7月14日 周一', '18:42', '傍晚的海风很温柔，和好朋友一起看了日落。原来快乐可以这么简单。', '青岛 · 小麦岛', ['朋友', '日落'], '开心', 'moment-sunset'],
  ['m02', '7月12日 周六', '10:16', '给自己留了一个没有安排的上午，光落在纸上，时间也变得很慢。', '家里的窗边', ['独处', '阅读'], '平静', 'moment-study'],
  ['m03', '7月10日 周四', '20:08', '第一次把想了很久的页面真正做出来。小小的完成，也值得被记住。', '学校图书馆', ['学习', '里程碑'], '兴奋', 'moment-study'],
  ['m04', '7月08日 周二', '17:30', '绕远路去买冰饮，意外看见一整片金色的云。', '沿海公路', ['晚霞', '散步'], '期待', 'moment-sunset'],
  ['m05', '7月07日 周一', '15:21', '读完了暑假的第一本书。', '市图书馆', ['阅读'], '平静', 'moment-study'],
  ['m06', '7月06日 周日', '12:02', '和妈妈一起学做了番茄牛腩，味道比想象中更好。', '家', ['家人', '美食'], '开心', 'moment-study'],
  ['m07', '7月05日 周六', '22:14', '一场酣畅淋漓的游戏，输赢之外还有很久没见的朋友。', '线上', ['朋友', '游戏'], '放松', 'moment-sunset'],
  ['m08', '7月04日 周五', '06:10', '天刚亮时的海是安静的蓝。第一次完整看完日出。', '石老人海水浴场', ['日出', '里程碑'], '兴奋', 'chapter-summer'],
  ['m09', '7月03日 周四', '19:45', '在陌生的小巷里找到一家很好吃的面馆。', '老城区', ['旅行', '美食'], '开心', 'moment-sunset'],
  ['m10', '7月02日 周三', '14:20', '午后下了一场很短的雨，空气突然有了青草味。', '大学路', ['雨天', '散步'], '平静', 'chapter-summer'],
  ['m11', '7月01日 周二', '09:00', '暑假正式开始。想认真收藏这个夏天，也认真地成为自己。', '校园', ['开始', '夏天'], '期待', 'chapter-summer'],
  ['m12', '6月30日 周一', '23:40', '收拾完行李，才突然意识到这一学年真的结束了。', '宿舍', ['校园', '告别'], '疲惫', 'moment-study'],
  ['m13', '6月28日 周六', '16:35', '和社团的大家拍了最后一张合照。', '操场', ['朋友', '校园'], '开心', 'chapter-summer'],
  ['m14', '6月26日 周四', '21:12', '改完最后一版课程作业，窗外已经完全黑了。', '工作室', ['学习', '完成'], '放松', 'moment-study'],
  ['m15', '6月24日 周二', '11:08', '计划了一条想走很久的海边路线。', '咖啡馆', ['旅行', '计划'], '期待', 'moment-sunset'],
  ['m16', '6月22日 周日', '18:16', '今天没有拍照，只想记住风吹过树叶的声音。', '公园', ['独处', '声音'], '平静', 'chapter-summer']
]

const moments = baseMoments.map((item, index) => {
  const parts = item[1].match(/^(\d+)月(\d+)日/)
  const month = String(Number(parts[1])).padStart(2, '0')
  const day = String(Number(parts[2])).padStart(2, '0')
  return {
    id: item[0], chapterId: 'summer-2026', dateLabel: item[1], time: item[2], content: item[3],
    location: item[4], tags: item[5], mood: item[6], image: `/assets/images/${item[7]}.webp`,
    imageCount: index % 5 === 0 ? 2 : 1, favorite: index === 0 || index === 7,
    milestone: item[5].indexOf('里程碑') > -1, createdAt: `2026-${month}-${day}T${item[2]}:00`
  }
})

module.exports = {
  version: 1,
  activeChapterId: 'summer-2026',
  chapters,
  moments,
  profile: {
    nickname: '夏天的记录者',
    bio: '把平凡的日子，过成值得收藏的章节。',
    avatar: '/assets/images/chapter-summer.webp'
  }
}
