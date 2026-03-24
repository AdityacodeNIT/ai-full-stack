// test-ws.js
import { WebSocketServer } from 'ws';
import { logger } from './utils/logger';

const wss = new WebSocketServer({ port: 3001, path: "/ws" });

wss.on('connection', (ws) => {
  logger.log(" Test WS Connected");
  ws.send("Hello from WS server");
});
