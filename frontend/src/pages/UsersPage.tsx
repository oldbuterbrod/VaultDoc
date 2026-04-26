import React, { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { userAPI } from '../services/api';
import { User, UserRole } from '../types';
import './UsersPage.css';

const roleLabels: Record<UserRole, string> = {
  admin: 'Администратор системы',
  security_admin: 'Администратор безопасности',
  developer: 'Разработчик',
  manager: 'Руководитель',
  employee: 'Сотрудник',
};

const UsersPage: React.FC = () => {
  const { user } = useAuth();

  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<UserRole>('employee');
  const [isActive, setIsActive] = useState(true);

  const [submitting, setSubmitting] = useState(false);
  const [togglingUserId, setTogglingUserId] = useState<string | null>(null);

  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const canCreateUsers = user?.role === 'admin';
  const canToggleUsers = user?.role === 'admin';

  const loadUsers = async () => {
    try {
      setLoading(true);
      setError('');
      const data = await userAPI.list();
      setUsers(data);
    } catch (e: any) {
      setError(e?.response?.data?.detail || 'Не удалось загрузить список пользователей');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  const sortedUsers = useMemo(() => {
    return [...users].sort((a, b) => {
      const left = `${a.full_name} ${a.email}`.toLowerCase();
      const right = `${b.full_name} ${b.email}`.toLowerCase();
      return left.localeCompare(right, 'ru');
    });
  }, [users]);

  const resetForm = () => {
    setFullName('');
    setEmail('');
    setPassword('');
    setRole('employee');
    setIsActive(true);
  };

  const handleCreateUser = async () => {
    try {
      setError('');
      setSuccess('');

      if (!fullName.trim() || !email.trim() || !password.trim()) {
        setError('Заполни ФИО, email и пароль');
        return;
      }

      setSubmitting(true);

      await userAPI.create({
        full_name: fullName.trim(),
        email: email.trim(),
        password: password.trim(),
        role,
        is_active: isActive,
      });

      setSuccess('Пользователь создан');
      resetForm();
      await loadUsers();
    } catch (e: any) {
      setError(e?.response?.data?.detail || 'Не удалось создать пользователя');
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleUser = async (targetUser: User) => {
    try {
      setError('');
      setSuccess('');
      setTogglingUserId(targetUser.public_id);

      await userAPI.setActive(targetUser.public_id, !targetUser.is_active);

      setSuccess(
        targetUser.is_active
          ? 'Пользователь деактивирован'
          : 'Пользователь активирован'
      );

      await loadUsers();
    } catch (e: any) {
      setError(e?.response?.data?.detail || 'Не удалось изменить статус пользователя');
    } finally {
      setTogglingUserId(null);
    }
  };

  return (
    <div className="users-page">
      <div className="users-page__header">
        <h1>Пользователи</h1>
        <p>Список пользователей системы и создание новых учётных записей.</p>
      </div>

      {error && <div className="users-page__alert users-page__alert--error">{error}</div>}
      {success && <div className="users-page__alert users-page__alert--success">{success}</div>}

      <div className="users-page__layout">
        <section className="users-page__card">
          <h2>Список пользователей</h2>

          {loading ? (
            <div className="users-page__empty">Загрузка...</div>
          ) : sortedUsers.length === 0 ? (
            <div className="users-page__empty">Пользователей пока нет</div>
          ) : (
            <div className="users-page__table-wrap">
              <table className="users-page__table">
                <thead>
                  <tr>
                    <th>ФИО</th>
                    <th>Email</th>
                    <th>Роль</th>
                    <th>Статус</th>
                    <th>Действие</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedUsers.map((item) => {
                    const isSelf = item.public_id === user?.public_id;
                    const isBusy = togglingUserId === item.public_id;

                    return (
                      <tr key={item.public_id}>
                        <td>{item.full_name}</td>
                        <td>{item.email}</td>
                        <td>{roleLabels[item.role]}</td>
                        <td>{item.is_active ? 'Активен' : 'Отключён'}</td>
                        <td>
                          {!canToggleUsers ? (
                            <span className="users-page__muted">Только просмотр</span>
                          ) : isSelf ? (
                            <span className="users-page__muted">Текущий пользователь</span>
                          ) : (
                            <button
                              type="button"
                              className={
                                item.is_active
                                  ? 'users-page__action users-page__action--danger'
                                  : 'users-page__action users-page__action--success'
                              }
                              disabled={isBusy}
                              onClick={() => handleToggleUser(item)}
                            >
                              {isBusy
                                ? 'Сохранение...'
                                : item.is_active
                                ? 'Отключить'
                                : 'Активировать'}
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <section className="users-page__card">
          <h2>Добавить пользователя</h2>

          {!canCreateUsers ? (
            <div className="users-page__empty">
              Создание пользователей доступно только администратору системы.
            </div>
          ) : (
            <div className="users-page__form">
              <label>
                <span>ФИО</span>
                <input
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Например: Иванов Иван Иванович"
                />
              </label>

              <label>
                <span>Email</span>
                <input
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="user@vaultdoc.ru"
                />
              </label>

              <label>
                <span>Пароль</span>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Пароль"
                />
              </label>

              <label>
                <span>Роль</span>
                <select value={role} onChange={(e) => setRole(e.target.value as UserRole)}>
                  <option value="employee">Сотрудник</option>
                  <option value="manager">Руководитель</option>
                  <option value="developer">Разработчик</option>
                  <option value="security_admin">Администратор безопасности</option>
                  <option value="admin">Администратор системы</option>
                </select>
              </label>

              <label className="users-page__checkbox">
                <input
                  type="checkbox"
                  checked={isActive}
                  onChange={(e) => setIsActive(e.target.checked)}
                />
                <span>Активная учётная запись</span>
              </label>

              <button
                type="button"
                className="users-page__submit"
                onClick={handleCreateUser}
                disabled={submitting}
              >
                {submitting ? 'Создание...' : 'Создать пользователя'}
              </button>
            </div>
          )}
        </section>
      </div>
    </div>
  );
};

export default UsersPage;