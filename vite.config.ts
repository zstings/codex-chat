import { fileURLToPath, URL } from 'node:url';

import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import { vokexPlugin } from 'vokex.app/vite-plugin';

export default defineConfig({
  plugins: [
    vue(),
    vokexPlugin({
      name: 'Codex 会话管理器',
      identifier: 'com.codex.session-manager',
      version: '1.0.0',
      icon: 'public/icon.ico',
      window: {
        title: 'Codex 会话管理器',
        width: 1200,
        height: 800,
        minWidth: 800,
        minHeight: 600,
      },
      devtools: process.env.NODE_ENV === 'development',
    }),
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
});
