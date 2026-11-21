import { mkdir, writeFile } from 'node:fs/promises'
import { build } from 'vite'

const result = await build({
  configFile: false,
  build: {
    write: false,
    cssCodeSplit: false,
    modulePreload: false,
    rolldownOptions: { input: 'fleet.html', output: { codeSplitting: false } }
  }
})

if (!('output' in result)) throw new Error('Expected one fleet build')
const html = result.output.find(file => file.type === 'asset' && file.fileName === 'fleet.html')
const css = result.output.find(file => file.type === 'asset' && file.fileName.endsWith('.css'))
const js = result.output.find(file => file.type === 'chunk' && file.isEntry)
if (!html || !css || !js) throw new Error('Fleet build must include HTML, CSS and a JavaScript entry')

const standalone = String(html.source)
  .replace(/<link\b[^>]*rel="stylesheet"[^>]*>/, () => '<style>' + css.source + '</style>')
  .replace(/<script\b[^>]*src="[^"]+"[^>]*><\/script>/, () => '<script type="module">' + js.code.replace(/<\/script/gi, '<\\/script') + '</script>')

await mkdir('dist', { recursive: true })
await writeFile('dist/fleet-offline.html', standalone)
