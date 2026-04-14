import React from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

interface MainLayoutProps {
  children?: React.ReactNode;
}

const MainLayout: React.FC<MainLayoutProps> = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const menuItems = [
    { id: 'dashboard', label: 'Главная', path: '/dashboard' },
    { id: 'documents', label: 'Документы', path: '/documents' },
    ...(user?.role === 'admin' 
      ? [{ id: 'users', label: 'Пользователи', path: '/users' }] 
      : []
    ),
  ];

  const isActive = (path: string) => location.pathname === path;

  return (
    <div style={{ 
      display: 'flex',
      minHeight: '100vh'
    }}>
      {/* Сайдбар */}
      <div style={{
        width: '250px',
        backgroundColor: '#2C3E50',
        color: 'white',
        padding: '20px',
        display: 'flex',
        flexDirection: 'column'
      }}>
        <h2 style={{ marginBottom: '30px' }}>ДокХранилище</h2>
        
        <div style={{ marginBottom: '20px' }}>
          <div style={{ fontWeight: '500' }}>{user?.full_name}</div>
          <div style={{ fontSize: '14px', color: '#95a5a6' }}>
            {user?.role === 'admin' ? 'Администратор' : 
             user?.role === 'manager' ? 'Менеджер' : 
             user?.role === 'employee' ? 'Сотрудник' : 
             user?.role}
          </div>
        </div>
        
        <nav style={{ flex: 1, marginBottom: '20px' }}>
          {menuItems.map((item) => (
            <button
              key={item.id}
              onClick={() => navigate(item.path)}
              style={{
                width: '100%',
                padding: '12px 15px',
                backgroundColor: isActive(item.path) ? 'rgba(255, 255, 255, 0.2)' : 'transparent',
                color: 'white',
                border: 'none',
                textAlign: 'left',
                cursor: 'pointer',
                marginBottom: '5px',
                borderRadius: '5px',
                fontSize: '16px',
                transition: 'background-color 0.3s',
                fontWeight: isActive(item.path) ? '600' : 'normal'
              }}
              onMouseEnter={(e) => {
                if (!isActive(item.path)) {
                  e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.1)';
                }
              }}
              onMouseLeave={(e) => {
                if (!isActive(item.path)) {
                  e.currentTarget.style.backgroundColor = 'transparent';
                }
              }}
            >
              {item.label}
            </button>
          ))}
        </nav>
        
        <button 
          onClick={logout}
          style={{
            width: '100%',
            padding: '12px',
            backgroundColor: '#e74c3c',
            color: 'white',
            border: 'none',
            borderRadius: '5px',
            cursor: 'pointer',
            fontSize: '16px',
            fontWeight: '500',
            transition: 'background-color 0.3s'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = '#c0392b';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = '#e74c3c';
          }}
        >
          Выйти
        </button>
      </div>
      
      {/* Основной контент */}
      <div style={{ 
        flex: 1,
        padding: '30px',
        backgroundColor: '#f5f5f5'
      }}>
        <Outlet /> {/* Здесь будут рендериться страницы */}
      </div>
    </div>
  );
};

export default MainLayout;