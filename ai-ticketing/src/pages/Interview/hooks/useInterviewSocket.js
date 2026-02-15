import { useEffect, useRef, useState } from 'react';
import { useAuth } from '@clerk/clerk-react';
import { logger } from '../../../utils/logger';

/**
 * Handles interview WebSocket lifecycle and message routing
 */
export function useInterviewSocket(interviewId, handlers = {}) {
  const { getToken } = useAuth();
  const wsRef = useRef(null);
  const initializedRef = useRef(false);
  const handlersRef = useRef(handlers);
  const [status, setStatus] = useState('disconnected');

  // Update handlers ref when handlers change
  useEffect(() => {
    handlersRef.current = handlers;
  }, [handlers]);

  useEffect(() => {
    if (initializedRef.current) return;
    initializedRef.current = true;

    let mounted = true;
    let ws;

    const connect = async () => {
      try {
        const token = await getToken();

        ws = new WebSocket(
          `${import.meta.env.VITE_WS_URL}/ws/interview?token=${token}`
        );

        wsRef.current = ws;

        ws.onopen = () => {
          if (!mounted) return;
          logger.log(' WebSocket connected');
          setStatus('connected');
        };

        ws.onmessage = (event) => {
          if (!mounted) return;

          try {
            const msg = JSON.parse(event.data);
            logger.log('📨 WS message received:', msg.type);

            // Route message by type using current handlers
            if (handlersRef.current[msg.type]) {
              handlersRef.current[msg.type](msg, ws);
            } else {
              console.warn(' Unhandled WS message:', msg.type);
            }
          } catch (err) {
            console.error(' Failed to parse WS message:', err);
          }
        };

        ws.onerror = (error) => {
          if (!mounted) return;
          console.error(' WebSocket error:', error);
          setStatus('error');
        };

        ws.onclose = () => {
          if (!mounted) return;
          console.log(' WebSocket closed');
          setStatus('disconnected');
        };
      } catch (err) {
        console.error(' Interview WS connection failed:', err);
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
  }, [interviewId, getToken]);

  return {
    interviewWS: wsRef,
    status,
    send: (payload) => {
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify(payload));
        console.log('📤 Sent WS message:', payload.type);
      } else {
        console.warn(' Cannot send message, WebSocket not open:', wsRef.current?.readyState);
      }
    },
  };
}
