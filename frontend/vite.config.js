import react from '@vitejs/plugin-react'
import { defineConfig, loadEnv } from 'vite'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const authTarget = env.VITE_AUTH_URL || 'http://localhost:9000'
  const apiTarget = env.VITE_API_BASE_URL || 'http://localhost:8080'
  const clientId = env.OAUTH_CLIENT_ID || 'api-gateway'
  const clientSecret = env.OAUTH_CLIENT_SECRET || 'secret123'

  return {
    plugins: [react()],
    server: {
      port: 5173,
      proxy: {
        '/auth-proxy': {
          target: authTarget,
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/auth-proxy/, ''),
          configure: (proxy) => {
            proxy.on('proxyReq', (proxyReq, req) => {
              const url = req.url || ''
              if (url.includes('/oauth2/token')) {
                const basic = Buffer.from(`${clientId}:${clientSecret}`).toString('base64')
                proxyReq.setHeader('Authorization', `Basic ${basic}`)
              }
            })
          },
        },
        '/api': {
          target: apiTarget,
          changeOrigin: true,
        },
        // Used only by the offline-banner Retry ping (gateway actuator is public).
        '/actuator': {
          target: apiTarget,
          changeOrigin: true,
        },
      },
    },
    test: {
      environment: 'jsdom',
      globals: true,
      setupFiles: './src/test/setup.js',
    },
  }
})
