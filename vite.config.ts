import { defineConfig } from 'vite'

export default defineConfig({
  build: {
    rolldownOptions: {
      input: { atlas: 'index.html', fleet: 'fleet.html' }
    }
  }
})
