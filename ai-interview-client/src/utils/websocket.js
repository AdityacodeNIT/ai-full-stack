import api from './api.js';


export const getWebSocketToken = async () => {
  try {
    const existingToken = localStorage.getItem('token');
    if (existingToken) {
      return existingToken;
    }
  
    const res = await api.get('/api/auth/ws-token');
    return res.data.token;
  } catch (error) {
    console.error('Failed to get WebSocket token:', error);
    throw error;
  }
};