import React from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import './MainLayout.css';

const MainLayout: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

    const canUseExplorer =
    user?.role === 'admin' ||
    user?.role === 'manager' ||
    user?.role === 'employee';

  const canUseUsers =
    user?.role === 'admin' ||
    user?.role === 'security_admin';

  const canUsePermissions =
    user?.role === 'admin' ||
    user?.role === 'security_admin';

  const canUseAudit =
    user?.role === 'admin' ||
    user?.role === 'security_admin';

  const canUseSystemStatus =
    user?.role === 'admin' ||
    user?.role === 'developer';

  const menuItems = [
    { label: 'Главная', path: '/dashboard' },
    ...(canUseExplorer ? [{ label: 'Проводник', path: '/documents' }] : []),
    ...(canUseUsers ? [{ label: 'Пользователи', path: '/users' }] : []),
    ...(canUsePermissions ? [{ label: 'Права доступа', path: '/permissions' }] : []),
    ...(canUseAudit ? [{ label: 'Журнал аудита', path: '/audit' }] : []),
    ...(canUseSystemStatus ? [{ label: 'Системное состояние', path: '/system-status' }] : []),
  ];
  const roleLabel =
    user?.role === 'admin'
      ? 'Администратор системы'
      : user?.role === 'security_admin'
      ? 'Администратор безопасности'
      : user?.role === 'developer'
      ? 'Разработчик'
      : user?.role === 'manager'
      ? 'Руководитель'
      : 'Сотрудник';

  return (
    <div className="layout">
      <aside className="layout__sidebar">
        <div className="layout__brand">ДокХранилище</div>

        <div className="layout__user-card">
          <div className="layout__user-name">{user?.full_name}</div>
          <div className="layout__user-role">{roleLabel}</div>
          <div className="layout__user-email">{user?.email}</div>
        </div>

        <nav className="layout__nav">
          {menuItems.map((item) => (
            <button
              key={item.path}
              className={`layout__nav-item ${
                location.pathname === item.path ? 'layout__nav-item--active' : ''
              }`}
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