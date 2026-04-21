import axios from 'axios';
import {
  AuditLogEntry,
  AuthResponse,
  Document,
  DocumentPermission,
  Folder,
  FolderPermission,
  PermissionGrant,
  User,
} from '../types';

const api = axios.create({
  baseURL: 'http://127.0.0.1:8000',
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error?.response?.status === 401) {
      localStorage.removeItem('access_token');
      localStorage.removeItem('user');
    }
    return Promise.reject(error);
  }
);

export const authAPI = {
  login: async (email: string, password: string): Promise<AuthResponse> => {
    const body = new URLSearchParams();
    body.append('username', email);
    body.append('password', password);

    const response = await api.post('/api/auth/login', body, {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    });

    return response.data;
  },

  getMe: async (): Promise<User> => {
    const response = await api.get('/api/auth/me');
    return response.data;
  },
};

export const folderAPI = {
  list: async (): Promise<Folder[]> => {
    const response = await api.get('/api/folders/');
    return response.data;
  },

  get: async (folderPublicId: string): Promise<Folder> => {
    const response = await api.get(`/api/folders/${folderPublicId}`);
    return response.data;
  },

  create: async (payload: { name: string; parent_public_id?: string | null }): Promise<Folder> => {
    const response = await api.post('/api/folders/', {
      name: payload.name,
      parent_public_id: payload.parent_public_id ?? null,
    });
    return response.data;
  },

  delete: async (folderPublicId: string): Promise<void> => {
    await api.delete(`/api/folders/${folderPublicId}`);
  },
};

export const documentAPI = {
  list: async (): Promise<Document[]> => {
    const response = await api.get('/api/documents/');
    return response.data;
  },

  get: async (documentPublicId: string): Promise<Document> => {
    const response = await api.get(`/api/documents/${documentPublicId}`);
    return response.data;
  },

  create: async (payload: {
    title: string;
    content?: string | null;
    file_name?: string | null;
    mime_type?: string | null;
    folder_public_id?: string | null;
  }): Promise<Document> => {
    const response = await api.post('/api/documents/', {
      title: payload.title,
      content: payload.content ?? null,
      file_name: payload.file_name ?? null,
      mime_type: payload.mime_type ?? null,
      folder_public_id: payload.folder_public_id ?? null,
    });
    return response.data;
  },

  delete: async (documentPublicId: string): Promise<void> => {
    await api.delete(`/api/documents/${documentPublicId}`);
  },
};

export const permissionAPI = {
  grantFolder: async (folderPublicId: string, payload: PermissionGrant): Promise<FolderPermission> => {
    const response = await api.post(`/api/permissions/folders/${folderPublicId}`, payload);
    return response.data;
  },

  updateFolder: async (folderPublicId: string, payload: PermissionGrant): Promise<FolderPermission> => {
    const response = await api.patch(`/api/permissions/folders/${folderPublicId}`, payload);
    return response.data;
  },

  revokeFolder: async (folderPublicId: string, userPublicId: string): Promise<void> => {
    await api.delete(`/api/permissions/folders/${folderPublicId}/${userPublicId}`);
  },

  grantDocument: async (documentPublicId: string, payload: PermissionGrant): Promise<DocumentPermission> => {
    const response = await api.post(`/api/permissions/documents/${documentPublicId}`, payload);
    return response.data;
  },

  updateDocument: async (documentPublicId: string, payload: PermissionGrant): Promise<DocumentPermission> => {
    const response = await api.patch(`/api/permissions/documents/${documentPublicId}`, payload);
    return response.data;
  },

  revokeDocument: async (documentPublicId: string, userPublicId: string): Promise<void> => {
    await api.delete(`/api/permissions/documents/${documentPublicId}/${userPublicId}`);
  },
};

export const auditAPI = {
  list: async (limit = 100): Promise<AuditLogEntry[]> => {
    const response = await api.get(`/api/audit/?limit=${limit}`);
    return response.data;
  },
};  