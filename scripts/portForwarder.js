import net from 'net';

const LOCAL_PORT = 5173;
const TARGET_PORT = 4173;

const server = net.createServer((socket) => {
  const target = net.createConnection({ port: TARGET_PORT, host: 'localhost' });
  socket.pipe(target);
  target.pipe(socket);

  socket.on('error', () => target.destroy());
  target.on('error', () => socket.destroy());
});

server.listen(LOCAL_PORT, '0.0.0.0', () => {
  console.log(`[PortForwarder] Transparently forwarding 0.0.0.0:${LOCAL_PORT} -> 127.0.0.1:${TARGET_PORT}`);
});
