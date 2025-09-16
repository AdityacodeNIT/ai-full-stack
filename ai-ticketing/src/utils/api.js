import axios from 'axios';

// Create axios instance with default config for cookie-based auth
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
  withCredentials: true, // This ensures cookies are sent with requests
  headers: {
    'Content-Type': 'application/json',
  },
});

export default api;