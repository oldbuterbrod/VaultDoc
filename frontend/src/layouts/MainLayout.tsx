import React from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import './MainLayout.css';

const MainLayout: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const menuItems = [
    { label: 'Главная', path: '/dashboard' },
    { label: 'Проводник', path: '/documents' },
    ...(user?.role === 'admin'
      ? [
          { label: 'Права доступа', path: '/permissions' },
          { label: 'Журнал аудита', path: '/audit' },
        ]
      : []),
  ];

  const roleLabel =
    user?.role === 'admin'
      ? 'Администратор'
      : user?.role === 'manager'
      ? 'Менеджер'
      : 'Сотрудник';

  return (
    <div className="layout">
      <aside className="layout__sidebar">
        <div className="layout__brand">VaultDoc</div>

        <div className="layout__user">
          <div className="layout__user-name">{user?.full_name}</div>
          <div className="layout__user-role">{roleLabel}</div>
          <div className="layout__user-email">{user?.email}</div>
        </div>

        <nav className="layout__nav">
          {menuItems.map((item) => (
            <button
              key={item.path}
              className={`layout__nav-btn ${location.pathname === item.path ? 'layout__nav-btn--active' : ''}`}
              onClick={() => navigate(item.path)}
            >
              {item.label}
            </button>
          ))}
        </nav>

        <button className="layout__logout" onClick={logout}>
          Выйти
        </button>
      </aside>

      <main className="layout__content">
        <Outlet />
      </main>
    </div>
  );
};

export default MainLayout;