import { copyFile, readdir, readFile, writeFile } from 'node:fs/promises'
import { join } from 'node:path'

const out = 'lib'
const types = join(out, 'types')
for (const file of await readdir(types)) {
  if (!file.endsWith('.d.ts')) continue
  const path = join(types, file)
  const source = await readFile(path, 'utf8')
  const declarations = source.replace(/(from ['"]|import\(['"])(\.\/[\w-]+)(['"])/g, '$1$2.js$3')
  await writeFile(path, declarations)
}

await copyFile('src/styles.css', join(out, 'styles.css'))
await writeFile(join(out, 'styles.css.d.ts'), 'export {}\n')
