import react from '@vitejs/plugin-react'
import type { Plugin } from 'vite'
import { defineConfig } from 'vitest/config'

export default defineConfig(({ mode }) => {
  const standalone = mode === 'standalone'

  return {
    base: standalone ? './' : '/',
    plugins: standalone ? [react(), standaloneHtmlPlugin()] : [react()],
    ...(standalone ? {
      build: {
        cssCodeSplit: false,
      },
    } : {}),
    test: {
      environment: 'jsdom',
      setupFiles: ['./src/test/setup.ts'],
    },
  }
})

function standaloneHtmlPlugin(): Plugin {
  return {
    name: 'turing-trainer-standalone-html',
    apply: 'build',
    enforce: 'post',
    generateBundle(_options, bundle) {
      const htmlAsset = bundle['index.html']

      if (htmlAsset === undefined || htmlAsset.type !== 'asset') {
        throw new Error('Vite не создал index.html')
      }

      let html = assetText(htmlAsset)
      const externalAssetFileNames = Object.keys(bundle).filter(
        (fileName) => fileName.startsWith('assets/') && !fileName.endsWith('.css'),
      )

      for (const [fileName, item] of Object.entries(bundle)) {
        if (item === htmlAsset) continue

        if (item.type === 'chunk' && fileName.endsWith('.js')) {
          const code = externalAssetFileNames.reduce(
            (currentCode, assetFileName) => prefixInlineAssetUrl(currentCode, assetFileName),
            item.code,
          )
          html = replaceAssetTag(
            html,
            fileName,
            'script',
            `<script type="module">${escapeClosingTag(code, 'script')}</script>`,
          )
          delete bundle[fileName]
          continue
        }

        if (item.type === 'asset' && fileName.endsWith('.css')) {
          html = replaceAssetTag(
            html,
            fileName,
            'link',
            `<style>${escapeClosingTag(assetText(item), 'style')}</style>`,
          )
          delete bundle[fileName]
          continue
        }

        if (fileName.startsWith('assets/') && !fileName.endsWith('.css')) continue

        throw new Error(`Standalone-сборка содержит неподдерживаемый файл: ${fileName}`)
      }

      htmlAsset.source = html
    },
  }
}

function prefixInlineAssetUrl(code: string, assetFileName: string): string {
  const baseName = assetFileName.slice('assets/'.length)
  const escapedBaseName = baseName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  return code.replace(
    new RegExp(`new URL\\(([\`'"])${escapedBaseName}\\1,import\\.meta\\.url\\)`, 'g'),
    (_match, quote: string) => `new URL(${quote}${assetFileName}${quote},import.meta.url)`,
  )
}

function replaceAssetTag(
  html: string,
  fileName: string,
  tagName: 'link' | 'script',
  replacement: string,
): string {
  const escapedFileName = fileName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const closingTag = tagName === 'script' ? '<\\/script>' : ''
  const pattern = new RegExp(`<${tagName}\\b[^>]*(?:src|href)=["'][^"']*${escapedFileName}["'][^>]*>${closingTag}`)

  if (!pattern.test(html)) throw new Error(`Не найдена HTML-ссылка на ${fileName}`)
  return html.replace(pattern, () => replacement)
}

function assetText(asset: { source: string | Uint8Array }): string {
  return typeof asset.source === 'string' ? asset.source : new TextDecoder().decode(asset.source)
}

function escapeClosingTag(value: string, tagName: 'script' | 'style'): string {
  return value.replace(new RegExp(`</${tagName}`, 'gi'), `<\\/${tagName}`)
}
