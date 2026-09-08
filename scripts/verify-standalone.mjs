import { readdir, readFile } from 'node:fs/promises'
import { resolve, relative } from 'node:path'

const outputDirectory = resolve(process.argv[2] ?? 'dist-standalone')
const files = await listFiles(outputDirectory)
const relativeFiles = files.map((file) => relative(outputDirectory, file).replaceAll('\\', '/'))

if (relativeFiles.length !== 1 || relativeFiles[0] !== 'index.html') {
  throw new Error(`Ожидался только index.html, получено: ${relativeFiles.join(', ')}`)
}

const html = await readFile(files[0], 'utf8')

if (!html.includes('<style') || !html.includes('<script type="module">')) {
  throw new Error('JavaScript и CSS должны быть встроены в index.html')
}

if (/<(?:script|link)\b[^>]*(?:src|href)=["'](?!data:)/i.test(html)) {
  throw new Error('index.html содержит ссылку на внешний JavaScript или CSS')
}

const scriptMarker = '<script type="module">'
const scriptStart = html.indexOf(scriptMarker)
const scriptEnd = html.lastIndexOf('</script>')

if (scriptStart === -1 || scriptEnd <= scriptStart) {
  throw new Error('Не найден встроенный модуль приложения')
}

try {
  Function(html.slice(scriptStart + scriptMarker.length, scriptEnd))
} catch (error) {
  throw new Error('Встроенный JavaScript повреждён', { cause: error })
}

console.log(`Standalone-сборка проверена: index.html (${Buffer.byteLength(html)} байт)`)

async function listFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true })
  const nested = await Promise.all(entries.map((entry) => {
    const path = resolve(directory, entry.name)
    return entry.isDirectory() ? listFiles(path) : [path]
  }))
  return nested.flat().sort()
}
