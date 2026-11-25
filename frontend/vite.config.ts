import { defineConfig } from 'vitest/config'
import { loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { resolveGoogleMapsPoint } from './map-link.ts'

export default defineConfig({
  plugins: [react(), tailwindcss(), {
    name: 'hotel-map-link',
    async config(_config, { mode }) {
      const env = loadEnv(mode, process.cwd(), 'VITE_')
      const mapUrl = env.VITE_HOTEL_MAP_URL?.trim() || ''
      const mapPoint = await resolveGoogleMapsPoint(mapUrl)
      if (mapUrl && !mapPoint) console.warn('Không lấy được tọa độ từ VITE_HOTEL_MAP_URL; kiểm tra link Google Maps và kết nối mạng.')
      return { define: { __HOTEL_MAP_POINT__: JSON.stringify(mapPoint) } }
    },
  }],
  server: {
    host: '0.0.0.0',
    port: 3000,
    allowedHosts: true,
    proxy: {
      '/api': {
        target: process.env.VITE_API_PROXY_TARGET || 'http://127.0.0.1:8080',
        changeOrigin: true,
      },
    },
  },
  test: { environment: 'jsdom', setupFiles: './src/test/setup.ts', restoreMocks: true },
})
