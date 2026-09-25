import { preview } from 'vite';

async function start() {
  console.log('[AURA.WAV] Starting Vite HTTPS preview on port 5173...');
  const server = await preview({
    configFile: './vite.config.ts',
    preview: {
      port: 5173,
      host: true,
      strictPort: false,
    }
  });

  server.printUrls();
  console.log('[AURA.WAV] Running and ready.');

  setInterval(() => {}, 60000);
}

start().catch(err => {
  console.error('[AURA.WAV] Failed to start preview server:', err);
  process.exit(1);
});
