import React, { useEffect, useMemo, useState } from 'react';
import { documentAPI, folderAPI, permissionAPI, userAPI } from '../services/api';
import { Document, Folder, PermissionGrant, User } from '../types';
import './PermissionsPage.css';

type ResourceType = 'folder' | 'document';
type ModeType = 'grant' | 'update' | 'revoke';

const defaultFlags: PermissionGrant = {
  user_public_id: '',
  can_read: true,
  can_update: false,
  can_delete: false,
  can_manage_access: false,
};

const PermissionsPage: React.FC = () => {
  const [resourceType, setResourceType] = useState<ResourceType>('document');
  const [mode, setMode] = useState<ModeType>('grant');

  const [users, setUsers] = useState<User[]>([]);
  const [folders, setFolders] = useState<Folder[]>([]);
  const [documents, setDocuments] = useState<Document[]>([]);

  const [selectedUserPublicId, setSelectedUserPublicId] = useState('');
  const [selectedResourcePublicId, setSelectedResourcePublicId] = useState('');

  const [flags, setFlags] = useState<PermissionGrant>(defaultFlags);

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [result, setResult] = useState('');

  const loadOptions = async () => {
    try {
      setLoading(true);
      setError('');

      const [userList, folderList, documentList] = await Promise.all([
        userAPI.list(),
        folderAPI.list(),
        documentAPI.list(),
      ]);

      setUsers(userList);
      setFolders(folderList);
      setDocuments(documentList);
    } catch (e: any) {
      setError(e?.response?.data?.detail || 'Не удалось загрузить данные для управления правами');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadOptions();
  }, []);

  useEffect(() => {
    setSelectedResourcePublicId('');
    setResult('');
    setSuccess('');
    setError('');
  }, [resourceType]);

  useEffect(() => {
    setResult('');
    setSuccess('');
    setError('');
  }, [mode]);

  useEffect(() => {
    setFlags((prev) => ({
      ...prev,
      user_public_id: selectedUserPublicId,
    }));
  }, [selectedUserPublicId]);

  const sortedUsers = useMemo(() => {
    return [...users].sort((a, b) => {
      const left = `${a.full_name} ${a.email}`.toLowerCase();
      const right = `${b.full_name} ${b.email}`.toLowerCase();
      return left.localeCompare(right, 'ru');
    });
  }, [users]);

  const sortedFolders = useMemo(() => {
    return [...folders].sort((a, b) => a.name.localeCompare(b.name, 'ru'));
  }, [folders]);

  const sortedDocuments = useMemo(() => {
    return [...documents].sort((a, b) => a.title.localeCompare(b.title, 'ru'));
  }, [documents]);

  const selectedUser = useMemo(
    () => users.find((user) => user.public_id === selectedUserPublicId) ?? null,
    [users, selectedUserPublicId]
  );

  const selectedFolder = useMemo(
    () => folders.find((folder) => folder.public_id === selectedResourcePublicId) ?? null,
    [folders, selectedResourcePublicId]
  );

  const selectedDocument = useMemo(
    () => documents.find((document) => document.public_id === selectedResourcePublicId) ?? null,
    [documents, selectedResourcePublicId]
  );

  const selectedResourceName =
    resourceType === 'folder'
      ? selectedFolder?.name ?? ''
      : selectedDocument?.title ?? '';

  const applyPreset = (preset: 'read' | 'edit' | 'full' | 'none') => {
    if (preset === 'read') {
      setFlags((prev) => ({
        ...prev,
        can_read: true,
        can_update: false,
        can_delete: false,
        can_manage_access: false,
      }));
      return;
    }

    if (preset === 'edit') {
      setFlags((prev) => ({
        ...prev,
        can_read: true,
        can_update: true,
        can_delete: false,
        can_manage_access: false,
      }));
      return;
    }

    if (preset === 'full') {
      setFlags((prev) => ({
        ...prev,
        can_read: true,
        can_update: true,
        can_delete: true,
        can_manage_access: true,
      }));
      return;
    }

    setFlags((prev) => ({
      ...prev,
      can_read: false,
      can_update: false,
      can_delete: false,
      can_manage_access: false,
    }));
  };

  const handleSubmit = async () => {
    if (!selectedUserPublicId) {
      setError('Выберите пользователя');
      setSuccess('');
      setResult('');
      return;
    }

    if (!selectedResourcePublicId) {
      setError(resourceType === 'folder' ? 'Выберите папку' : 'Выберите документ');
      setSuccess('');
      setResult('');
      return;
    }

    if (mode !== 'revoke') {
      const hasAnyPermission =
        flags.can_read || flags.can_update || flags.can_delete || flags.can_manage_access;

      if (!hasAnyPermission) {
        setError('Выберите хотя бы одно право или используйте режим «Отозвать»');
        setSuccess('');
        setResult('');
        return;
      }
    }

    try {
      setSubmitting(true);
      setError('');
      setSuccess('');
      setResult('');

      const payload: PermissionGrant = {
        user_public_id: selectedUserPublicId,
        can_read: flags.can_read,
        can_update: flags.can_update,
        can_delete: flags.can_delete,
        can_manage_access: flags.can_manage_access,
      };

      let responseData: unknown = null;

      if (resourceType === 'document') {
        if (mode === 'grant') {
          responseData = await permissionAPI.grantDocument(selectedResourcePublicId, payload);
          setSuccess('Право на документ выдано');
        } else if (mode === 'update') {
          responseData = await permissionAPI.updateDocument(selectedResourcePublicId, payload);
          setSuccess('Право на документ обновлено');
        } else {
          await permissionAPI.revokeDocument(selectedResourcePublicId, selectedUserPublicId);
          setSuccess('Право на документ отозвано');
        }
      } else {
        if (mode === 'grant') {
          responseData = await permissionAPI.grantFolder(selectedResourcePublicId, payload);
          setSuccess('Право на папку выдано');
        } else if (mode === 'update') {
          responseData = await permissionAPI.updateFolder(selectedResourcePublicId, payload);
          setSuccess('Право на папку обновлено');
        } else {
          await permissionAPI.revokeFolder(selectedResourcePublicId, selectedUserPublicId);
          setSuccess('Право на папку отозвано');
        }
      }

      if (responseData) {
        setResult(JSON.stringify(responseData, null, 2));
      }
    } catch (e: any) {
      setError(e?.response?.data?.detail || 'Операция не выполнена');
    } finally {
      setSubmitting(false);
    }
  };

  const isFolderMode = resourceType === 'folder';

  return (
    <div className="permissions-page">
      <h1>Права доступа</h1>
      <p className="permissions__subtitle">
        Выберите пользователя, ресурс и режим операции. ID руками вводить не нужно.
      </p>

      {loading ? (
        <div className="permissions__card">
          <div className="permissions__empty">Загрузка данных...</div>
        </div>
      ) : (
        <>
          <div className="permissions__layout">
            <div className="permissions__card">
              <h2>Параметры операции</h2>

              <div className="permissions__grid">
                <label>
                  <span>Тип ресурса</span>
                  <select
                    value={resourceType}
                    onChange={(e) => setResourceType(e.target.value as ResourceType)}
                  >
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
                  <span>Пользователь</span>
                  <select
                    value={selectedUserPublicId}
                    onChange={(e) => setSelectedUserPublicId(e.target.value)}
                  >
                    <option value="">Выберите пользователя</option>
                    {sortedUsers.map((user) => (
                      <option key={user.public_id} value={user.public_id}>
                        {user.full_name} ({user.email}) — {user.role}
                      </option>
                    ))}
                  </select>
                </label>

                <label>
                  <span>{isFolderMode ? 'Папка' : 'Документ'}</span>
                  <select
                    value={selectedResourcePublicId}
                    onChange={(e) => setSelectedResourcePublicId(e.target.value)}
                  >
                    <option value="">
                      {isFolderMode ? 'Выберите папку' : 'Выберите документ'}
                    </option>

                    {isFolderMode
                      ? sortedFolders.map((folder) => (
                          <option key={folder.public_id} value={folder.public_id}>
                            {folder.name}
                          </option>
                        ))
                      : sortedDocuments.map((document) => (
                          <option key={document.public_id} value={document.public_id}>
                            {document.title}
                          </option>
                        ))}
                  </select>
                </label>
              </div>

              <div className="permissions__summary">
                <div className="permissions__summary-item">
                  <span className="permissions__summary-label">Пользователь</span>
                  <strong>
                    {selectedUser
                      ? `${selectedUser.full_name} (${selectedUser.role})`
                      : 'не выбран'}
                  </strong>
                  {selectedUser && (
                    <span className="permissions__summary-meta">{selectedUser.public_id}</span>
                  )}
                </div>

                <div className="permissions__summary-item">
                  <span className="permissions__summary-label">Ресурс</span>
                  <strong>{selectedResourceName || 'не выбран'}</strong>
                  {selectedResourcePublicId && (
                    <span className="permissions__summary-meta">{selectedResourcePublicId}</span>
                  )}
                </div>
              </div>
            </div>

            <div className="permissions__card">
              <h2>Права</h2>

              {mode === 'revoke' ? (
                <div className="permissions__empty">
                  Для режима «Отозвать» флаги прав не нужны. Будет удалена запись доступа для
                  выбранного пользователя и ресурса.
                </div>
              ) : (
                <>
                  <div className="permissions__presets">
                    <button
                      type="button"
                      className="permissions__preset"
                      onClick={() => applyPreset('read')}
                    >
                      Только чтение
                    </button>
                    <button
                      type="button"
                      className="permissions__preset"
                      onClick={() => applyPreset('edit')}
                    >
                      Чтение + изменение
                    </button>
                    <button
                      type="button"
                      className="permissions__preset"
                      onClick={() => applyPreset('full')}
                    >
                      Полный доступ
                    </button>
                    <button
                      type="button"
                      className="permissions__preset permissions__preset--ghost"
                      onClick={() => applyPreset('none')}
                    >
                      Сбросить флаги
                    </button>
                  </div>

                  <div className="permissions__checks">
                    <label className="permissions__check">
                      <input
                        type="checkbox"
                        checked={flags.can_read}
                        onChange={(e) =>
                          setFlags((prev) => ({
                            ...prev,
                            can_read: e.target.checked,
                          }))
                        }
                      />
                      <span>Чтение</span>
                    </label>

                    <label className="permissions__check">
                      <input
                        type="checkbox"
                        checked={flags.can_update}
                        onChange={(e) =>
                          setFlags((prev) => ({
                            ...prev,
                            can_update: e.target.checked,
                          }))
                        }
                      />
                      <span>Изменение</span>
                    </label>

                    <label className="permissions__check">
                      <input
                        type="checkbox"
                        checked={flags.can_delete}
                        onChange={(e) =>
                          setFlags((prev) => ({
                            ...prev,
                            can_delete: e.target.checked,
                          }))
                        }
                      />
                      <span>Удаление</span>
                    </label>

                    <label className="permissions__check">
                      <input
                        type="checkbox"
                        checked={flags.can_manage_access}
                        onChange={(e) =>
                          setFlags((prev) => ({
                            ...prev,
                            can_manage_access: e.target.checked,
                          }))
                        }
                      />
                      <span>Управление доступом</span>
                    </label>
                  </div>
                </>
              )}

              <button
                type="button"
                className="permissions__submit"
                onClick={handleSubmit}
                disabled={submitting}
              >
                {submitting ? 'Выполнение...' : 'Выполнить'}
              </button>
            </div>
          </div>

          {error && <div className="permissions__error">{error}</div>}
          {success && <div className="permissions__success">{success}</div>}

          {result && (
            <div className="permissions__card permissions__result-card">
              <h2>Ответ сервера</h2>
              <pre className="permissions__result">{result}</pre>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default PermissionsPage;