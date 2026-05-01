import axios from "axios";

// In dev, Vite proxies /api → http://localhost:4000/api
// In production, /api is served by Express on the same host
export const API_URL = "/api";

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
