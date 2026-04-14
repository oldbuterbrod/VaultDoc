export interface User {
  id: number;
  email: string;
  full_name: string;
  role: 'employee' | 'manager' | 'admin';
  is_active: boolean;
  created_at: string;
}

export interface Folder {
  id: number;
  name: string;
  owner_id: number;
  parent_id?: number;
  created_at: string;
  updated_at: string;
}

export interface Document {
  id: number;
  title: string;
  content_preview?: string; // Изменили с content на content_preview
  content?: string; // Оставляем на случай если полное содержание будет в другом поле
  folder_id?: number;
  folder_name?: string;
  owner_id: number;
  owner_name?: string;
  status: 'draft' | 'under_review' | 'approved' | 'rejected';
  created_at: string;
  updated_at: string;
}

export interface Permission {
  id: number;
  user_id: number;
  entity_type: 'folder' | 'document';
  entity_id: number;
  can_view: boolean;
  can_edit: boolean;
  can_delete: boolean;
  can_manage_access: boolean;
  granted_by?: number;
  granted_at: string;
}

export interface DocumentComment {
  id: number;
  document_id: number;
  user_id: number;
  comment: string;
  created_at: string;
}

export interface Statistics {
  total_users?: number;
  total_documents?: number;
  total_folders?: number;
  storage_used_mb?: number;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterData {
  email: string;
  password: string;
  full_name: string;
  role?: 'employee' | 'manager' | 'admin';
}

export interface AuthResponse {
  access_token: string;
  token_type: string;
}

export interface ApiError {
  detail: string;
}