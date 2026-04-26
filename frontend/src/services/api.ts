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
  baseURL: '',
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
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    });

    return response.data;
  },

  getMe: async (): Promise<User> => {
    const response = await api.get('/api/auth/me');
    return response.data;
  },
};

export const userAPI = {
  list: async (): Promise<User[]> => {
    const response = await api.get('/api/users/');
    return response.data;
  },

  create: async (payload: {
    email: string;
    full_name: string;
    password: string;
    role: 'admin' | 'security_admin' | 'developer' | 'manager' | 'employee';
    is_active: boolean;
  }): Promise<User> => {
    const response = await api.post('/api/users/', payload);
    return response.data;
  },

  setActive: async (userPublicId: string, isActive: boolean): Promise<User> => {
    const response = await api.patch(`/api/users/${userPublicId}/activation`, {
      is_active: isActive,
    });
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

  create: async (payload: {
    name: string;
    parent_public_id?: string | null;
  }): Promise<Folder> => {
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

  upload: async (payload: {
    file: File;
    title?: string;
    folder_public_id?: string | null;
  }): Promise<Document> => {
    const formData = new FormData();
    formData.append('file', payload.file);

    if (payload.title?.trim()) {
      formData.append('title', payload.title.trim());
    }

    if (payload.folder_public_id) {
      formData.append('folder_public_id', payload.folder_public_id);
    }

    const response = await api.post('/api/documents/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });

    return response.data;
  },

  download: async (documentPublicId: string): Promise<Blob> => {
  const response = await api.get(`/api/documents/${documentPublicId}/download`, {
    responseType: 'blob',
  });

  return response.data;
},
  delete: async (documentPublicId: string): Promise<void> => {
    await api.delete(`/api/documents/${documentPublicId}`);
  },
};

export const permissionAPI = {
  grantFolder: async (
    folderPublicId: string,
    payload: PermissionGrant
  ): Promise<FolderPermission> => {
    const response = await api.post(`/api/permissions/folders/${folderPublicId}`, payload);
    return response.data;
  },

  updateFolder: async (
    folderPublicId: string,
    payload: PermissionGrant
  ): Promise<FolderPermission> => {
    const response = await api.patch(`/api/permissions/folders/${folderPublicId}`, payload);
    return response.data;
  },

  revokeFolder: async (folderPublicId: string, userPublicId: string): Promise<void> => {
    await api.delete(`/api/permissions/folders/${folderPublicId}/${userPublicId}`);
  },

  grantDocument: async (
    documentPublicId: string,
    payload: PermissionGrant
  ): Promise<DocumentPermission> => {
    const response = await api.post(`/api/permissions/documents/${documentPublicId}`, payload);
    return response.data;
  },

  updateDocument: async (
    documentPublicId: string,
    payload: PermissionGrant
  ): Promise<DocumentPermission> => {
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
export const systemAPI = {
  health: async (): Promise<{ status?: string; [key: string]: any }> => {
    const response = await api.get('/health');
    return response.data;
  },

  pingAuth: async (): Promise<{ module: string }> => {
    const response = await api.get('/api/auth/ping');
    return response.data;
  },

  pingUsers: async (): Promise<{ module: string }> => {
    const response = await api.get('/api/users/ping');
    return response.data;
  },

  pingFolders: async (): Promise<{ module: string }> => {
    const response = await api.get('/api/folders/ping');
    return response.data;
  },

  pingDocuments: async (): Promise<{ module: string }> => {
    const response = await api.get('/api/documents/ping');
    return response.data;
  },

  pingPermissions: async (): Promise<{ module: string }> => {
    const response = await api.get('/api/permissions/ping');
    return response.data;
  },
};