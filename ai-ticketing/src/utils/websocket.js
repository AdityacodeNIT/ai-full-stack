import api from './api.js';

// Get a temporary token for WebSocket connections
export const getWebSocketToken = async () => {
  try {
    const res = await api.get('/api/auth/ws-token');
    return res.data.token;
  } catch (error) {
    console.error('Failed to get WebSocket token:', error);
    throw error;
  }
};