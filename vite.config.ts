/// <reference types="vitest/config" />
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'vite'

export default defineConfig({
  base: '/homefit100/',
  plugins: [react(), tailwindcss()],
  test: { environment: 'node', include: ['tests/**/*.test.ts'] },
})
