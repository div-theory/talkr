import { WebSocketServer, WebSocket } from 'ws';
import { createServer } from 'http';

// CLOUD COMPATIBILITY: Use the port assigned by the host, or 8080 locally
const PORT = process.env.PORT ? parseInt(process.env.PORT) : 8080;
const server = createServer((req, res) => {
    // Basic health check for Cloud Load Balancers
    res.writeHead(200);
    res.end('Talkr Signal Online');
});

const wss = new WebSocketServer({ server });
const rooms = new Map<string, Set<WebSocket>>();

console.log(`[Talkr] Signaling Server Running on port ${PORT}`);

// Free Public STUN Servers (No auth needed)
// Since we don't have a VM for TURN, we use Google's public STUN.
const PUBLIC_ICE_SERVERS = {
    iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' }
    ]
};

wss.on('connection', (ws: WebSocket) => {
  let currentRoom: string | null = null;

  // Keep-alive to prevent Cloud Load Balancers from killing idle connections
  const pingInterval = setInterval(() => {
    if (ws.readyState === WebSocket.OPEN) ws.ping();
  }, 30000);

  ws.on('message', (rawMessage: string) => {
    try {
      const data = JSON.parse(rawMessage.toString());
      const { type, roomId } = data;

      if (type === 'join') {
        currentRoom = roomId;
        if (!rooms.has(roomId)) rooms.set(roomId, new Set());
        const room = rooms.get(roomId)!;
        
        if (room.size >= 2) {
          ws.send(JSON.stringify({ type: 'full' }));
          return;
        }

        room.add(ws);
        console.log(`[Room ${roomId}] Client joined.`);

        // Send Public STUN config
        ws.send(JSON.stringify({ type: 'config-ice', iceServers: PUBLIC_ICE_SERVERS }));

        if (room.size === 2) {
          broadcastToRoom(roomId, ws, { type: 'ready' });
        }
      } 
      else if (currentRoom) {
        broadcastToRoom(currentRoom, ws, data);
      }
    } catch (e) {
      console.error('Parse error', e);
    }
  });

  ws.on('close', () => {
    clearInterval(pingInterval);
    if (currentRoom && rooms.has(currentRoom)) {
      const room = rooms.get(currentRoom)!;
      room.delete(ws);
      if (room.size === 0) rooms.delete(currentRoom);
    }
  });
});

function broadcastToRoom(roomId: string, sender: WebSocket, message: any) {
  const room = rooms.get(roomId);
  if (!room) return;
  
  room.forEach(client => {
    if (client !== sender && client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify(message));
    }
  });
}

server.listen(PORT, '0.0.0.0'); // Listen on all interfaces