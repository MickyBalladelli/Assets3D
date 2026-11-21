import { defineConfig } from '@playwright/test'

export default defineConfig({
  testDir: './tests',
  testMatch: '*.spec.ts',
  use: {
    baseURL: process.env.APP_URL ?? 'http://localhost:5173'
  }
})
