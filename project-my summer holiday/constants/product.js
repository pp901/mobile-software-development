// V1 product information architecture. Keep this list as the single source of
// truth for Chapter navigation; Goal remains data-compatible but is not a V1
// top-level dimension.
const CHAPTER_MODULES = ['瞬间', '日历', '回望']

function getChapterModules() {
  return CHAPTER_MODULES.slice()
}

function isChapterModule(value) {
  return CHAPTER_MODULES.includes(value)
}

module.exports = { CHAPTER_MODULES, getChapterModules, isChapterModule }
