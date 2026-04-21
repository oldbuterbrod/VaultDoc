import React from 'react';
import { BrowserRouter as Router, Navigate, Route, Routes } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import MainLayout from './layouts/MainLayout';
import DashboardPage from './pages/DashboardPage';
import ExplorerPage from './pages/ExplorerPage'
import LoginPage from './pages/LoginPage';
import PermissionsPage from './pages/PermissionsPage';
import AuditLogPage from './pages/AuditLogPage';

const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();

  if (loading) return <div className="page-loading">Загрузка...</div>;
  return isAuthenticated ? <>{children}</> : <Navigate to="/" replace />;
};

const AdminRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  return user?.role === 'admin' ? <>{children}</> : <Navigate to="/dashboard" replace />;
};

function App() {
  return (
    <Router>
      <AuthProvider>
        <Routes>
          <Route path="/" element={<LoginPage />} />

          <Route
            element={
              <ProtectedRoute>
                <MainLayout />
              </ProtectedRoute>
            }
          >
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/documents" element={<ExplorerPage />} />
            <Route
              path="/permissions"
              element={
                <AdminRoute>
                  <PermissionsPage />
                </AdminRoute>
              }
            />
            <Route
              path="/audit"
              element={
                <AdminRoute>
                  <AuditLogPage />
                </AdminRoute>
              }
            />
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </Router>
  );
}

export default App;