import { logger } from "../../utils/logger.js";

export class WebSocketGateway{
    constructor(ws) {
        this.ws = ws;
        this.connectionActive=true;
    }
      //  WebSocket helpers

      sendMessage(payload) {
        if (this.connectionActive && this.ws?.readyState === this.ws.OPEN) {
          try {
            this.ws.send(JSON.stringify(payload));
            return true;
          } catch (err) {
            logger.error("WS send failed:", err);
            this.connectionActive = false;
          }
        }
        return false;
      }
    
      sendError(message, shouldClose = false) {
        logger.error("Interview error:", message);
        this.sendMessage({ type: "error", message });
    
        if (shouldClose) {
          setTimeout(() => {
            this.connectionActive = false;
            this.ws.close();
          }, 100);
        }
      }


        close(delay = 0) {
    setTimeout(() => {
      this.connectionActive = false;
      this.ws.close();
    }, delay);
  }
}