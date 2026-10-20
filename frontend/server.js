import { createServer } from 'vite';

process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

async function start() {
  try {
    const server = await createServer({
      configFile: './vite.config.js',
      server: {
        port: 5173,
        host: '127.0.0.1',
      },
    });
    await server.listen();
    console.log('Vite server running permanently at http://127.0.0.1:5173');

    // Keep Node event loop explicitly alive
    setInterval(() => {}, 1000 * 60 * 60);
  } catch (e) {
    console.error('Failed to start Vite server:', e);
  }
}

start();
