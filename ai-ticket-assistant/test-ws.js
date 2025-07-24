// test-ws.js
import { WebSocketServer } from 'ws';

const wss = new WebSocketServer({ port: 3001, path: "/ws" });

wss.on('connection', (ws) => {
  console.log("🟢 Test WS Connected");
  ws.send("Hello from WS server");
});
