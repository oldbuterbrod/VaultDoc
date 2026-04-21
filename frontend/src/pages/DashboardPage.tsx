import React from 'react';
import { useAuth } from '../context/AuthContext';

const DashboardPage: React.FC = () => {
  const { user } = useAuth();

  const getRoleLabel = (role?: string) => {
    switch (role) {
      case 'admin':
        return 'Администратор';
      case 'manager':
        return 'Менеджер';
      case 'employee':
        return 'Сотрудник';
      default:
        return role ?? '-';
    }
  };

  return (
    <div style={{ padding: '20px' }}>
      <h1 style={{ color: '#2C3E50', marginBottom: '20px' }}>Главная</h1>

      <div
        style={{
          backgroundColor: 'white',
          padding: '24px',
          borderRadius: '10px',
          boxShadow: '0 2px 10px rgba(0,0,0,0.08)',
          marginBottom: '20px',
        }}
      >
        <h2 style={{ marginTop: 0 }}>Текущий пользователь</h2>

        <div style={{ display: 'grid', gap: '12px' }}>
          <div>
            <strong>ФИО:</strong> {user?.full_name}
          </div>
          <div>
            <strong>Email:</strong> {user?.email}
          </div>
          <div>
            <strong>Роль:</strong> {getRoleLabel(user?.role)}
          </div>
          <div>
            <strong>Статус:</strong> {user?.is_active ? 'Активен' : 'Неактивен'}
          </div>
          <div>
            <strong>Public ID:</strong> {user?.public_id}
          </div>
        </div>
      </div>

      <div
        style={{
          backgroundColor: 'white',
          padding: '24px',
          borderRadius: '10px',
          boxShadow: '0 2px 10px rgba(0,0,0,0.08)',
        }}
      >
        <h2 style={{ marginTop: 0 }}>Назначение панели</h2>
        <p style={{ marginBottom: 8 }}>
          Этот интерфейс нужен для демонстрации:
        </p>
        <ul style={{ marginTop: 0, paddingLeft: '20px' }}>
          <li>авторизации и ролей;</li>
          <li>работы с папками и документами;</li>
          <li>серверной проверки доступа;</li>
          <li>выдачи и отзыва прав доступа.</li>
        </ul>
      </div>
    </div>
  );
};

export default DashboardPage;
