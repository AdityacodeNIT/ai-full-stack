import axios from "axios";
import { logger } from "./logger";

// Axios instance
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
  withCredentials: true,
  headers: {
    "Content-Type": "application/json",
  },
});

// Store for Clerk token (set by components using useAuth)
let clerkTokenGetter = null;

export const setClerkTokenGetter = (getter) => {
  clerkTokenGetter = getter;
};

// Request interceptor - add Clerk session token
api.interceptors.request.use(
  async (config) => {
    logger.log("📤 API Request:", config.method?.toUpperCase(), config.url);
    
    // Get token from Clerk if available
    if (clerkTokenGetter) {
      try {
        const token = await clerkTokenGetter();
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
          logger.log(" Added Clerk token to request");
        } else {
          logger.warn(" No Clerk token available");
        }
      } catch (error) {
        logger.error(" Failed to get Clerk token:", error);
      }
    } else {
      logger.warn(" Clerk token getter not set");
    }
    
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      logger.warn("Unauthorized request - Clerk session may have expired");
    }
    return Promise.reject(error);
  }
);

export default api;
