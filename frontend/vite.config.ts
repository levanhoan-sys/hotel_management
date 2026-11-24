import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({ plugins: [react(), tailwindcss()], server: { host: '0.0.0.0', port: 3000, allowedHosts: true }, test: { environment: 'jsdom', setupFiles: './src/test/setup.ts', restoreMocks: true } })
