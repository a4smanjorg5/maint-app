import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'
import { NodePackageImporter } from 'sass-embedded'
import { resolve } from 'path'

// https://vite.dev/config/
export default defineConfig(env => ({
  css: {
    modules: {
      generateScopedName: env.command == 'build' ? '[hash:base64:5]' : '',
      localsConvention: 'camelCase',
    },
    preprocessorOptions: {
      scss: {
        importers: [new NodePackageImporter()]
      }
    },
  },
  optimizeDeps: {
    exclude: ['@electric-sql/pglite']
  },
  resolve: { alias: { '@': resolve(__dirname, './src') } },
  plugins: [react()],
}))
