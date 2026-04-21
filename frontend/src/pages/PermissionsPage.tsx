import React, { useState } from 'react';
import { permissionAPI } from '../services/api';
import './PermissionsPage.css';

type ResourceType = 'folder' | 'document';
type ModeType = 'grant' | 'update' | 'revoke';

const PermissionsPage: React.FC = () => {
  const [resourceType, setResourceType] = useState<ResourceType>('document');
  const [mode, setMode] = useState<ModeType>('grant');
  const [resourcePublicId, setResourcePublicId] = useState('');
  const [userPublicId, setUserPublicId] = useState('');
  const [canRead, setCanRead] = useState(true);
  const [canUpdate, setCanUpdate] = useState(false);
  const [canDelete, setCanDelete] = useState(false);
  const [canManageAccess, setCanManageAccess] = useState(false);
  const [result, setResult] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async () => {
    setError('');
    setResult('');

    try {
      if (resourceType === 'document') {
        if (mode === 'grant') {
          const data = await permissionAPI.grantDocument(resourcePublicId, {
            user_public_id: userPublicId,
            can_read: canRead,
            can_update: canUpdate,
            can_delete: canDelete,
            can_manage_access: canManageAccess,
          });
          setResult(JSON.stringify(data, null, 2));
        } else if (mode === 'update') {
          const data = await permissionAPI.updateDocument(resourcePublicId, {
            user_public_id: userPublicId,
            can_read: canRead,
            can_update: canUpdate,
            can_delete: canDelete,
            can_manage_access: canManageAccess,
          });
          setResult(JSON.stringify(data, null, 2));
        } else {
          await permissionAPI.revokeDocument(resourcePublicId, userPublicId);
          setResult('Право на документ отозвано');
        }
      } else {
        if (mode === 'grant') {
          const data = await permissionAPI.grantFolder(resourcePublicId, {
            user_public_id: userPublicId,
            can_read: canRead,
            can_update: canUpdate,
            can_delete: canDelete,
            can_manage_access: canManageAccess,
          });
          setResult(JSON.stringify(data, null, 2));
        } else if (mode === 'update') {
          const data = await permissionAPI.updateFolder(resourcePublicId, {
            user_public_id: userPublicId,
            can_read: canRead,
            can_update: canUpdate,
            can_delete: canDelete,
            can_manage_access: canManageAccess,
          });
          setResult(JSON.stringify(data, null, 2));
        } else {
          await permissionAPI.revokeFolder(resourcePublicId, userPublicId);
          setResult('Право на папку отозвано');
        }
      }
    } catch (e: any) {
      setError(e?.response?.data?.detail || 'Операция не выполнена');
    }
  };

  return (
    <div className="permissions">
      <h1>Права доступа</h1>

      <div className="permissions__card">
        <div className="permissions__grid">
          <label>
            <span>Тип ресурса</span>
            <select value={resourceType} onChange={(e) => setResourceType(e.target.value as ResourceType)}>
              <option value="document">Документ</option>
              <option value="folder">Папка</option>
            </select>
          </label>

          <label>
            <span>Режим</span>
            <select value={mode} onChange={(e) => setMode(e.target.value as ModeType)}>
              <option value="grant">Выдать</option>
              <option value="update">Обновить</option>
              <option value="revoke">Отозвать</option>
            </select>
          </label>

          <label>
            <span>Public ID ресурса</span>
            <input value={resourcePublicId} onChange={(e) => setResourcePublicId(e.target.value)} />
          </label>

          <label>
            <span>Public ID пользователя</span>
            <input value={userPublicId} onChange={(e) => setUserPublicId(e.target.value)} />
          </label>
        </div>

        {mode !== 'revoke' && (
          <div className="permissions__checks">
            <label><input type="checkbox" checked={canRead} onChange={(e) => setCanRead(e.target.checked)} /> can_read</label>
            <label><input type="checkbox" checked={canUpdate} onChange={(e) => setCanUpdate(e.target.checked)} /> can_update</label>
            <label><input type="checkbox" checked={canDelete} onChange={(e) => setCanDelete(e.target.checked)} /> can_delete</label>
            <label><input type="checkbox" checked={canManageAccess} onChange={(e) => setCanManageAccess(e.target.checked)} /> can_manage_access</label>
          </div>
        )}

        <button className="permissions__submit" onClick={handleSubmit}>
          Выполнить
        </button>

        {error && <div className="permissions__error">{error}</div>}
        {result && <pre className="permissions__result">{result}</pre>}
      </div>
    </div>
  );
};

export default PermissionsPage;