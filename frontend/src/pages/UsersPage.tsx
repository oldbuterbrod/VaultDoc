import React, { useState, useEffect } from 'react';
import { userAPI } from '../services/api';

interface User {
  id: number;
  email: string;
  full_name: string;
  role: string;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
}

interface UserFormData {
  email: string;
  password: string;
  full_name: string;
  role: string;
  is_active: boolean;
}

const UsersPage: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Состояния для модальных окон
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  
  // Форма
  const [userForm, setUserForm] = useState<UserFormData>({
    email: '',
    password: '',
    full_name: '',
    role: 'employee',
    is_active: true
  });
  
  // Состояния для фильтрации и поиска
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const data = await userAPI.getUsers();
      setUsers(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Error fetching users:', error);
      setUsers([]);
    } finally {
      setLoading(false);
    }
  };

  // 🔥 ОБРАБОТЧИКИ CRUD

  // Создание пользователя
  const handleCreateUser = () => {
    setUserForm({
      email: '',
      password: '',
      full_name: '',
      role: 'employee',
      is_active: true
    });
    setShowCreateModal(true);
  };

  // Редактирование пользователя
  const handleEditUser = (user: User) => {
    setSelectedUser(user);
    setUserForm({
      email: user.email,
      password: '', // Пароль не показываем при редактировании
      full_name: user.full_name || '',
      role: user.role,
      is_active: user.is_active
    });
    setShowEditModal(true);
  };

  // Удаление пользователя
  const handleDeleteUser = (user: User) => {
    setSelectedUser(user);
    setShowDeleteConfirm(true);
  };

  // Сохранение нового пользователя
  const handleSaveCreate = async () => {
    try {
      // Валидация
      if (!userForm.email || !userForm.password || !userForm.full_name) {
        alert('Заполните все обязательные поля');
        return;
      }
      
      await userAPI.createUser(userForm);
      
      // Обновляем список
      await fetchUsers();
      
      // Закрываем модальное окно
      setShowCreateModal(false);
      
      alert('Пользователь успешно создан');
      
    } catch (error: any) {
      console.error('Error creating user:', error);
      const errorMessage = error.response?.data?.detail || 
                          error.response?.data?.message || 
                          'Ошибка при создании пользователя';
      alert(`Ошибка: ${errorMessage}`);
    }
  };

  // Сохранение изменений
  const handleSaveEdit = async () => {
    if (!selectedUser) return;
    
    try {
      // Подготавливаем данные для обновления
      const updateData: any = {
        full_name: userForm.full_name,
        role: userForm.role,
        is_active: userForm.is_active
      };
      
      // Если email изменился
      if (userForm.email !== selectedUser.email) {
        updateData.email = userForm.email;
      }
      
      // Если указан новый пароль
      if (userForm.password) {
        updateData.password = userForm.password;
      }
      
      await userAPI.updateUser(selectedUser.id, updateData);
      
      // Обновляем список
      await fetchUsers();
      
      // Закрываем модальное окно
      setShowEditModal(false);
      setSelectedUser(null);
      
      alert('Пользователь успешно обновлен');
      
    } catch (error: any) {
      console.error('Error updating user:', error);
      const errorMessage = error.response?.data?.detail || 
                          error.response?.data?.message || 
                          'Ошибка при обновлении пользователя';
      alert(`Ошибка: ${errorMessage}`);
    }
  };

  // Подтверждение удаления
  const confirmDelete = async () => {
    if (!selectedUser) return;
    
    try {
      await userAPI.deleteUser(selectedUser.id);
      
      // Обновляем список
      await fetchUsers();
      
      // Закрываем модальное окно
      setShowDeleteConfirm(false);
      setSelectedUser(null);
      
      alert('Пользователь успешно удален');
      
    } catch (error: any) {
      console.error('Error deleting user:', error);
      const errorMessage = error.response?.data?.detail || 
                          error.response?.data?.message || 
                          'Ошибка при удалении пользователя';
      alert(`Ошибка: ${errorMessage}`);
    }
  };

  // Вспомогательные функции
  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'admin': return 'Администратор';
      case 'manager': return 'Менеджер';
      case 'employee': return 'Сотрудник';
      default: return role;
    }
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'admin': return '#e74c3c';
      case 'manager': return '#3498db';
      case 'employee': return '#2ecc71';
      default: return '#95a5a6';
    }
  };

  // Фильтрация пользователей
  const filteredUsers = users.filter(user => {
    // Поиск по имени и email
    const matchesSearch = searchTerm === '' || 
      user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (user.full_name && user.full_name.toLowerCase().includes(searchTerm.toLowerCase()));
    
    // Фильтр по роли
    const matchesRole = roleFilter === 'all' || user.role === roleFilter;
    
    // Фильтр по статусу
    const matchesStatus = statusFilter === 'all' || 
      (statusFilter === 'active' && user.is_active) ||
      (statusFilter === 'inactive' && !user.is_active);
    
    return matchesSearch && matchesRole && matchesStatus;
  });

  // Статистика
  const stats = {
    total: users.length,
    admins: users.filter(u => u.role === 'admin').length,
    managers: users.filter(u => u.role === 'manager').length,
    employees: users.filter(u => u.role === 'employee').length,
    active: users.filter(u => u.is_active).length,
    inactive: users.filter(u => !u.is_active).length
  };

  if (loading) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '200px' 
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '32px', marginBottom: '10px' }}>⏳</div>
          <div>Загрузка пользователей...</div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: '20px' }}>
      {/* Заголовок и кнопка создания */}
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        marginBottom: '20px' 
      }}>
        <h1 style={{ color: '#2C3E50', margin: 0 }}>Управление пользователями</h1>
        <button
          onClick={handleCreateUser}
          style={{
            padding: '10px 20px',
            backgroundColor: '#4caf50',
            color: 'white',
            border: 'none',
            borderRadius: '5px',
            cursor: 'pointer',
            fontSize: '14px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}
        >
          <span>+</span>
          Добавить пользователя
        </button>
      </div>
      
      {/* Статистика */}
      <div style={{ 
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
        gap: '15px',
        marginBottom: '30px'
      }}>
        <div style={{
          backgroundColor: 'white',
          padding: '20px',
          borderRadius: '8px',
          boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
          textAlign: 'center'
        }}>
          <div style={{ fontSize: '12px', color: '#666', marginBottom: '5px' }}>Всего</div>
          <div style={{ fontSize: '28px', fontWeight: '600', color: '#2C3E50' }}>
            {stats.total}
          </div>
        </div>
        
        <div style={{
          backgroundColor: 'white',
          padding: '20px',
          borderRadius: '8px',
          boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
          textAlign: 'center'
        }}>
          <div style={{ fontSize: '12px', color: '#666', marginBottom: '5px' }}>Администраторы</div>
          <div style={{ fontSize: '28px', fontWeight: '600', color: getRoleColor('admin') }}>
            {stats.admins}
          </div>
        </div>
        
        <div style={{
          backgroundColor: 'white',
          padding: '20px',
          borderRadius: '8px',
          boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
          textAlign: 'center'
        }}>
          <div style={{ fontSize: '12px', color: '#666', marginBottom: '5px' }}>Менеджеры</div>
          <div style={{ fontSize: '28px', fontWeight: '600', color: getRoleColor('manager') }}>
            {stats.managers}
          </div>
        </div>
        
        <div style={{
          backgroundColor: 'white',
          padding: '20px',
          borderRadius: '8px',
          boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
          textAlign: 'center'
        }}>
          <div style={{ fontSize: '12px', color: '#666', marginBottom: '5px' }}>Активные</div>
          <div style={{ fontSize: '28px', fontWeight: '600', color: '#2ecc71' }}>
            {stats.active}
          </div>
        </div>
      </div>

      {/* Фильтры и поиск */}
      <div style={{
        backgroundColor: 'white',
        padding: '20px',
        borderRadius: '8px',
        boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
        marginBottom: '20px'
      }}>
        <div style={{ display: 'flex', gap: '15px', flexWrap: 'wrap' }}>
          {/* Поиск */}
          <div style={{ flex: 2, minWidth: '250px' }}>
            <div style={{ marginBottom: '5px', fontSize: '14px', fontWeight: '500' }}>Поиск</div>
            <input
              type="text"
              placeholder="Поиск по email или имени..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{
                width: '100%',
                padding: '10px',
                border: '1px solid #ddd',
                borderRadius: '5px',
                fontSize: '14px'
              }}
            />
          </div>
          
          {/* Фильтр по роли */}
          <div style={{ flex: 1, minWidth: '150px' }}>
            <div style={{ marginBottom: '5px', fontSize: '14px', fontWeight: '500' }}>Роль</div>
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              style={{
                width: '100%',
                padding: '10px',
                border: '1px solid #ddd',
                borderRadius: '5px',
                fontSize: '14px',
                backgroundColor: 'white'
              }}
            >
              <option value="all">Все роли</option>
              <option value="admin">Администраторы</option>
              <option value="manager">Менеджеры</option>
              <option value="employee">Сотрудники</option>
            </select>
          </div>
          
          {/* Фильтр по статусу */}
          <div style={{ flex: 1, minWidth: '150px' }}>
            <div style={{ marginBottom: '5px', fontSize: '14px', fontWeight: '500' }}>Статус</div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              style={{
                width: '100%',
                padding: '10px',
                border: '1px solid #ddd',
                borderRadius: '5px',
                fontSize: '14px',
                backgroundColor: 'white'
              }}
            >
              <option value="all">Все статусы</option>
              <option value="active">Активные</option>
              <option value="inactive">Неактивные</option>
            </select>
          </div>
        </div>
      </div>

      {/* Таблица пользователей */}
      <div style={{
        backgroundColor: 'white',
        padding: '25px',
        borderRadius: '8px',
        boxShadow: '0 2px 10px rgba(0,0,0,0.1)'
      }}>
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          marginBottom: '20px' 
        }}>
          <h2 style={{ margin: 0 }}>Список пользователей</h2>
          <div style={{ color: '#666', fontSize: '14px' }}>
            Найдено: {filteredUsers.length} из {users.length}
          </div>
        </div>
        
        {filteredUsers.length === 0 ? (
          <div style={{ 
            color: '#7f8c8d', 
            fontStyle: 'italic', 
            textAlign: 'center', 
            padding: '40px' 
          }}>
            {users.length === 0 ? 'Пользователи не найдены' : 'Пользователи по заданным фильтрам не найдены'}
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid #e0e0e0' }}>
                  <th style={{ textAlign: 'left', padding: '12px' }}>ID</th>
                  <th style={{ textAlign: 'left', padding: '12px' }}>Email</th>
                  <th style={{ textAlign: 'left', padding: '12px' }}>Имя</th>
                  <th style={{ textAlign: 'left', padding: '12px' }}>Роль</th>
                  <th style={{ textAlign: 'left', padding: '12px' }}>Статус</th>
                  <th style={{ textAlign: 'left', padding: '12px' }}>Дата создания</th>
                  <th style={{ textAlign: 'left', padding: '12px' }}>Действия</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.map((user, index) => (
                  <tr 
                    key={user.id || index} 
                    style={{ 
                      borderBottom: '1px solid #e0e0e0',
                      backgroundColor: index % 2 === 0 ? '#fafafa' : 'white'
                    }}
                  >
                    <td style={{ padding: '12px', fontWeight: '500' }}>{user.id || index + 1}</td>
                    <td style={{ padding: '12px' }}>{user.email || 'Нет email'}</td>
                    <td style={{ padding: '12px' }}>{user.full_name || 'Нет имени'}</td>
                    <td style={{ padding: '12px' }}>
                      <span style={{
                        padding: '4px 12px',
                        borderRadius: '20px',
                        backgroundColor: getRoleColor(user.role),
                        color: 'white',
                        fontSize: '12px',
                        fontWeight: '500'
                      }}>
                        {getRoleLabel(user.role)}
                      </span>
                    </td>
                    <td style={{ padding: '12px' }}>
                      <span style={{
                        padding: '4px 12px',
                        borderRadius: '20px',
                        backgroundColor: user.is_active ? '#d4edda' : '#f8d7da',
                        color: user.is_active ? '#155724' : '#721c24',
                        fontSize: '12px',
                        fontWeight: '500'
                      }}>
                        {user.is_active ? 'Активен' : 'Неактивен'}
                      </span>
                    </td>
                    <td style={{ padding: '12px', color: '#666', fontSize: '13px' }}>
                      {user.created_at ? new Date(user.created_at).toLocaleDateString('ru-RU') : 'Нет данных'}
                    </td>
                    <td style={{ padding: '12px' }}>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <button
                          onClick={() => handleEditUser(user)}
                          style={{
                            padding: '6px 12px',
                            backgroundColor: '#ff9800',
                            color: 'white',
                            border: 'none',
                            borderRadius: '4px',
                            cursor: 'pointer',
                            fontSize: '12px'
                          }}
                        >
                          Редактировать
                        </button>
                        <button
                          onClick={() => handleDeleteUser(user)}
                          style={{
                            padding: '6px 12px',
                            backgroundColor: '#f44336',
                            color: 'white',
                            border: 'none',
                            borderRadius: '4px',
                            cursor: 'pointer',
                            fontSize: '12px'
                          }}
                        >
                          Удалить
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* 🔥 МОДАЛЬНОЕ ОКНО СОЗДАНИЯ ПОЛЬЗОВАТЕЛЯ */}
      {showCreateModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.5)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 1000
        }}>
          <div style={{
            backgroundColor: 'white',
            padding: '30px',
            borderRadius: '8px',
            width: '500px',
            maxWidth: '90%',
            maxHeight: '90%',
            overflow: 'auto'
          }}>
            <h2 style={{ marginBottom: '20px', color: '#2C3E50' }}>
              Создание нового пользователя
            </h2>
            
            <div style={{ marginBottom: '15px' }}>
              <label style={{ display: 'block', marginBottom: '5px', fontWeight: '500' }}>
                Email *
              </label>
              <input
                type="email"
                value={userForm.email}
                onChange={(e) => setUserForm({...userForm, email: e.target.value})}
                style={{
                  width: '100%',
                  padding: '10px',
                  border: '1px solid #ddd',
                  borderRadius: '4px',
                  fontSize: '14px'
                }}
                placeholder="user@example.com"
              />
            </div>
            
            <div style={{ marginBottom: '15px' }}>
              <label style={{ display: 'block', marginBottom: '5px', fontWeight: '500' }}>
                Пароль *
              </label>
              <input
                type="password"
                value={userForm.password}
                onChange={(e) => setUserForm({...userForm, password: e.target.value})}
                style={{
                  width: '100%',
                  padding: '10px',
                  border: '1px solid #ddd',
                  borderRadius: '4px',
                  fontSize: '14px'
                }}
                placeholder="Минимум 6 символов"
              />
            </div>
            
            <div style={{ marginBottom: '15px' }}>
              <label style={{ display: 'block', marginBottom: '5px', fontWeight: '500' }}>
                Полное имя *
              </label>
              <input
                type="text"
                value={userForm.full_name}
                onChange={(e) => setUserForm({...userForm, full_name: e.target.value})}
                style={{
                  width: '100%',
                  padding: '10px',
                  border: '1px solid #ddd',
                  borderRadius: '4px',
                  fontSize: '14px'
                }}
                placeholder="Иванов Иван Иванович"
              />
            </div>
            
            <div style={{ marginBottom: '15px' }}>
              <label style={{ display: 'block', marginBottom: '5px', fontWeight: '500' }}>
                Роль
              </label>
              <select
                value={userForm.role}
                onChange={(e) => setUserForm({...userForm, role: e.target.value})}
                style={{
                  width: '100%',
                  padding: '10px',
                  border: '1px solid #ddd',
                  borderRadius: '4px',
                  fontSize: '14px',
                  backgroundColor: 'white'
                }}
              >
                <option value="employee">Сотрудник</option>
                <option value="manager">Менеджер</option>
                <option value="admin">Администратор</option>
              </select>
            </div>
            
            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={userForm.is_active}
                  onChange={(e) => setUserForm({...userForm, is_active: e.target.checked})}
                  style={{ marginRight: '8px' }}
                />
                <span>Активный пользователь</span>
              </label>
            </div>
            
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button
                onClick={() => setShowCreateModal(false)}
                style={{
                  padding: '10px 20px',
                  backgroundColor: '#95a5a6',
                  color: 'white',
                  border: 'none',
                  borderRadius: '5px',
                  cursor: 'pointer'
                }}
              >
                Отмена
              </button>
              <button
                onClick={handleSaveCreate}
                style={{
                  padding: '10px 20px',
                  backgroundColor: '#4caf50',
                  color: 'white',
                  border: 'none',
                  borderRadius: '5px',
                  cursor: 'pointer'
                }}
              >
                Создать пользователя
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 🔥 МОДАЛЬНОЕ ОКНО РЕДАКТИРОВАНИЯ */}
      {showEditModal && selectedUser && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.5)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 1000
        }}>
          <div style={{
            backgroundColor: 'white',
            padding: '30px',
            borderRadius: '8px',
            width: '500px',
            maxWidth: '90%',
            maxHeight: '90%',
            overflow: 'auto'
          }}>
            <h2 style={{ marginBottom: '20px', color: '#2C3E50' }}>
              Редактирование пользователя
              <div style={{ fontSize: '14px', color: '#666', marginTop: '5px', fontWeight: 'normal' }}>
                ID: {selectedUser.id}
              </div>
            </h2>
            
            <div style={{ marginBottom: '15px' }}>
              <label style={{ display: 'block', marginBottom: '5px', fontWeight: '500' }}>
                Email *
              </label>
              <input
                type="email"
                value={userForm.email}
                onChange={(e) => setUserForm({...userForm, email: e.target.value})}
                style={{
                  width: '100%',
                  padding: '10px',
                  border: '1px solid #ddd',
                  borderRadius: '4px',
                  fontSize: '14px'
                }}
              />
            </div>
            
            <div style={{ marginBottom: '15px' }}>
              <label style={{ display: 'block', marginBottom: '5px', fontWeight: '500' }}>
                Новый пароль (оставьте пустым, чтобы не менять)
              </label>
              <input
                type="password"
                value={userForm.password}
                onChange={(e) => setUserForm({...userForm, password: e.target.value})}
                style={{
                  width: '100%',
                  padding: '10px',
                  border: '1px solid #ddd',
                  borderRadius: '4px',
                  fontSize: '14px'
                }}
                placeholder="Новый пароль (необязательно)"
              />
            </div>
            
            <div style={{ marginBottom: '15px' }}>
              <label style={{ display: 'block', marginBottom: '5px', fontWeight: '500' }}>
                Полное имя *
              </label>
              <input
                type="text"
                value={userForm.full_name}
                onChange={(e) => setUserForm({...userForm, full_name: e.target.value})}
                style={{
                  width: '100%',
                  padding: '10px',
                  border: '1px solid #ddd',
                  borderRadius: '4px',
                  fontSize: '14px'
                }}
              />
            </div>
            
            <div style={{ marginBottom: '15px' }}>
              <label style={{ display: 'block', marginBottom: '5px', fontWeight: '500' }}>
                Роль
              </label>
              <select
                value={userForm.role}
                onChange={(e) => setUserForm({...userForm, role: e.target.value})}
                style={{
                  width: '100%',
                  padding: '10px',
                  border: '1px solid #ddd',
                  borderRadius: '4px',
                  fontSize: '14px',
                  backgroundColor: 'white'
                }}
              >
                <option value="employee">Сотрудник</option>
                <option value="manager">Менеджер</option>
                <option value="admin">Администратор</option>
              </select>
            </div>
            
            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={userForm.is_active}
                  onChange={(e) => setUserForm({...userForm, is_active: e.target.checked})}
                  style={{ marginRight: '8px' }}
                />
                <span>Активный пользователь</span>
              </label>
            </div>
            
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button
                onClick={() => {
                  setShowEditModal(false);
                  setSelectedUser(null);
                }}
                style={{
                  padding: '10px 20px',
                  backgroundColor: '#95a5a6',
                  color: 'white',
                  border: 'none',
                  borderRadius: '5px',
                  cursor: 'pointer'
                }}
              >
                Отмена
              </button>
              <button
                onClick={handleSaveEdit}
                style={{
                  padding: '10px 20px',
                  backgroundColor: '#2196f3',
                  color: 'white',
                  border: 'none',
                  borderRadius: '5px',
                  cursor: 'pointer'
                }}
              >
                Сохранить изменения
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 🔥 МОДАЛЬНОЕ ОКНО ПОДТВЕРЖДЕНИЯ УДАЛЕНИЯ */}
      {showDeleteConfirm && selectedUser && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.5)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 1000
        }}>
          <div style={{
            backgroundColor: 'white',
            padding: '30px',
            borderRadius: '8px',
            width: '400px',
            maxWidth: '90%'
          }}>
            <h2 style={{ marginBottom: '15px', color: '#f44336' }}>
              Подтверждение удаления
            </h2>
            
            <p style={{ marginBottom: '20px', fontSize: '16px' }}>
              Вы уверены, что хотите удалить пользователя <strong>"{selectedUser.email}"</strong>?
              <br />
              <span style={{ color: '#666', fontSize: '14px', marginTop: '5px', display: 'block' }}>
                Все документы и папки пользователя будут переназначены или удалены.
              </span>
            </p>
            
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button
                onClick={() => {
                  setShowDeleteConfirm(false);
                  setSelectedUser(null);
                }}
                style={{
                  padding: '10px 20px',
                  backgroundColor: '#95a5a6',
                  color: 'white',
                  border: 'none',
                  borderRadius: '5px',
                  cursor: 'pointer'
                }}
              >
                Отмена
              </button>
              <button
                onClick={confirmDelete}
                style={{
                  padding: '10px 20px',
                  backgroundColor: '#f44336',
                  color: 'white',
                  border: 'none',
                  borderRadius: '5px',
                  cursor: 'pointer'
                }}
              >
                Удалить
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UsersPage;