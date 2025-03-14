import axios from 'axios';
import KeycloakService from './KeycloakService';

// Create axios instance with base URL
const apiClient = axios.create({
  baseURL: process.env.REACT_APP_BACKEND_URL || 'http://localhost:3001/api'
});

// Request interceptor to add auth token to requests
apiClient.interceptors.request.use(
  async (config) => {
    // Check if token is expired and update if needed
    if (KeycloakService.isLoggedIn() && KeycloakService.isTokenExpired()) {
      try {
        await KeycloakService.updateToken();
      } catch (error) {
        console.error('Token refresh failed', error);
        KeycloakService.doLogin();
        return Promise.reject(error);
      }
    }
    
    // Add auth header if logged in
    if (KeycloakService.isLoggedIn()) {
      config.headers.Authorization = `Bearer ${KeycloakService.getToken()}`;
    }
    
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle common errors
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    // Handle 401 Unauthorized errors
    if (error.response && error.response.status === 401) {
      KeycloakService.doLogin();
    }
    return Promise.reject(error);
  }
);

// API methods for document operations
const ApiService = {
  // Get all documents
  getDocuments: () => {
    return apiClient.get('/documents');
  },
  
  // Upload a document
  uploadDocument: (file) => {
    const formData = new FormData();
    formData.append('document', file);
    
    return apiClient.post('/documents', formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    });
  },
  
  // Delete a document (admin only)
  deleteDocument: (filename) => {
    return apiClient.delete(`/documents/${filename}`);
  },
  
  // Get download URL for a document
  getDocumentUrl: (filename) => {
    return `${apiClient.defaults.baseURL}/documents/${filename}`;
  }
};

export default ApiService;