let active = null
module.exports = {
 claim(audio) { if (active && active !== audio) active.pause(); active = audio },
 release(audio) { if (active === audio) active = null }
}
