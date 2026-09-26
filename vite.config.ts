import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import basicSsl from '@vitejs/plugin-basic-ssl';
import path from 'path';
import { handleStreamRequest } from './src/server/streamMiddleware.js';

function audioStreamingPlugin() {
  return {
    name: 'audio-streaming-plugin',
    configureServer(server: any) {
      server.middlewares.use('/api/stream', (req: any, res: any) => {
        handleStreamRequest(req, res);
      });
    },
    configurePreviewServer(server: any) {
      server.middlewares.use('/api/stream', (req: any, res: any) => {
        handleStreamRequest(req, res);
      });
    },
  };
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), basicSsl(), audioStreamingPlugin()],
  resolve: {
    alias: {
      jsmediatags: path.resolve(import.meta.dirname, 'node_modules/jsmediatags/dist/jsmediatags.min.js'),
    },
  },
  server: {
    host: true,
    port: 5173,
    cors: true,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS',
    },
  },
  preview: {
    host: true,
    port: 5173,
    cors: true,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS',
    },
  },
  build: {
    rollupOptions: {
      external: ['react-native-fs'],
    },
  },
});
