import { defineConfig } from 'vite'

export default defineConfig({
  build: {
    outDir: 'lib',
    emptyOutDir: true,
    lib: { entry: 'src/index.ts', formats: ['es'], fileName: 'index' },
    rolldownOptions: {
      external: id => /^(react|three)(\/|$)/.test(id),
      output: { banner: '"use client"\n' }
    }
  }
})
