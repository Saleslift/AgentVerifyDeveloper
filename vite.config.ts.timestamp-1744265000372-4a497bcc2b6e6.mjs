// vite.config.ts
import { defineConfig } from "file:///home/project/node_modules/vite/dist/node/index.js";
import react from "file:///home/project/node_modules/@vitejs/plugin-react/dist/index.mjs";
import { visualizer } from "file:///home/project/node_modules/rollup-plugin-visualizer/dist/plugin/index.js";
import path from "path";
var __vite_injected_original_dirname = "/home/project";
var vite_config_default = defineConfig(({ mode }) => {
  const isAnalyze = mode === "analyze";
  return {
    plugins: [
      react({
        babel: {
          plugins: [
            "@babel/plugin-transform-react-jsx",
            ["@babel/plugin-transform-react-jsx-source", { development: false }]
          ]
        }
      }),
      isAnalyze && visualizer({
        open: true,
        gzipSize: true,
        brotliSize: true,
        filename: "dist/stats.html"
      })
    ].filter(Boolean),
    optimizeDeps: {
      include: ["@headlessui/react"],
      exclude: ["lucide-react"]
    },
    resolve: {
      alias: {
        "@": path.resolve(__vite_injected_original_dirname, "./src")
      }
    },
    build: {
      sourcemap: !isAnalyze,
      rollupOptions: {
        input: {
          main: "/index.html"
        },
        output: {
          manualChunks: (id) => {
            if (id.includes("node_modules/react/") || id.includes("node_modules/react-dom/")) {
              return "react-vendor";
            }
            if (id.includes("node_modules/@supabase/")) {
              return "supabase";
            }
            if (id.includes("node_modules/@googlemaps/") || id.includes("node_modules/@react-google-maps/") || id.includes("node_modules/use-places-autocomplete")) {
              return "maps";
            }
            if (id.includes("node_modules/react-hook-form") || id.includes("node_modules/zod")) {
              return "forms";
            }
            if (id.includes("node_modules/@headlessui/")) {
              return "ui-components";
            }
            if (id.includes("node_modules/lucide-react")) {
              return "icons";
            }
            if (id.includes("/src/components/agent/")) {
              return "feature-agent";
            }
            if (id.includes("/src/components/agency/")) {
              return "feature-agency";
            }
            if (id.includes("/src/components/developer/")) {
              return "feature-developer";
            }
            if (id.includes("/src/components/property/")) {
              return "feature-property";
            }
            if (id.includes("/src/hooks/")) {
              return "app-hooks";
            }
            if (id.includes("/src/utils/")) {
              return "app-utils";
            }
            if (id.includes("/src/contexts/")) {
              return "app-contexts";
            }
          }
        }
      },
      target: "esnext",
      minify: "esbuild",
      cssMinify: true,
      modulePreload: {
        polyfill: false
      },
      reportCompressedSize: false,
      chunkSizeWarningLimit: 1e3,
      emptyOutDir: true
    },
    server: {
      hmr: {
        overlay: false,
        protocol: "ws",
        host: "localhost",
        port: 5173,
        clientPort: 5173
      },
      watch: {
        usePolling: true,
        interval: 1e3
      },
      host: true,
      port: 5173,
      proxy: {
        "/rest/v1": {
          target: process.env.VITE_SUPABASE_URL,
          changeOrigin: true,
          rewrite: (path2) => path2.replace(/^\/rest\/v1/, "/rest/v1"),
          secure: false
        },
        "/auth/v1": {
          target: process.env.VITE_SUPABASE_URL,
          changeOrigin: true,
          rewrite: (path2) => path2.replace(/^\/auth\/v1/, "/auth/v1"),
          secure: false
        },
        "/storage/v1": {
          target: process.env.VITE_SUPABASE_URL,
          changeOrigin: true,
          rewrite: (path2) => path2.replace(/^\/storage\/v1/, "/storage/v1"),
          secure: false
        },
        "/realtime/v1": {
          target: process.env.VITE_SUPABASE_URL,
          changeOrigin: true,
          rewrite: (path2) => path2.replace(/^\/realtime\/v1/, "/realtime/v1"),
          secure: false,
          ws: true
        }
      }
    },
    base: "/"
  };
});
export {
  vite_config_default as default
};
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsidml0ZS5jb25maWcudHMiXSwKICAic291cmNlc0NvbnRlbnQiOiBbImNvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9kaXJuYW1lID0gXCIvaG9tZS9wcm9qZWN0XCI7Y29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2ZpbGVuYW1lID0gXCIvaG9tZS9wcm9qZWN0L3ZpdGUuY29uZmlnLnRzXCI7Y29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2ltcG9ydF9tZXRhX3VybCA9IFwiZmlsZTovLy9ob21lL3Byb2plY3Qvdml0ZS5jb25maWcudHNcIjtpbXBvcnQgeyBkZWZpbmVDb25maWcgfSBmcm9tICd2aXRlJztcbmltcG9ydCByZWFjdCBmcm9tICdAdml0ZWpzL3BsdWdpbi1yZWFjdCc7XG5pbXBvcnQgeyB2aXN1YWxpemVyIH0gZnJvbSAncm9sbHVwLXBsdWdpbi12aXN1YWxpemVyJztcbmltcG9ydCBwYXRoIGZyb20gJ3BhdGgnO1xuXG5leHBvcnQgZGVmYXVsdCBkZWZpbmVDb25maWcoKHsgbW9kZSB9KSA9PiB7XG4gIGNvbnN0IGlzQW5hbHl6ZSA9IG1vZGUgPT09ICdhbmFseXplJztcbiAgXG4gIHJldHVybiB7XG4gICAgcGx1Z2luczogW1xuICAgICAgcmVhY3Qoe1xuICAgICAgICBiYWJlbDoge1xuICAgICAgICAgIHBsdWdpbnM6IFtcbiAgICAgICAgICAgICdAYmFiZWwvcGx1Z2luLXRyYW5zZm9ybS1yZWFjdC1qc3gnLFxuICAgICAgICAgICAgWydAYmFiZWwvcGx1Z2luLXRyYW5zZm9ybS1yZWFjdC1qc3gtc291cmNlJywgeyBkZXZlbG9wbWVudDogZmFsc2UgfV1cbiAgICAgICAgICBdXG4gICAgICAgIH1cbiAgICAgIH0pLFxuICAgICAgaXNBbmFseXplICYmIHZpc3VhbGl6ZXIoe1xuICAgICAgICBvcGVuOiB0cnVlLFxuICAgICAgICBnemlwU2l6ZTogdHJ1ZSxcbiAgICAgICAgYnJvdGxpU2l6ZTogdHJ1ZSxcbiAgICAgICAgZmlsZW5hbWU6ICdkaXN0L3N0YXRzLmh0bWwnXG4gICAgICB9KVxuICAgIF0uZmlsdGVyKEJvb2xlYW4pLFxuICAgIG9wdGltaXplRGVwczoge1xuICAgICAgaW5jbHVkZTogWydAaGVhZGxlc3N1aS9yZWFjdCddLFxuICAgICAgZXhjbHVkZTogWydsdWNpZGUtcmVhY3QnXVxuICAgIH0sXG4gICAgcmVzb2x2ZToge1xuICAgICAgYWxpYXM6IHtcbiAgICAgICAgJ0AnOiBwYXRoLnJlc29sdmUoX19kaXJuYW1lLCAnLi9zcmMnKVxuICAgICAgfVxuICAgIH0sXG4gICAgYnVpbGQ6IHtcbiAgICAgIHNvdXJjZW1hcDogIWlzQW5hbHl6ZSxcbiAgICAgIHJvbGx1cE9wdGlvbnM6IHtcbiAgICAgICAgaW5wdXQ6IHtcbiAgICAgICAgICBtYWluOiAnL2luZGV4Lmh0bWwnXG4gICAgICAgIH0sXG4gICAgICAgIG91dHB1dDoge1xuICAgICAgICAgIG1hbnVhbENodW5rczogKGlkKSA9PiB7XG4gICAgICAgICAgICAvLyBDb3JlIFJlYWN0IGxpYnJhcmllc1xuICAgICAgICAgICAgaWYgKGlkLmluY2x1ZGVzKCdub2RlX21vZHVsZXMvcmVhY3QvJykgfHwgXG4gICAgICAgICAgICAgICAgaWQuaW5jbHVkZXMoJ25vZGVfbW9kdWxlcy9yZWFjdC1kb20vJykpIHtcbiAgICAgICAgICAgICAgcmV0dXJuICdyZWFjdC12ZW5kb3InO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgXG4gICAgICAgICAgICAvLyBTdXBhYmFzZVxuICAgICAgICAgICAgaWYgKGlkLmluY2x1ZGVzKCdub2RlX21vZHVsZXMvQHN1cGFiYXNlLycpKSB7XG4gICAgICAgICAgICAgIHJldHVybiAnc3VwYWJhc2UnO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgXG4gICAgICAgICAgICAvLyBNYXBzXG4gICAgICAgICAgICBpZiAoaWQuaW5jbHVkZXMoJ25vZGVfbW9kdWxlcy9AZ29vZ2xlbWFwcy8nKSB8fCBcbiAgICAgICAgICAgICAgICBpZC5pbmNsdWRlcygnbm9kZV9tb2R1bGVzL0ByZWFjdC1nb29nbGUtbWFwcy8nKSB8fFxuICAgICAgICAgICAgICAgIGlkLmluY2x1ZGVzKCdub2RlX21vZHVsZXMvdXNlLXBsYWNlcy1hdXRvY29tcGxldGUnKSkge1xuICAgICAgICAgICAgICByZXR1cm4gJ21hcHMnO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgXG4gICAgICAgICAgICAvLyBGb3Jtc1xuICAgICAgICAgICAgaWYgKGlkLmluY2x1ZGVzKCdub2RlX21vZHVsZXMvcmVhY3QtaG9vay1mb3JtJykgfHwgXG4gICAgICAgICAgICAgICAgaWQuaW5jbHVkZXMoJ25vZGVfbW9kdWxlcy96b2QnKSkge1xuICAgICAgICAgICAgICByZXR1cm4gJ2Zvcm1zJztcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIFxuICAgICAgICAgICAgLy8gVUkgQ29tcG9uZW50c1xuICAgICAgICAgICAgaWYgKGlkLmluY2x1ZGVzKCdub2RlX21vZHVsZXMvQGhlYWRsZXNzdWkvJykpIHtcbiAgICAgICAgICAgICAgcmV0dXJuICd1aS1jb21wb25lbnRzJztcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIFxuICAgICAgICAgICAgLy8gSWNvbnNcbiAgICAgICAgICAgIGlmIChpZC5pbmNsdWRlcygnbm9kZV9tb2R1bGVzL2x1Y2lkZS1yZWFjdCcpKSB7XG4gICAgICAgICAgICAgIHJldHVybiAnaWNvbnMnO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgXG4gICAgICAgICAgICAvLyBHcm91cCBieSBmZWF0dXJlIGZvciBhcHAgY29kZVxuICAgICAgICAgICAgaWYgKGlkLmluY2x1ZGVzKCcvc3JjL2NvbXBvbmVudHMvYWdlbnQvJykpIHtcbiAgICAgICAgICAgICAgcmV0dXJuICdmZWF0dXJlLWFnZW50JztcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIFxuICAgICAgICAgICAgaWYgKGlkLmluY2x1ZGVzKCcvc3JjL2NvbXBvbmVudHMvYWdlbmN5LycpKSB7XG4gICAgICAgICAgICAgIHJldHVybiAnZmVhdHVyZS1hZ2VuY3knO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgXG4gICAgICAgICAgICBpZiAoaWQuaW5jbHVkZXMoJy9zcmMvY29tcG9uZW50cy9kZXZlbG9wZXIvJykpIHtcbiAgICAgICAgICAgICAgcmV0dXJuICdmZWF0dXJlLWRldmVsb3Blcic7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIGlmIChpZC5pbmNsdWRlcygnL3NyYy9jb21wb25lbnRzL3Byb3BlcnR5LycpKSB7XG4gICAgICAgICAgICAgIHJldHVybiAnZmVhdHVyZS1wcm9wZXJ0eSc7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIGlmIChpZC5pbmNsdWRlcygnL3NyYy9ob29rcy8nKSkge1xuICAgICAgICAgICAgICByZXR1cm4gJ2FwcC1ob29rcyc7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIGlmIChpZC5pbmNsdWRlcygnL3NyYy91dGlscy8nKSkge1xuICAgICAgICAgICAgICByZXR1cm4gJ2FwcC11dGlscyc7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIGlmIChpZC5pbmNsdWRlcygnL3NyYy9jb250ZXh0cy8nKSkge1xuICAgICAgICAgICAgICByZXR1cm4gJ2FwcC1jb250ZXh0cyc7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9LFxuICAgICAgdGFyZ2V0OiAnZXNuZXh0JyxcbiAgICAgIG1pbmlmeTogJ2VzYnVpbGQnLFxuICAgICAgY3NzTWluaWZ5OiB0cnVlLFxuICAgICAgbW9kdWxlUHJlbG9hZDoge1xuICAgICAgICBwb2x5ZmlsbDogZmFsc2VcbiAgICAgIH0sXG4gICAgICByZXBvcnRDb21wcmVzc2VkU2l6ZTogZmFsc2UsXG4gICAgICBjaHVua1NpemVXYXJuaW5nTGltaXQ6IDEwMDAsXG4gICAgICBlbXB0eU91dERpcjogdHJ1ZVxuICAgIH0sXG4gICAgc2VydmVyOiB7XG4gICAgICBobXI6IHtcbiAgICAgICAgb3ZlcmxheTogZmFsc2UsXG4gICAgICAgIHByb3RvY29sOiAnd3MnLFxuICAgICAgICBob3N0OiAnbG9jYWxob3N0JyxcbiAgICAgICAgcG9ydDogNTE3MyxcbiAgICAgICAgY2xpZW50UG9ydDogNTE3M1xuICAgICAgfSxcbiAgICAgIHdhdGNoOiB7XG4gICAgICAgIHVzZVBvbGxpbmc6IHRydWUsXG4gICAgICAgIGludGVydmFsOiAxMDAwXG4gICAgICB9LFxuICAgICAgaG9zdDogdHJ1ZSxcbiAgICAgIHBvcnQ6IDUxNzMsXG4gICAgICBwcm94eToge1xuICAgICAgICAnL3Jlc3QvdjEnOiB7XG4gICAgICAgICAgdGFyZ2V0OiBwcm9jZXNzLmVudi5WSVRFX1NVUEFCQVNFX1VSTCxcbiAgICAgICAgICBjaGFuZ2VPcmlnaW46IHRydWUsXG4gICAgICAgICAgcmV3cml0ZTogKHBhdGgpID0+IHBhdGgucmVwbGFjZSgvXlxcL3Jlc3RcXC92MS8sICcvcmVzdC92MScpLFxuICAgICAgICAgIHNlY3VyZTogZmFsc2VcbiAgICAgICAgfSxcbiAgICAgICAgJy9hdXRoL3YxJzoge1xuICAgICAgICAgIHRhcmdldDogcHJvY2Vzcy5lbnYuVklURV9TVVBBQkFTRV9VUkwsXG4gICAgICAgICAgY2hhbmdlT3JpZ2luOiB0cnVlLFxuICAgICAgICAgIHJld3JpdGU6IChwYXRoKSA9PiBwYXRoLnJlcGxhY2UoL15cXC9hdXRoXFwvdjEvLCAnL2F1dGgvdjEnKSxcbiAgICAgICAgICBzZWN1cmU6IGZhbHNlXG4gICAgICAgIH0sXG4gICAgICAgICcvc3RvcmFnZS92MSc6IHtcbiAgICAgICAgICB0YXJnZXQ6IHByb2Nlc3MuZW52LlZJVEVfU1VQQUJBU0VfVVJMLFxuICAgICAgICAgIGNoYW5nZU9yaWdpbjogdHJ1ZSxcbiAgICAgICAgICByZXdyaXRlOiAocGF0aCkgPT4gcGF0aC5yZXBsYWNlKC9eXFwvc3RvcmFnZVxcL3YxLywgJy9zdG9yYWdlL3YxJyksXG4gICAgICAgICAgc2VjdXJlOiBmYWxzZVxuICAgICAgICB9LFxuICAgICAgICAnL3JlYWx0aW1lL3YxJzoge1xuICAgICAgICAgIHRhcmdldDogcHJvY2Vzcy5lbnYuVklURV9TVVBBQkFTRV9VUkwsXG4gICAgICAgICAgY2hhbmdlT3JpZ2luOiB0cnVlLFxuICAgICAgICAgIHJld3JpdGU6IChwYXRoKSA9PiBwYXRoLnJlcGxhY2UoL15cXC9yZWFsdGltZVxcL3YxLywgJy9yZWFsdGltZS92MScpLFxuICAgICAgICAgIHNlY3VyZTogZmFsc2UsXG4gICAgICAgICAgd3M6IHRydWVcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH0sXG4gICAgYmFzZTogJy8nXG4gIH07XG59KTsiXSwKICAibWFwcGluZ3MiOiAiO0FBQXlOLFNBQVMsb0JBQW9CO0FBQ3RQLE9BQU8sV0FBVztBQUNsQixTQUFTLGtCQUFrQjtBQUMzQixPQUFPLFVBQVU7QUFIakIsSUFBTSxtQ0FBbUM7QUFLekMsSUFBTyxzQkFBUSxhQUFhLENBQUMsRUFBRSxLQUFLLE1BQU07QUFDeEMsUUFBTSxZQUFZLFNBQVM7QUFFM0IsU0FBTztBQUFBLElBQ0wsU0FBUztBQUFBLE1BQ1AsTUFBTTtBQUFBLFFBQ0osT0FBTztBQUFBLFVBQ0wsU0FBUztBQUFBLFlBQ1A7QUFBQSxZQUNBLENBQUMsNENBQTRDLEVBQUUsYUFBYSxNQUFNLENBQUM7QUFBQSxVQUNyRTtBQUFBLFFBQ0Y7QUFBQSxNQUNGLENBQUM7QUFBQSxNQUNELGFBQWEsV0FBVztBQUFBLFFBQ3RCLE1BQU07QUFBQSxRQUNOLFVBQVU7QUFBQSxRQUNWLFlBQVk7QUFBQSxRQUNaLFVBQVU7QUFBQSxNQUNaLENBQUM7QUFBQSxJQUNILEVBQUUsT0FBTyxPQUFPO0FBQUEsSUFDaEIsY0FBYztBQUFBLE1BQ1osU0FBUyxDQUFDLG1CQUFtQjtBQUFBLE1BQzdCLFNBQVMsQ0FBQyxjQUFjO0FBQUEsSUFDMUI7QUFBQSxJQUNBLFNBQVM7QUFBQSxNQUNQLE9BQU87QUFBQSxRQUNMLEtBQUssS0FBSyxRQUFRLGtDQUFXLE9BQU87QUFBQSxNQUN0QztBQUFBLElBQ0Y7QUFBQSxJQUNBLE9BQU87QUFBQSxNQUNMLFdBQVcsQ0FBQztBQUFBLE1BQ1osZUFBZTtBQUFBLFFBQ2IsT0FBTztBQUFBLFVBQ0wsTUFBTTtBQUFBLFFBQ1I7QUFBQSxRQUNBLFFBQVE7QUFBQSxVQUNOLGNBQWMsQ0FBQyxPQUFPO0FBRXBCLGdCQUFJLEdBQUcsU0FBUyxxQkFBcUIsS0FDakMsR0FBRyxTQUFTLHlCQUF5QixHQUFHO0FBQzFDLHFCQUFPO0FBQUEsWUFDVDtBQUdBLGdCQUFJLEdBQUcsU0FBUyx5QkFBeUIsR0FBRztBQUMxQyxxQkFBTztBQUFBLFlBQ1Q7QUFHQSxnQkFBSSxHQUFHLFNBQVMsMkJBQTJCLEtBQ3ZDLEdBQUcsU0FBUyxrQ0FBa0MsS0FDOUMsR0FBRyxTQUFTLHNDQUFzQyxHQUFHO0FBQ3ZELHFCQUFPO0FBQUEsWUFDVDtBQUdBLGdCQUFJLEdBQUcsU0FBUyw4QkFBOEIsS0FDMUMsR0FBRyxTQUFTLGtCQUFrQixHQUFHO0FBQ25DLHFCQUFPO0FBQUEsWUFDVDtBQUdBLGdCQUFJLEdBQUcsU0FBUywyQkFBMkIsR0FBRztBQUM1QyxxQkFBTztBQUFBLFlBQ1Q7QUFHQSxnQkFBSSxHQUFHLFNBQVMsMkJBQTJCLEdBQUc7QUFDNUMscUJBQU87QUFBQSxZQUNUO0FBR0EsZ0JBQUksR0FBRyxTQUFTLHdCQUF3QixHQUFHO0FBQ3pDLHFCQUFPO0FBQUEsWUFDVDtBQUVBLGdCQUFJLEdBQUcsU0FBUyx5QkFBeUIsR0FBRztBQUMxQyxxQkFBTztBQUFBLFlBQ1Q7QUFFQSxnQkFBSSxHQUFHLFNBQVMsNEJBQTRCLEdBQUc7QUFDN0MscUJBQU87QUFBQSxZQUNUO0FBRUEsZ0JBQUksR0FBRyxTQUFTLDJCQUEyQixHQUFHO0FBQzVDLHFCQUFPO0FBQUEsWUFDVDtBQUVBLGdCQUFJLEdBQUcsU0FBUyxhQUFhLEdBQUc7QUFDOUIscUJBQU87QUFBQSxZQUNUO0FBRUEsZ0JBQUksR0FBRyxTQUFTLGFBQWEsR0FBRztBQUM5QixxQkFBTztBQUFBLFlBQ1Q7QUFFQSxnQkFBSSxHQUFHLFNBQVMsZ0JBQWdCLEdBQUc7QUFDakMscUJBQU87QUFBQSxZQUNUO0FBQUEsVUFDRjtBQUFBLFFBQ0Y7QUFBQSxNQUNGO0FBQUEsTUFDQSxRQUFRO0FBQUEsTUFDUixRQUFRO0FBQUEsTUFDUixXQUFXO0FBQUEsTUFDWCxlQUFlO0FBQUEsUUFDYixVQUFVO0FBQUEsTUFDWjtBQUFBLE1BQ0Esc0JBQXNCO0FBQUEsTUFDdEIsdUJBQXVCO0FBQUEsTUFDdkIsYUFBYTtBQUFBLElBQ2Y7QUFBQSxJQUNBLFFBQVE7QUFBQSxNQUNOLEtBQUs7QUFBQSxRQUNILFNBQVM7QUFBQSxRQUNULFVBQVU7QUFBQSxRQUNWLE1BQU07QUFBQSxRQUNOLE1BQU07QUFBQSxRQUNOLFlBQVk7QUFBQSxNQUNkO0FBQUEsTUFDQSxPQUFPO0FBQUEsUUFDTCxZQUFZO0FBQUEsUUFDWixVQUFVO0FBQUEsTUFDWjtBQUFBLE1BQ0EsTUFBTTtBQUFBLE1BQ04sTUFBTTtBQUFBLE1BQ04sT0FBTztBQUFBLFFBQ0wsWUFBWTtBQUFBLFVBQ1YsUUFBUSxRQUFRLElBQUk7QUFBQSxVQUNwQixjQUFjO0FBQUEsVUFDZCxTQUFTLENBQUNBLFVBQVNBLE1BQUssUUFBUSxlQUFlLFVBQVU7QUFBQSxVQUN6RCxRQUFRO0FBQUEsUUFDVjtBQUFBLFFBQ0EsWUFBWTtBQUFBLFVBQ1YsUUFBUSxRQUFRLElBQUk7QUFBQSxVQUNwQixjQUFjO0FBQUEsVUFDZCxTQUFTLENBQUNBLFVBQVNBLE1BQUssUUFBUSxlQUFlLFVBQVU7QUFBQSxVQUN6RCxRQUFRO0FBQUEsUUFDVjtBQUFBLFFBQ0EsZUFBZTtBQUFBLFVBQ2IsUUFBUSxRQUFRLElBQUk7QUFBQSxVQUNwQixjQUFjO0FBQUEsVUFDZCxTQUFTLENBQUNBLFVBQVNBLE1BQUssUUFBUSxrQkFBa0IsYUFBYTtBQUFBLFVBQy9ELFFBQVE7QUFBQSxRQUNWO0FBQUEsUUFDQSxnQkFBZ0I7QUFBQSxVQUNkLFFBQVEsUUFBUSxJQUFJO0FBQUEsVUFDcEIsY0FBYztBQUFBLFVBQ2QsU0FBUyxDQUFDQSxVQUFTQSxNQUFLLFFBQVEsbUJBQW1CLGNBQWM7QUFBQSxVQUNqRSxRQUFRO0FBQUEsVUFDUixJQUFJO0FBQUEsUUFDTjtBQUFBLE1BQ0Y7QUFBQSxJQUNGO0FBQUEsSUFDQSxNQUFNO0FBQUEsRUFDUjtBQUNGLENBQUM7IiwKICAibmFtZXMiOiBbInBhdGgiXQp9Cg==
