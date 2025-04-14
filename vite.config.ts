import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { visualizer } from 'rollup-plugin-visualizer';
import path from 'path';

export default defineConfig(({ mode }) => {
  const isAnalyze = mode === 'analyze';
  
  return {
    plugins: [
      react({
        babel: {
          plugins: [
            '@babel/plugin-transform-react-jsx',
            ['@babel/plugin-transform-react-jsx-source', { development: false }]
          ]
        }
      }),
      isAnalyze && visualizer({
        open: true,
        gzipSize: true,
        brotliSize: true,
        filename: 'dist/stats.html'
      })
    ].filter(Boolean),
    optimizeDeps: {
      include: ['@headlessui/react'],
      exclude: ['lucide-react']
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src')
      }
    },
    build: {
      sourcemap: !isAnalyze,
      rollupOptions: {
        input: {
          main: '/index.html'
        },
        output: {
          manualChunks: (id) => {
            // Core React libraries
            if (id.includes('node_modules/react/') || 
                id.includes('node_modules/react-dom/')) {
              return 'react-vendor';
            }
            
            // Supabase
            if (id.includes('node_modules/@supabase/')) {
              return 'supabase';
            }
            
            // Maps
            if (id.includes('node_modules/@googlemaps/') || 
                id.includes('node_modules/@react-google-maps/') ||
                id.includes('node_modules/use-places-autocomplete')) {
              return 'maps';
            }
            
            // Forms
            if (id.includes('node_modules/react-hook-form') || 
                id.includes('node_modules/zod')) {
              return 'forms';
            }
            
            // UI Components
            if (id.includes('node_modules/@headlessui/')) {
              return 'ui-components';
            }
            
            // Icons
            if (id.includes('node_modules/lucide-react')) {
              return 'icons';
            }
            
            // Group by feature for app code
            if (id.includes('/src/components/agent/')) {
              return 'feature-agent';
            }
            
            if (id.includes('/src/components/agency/')) {
              return 'feature-agency';
            }
            
            if (id.includes('/src/components/developer/')) {
              return 'feature-developer';
            }
            
            if (id.includes('/src/components/property/')) {
              return 'feature-property';
            }
            
            if (id.includes('/src/hooks/')) {
              return 'app-hooks';
            }
            
            if (id.includes('/src/utils/')) {
              return 'app-utils';
            }
            
            if (id.includes('/src/contexts/')) {
              return 'app-contexts';
            }
          }
        }
      },
      target: 'esnext',
      minify: 'esbuild',
      cssMinify: true,
      modulePreload: {
        polyfill: false
      },
      reportCompressedSize: false,
      chunkSizeWarningLimit: 1000,
      emptyOutDir: true
    },
    server: {
      hmr: {
        overlay: false,
        protocol: 'ws',
        host: 'localhost',
        port: 5173,
        clientPort: 5173
      },
      watch: {
        usePolling: true,
        interval: 1000
      },
      host: true,
      port: 5173,
      proxy: {
        '/rest/v1': {
          target: process.env.VITE_SUPABASE_URL,
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/rest\/v1/, '/rest/v1'),
          secure: false
        },
        '/auth/v1': {
          target: process.env.VITE_SUPABASE_URL,
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/auth\/v1/, '/auth/v1'),
          secure: false
        },
        '/storage/v1': {
          target: process.env.VITE_SUPABASE_URL,
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/storage\/v1/, '/storage/v1'),
          secure: false
        },
        '/realtime/v1': {
          target: process.env.VITE_SUPABASE_URL,
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/realtime\/v1/, '/realtime/v1'),
          secure: false,
          ws: true
        }
      }
    },
    base: '/'
  };
});