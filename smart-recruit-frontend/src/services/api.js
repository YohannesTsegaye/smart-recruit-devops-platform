import axios from 'axios';
import { API_BASE_URL } from './apiBase';

// Create axios instance with base configuration
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 10000, // 10 seconds timeout
});

// Request interceptor to add authentication token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle common errors
api.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    // Handle authentication errors
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    
    // Handle server errors
    if (error.response?.status >= 500) {
      console.error('Server error:', error.response.data);
    }
    
    return Promise.reject(error);
  }
);

// Authentication API
export const authAPI = {
  login: (credentials) => api.post('/auth/login', credentials),
  forgotPassword: (email) => api.post('/auth/forgot-password', { email }),
  resetPassword: (data) => api.post('/auth/reset-password', data),
  logout: () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  },
};

// Users API
export const usersAPI = {
  getAll: (params) => api.get('/users', { params }),
  getById: (id) => api.get(`/users/${id}`),
  create: (userData) => api.post('/users', userData),
  update: (id, userData) => api.put(`/users/${id}`, userData),
  delete: (id) => api.delete(`/users/${id}`),
  updateRole: (id, role) => api.put(`/users/${id}/role`, { role }),
  updatePassword: (id, passwordData) => api.put(`/users/${id}/password`, passwordData),
  updateEmail: (id, emailData) => api.put(`/users/${id}/email`, emailData),
};

// Candidates API
export const candidatesAPI = {
  getAll: (params) => api.get('/candidates', { params }),
  getById: (id) => api.get(`/candidates/${id}`),
  create: (candidateData) => api.post('/candidates', candidateData),
  update: (id, candidateData) => api.put(`/candidates/${id}`, candidateData),
  updateStatus: (id, statusData) => api.put(`/candidates/${id}/status`, statusData),
  delete: (id) => api.delete(`/candidates/${id}`),
  getStats: () => api.get('/candidates/stats'),
  exportData: (params) => api.get('/candidates/export', { 
    params, 
    responseType: 'blob' 
  }),
};

// Job Postings API
export const jobPostingsAPI = {
  getAll: (params) => api.get('/jobpost', { params }),
  getById: (id) => api.get(`/jobpost/${id}`),
  create: (jobData) => api.post('/jobpost', jobData),
  update: (id, jobData) => api.put(`/jobpost/${id}`, jobData),
  delete: (id) => api.delete(`/jobpost/${id}`),
  getStats: () => api.get('/jobpost/stats'),
};

// File Upload API
export const uploadAPI = {
  uploadResume: (file, onUploadProgress) => {
    const formData = new FormData();
    formData.append('file', file);
    
    return api.post('/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      onUploadProgress,
    });
  },
  
  uploadJobApplication: (applicationData, file, onUploadProgress) => {
    const formData = new FormData();
    formData.append('file', file);
    
    // Append application data
    Object.keys(applicationData).forEach(key => {
      formData.append(key, applicationData[key]);
    });
    
    return api.post('/candidates', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      onUploadProgress,
    });
  },
};

// Dashboard API
export const dashboardAPI = {
  getStats: () => api.get('/dashboard/stats'),
  getRecentCandidates: () => api.get('/dashboard/recent-candidates'),
  getRecentJobs: () => api.get('/dashboard/recent-jobs'),
  getChartsData: () => api.get('/dashboard/charts'),
  generateReport: (params) => api.get('/dashboard/report', { 
    params, 
    responseType: 'blob' 
  }),
};

// Email API
export const emailAPI = {
  sendTestEmail: (emailData) => api.post('/email/test', emailData),
  sendBulkEmail: (emailData) => api.post('/email/bulk', emailData),
  getEmailTemplates: () => api.get('/email/templates'),
  updateEmailTemplate: (id, templateData) => api.put(`/email/templates/${id}`, templateData),
};

// Utility functions
export const apiUtils = {
  // Handle file download
  downloadFile: (url, filename) => {
    return api.get(url, { responseType: 'blob' })
      .then(response => {
        const blob = new Blob([response.data]);
        const downloadUrl = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = downloadUrl;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(downloadUrl);
      });
  },
  
  // Handle pagination
  getPaginatedData: async (apiCall, page = 1, limit = 10, filters = {}) => {
    const params = {
      page,
      limit,
      ...filters,
    };
    
    try {
      const response = await apiCall(params);
      return {
        data: response.data.data || response.data,
        pagination: response.data.pagination || {
          page,
          limit,
          total: response.data.length,
        },
      };
    } catch (error) {
      console.error('Error fetching paginated data:', error);
      throw error;
    }
  },
};

export default api;
