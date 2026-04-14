import axios from 'axios';

const API_URL = 'http://localhost:8000';

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Добавляем токен к запросам
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Аутентификация
export const authAPI = {
  login: async (email: string, password: string) => {
    try {
      const response = await api.post('/api/auth/login_json', {
        email,
        password
      });
      console.log('Login response:', response.data);
      return response.data;
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    }
  },

  getMe: async () => {
    try {
      const response = await api.get('/api/auth/me');
      console.log('GetMe response:', response.data);
      return response.data;
    } catch (error) {
      console.error('GetMe error:', error);
      throw error;
    }
  },
};

// Документы
export const documentAPI = {
  // Получить все документы
  getDocuments: async () => {
    try {
      console.log('=== API CALL: GET /api/documents ===');
      const response = await api.get('/api/documents');
      
      // Обработка разных форматов ответа
      const data = response.data;
      if (data && Array.isArray(data.documents)) {
        console.log('API returned documents array');
        return data.documents;
      }
      if (Array.isArray(data)) {
        console.log('API returned array');
        return data;
      }
      return [];
    } catch (error) {
      console.error('Error fetching documents:', error);
      return [];
    }
  },

  // Получить документ по ID
  getDocumentById: async (id: number) => {
    try {
      console.log(`=== API CALL: GET /api/documents/${id} ===`);
      
      // 🔴 ПРОБЛЕМА: В Swagger endpoint `/api/documents/{document_id}` БЕЗ слеша
      // Пробуем сначала без слеша
      const response = await api.get(`/api/documents/${id}`);
      
      console.log('Full document response structure:', response.data);
      
      const data = response.data;
      if (data && data.document) {
        console.log('Returning data.document');
        return data.document;
      }
      if (data && data.data) {
        console.log('Returning data.data');
        return data.data;
      }
      return data;
      
    } catch (error: any) {
      console.error(`=== API ERROR: GET document ${id} ===`);
      console.error('Error message:', error.message);
      console.error('Error response data:', error.response?.data);
      console.error('Error response status:', error.response?.status);
      
      // 🔴 Пробуем со слешом если без не работает
      try {
        console.log('Trying with trailing slash...');
        const retryResponse = await api.get(`/api/documents/${id}/`);
        return retryResponse.data;
      } catch (retryError) {
        console.error('Both attempts failed');
        return null;
      }
    }
  },

  // 🔴 ИСПРАВЛЯЕМ: В Swagger POST /api/documents/ СО слешом
  createDocument: async (documentData: {
    title: string;
    content: string;
    folder_id?: number;
    status?: string;
  }) => {
    try {
      console.log('=== API CALL: POST /api/documents/ ===');
      console.log('Data to send:', documentData);
      
      // 🔴 ВАЖНО: URL заканчивается на /
      const response = await api.post('/api/documents/', documentData);
      console.log('Create document response:', response.data);
      
      const data = response.data;
      if (data && data.document) {
        return data.document;
      }
      if (data && data.data) {
        return data.data;
      }
      return data;
      
    } catch (error: any) {
      console.error('Error creating document:', error);
      console.error('Error response:', error.response?.data);
      
      // 🔴 Пробуем без слеша если со слешом не работает
      try {
        console.log('Trying without trailing slash...');
        const retryResponse = await api.post('/api/documents', documentData);
        return retryResponse.data;
      } catch (retryError) {
        // Бросаем оригинальную ошибку
        throw error;
      }
    }
  },

  // 🔴 ИСПРАВЛЯЕМ: В Swagger PUT /api/documents/{document_id} БЕЗ слеша
  updateDocument: async (id: number, documentData: {
    title?: string;
    content?: string;
    folder_id?: number;
    status?: string;
  }) => {
    try {
      console.log(`=== API CALL: PUT /api/documents/${id} ===`);
      console.log('Data to update:', documentData);
      
      // 🔴 ВАЖНО: URL БЕЗ слеша (согласно Swagger)
      const response = await api.put(`/api/documents/${id}`, documentData);
      console.log('Update document response:', response.data);
      
      const data = response.data;
      if (data && data.document) {
        return data.document;
      }
      if (data && data.data) {
        return data.data;
      }
      return data;
      
    } catch (error: any) {
      console.error(`Error updating document ${id}:`, error);
      console.error('Error response:', error.response?.data);
      
      // 🔴 Пробуем со слешом если без не работает
      try {
        console.log('Trying with trailing slash...');
        const retryResponse = await api.put(`/api/documents/${id}/`, documentData);
        return retryResponse.data;
      } catch (retryError) {
        throw error;
      }
    }
  },

  // 🔴 ИСПРАВЛЯЕМ: В Swagger DELETE /api/documents/{document_id} БЕЗ слеша
  deleteDocument: async (id: number) => {
    try {
      console.log(`=== API CALL: DELETE /api/documents/${id} ===`);
      
      // 🔴 ВАЖНО: URL БЕЗ слеша (согласно Swagger)
      const response = await api.delete(`/api/documents/${id}`);
      console.log('Delete document response:', response.data);
      
      return response.data;
      
    } catch (error: any) {
      console.error(`Error deleting document ${id}:`, error);
      console.error('Error response:', error.response?.data);
      
      // 🔴 Пробуем со слешом если без не работает
      try {
        console.log('Trying with trailing slash...');
        const retryResponse = await api.delete(`/api/documents/${id}/`);
        return retryResponse.data;
      } catch (retryError) {
        throw error;
      }
    }
  }
};

// Папки
export const folderAPI = {
  // Получить все папки
  getFolders: async () => {
    try {
      const response = await api.get('/api/folders');
      console.log('Folders response:', response.data);
      
      const data = response.data;
      if (Array.isArray(data)) {
        return data;
      }
      if (data && Array.isArray(data.folders)) {
        return data.folders;
      }
      if (data && Array.isArray(data.data)) {
        return data.data;
      }
      return [];
    } catch (error) {
      console.error('Error fetching folders:', error);
      return [];
    }
  },

  // 🔴 ИСПРАВЛЯЕМ: В Swagger POST /api/folders/ СО слешом
  createFolder: async (folderData: {
    name: string;
    parent_id?: number;
    description?: string;
  }) => {
    try {
      console.log('=== API CALL: POST /api/folders/ ===');
      console.log('Data to send:', folderData);
      
      // 🔴 ВАЖНО: URL заканчивается на /
      const response = await api.post('/api/folders/', folderData);
      console.log('Create folder response:', response.data);
      
      const data = response.data;
      if (data && data.folder) {
        return data.folder;
      }
      if (data && data.data) {
        return data.data;
      }
      return data;
      
    } catch (error: any) {
      console.error('Error creating folder:', error);
      console.error('Error response:', error.response?.data);
      
      // 🔴 Пробуем без слеша если со слешом не работает
      try {
        console.log('Trying without trailing slash...');
        const retryResponse = await api.post('/api/folders', folderData);
        return retryResponse.data;
      } catch (retryError) {
        throw error;
      }
    }
  },

  // 🔴 ИСПРАВЛЯЕМ: В Swagger PUT /api/folders/{folder_id} БЕЗ слеша
  updateFolder: async (id: number, folderData: {
    name?: string;
    parent_id?: number;
    description?: string;
  }) => {
    try {
      console.log(`=== API CALL: PUT /api/folders/${id} ===`);
      console.log('Data to update:', folderData);
      
      // 🔴 ВАЖНО: URL БЕЗ слеша (согласно Swagger)
      const response = await api.put(`/api/folders/${id}`, folderData);
      console.log('Update folder response:', response.data);
      
      const data = response.data;
      if (data && data.folder) {
        return data.folder;
      }
      if (data && data.data) {
        return data.data;
      }
      return data;
      
    } catch (error: any) {
      console.error(`Error updating folder ${id}:`, error);
      console.error('Error response:', error.response?.data);
      throw error;
    }
  },

  // 🔴 ИСПРАВЛЯЕМ: В Swagger DELETE /api/folders/{folder_id} БЕЗ слеша
  deleteFolder: async (id: number) => {
    try {
      console.log(`=== API CALL: DELETE /api/folders/${id} ===`);
      
      // 🔴 ВАЖНО: URL БЕЗ слеша (согласно Swagger)
      const response = await api.delete(`/api/folders/${id}`);
      console.log('Delete folder response:', response.data);
      
      return response.data;
      
    } catch (error: any) {
      console.error(`Error deleting folder ${id}:`, error);
      console.error('Error response:', error.response?.data);
      throw error;
    }
  },

  // Получение дерева папок (опционально)
  getFolderTree: async () => {
    try {
      console.log('=== API CALL: GET /api/folders/tree ===');
      
      try {
        const response = await api.get('/api/folders/tree');
        console.log('Folder tree response:', response.data);
        return response.data;
      } catch (error: any) {
        console.log('Folder tree endpoint not found, using flat list');
        const folders = await folderAPI.getFolders();
        
        // Преобразуем плоский список в дерево на клиенте
        const buildTree = (parentId: number | null = null) => {
          return folders
            .filter((folder: any) => folder.parent_id === parentId)
            .map((folder: any) => ({
              ...folder,
              children: buildTree(folder.id)
            }));
        };
        
        return buildTree();
      }
      
    } catch (error) {
      console.error('Error fetching folder tree:', error);
      return [];
    }
  }
};

// Пользователи
// services/api.ts - добавляем в userAPI

export const userAPI = {
  getUsers: async () => {
    try {
      const response = await api.get('/api/users');
      console.log('Users response:', response.data);
      
      const data = response.data;
      if (Array.isArray(data)) {
        return data;
      }
      if (data && Array.isArray(data.users)) {
        return data.users;
      }
      if (data && Array.isArray(data.data)) {
        return data.data;
      }
      return [];
    } catch (error) {
      console.error('Error fetching users:', error);
      return [];
    }
  },

  // 🔥 ДОБАВЛЯЕМ: Получить пользователя по ID
  getUserById: async (id: number) => {
    try {
      const response = await api.get(`/api/users/${id}`);
      console.log('User by ID response:', response.data);
      
      const data = response.data;
      if (data && data.user) {
        return data.user;
      }
      if (data && data.data) {
        return data.data;
      }
      return data;
      
    } catch (error) {
      console.error(`Error fetching user ${id}:`, error);
      throw error;
    }
  },

  // 🔥 ДОБАВЛЯЕМ: Создать пользователя (регистрация)
  createUser: async (userData: {
    email: string;
    password: string;
    full_name: string;
    role: string;
    is_active?: boolean;
  }) => {
    try {
      console.log('=== API CALL: POST /api/auth/register ===');
      console.log('Data to send:', userData);
      
      const response = await api.post('/api/auth/register', userData);
      console.log('Create user response:', response.data);
      
      const data = response.data;
      if (data && data.user) {
        return data.user;
      }
      if (data && data.data) {
        return data.data;
      }
      return data;
      
    } catch (error: any) {
      console.error('Error creating user:', error);
      console.error('Error response:', error.response?.data);
      throw error;
    }
  },

  // 🔥 ДОБАВЛЯЕМ: Обновить пользователя
  updateUser: async (id: number, userData: {
    email?: string;
    password?: string;
    full_name?: string;
    role?: string;
    is_active?: boolean;
  }) => {
    try {
      console.log(`=== API CALL: PUT /api/users/${id} ===`);
      console.log('Data to update:', userData);
      
      const response = await api.put(`/api/users/${id}`, userData);
      console.log('Update user response:', response.data);
      
      const data = response.data;
      if (data && data.user) {
        return data.user;
      }
      if (data && data.data) {
        return data.data;
      }
      return data;
      
    } catch (error: any) {
      console.error(`Error updating user ${id}:`, error);
      console.error('Error response:', error.response?.data);
      throw error;
    }
  },

  // 🔥 ДОБАВЛЯЕМ: Удалить пользователя
  deleteUser: async (id: number) => {
    try {
      console.log(`=== API CALL: DELETE /api/users/${id} ===`);
      
      const response = await api.delete(`/api/users/${id}`);
      console.log('Delete user response:', response.data);
      
      return response.data;
      
    } catch (error: any) {
      console.error(`Error deleting user ${id}:`, error);
      console.error('Error response:', error.response?.data);
      throw error;
    }
  }
};
// Статистика
export const statisticsAPI = {
  getStatistics: async () => {
    try {
      const response = await api.get('/api/statistics');
      console.log('Statistics response:', response.data);
      
      const data = response.data;
      return {
        total_users: data?.total_users || data?.users_count || 0,
        total_documents: data?.total_documents || data?.documents_count || 0,
        total_folders: data?.total_folders || data?.folders_count || 0,
        storage_used_mb: data?.storage_used_mb || data?.storage_mb || 0
      };
    } catch (error) {
      console.error('Error fetching statistics:', error);
      return {
        total_users: 0,
        total_documents: 0,
        total_folders: 0,
        storage_used_mb: 0
      };
    }
  },
};

export default api;