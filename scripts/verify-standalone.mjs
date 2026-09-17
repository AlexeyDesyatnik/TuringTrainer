import { readdir, readFile } from 'node:fs/promises'
import { resolve, relative } from 'node:path'

const outputDirectory = resolve(process.argv[2] ?? 'dist-standalone')
const files = await listFiles(outputDirectory)
const relativeFiles = files.map((file) => relative(outputDirectory, file).replaceAll('\\', '/'))

if (!relativeFiles.includes('index.html') || relativeFiles.some((file) => file !== 'index.html' && !file.startsWith('assets/'))) {
  throw new Error(`Ожидались index.html и материалы в assets, получено: ${relativeFiles.join(', ')}`)
}

const html = await readFile(resolve(outputDirectory, 'index.html'), 'utf8')

if (!html.includes('<style') || !html.includes('<script type="module">')) {
  throw new Error('JavaScript и CSS должны быть встроены в index.html')
}

if (/<(?:script|link)\b[^>]*(?:src|href)=["'](?!data:)/i.test(html)) {
  throw new Error('index.html содержит ссылку на внешний JavaScript или CSS')
}

for (const file of relativeFiles.filter((file) => file.startsWith('assets/'))) {
  if (!html.includes(file)) {
    throw new Error(`index.html не ссылается на материал по его фактическому пути: ${file}`)
  }
}

const scriptMarker = '<script type="module">'
const scriptStart = html.indexOf(scriptMarker)
const scriptEnd = html.lastIndexOf('</script>')

if (scriptStart === -1 || scriptEnd <= scriptStart) {
  throw new Error('Не найден встроенный модуль приложения')
}

try {
  const script = html.slice(scriptStart + scriptMarker.length, scriptEnd)
    .replaceAll('import.meta.url', '"file:///index.html"')
  Function(script)
} catch (error) {
  throw new Error('Встроенный JavaScript повреждён', { cause: error })
}

console.log(`Standalone-комплект проверен: index.html (${Buffer.byteLength(html)} байт), материалов ${relativeFiles.length - 1}`)

async function listFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true })
  const nested = await Promise.all(entries.map((entry) => {
    const path = resolve(directory, entry.name)
    return entry.isDirectory() ? listFiles(path) : [path]
  }))
  return nested.flat().sort()
}
