// 本地存储统一封装：收藏夹 / 浏览足迹 / 登录信息 / 阅读字号 / 搜索历史
// 收藏与足迹按用户 ID 隔离（u_<userId>_ 前缀），不同账号互不可见；
// 阅读字号、搜索历史为设备级偏好，不按用户隔离。
const FAV_KEY_PREFIX = 'news_';   // 单条收藏：u_<uid>_news_<id> -> 文章对象
const FAV_IDS_KEY = 'fav_ids';    // 收藏顺序表 u_<uid>_fav_ids：[{id, folderId, ts}]
const FAV_FOLDERS_KEY = 'fav_folders'; // 收藏夹列表 u_<uid>_fav_folders：[{id, name, ts}]
const DEFAULT_FOLDER_ID = 'default';   // 默认收藏夹，不可删除
const FOLDER_NAME_MAX = 12;            // 收藏夹名称最大长度
const HISTORY_KEY = 'history';    // 浏览足迹 u_<uid>_history：[{id, ts}]
const USER_KEY = 'userinfo';      // 当前登录：{userId, nickName, avatarUrl}
const LAST_USER_KEY = 'last_user'; // 上次登录账号（退出后保留，用于一键恢复）
const FONT_KEY = 'font_size';     // 正文阅读字号（设备级）
const SEARCH_HISTORY_KEY = 'search_history'; // 搜索历史词（设备级）

/* ================= 用户数据域 ================= */

// 当前登录用户的 ID（模块加载时从本地恢复，登录/退出时更新）
let currentUserId = '';
try {
  const savedUser = wx.getStorageSync(USER_KEY);
  if (savedUser && savedUser.userId) currentUserId = savedUser.userId;
} catch (e) { }

// 用户数据域 key：未登录时落到 guest（页面层已保证未登录不读写用户数据）
function skey(key) {
  return 'u_' + (currentUserId || 'guest') + '_' + key;
}

/* ================= 收藏夹（文件夹） ================= */

// 读取收藏夹列表（保证默认收藏夹始终存在）
function getFolders() {
  let folders = wx.getStorageSync(skey(FAV_FOLDERS_KEY)) || []
  let hasDefault = false
  for (let i = 0; i < folders.length; i++) {
    if (folders[i].id === DEFAULT_FOLDER_ID) { hasDefault = true; break }
  }
  if (!hasDefault) {
    folders.unshift({ id: DEFAULT_FOLDER_ID, name: '默认收藏夹', ts: Date.now() })
    wx.setStorageSync(skey(FAV_FOLDERS_KEY), folders)
  }
  return folders
}

// 名称校验：去空白、限长，非法返回 ''
function trimFolderName(name) {
  name = (name || '').trim()
  if (!name) return ''
  return name.length > FOLDER_NAME_MAX ? name.slice(0, FOLDER_NAME_MAX) : name
}

// 新建收藏夹，成功返回夹对象，名称非法返回 null
function createFolder(name) {
  name = trimFolderName(name)
  if (!name) return null
  let folders = getFolders()
  for (let i = 0; i < folders.length; i++) {
    if (folders[i].name === name) return null // 重名
  }
  let folder = { id: 'f_' + Date.now() + '_' + Math.floor(Math.random() * 1000), name: name, ts: Date.now() }
  folders.push(folder)
  wx.setStorageSync(skey(FAV_FOLDERS_KEY), folders)
  return folder
}

// 重命名收藏夹，成功返回 true
function renameFolder(folderId, name) {
  name = trimFolderName(name)
  if (!name) return false
  let folders = getFolders()
  for (let i = 0; i < folders.length; i++) {
    if (folders[i].id !== folderId && folders[i].name === name) return false // 重名
  }
  for (let i = 0; i < folders.length; i++) {
    if (folders[i].id === folderId) {
      folders[i].name = name
      wx.setStorageSync(skey(FAV_FOLDERS_KEY), folders)
      return true
    }
  }
  return false
}

// 删除收藏夹（默认夹不可删），夹内收藏移入默认夹，返回被移动的条数
function deleteFolder(folderId) {
  if (folderId === DEFAULT_FOLDER_ID) return -1
  let folders = getFolders()
  folders = folders.filter(function (f) { return f.id !== folderId })
  wx.setStorageSync(skey(FAV_FOLDERS_KEY), folders)
  let entries = getFavEntries()
  let moved = 0
  for (let i = 0; i < entries.length; i++) {
    if (entries[i].folderId === folderId) {
      entries[i].folderId = DEFAULT_FOLDER_ID
      moved++
    }
  }
  wx.setStorageSync(skey(FAV_IDS_KEY), entries)
  return moved
}

// 清空指定收藏夹（仅删夹内收藏，保留收藏夹本身），返回清除条数
function clearFolder(folderId) {
  let entries = getFavEntries()
  let removed = 0
  for (let i = entries.length - 1; i >= 0; i--) {
    if (entries[i].folderId === folderId) {
      wx.removeStorageSync(skey(FAV_KEY_PREFIX + entries[i].id))
      entries.splice(i, 1)
      removed++
    }
  }
  wx.setStorageSync(skey(FAV_IDS_KEY), entries)
  return removed
}

// 各收藏夹的收藏条数 {folderId: count}
function getFavFolderCounts() {
  let entries = getFavEntries()
  let counts = {}
  for (let i = 0; i < entries.length; i++) {
    counts[entries[i].folderId] = (counts[entries[i].folderId] || 0) + 1
  }
  return counts
}

/* ================= 收藏 ================= */

// 读取收藏顺序表（兼容旧版字符串数组，自动迁移为 {id, folderId, ts}）
function getFavEntries() {
  let raw = wx.getStorageSync(skey(FAV_IDS_KEY)) || []
  let migrated = false
  let entries = []
  for (let i = 0; i < raw.length; i++) {
    if (typeof raw[i] === 'string') {
      migrated = true
      entries.push({ id: raw[i], folderId: DEFAULT_FOLDER_ID, ts: Date.now() })
    } else {
      entries.push(raw[i])
    }
  }
  if (migrated) wx.setStorageSync(skey(FAV_IDS_KEY), entries)
  return entries
}

// 是否已收藏（任意收藏夹）
function isFavorite(id) {
  let entries = getFavEntries()
  for (let i = 0; i < entries.length; i++) {
    if (entries[i].id === id) return true
  }
  return false
}

// 添加收藏到指定收藏夹（不传 folderId 存入默认夹）
function addFavorite(article, folderId) {
  folderId = folderId || DEFAULT_FOLDER_ID
  wx.setStorageSync(skey(FAV_KEY_PREFIX + article.id), article)
  let entries = getFavEntries()
  let exists = false
  for (let i = 0; i < entries.length; i++) {
    if (entries[i].id === article.id) {
      entries[i].folderId = folderId // 已存在则移动到目标夹
      exists = true
      break
    }
  }
  if (!exists) entries.unshift({ id: article.id, folderId: folderId, ts: Date.now() }) // 新收藏排在最前
  wx.setStorageSync(skey(FAV_IDS_KEY), entries)
}

// 取消收藏
function removeFavorite(id) {
  wx.removeStorageSync(skey(FAV_KEY_PREFIX + id));
  let entries = getFavEntries();
  entries = entries.filter(function (e) { return e.id !== id });
  wx.setStorageSync(skey(FAV_IDS_KEY), entries);
}

// 移动收藏到其他收藏夹（已在目标夹返回 false）
function moveFavorite(id, folderId) {
  let entries = getFavEntries();
  for (let i = 0; i < entries.length; i++) {
    if (entries[i].id === id) {
      if (entries[i].folderId === folderId) return false;
      entries[i].folderId = folderId;
      wx.setStorageSync(skey(FAV_IDS_KEY), entries);
      return true;
    }
  }
  return false;
}

// 获取收藏列表（按收藏时间倒序；传 folderId 只取该夹，不传取全部）
function getFavorites(folderId) {
  let entries = getFavEntries()
  let list = []
  for (let i = 0; i < entries.length; i++) {
    if (folderId && entries[i].folderId !== folderId) continue
    let obj = wx.getStorageSync(skey(FAV_KEY_PREFIX + entries[i].id))
    if (obj) {
      obj.folderId = entries[i].folderId
      list.push(obj)
    }
  }
  return list
}

// 清空全部收藏（当前用户）
function clearFavorites() {
  let entries = getFavEntries()
  for (let i = 0; i < entries.length; i++) {
    wx.removeStorageSync(skey(FAV_KEY_PREFIX + entries[i].id))
  }
  wx.removeStorageSync(skey(FAV_IDS_KEY))
}

/* ================= 浏览足迹 ================= */

// 记录足迹（去重、最多保留 50 条）
function addHistory(article) {
  let list = wx.getStorageSync(skey(HISTORY_KEY)) || [];
  list = list.filter(function (item) { return item.id !== article.id; });
  list.unshift({ id: article.id, ts: Date.now() });
  if (list.length > 50) list = list.slice(0, 50);
  wx.setStorageSync(skey(HISTORY_KEY), list);
}

// 获取足迹列表
function getHistory() {
  return wx.getStorageSync(skey(HISTORY_KEY)) || [];
}

// 删除单条足迹
function removeHistory(id) {
  let list = wx.getStorageSync(skey(HISTORY_KEY)) || [];
  list = list.filter(function (item) { return item.id !== id; });
  wx.setStorageSync(skey(HISTORY_KEY), list);
}

// 清空足迹
function clearHistory() {
  wx.removeStorageSync(skey(HISTORY_KEY));
}

/* ================= 登录信息（账号 = userId，昵称头像仅资料） ================= */

function getUser() {
  return wx.getStorageSync(USER_KEY) || null;
}

// 登录新账号：自动生成唯一 userId；返回带 userId 的完整账号信息
// （传入已含 userId 的对象视为恢复账号，沿用原 ID 及其数据）
function setUser(user) {
  if (!user.userId) {
    user.userId = 'u' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  }
  wx.setStorageSync(USER_KEY, user);
  wx.setStorageSync(LAST_USER_KEY, user);
  currentUserId = user.userId;
  return user;
}

// 修改资料（昵称/头像）：保持原 userId 不变，数据不受影响
function updateUser(profile) {
  let user = getUser() || {};
  user.nickName = profile.nickName;
  user.avatarUrl = profile.avatarUrl;
  wx.setStorageSync(USER_KEY, user);
  wx.setStorageSync(LAST_USER_KEY, user);
  return user;
}

// 上次登录账号（退出后仍保留，用于一键恢复）
function getLastUser() {
  let last = wx.getStorageSync(LAST_USER_KEY) || null;
  return (last && last.userId && last.nickName) ? last : null;
}

// 退出登录：仅清除当前登录态（数据保留在各账号名下），保留上次登录账号以便恢复
function clearUser() {
  wx.removeStorageSync(USER_KEY);
  currentUserId = '';
}

/* ================= 阅读字号（设备级） ================= */

function getFontSize() {
  return wx.getStorageSync(FONT_KEY) || 32;
}

function setFontSize(size) {
  wx.setStorageSync(FONT_KEY, size);
}

/* ================= 搜索历史（设备级） ================= */

function getSearchHistory() {
  return wx.getStorageSync(SEARCH_HISTORY_KEY) || [];
}

function addSearchHistory(keyword) {
  keyword = (keyword || '').trim();
  if (!keyword) return;
  let list = wx.getStorageSync(SEARCH_HISTORY_KEY) || [];
  list = list.filter(function (k) { return k !== keyword; });
  list.unshift(keyword);
  if (list.length > 8) list = list.slice(0, 8);
  wx.setStorageSync(SEARCH_HISTORY_KEY, list);
}

function clearSearchHistory() {
  wx.removeStorageSync(SEARCH_HISTORY_KEY);
}

/* ================= 工具 ================= */

// 友好时间显示
function formatTs(ts) {
  let diff = Date.now() - ts;
  let minute = 60 * 1000;
  let hour = 60 * minute;
  let day = 24 * hour;
  if (diff < minute) return '刚刚';
  if (diff < hour) return Math.floor(diff / minute) + '分钟前';
  if (diff < day) return Math.floor(diff / hour) + '小时前';
  if (diff < 2 * day) return '昨天';
  if (diff < 30 * day) return Math.floor(diff / day) + '天前';
  let d = new Date(ts);
  return d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate();
}

module.exports = {
  DEFAULT_FOLDER_ID: DEFAULT_FOLDER_ID,
  getFolders: getFolders,
  createFolder: createFolder,
  renameFolder: renameFolder,
  deleteFolder: deleteFolder,
  clearFolder: clearFolder,
  getFavFolderCounts: getFavFolderCounts,
  isFavorite: isFavorite,
  addFavorite: addFavorite,
  removeFavorite: removeFavorite,
  moveFavorite: moveFavorite,
  getFavorites: getFavorites,
  clearFavorites: clearFavorites,
  addHistory: addHistory,
  getHistory: getHistory,
  removeHistory: removeHistory,
  clearHistory: clearHistory,
  getUser: getUser,
  setUser: setUser,
  updateUser: updateUser,
  getLastUser: getLastUser,
  clearUser: clearUser,
  getFontSize: getFontSize,
  setFontSize: setFontSize,
  getSearchHistory: getSearchHistory,
  addSearchHistory: addSearchHistory,
  clearSearchHistory: clearSearchHistory,
  formatTs: formatTs
}
