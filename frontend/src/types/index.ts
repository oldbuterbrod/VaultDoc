export type UserRole = 'admin' | 'manager' | 'employee';

export interface User {
  public_id: string;
  email: string;
  full_name: string;
  role: UserRole;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface AuthResponse {
  access_token: string;
  token_type: string;
  user: User;
}

export interface Folder {
  id: number;
  public_id: string;
  name: string;
  owner_id: number;
  parent_id: number | null;
  created_at: string;
  updated_at: string;
}

export interface Document {
  id: number;
  public_id: string;
  title: string;
  folder_id: number | null;
  owner_id: number;
  content: string | null;
  file_name: string | null;
  mime_type: string | null;
  created_at: string;
  updated_at: string;
}

export interface PermissionGrant {
  user_public_id: string;
  can_read: boolean;
  can_update: boolean;
  can_delete: boolean;
  can_manage_access: boolean;
}

export interface FolderPermission {
  user_id: number;
  folder_id: number;
  granted_by: number;
  can_read: boolean;
  can_update: boolean;
  can_delete: boolean;
  can_manage_access: boolean;
  granted_at: string;
}

export interface DocumentPermission {
  user_id: number;
  document_id: number;
  granted_by: number;
  can_read: boolean;
  can_update: boolean;
  can_delete: boolean;
  can_manage_access: boolean;
  granted_at: string;
}

export interface AuditLogEntry {
  id: number;
  actor_user_id: number | null;
  action: string;
  resource_type: string;
  resource_id: number | null;
  resource_public_id: string | null;
  success: boolean;
  ip_address: string | null;
  user_agent: string | null;
  details: Record<string, unknown>;
  created_at: string;
}