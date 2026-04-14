import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { statisticsAPI } from '../services/api';

const DashboardPage: React.FC = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState({
    total_users: 0,
    total_documents: 0,
    total_folders: 0,
    storage_used_mb: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStatistics();
  }, []);

  const fetchStatistics = async () => {
    try {
      const data = await statisticsAPI.getStatistics();
      setStats(data);
    } catch (error) {
      console.error('Error fetching statistics:', error);
    } finally {
      setLoading(false);
    }
  };

  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'admin': return 'Администратор';
      case 'manager': return 'Менеджер';
      case 'employee': return 'Сотрудник';
      default: return role;
    }
  };

  if (loading) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '200px' 
      }}>
        <div>Загрузка статистики...</div>
      </div>
    );
  }

  return (
    <>
      <h1 style={{ color: '#2C3E50', marginBottom: '20px' }}>Главная страница</h1>
      
      {/* Информация о пользователе */}
      <div style={{
        backgroundColor: 'white',
        padding: '25px',
        borderRadius: '8px',
        boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
        marginBottom: '30px'
      }}>
        <h2 style={{ marginBottom: '20px' }}>Информация о пользователе</h2>
        <div style={{ 
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '20px'
        }}>
          <div>
            <div style={{ color: '#7f8c8d', fontSize: '14px' }}>Имя</div>
            <div style={{ fontSize: '18px', fontWeight: '500' }}>{user?.full_name}</div>
          </div>
          <div>
            <div style={{ color: '#7f8c8d', fontSize: '14px' }}>Email</div>
            <div style={{ fontSize: '18px', fontWeight: '500' }}>{user?.email}</div>
          </div>
          <div>
            <div style={{ color: '#7f8c8d', fontSize: '14px' }}>Роль</div>
            <div style={{ fontSize: '18px', fontWeight: '500' }}>{getRoleLabel(user?.role || '')}</div>
          </div>
        </div>
      </div>

      {/* Статистика */}
      <div style={{ 
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: '20px'
      }}>
        <div style={{
          backgroundColor: 'white',
          padding: '20px',
          borderRadius: '8px',
          boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
          textAlign: 'center'
        }}>
          <h3>Пользователи</h3>
          <div style={{ fontSize: '32px', fontWeight: '600' }}>
            {stats.total_users}
          </div>
        </div>
        
        <div style={{
          backgroundColor: 'white',
          padding: '20px',
          borderRadius: '8px',
          boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
          textAlign: 'center'
        }}>
          <h3>Документы</h3>
          <div style={{ fontSize: '32px', fontWeight: '600' }}>
            {stats.total_documents}
          </div>
        </div>
        
        <div style={{
          backgroundColor: 'white',
          padding: '20px',
          borderRadius: '8px',
          boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
          textAlign: 'center'
        }}>
          <h3>Папки</h3>
          <div style={{ fontSize: '32px', fontWeight: '600' }}>
            {stats.total_folders}
          </div>
        </div>
        
        <div style={{
          backgroundColor: 'white',
          padding: '20px',
          borderRadius: '8px',
          boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
          textAlign: 'center'
        }}>
          <h3>Хранилище</h3>
          <div style={{ fontSize: '32px', fontWeight: '600' }}>
            {stats.storage_used_mb} МБ
          </div>
        </div>
      </div>
    </>
  );
};

export default DashboardPage;