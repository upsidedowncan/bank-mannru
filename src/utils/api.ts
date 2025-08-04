import axios from 'axios'

// Create axios instance with default config
export const api = axios.create({
  baseURL: process.env.REACT_APP_API_URL || 'http://localhost:3001',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
})

// Request interceptor
api.interceptors.request.use(
  (config) => {
    // Add auth token if available
    const token = localStorage.getItem('authToken')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

// Response interceptor
api.interceptors.response.use(
  (response) => {
    return response
  },
  (error) => {
    // Handle common errors
    if (error.response?.status === 401) {
      // Handle unauthorized
      localStorage.removeItem('authToken')
      window.location.href = '/login'
    }
    return Promise.reject(error)
  }
)

// API helper functions
export const apiHelpers = {
  get: (url: string, config = {}) => api.get(url, config),
  post: (url: string, data = {}, config = {}) => api.post(url, data, config),
  put: (url: string, data = {}, config = {}) => api.put(url, data, config),
  delete: (url: string, config = {}) => api.delete(url, config),
  patch: (url: string, data = {}, config = {}) => api.patch(url, data, config),
} 