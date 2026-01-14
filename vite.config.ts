import path from 'path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import glsl from 'vite-plugin-glsl';

export default defineConfig(({ mode }) => {
    const isProd = mode === 'production';
    
    return {
      server: {
        port: 3000,
        host: '0.0.0.0',
      },
      plugins: [
        react(),
        glsl({
          include: [
            '**/*.glsl',
            '**/*.vert',
            '**/*.frag'
          ]
        })
      ],
      define: {},
      resolve: {
        alias: {
          '@': path.resolve(__dirname, 'src'),
        }
      },
      build: {
        target: 'es2022',
        minify: 'esbuild',
        sourcemap: !isProd,
        chunkSizeWarningLimit: 2000,
        rollupOptions: {
          output: {
            manualChunks(id: string) {
              if (id.includes('node_modules')) {
                if (id.includes('@tensorflow')) {
                  return 'vendor-tensorflow';
                }
                if (id.includes('@google/genai')) {
                  return 'vendor-google-ai';
                }
                if (id.includes('node_modules/three/')) {
                  return 'vendor-three-core';
                }
              }
              return undefined;
            },
          },
        },
      },
      optimizeDeps: {
        include: [
          'react',
          'react-dom',
          'three',
          '@react-three/fiber',
          '@react-three/drei',
          'zustand',
        ],
      },
      esbuild: {
        drop: isProd ? ['console', 'debugger'] : [],
      },
    };
});
