import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { systemAPI } from '../services/api';
import './SystemStatusPage.css';

type ModuleStatus = {
  key: string;
  title: string;
  ok: boolean;
  details: string;
};

const SystemStatusPage: React.FC = () => {
  const { user } = useAuth();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [healthOk, setHealthOk] = useState(false);
  const [healthText, setHealthText] = useState('—');
  const [modules, setModules] = useState<ModuleStatus[]>([]);

  useEffect(() => {
    const loadStatus = async () => {
      try {
        setLoading(true);
        setError('');

        const results = await Promise.allSettled([
          systemAPI.health(),
          systemAPI.pingAuth(),
          systemAPI.pingUsers(),
          systemAPI.pingFolders(),
          systemAPI.pingDocuments(),
          systemAPI.pingPermissions(),
        ]);

        const [
          healthResult,
          authResult,
          usersResult,
          foldersResult,
          documentsResult,
          permissionsResult,
        ] = results;

        if (healthResult.status === 'fulfilled') {
          setHealthOk(true);
          setHealthText(healthResult.value?.status || 'ok');
        } else {
          setHealthOk(false);
          setHealthText('error');
        }

        const nextModules: ModuleStatus[] = [
          {
            key: 'auth',
            title: 'Аутентификация',
            ok: authResult.status === 'fulfilled',
            details:
              authResult.status === 'fulfilled'
                ? authResult.value.module
                : 'Недоступно',
          },
          {
            key: 'users',
            title: 'Пользователи',
            ok: usersResult.status === 'fulfilled',
            details:
              usersResult.status === 'fulfilled'
                ? usersResult.value.module
                : 'Недоступно',
          },
          {
            key: 'folders',
            title: 'Папки',
            ok: foldersResult.status === 'fulfilled',
            details:
              foldersResult.status === 'fulfilled'
                ? foldersResult.value.module
                : 'Недоступно',
          },
          {
            key: 'documents',
            title: 'Документы',
            ok: documentsResult.status === 'fulfilled',
            details:
              documentsResult.status === 'fulfilled'
                ? documentsResult.value.module
                : 'Недоступно',
          },
          {
            key: 'permissions',
            title: 'Права доступа',
            ok: permissionsResult.status === 'fulfilled',
            details:
              permissionsResult.status === 'fulfilled'
                ? permissionsResult.value.module
                : 'Недоступно',
          },
        ];

        setModules(nextModules);
      } catch (e: any) {
        setError(e?.response?.data?.detail || 'Не удалось загрузить системное состояние');
      } finally {
        setLoading(false);
      }
    };

    loadStatus();
  }, []);

  return (
    <div className="system-status">
      <div className="system-status__header">
        <h1>Системное состояние</h1>
        <p>
          Техническая страница контроля доступности сервиса и основных модулей.
        </p>
      </div>

      {error && <div className="system-status__alert system-status__alert--error">{error}</div>}

      {loading ? (
        <div className="system-status__card">Загрузка статуса...</div>
      ) : (
        <>
          <div className="system-status__grid">
            <section className="system-status__card">
              <h2>Общий статус backend</h2>
              <div className="system-status__status-row">
                <span className="system-status__label">Health</span>
                <span
                  className={
                    healthOk
                      ? 'system-status__badge system-status__badge--ok'
                      : 'system-status__badge system-status__badge--error'
                  }
                >
                  {healthText}
                </span>
              </div>
            </section>

            <section className="system-status__card">
              <h2>Текущий пользователь</h2>
              <div className="system-status__info-row">
                <span className="system-status__label">ФИО</span>
                <span>{user?.full_name || '—'}</span>
              </div>
              <div className="system-status__info-row">
                <span className="system-status__label">Email</span>
                <span>{user?.email || '—'}</span>
              </div>
              <div className="system-status__info-row">
                <span className="system-status__label">Роль</span>
                <span>{user?.role || '—'}</span>
              </div>
            </section>
          </div>

          <section className="system-status__card">
            <h2>Состояние модулей API</h2>

            <div className="system-status__modules">
              {modules.map((item) => (
                <div key={item.key} className="system-status__module">
                  <div className="system-status__module-head">
                    <div className="system-status__module-title">{item.title}</div>
                    <span
                      className={
                        item.ok
                          ? 'system-status__badge system-status__badge--ok'
                          : 'system-status__badge system-status__badge--error'
                      }
                    >
                      {item.ok ? 'OK' : 'ERROR'}
                    </span>
                  </div>
                  <div className="system-status__module-details">{item.details}</div>
                </div>
              ))}
            </div>
          </section>
        </>
      )}
    </div>
  );
};

export default SystemStatusPage;