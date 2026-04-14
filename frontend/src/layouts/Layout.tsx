import React from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import './Layout.css';

const MainLayout: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const menuItems = [
    { id: 'dashboard', label: 'Главная', path: '/dashboard' },
    { id: 'documents', label: 'Документы', path: '/documents' },
    ...(user?.role === 'admin' 
      ? [{ id: 'users', label: 'Пользователи', path: '/users' }] 
      : []
    ),
  ];

  return (
    <div className="app-container">
      {/* Сайдбар */}
      <div className="sidebar">
        <div className="sidebar-header">
          <h1 className="logo">ДокХранилище</h1>
          <div className="user-info">
            <div className="user-name">{user?.email}</div>
            <div className="user-role">{user?.role}</div>
          </div>
        </div>
        
        <nav className="sidebar-nav">
          {menuItems.map((item) => (
            <button
              key={item.id}
              className="nav-button"
              onClick={() => navigate(item.path)}
            >
              {item.label}
            </button>
          ))}
        </nav>
        
        <div className="sidebar-footer">
          <button className="logout-button" onClick={logout}>
            Выйти
          </button>
        </div>
      </div>

      {/* Основной контент */}
      <div className="main-content">
        <div className="content-header">
          <h2>Система управления документами</h2>
        </div>
        <div className="content-body">
          <Outlet />
        </div>
      </div>
    </div>
  );
};

export default MainLayout;