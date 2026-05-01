import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    setupFiles: ['./vitest.setup.ts'],
    globals: true,
    alias: {
      '@': resolve(__dirname, './'),
      '@fridge-manager/shared': resolve(__dirname, '../../packages/shared/dist')
    },
    exclude: ['**/node_modules/**', '**/__tests__/e2e/**']
  }
})
