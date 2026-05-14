import React from 'react';
import { useAuth } from '../context/AuthContext';
import './DashboardPage.css';

const DashboardPage: React.FC = () => {
  const { user } = useAuth();

  const getRoleLabel = (role?: string) => {
    switch (role) {
      case 'admin':
        return 'Администратор системы';
      case 'security_admin':
        return 'Администратор безопасности';
      case 'developer':
        return 'Разработчик';
      case 'manager':
        return 'Руководитель';
      case 'employee':
        return 'Сотрудник';
      default:
        return role ?? '-';
    }
  };

  return (
    <div className="dashboard-page">
      <div className="dashboard-page__header">
        <h1 className="dashboard-page__title">Главная</h1>
        <p className="dashboard-page__subtitle">
          VaultDoc — защищённый корпоративный веб-сервис для хранения документов,
          управления доступом к папкам и документам, а также контроля действий пользователей.
        </p>
      </div>

      <div className="dashboard-page__grid">
        <section className="dashboard-page__card">
          <h2>Текущий пользователь</h2>

          <div className="dashboard-page__info-list">
            <div className="dashboard-page__info-row">
              <span className="dashboard-page__label">ФИО</span>
              <span>{user?.full_name || '-'}</span>
            </div>

            <div className="dashboard-page__info-row">
              <span className="dashboard-page__label">Email</span>
              <span>{user?.email || '-'}</span>
            </div>

            <div className="dashboard-page__info-row">
              <span className="dashboard-page__label">Роль</span>
              <span>{getRoleLabel(user?.role)}</span>
            </div>

            <div className="dashboard-page__info-row">
              <span className="dashboard-page__label">Статус</span>
              <span>{user?.is_active ? 'Активен' : 'Неактивен'}</span>
            </div>
          </div>
        </section>

        <section className="dashboard-page__card">
          <h2>Назначение системы</h2>

          <p className="dashboard-page__text">
            Система предназначена для централизованного хранения документов,
            разграничения доступа к ресурсам на уровне папок и документов,
            а также регистрации значимых событий безопасности в журнале аудита.
          </p>
        </section>
      </div>
    </div>
  );
};

export default DashboardPage;