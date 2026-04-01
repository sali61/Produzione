import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

const currentDir = path.dirname(fileURLToPath(import.meta.url))
const certificatePath = path.resolve(currentDir, 'certs', 'localhost.pem')
const certificateKeyPath = path.resolve(currentDir, 'certs', 'localhost.key')

const httpsConfiguration = fs.existsSync(certificatePath) && fs.existsSync(certificateKeyPath)
  ? {
      cert: fs.readFileSync(certificatePath),
      key: fs.readFileSync(certificateKeyPath),
    }
  : {}

export default defineConfig({
  plugins: [react()],
  server: {
    host: 'localhost',
    port: 5643,
    strictPort: true,
    https: httpsConfiguration,
    proxy: {
      '/api': {
        target: 'https://localhost:7643',
        changeOrigin: true,
        secure: false,
      },
    },
  },
  preview: {
    host: 'localhost',
    port: 5643,
    strictPort: true,
    https: httpsConfiguration,
  },
})
