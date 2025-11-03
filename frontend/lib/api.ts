/**
 * API client for Crux backend
 */

import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

// Create axios instance
export const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add auth token to requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('crux_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Auth endpoints
export const authAPI = {
  signup: (data: { email: string; password: string; username: string }) =>
    api.post('/api/auth/signup', data),
  
  login: (data: { email: string; password: string }) =>
    api.post('/api/auth/login', data),
  
  getMe: () => api.get('/api/auth/me'),
};

// User endpoints
export const userAPI = {
  getByUsername: (username: string) =>
    api.get(`/api/users/${username}`),
  
  getProfile: (username: string) =>
    api.get(`/api/users/${username}/profile`),
  
  updateProfile: (data: any) =>
    api.put('/api/users/profile', data),
  
  update: (username: string, data: { profile_visibility?: string }) =>
    api.put(`/api/users/${username}`, data),
};

// Graph endpoints
export const graphAPI = {
  getGraph: (username: string) =>
    api.get(`/api/users/${username}/graph`),
  
  createProject: (username: string, data: any) =>
    api.post(`/api/users/${username}/projects`, data),
  
  createSkill: (username: string, data: any) =>
    api.post(`/api/users/${username}/skills`, data),
  
  createExperience: (username: string, data: any) =>
    api.post(`/api/users/${username}/experience`, data),
  
  deleteNode: (username: string, nodeId: string) =>
    api.delete(`/api/users/${username}/nodes/${nodeId}`),
};

// Integration endpoints
export const integrationAPI = {
  githubAuthorize: () =>
    api.get('/api/integrations/github/authorize'),
  
  githubCallback: (data: { code: string; state?: string }) =>
    api.post('/api/integrations/github/callback', data),
  
  githubSync: () =>
    api.post('/api/integrations/github/sync'),
  
  githubDisconnect: () =>
    api.post('/api/integrations/github/disconnect'),
  
  getGitHubRepositories: (username: string, owner?: string) =>
    api.get(`/api/integrations/github/${username}/repositories`, { params: { owner } }),
  
  getGitHubMonthlyAnalytics: (username: string, params?: {
    repo_ids?: string;
    start_year?: number;
    start_month?: number;
    aggregate?: boolean;
  }) =>
    api.get(`/api/integrations/github/${username}/analytics/monthly`, { params }),
};

// AI endpoints
export const aiAPI = {
  generateSummary: (username: string) =>
    api.post(`/api/users/${username}/summarize`),
  
  getSummary: (username: string) =>
    api.get(`/api/users/${username}/summary`),
};
