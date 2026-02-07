import { useEffect, useRef, useState } from 'react';
import { getWebSocketToken } from '../../utils/websocket';

/**
 * Handles interview WebSocket lifecycle and message routing
 */
export function useInterviewSocket(interviewId, handlers = {}) {
  const wsRef = useRef(null);
  const initializedRef = useRef(false);
  const [status, setStatus] = useState('disconnected');

  useEffect(() => {
    if (initializedRef.current) return;
    initializedRef.current = true;

    let mounted = true;
    let ws;

    const connect = async () => {
      try {
        const token = await getWebSocketToken();

        ws = new WebSocket(
          `${import.meta.env.VITE_WS_URL}/ws/interview?token=${token}`
        );

        wsRef.current = ws;

        ws.onopen = () => {
          if (!mounted) return;
          setStatus('connected');
        };

        ws.onmessage = (event) => {
          if (!mounted) return;

          const msg = JSON.parse(event.data);

          // Route message by type
          if (handlers[msg.type]) {
            handlers[msg.type](msg, ws);
          } else {
            console.warn('⚠️ Unhandled WS message:', msg.type);
          }
        };

        ws.onerror = () => {
          if (!mounted) return;
          setStatus('error');
        };

        ws.onclose = () => {
          if (!mounted) return;
          setStatus('disconnected');
        };
      } catch (err) {
        console.error('❌ Interview WS connection failed:', err);
        if (mounted) setStatus('error');
      }
    };

    connect();

    return () => {
      mounted = false;
      initializedRef.current = false;

      if (ws && (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING)) {
        ws.close();
      }

      wsRef.current = null;
    };
  }, [interviewId]);

  return {
    interviewWS: wsRef,
    status,
    send: (payload) => {
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify(payload));
      }
    },
  };
}
