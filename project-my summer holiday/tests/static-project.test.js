const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')

const root = path.resolve(__dirname, '..')

function walk(directory, extension, output = []) {
  fs.readdirSync(directory, { withFileTypes: true }).forEach(entry => {
    if (entry.name === 'node_modules') return
    const target = path.join(directory, entry.name)
    if (entry.isDirectory()) walk(target, extension, output)
    else if (target.endsWith(extension)) output.push(target)
  })
  return output
}

walk(root, '.json').forEach(file => {
  assert.doesNotThrow(() => JSON.parse(fs.readFileSync(file, 'utf8')), `JSON 无法解析：${path.relative(root, file)}`)
})

function validateMarkup(file) {
  const source = fs.readFileSync(file, 'utf8').replace(/<!--[^]*?-->/g, '')
  const stack = []
  const tags = []
  for (let index = 0; index < source.length; index += 1) {
    if (source[index] !== '<' || !/[a-zA-Z/]/.test(source[index + 1] || '')) continue
    let quote = ''
    let end = index + 1
    for (; end < source.length; end += 1) {
      const char = source[end]
      if (quote) {
        if (char === quote) quote = ''
      } else if (char === '"' || char === "'") quote = char
      else if (char === '>') break
    }
    if (end < source.length) {
      tags.push(source.slice(index, end + 1))
      index = end
    }
  }
  tags.forEach(raw => {
    const name = (raw.match(/^<\/?([\w-]+)/) || [])[1]
    if (!name || /\/>$/.test(raw)) return
    if (/^<\//.test(raw)) assert.equal(stack.pop(), name, `WXML 标签未闭合：${path.relative(root, file)} ${raw}`)
    else stack.push(name)
  })
  assert.deepEqual(stack, [], `WXML 标签未闭合：${path.relative(root, file)}`)

  for (const match of source.matchAll(/\{\{([^]*?)\}\}/g)) {
    assert.doesNotThrow(() => new Function(`return (${match[1]})`), `WXML 表达式语法异常：${path.relative(root, file)} -> ${match[1]}`)
  }

  const scriptFile = file.replace(/\.wxml$/, '.js')
  if (fs.existsSync(scriptFile)) {
    const script = fs.readFileSync(scriptFile, 'utf8')
    const eventPattern = /\b(?:bind|catch)(?:[a-z]+|:[\w-]+)="([A-Za-z_$][\w$]*)"/g
    for (const match of source.matchAll(eventPattern)) {
      const handler = match[1]
      assert.match(script, new RegExp(`\\b${handler}\\s*\\(`), `事件处理器缺失：${path.relative(root, file)} -> ${handler}`)
    }
  }

  for (const match of source.matchAll(/\bsrc="(\/assets\/[^"{]+)"/g)) {
    assert.equal(fs.existsSync(path.join(root, match[1])), true, `静态资源缺失：${path.relative(root, file)} -> ${match[1]}`)
  }
}

walk(path.join(root, 'pages'), '.wxml').forEach(validateMarkup)
walk(path.join(root, 'components'), '.wxml').forEach(validateMarkup)

walk(root, '.wxss').forEach(file => {
  const source = fs.readFileSync(file, 'utf8').replace(/\/\*[^]*?\*\//g, '')
  let depth = 0
  for (const char of source) {
    if (char === '{') depth += 1
    if (char === '}') depth -= 1
    assert.equal(depth >= 0, true, `WXSS 花括号顺序异常：${path.relative(root, file)}`)
  }
  assert.equal(depth, 0, `WXSS 花括号未闭合：${path.relative(root, file)}`)
})

walk(path.join(root, 'pages'), '.json').concat(walk(path.join(root, 'components'), '.json')).forEach(file => {
  const config = JSON.parse(fs.readFileSync(file, 'utf8'))
  Object.values(config.usingComponents || {}).forEach(componentPath => {
    if (!componentPath.startsWith('/')) return
    assert.equal(fs.existsSync(path.join(root, `${componentPath}.json`)), true, `组件路径缺失：${path.relative(root, file)} -> ${componentPath}`)
  })
})

console.log('static-project tests passed')
