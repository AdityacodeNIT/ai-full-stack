import api from './api.js';

// Get a token for WebSocket connections
export const getWebSocketToken = async () => {
  try {
    // First try to get existing token from localStorage (production)
    const existingToken = localStorage.getItem('token');
    if (existingToken) {
      return existingToken;
    }
    
    // If no token in localStorage, get a temporary one from server (development)
    const res = await api.get('/api/auth/ws-token');
    return res.data.token;
  } catch (error) {
    console.error('Failed to get WebSocket token:', error);
    throw error;
  }
};