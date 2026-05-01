import axios from "axios";

// Dev: Vite proxies /api → localhost:4000
// Production: VITE_API_URL is set in Render's environment variables
export const API_URL = import.meta.env.VITE_API_URL || "/api";

export const api = axios.create({ baseURL: API_URL });

// Attach JWT on every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("finance-token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Auto-logout on 401
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) { 
      localStorage.removeItem("finance-token");
      window.dispatchEvent(new Event("finance:logout"));
    }
    return Promise.reject(error);
  }
);

export default api;
