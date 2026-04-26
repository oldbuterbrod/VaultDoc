import React from 'react';
import { BrowserRouter as Router, Navigate, Route, Routes } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import MainLayout from './layouts/MainLayout';
import DashboardPage from './pages/DashboardPage';
import ExplorerPage from './pages/ExplorerPage';
import LoginPage from './pages/LoginPage';
import PermissionsPage from './pages/PermissionsPage';
import AuditLogPage from './pages/AuditLogPage';
import UsersPage from './pages/UsersPage';
import SystemStatusPage from './pages/SystemStatusPage';
import { UserRole } from './types';

const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return <div>Загрузка...</div>;
  }

  return isAuthenticated ? <>{children}</> : <Navigate to="/" replace />;
};

const RoleRoute: React.FC<{
  children: React.ReactNode;
  allowedRoles: UserRole[];
}> = ({ children, allowedRoles }) => {
  const { user, isAuthenticated, loading } = useAuth();

  if (loading) {
    return <div>Загрузка...</div>;
  }

  if (!isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  return user && allowedRoles.includes(user.role) ? (
    <>{children}</>
  ) : (
    <Navigate to="/dashboard" replace />
  );
};

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/" element={<LoginPage />} />

          <Route
            path="/"
            element={
              <ProtectedRoute>
                <MainLayout />
              </ProtectedRoute>
            }
          >
            <Route path="dashboard" element={<DashboardPage />} />

            <Route
              path="documents"
              element={
                <RoleRoute allowedRoles={['admin', 'manager', 'employee']}>
                  <ExplorerPage />
                </RoleRoute>
              }
            />

            <Route
              path="users"
              element={
                <RoleRoute allowedRoles={['admin', 'security_admin']}>
                  <UsersPage />
                </RoleRoute>
              }
            />

            <Route
              path="permissions"
              element={
                <RoleRoute allowedRoles={['admin', 'security_admin']}>
                  <PermissionsPage />
                </RoleRoute>
              }
            />
            <Route
              path="system-status"
              element={
                <RoleRoute allowedRoles={['admin', 'developer']}>
                <SystemStatusPage />
                </RoleRoute>
                }
            />

            <Route
              path="audit"
              element={
                <RoleRoute allowedRoles={['admin', 'security_admin']}>
                  <AuditLogPage />
                </RoleRoute>
              }
            />
          </Route>

          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;