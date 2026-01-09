import axios from "axios";

// Axios instance
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
  withCredentials: true, // send HTTP-only cookies
  headers: {
    "Content-Type": "application/json",
  },
});

//  REMOVE token-based auth if using cookies
// (recommended for security and consistency)

// Request interceptor (optional – keep ONLY if backend uses Bearer tokens)
// api.interceptors.request.use(
//   (config) => {
//     const token = localStorage.getItem("token");
//     if (token) {
//       config.headers.Authorization = `Bearer ${token}`;
//     }
//     return config;
//   },
//   (error) => Promise.reject(error)
// );

// Response interceptor – NO hard redirects
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Clear any stale client state
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      //  DO NOT redirect here
      // Let CheckAuth or route guards handle navigation
    }
    return Promise.reject(error);
  }
);

export default api;
