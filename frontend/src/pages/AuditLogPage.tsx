import React, { useEffect, useState } from 'react';
import { auditAPI } from '../services/api';
import { AuditLogEntry } from '../types';
import './AuditLogPage.css';

const AuditLogPage: React.FC = () => {
  const [rows, setRows] = useState<AuditLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadAudit = async () => {
    try {
      setLoading(true);
      setError('');
      const data = await auditAPI.list(100);
      setRows(data);
    } catch (e: any) {
      setError(e?.response?.data?.detail || 'Не удалось загрузить журнал аудита');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAudit();
  }, []);

  if (loading) return <div className="page-loading">Загрузка аудита...</div>;

  return (
    <div className="audit">
      <div className="audit__header">
        <h1>Журнал аудита</h1>
        <button className="audit__refresh" onClick={loadAudit}>
          Обновить
        </button>
      </div>

      {error && <div className="audit__error">{error}</div>}

      <div className="audit__table-wrap">
        <table className="audit__table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Время</th>
              <th>Действие</th>
              <th>Успех</th>
              <th>Пользователь</th>
              <th>Тип ресурса</th>
              <th>Детали</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id}>
                <td>{row.id}</td>
                <td>{new Date(row.created_at).toLocaleString()}</td>
                <td>{row.action}</td>
                <td>{row.success ? 'Да' : 'Нет'}</td>
                <td>{row.actor_user_id ?? '-'}</td>
                <td>{row.resource_type}</td>
                <td>
                  <pre className="audit__details">{JSON.stringify(row.details, null, 2)}</pre>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default AuditLogPage;