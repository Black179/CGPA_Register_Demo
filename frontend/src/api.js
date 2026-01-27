const API_BASE_URL = import.meta.env.VITE_API_URL || '';

export const api = {
  base: API_BASE_URL,

  // Your API endpoints
  login: (data) => axios.post(`${API_BASE_URL}/api/auth/login`, data),
  register: (data) => axios.post(`${API_BASE_URL}/api/auth/register`, data),
  // Add other endpoints as needed
};