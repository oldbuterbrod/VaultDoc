import React, { useEffect, useMemo, useState } from 'react';
import ResourceTree from '../components/ResourceTree';
import { documentAPI, folderAPI } from '../services/api';
import { Document, Folder } from '../types';
import './ExplorerPage.css';

const ExplorerPage: React.FC = () => {
  const [folders, setFolders] = useState<Folder[]>([]);
  const [documents, setDocuments] = useState<Document[]>([]);

  const [selectedFolderPublicId, setSelectedFolderPublicId] = useState<string | null>(null);
  const [selectedDocumentPublicId, setSelectedDocumentPublicId] = useState<string | null>(null);

  const [folderName, setFolderName] = useState('');
  const [documentTitle, setDocumentTitle] = useState('');
  const [documentContent, setDocumentContent] = useState('');

  const [uploadTitle, setUploadTitle] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    try {
      setLoading(true);
      setError('');

      const [folderList, documentList] = await Promise.all([
        folderAPI.list(),
        documentAPI.list(),
      ]);

      setFolders(folderList);
      setDocuments(documentList);
    } catch (e: any) {
      setError(e?.response?.data?.detail || 'Не удалось загрузить проводник');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const selectedFolder = useMemo(
    () => folders.find((f) => f.public_id === selectedFolderPublicId) ?? null,
    [folders, selectedFolderPublicId]
  );

  const selectedDocument = useMemo(
    () => documents.find((d) => d.public_id === selectedDocumentPublicId) ?? null,
    [documents, selectedDocumentPublicId]
  );

  const selectedFolderName = selectedFolder ? selectedFolder.name : 'корень';

  const handleCreateFolder = async () => {
    try {
      setError('');
      setSuccess('');

      if (!folderName.trim()) {
        setError('Введите название папки');
        return;
      }

      await folderAPI.create({
        name: folderName.trim(),
        parent_public_id: selectedFolder?.public_id ?? null,
      });

      setFolderName('');
      setSuccess('Папка создана');
      await loadData();
    } catch (e: any) {
      setError(e?.response?.data?.detail || 'Не удалось создать папку');
    }
  };

  const handleCreateDocument = async () => {
    try {
      setError('');
      setSuccess('');

      if (!documentTitle.trim()) {
        setError('Введите название документа');
        return;
      }

      await documentAPI.create({
        title: documentTitle.trim(),
        content: documentContent || null,
        folder_public_id: selectedFolder?.public_id ?? null,
      });

      setDocumentTitle('');
      setDocumentContent('');
      setSuccess('Документ создан');
      await loadData();
    } catch (e: any) {
      setError(e?.response?.data?.detail || 'Не удалось создать документ');
    }
  };

  const handleUploadDocument = async () => {
    try {
      setError('');
      setSuccess('');

      if (!selectedFile) {
        setError('Выберите файл для загрузки');
        return;
      }

      await documentAPI.upload({
        file: selectedFile,
        title: uploadTitle.trim() || undefined,
        folder_public_id: selectedFolder?.public_id ?? null,
      });

      setUploadTitle('');
      setSelectedFile(null);

      const fileInput = document.getElementById('document-upload-input') as HTMLInputElement | null;
      if (fileInput) {
        fileInput.value = '';
      }

      setSuccess('Файл загружен');
      await loadData();
    } catch (e: any) {
      setError(e?.response?.data?.detail || 'Не удалось загрузить файл');
    }
  };

  const handleDeleteFolder = async () => {
    if (!selectedFolder) {
      return;
    }

    try {
      setError('');
      setSuccess('');

      await folderAPI.delete(selectedFolder.public_id);
      setSelectedFolderPublicId(null);
      setSuccess('Папка удалена');
      await loadData();
    } catch (e: any) {
      setError(e?.response?.data?.detail || 'Не удалось удалить папку');
    }
  };

  const handleDeleteDocument = async () => {
    if (!selectedDocument) {
      return;
    }

    try {
      setError('');
      setSuccess('');

      await documentAPI.delete(selectedDocument.public_id);
      setSelectedDocumentPublicId(null);
      setSuccess('Документ удалён');
      await loadData();
    } catch (e: any) {
      setError(e?.response?.data?.detail || 'Не удалось удалить документ');
    }
  };

  const handleDownloadDocument = async () => {
    if (!selectedDocument) {
      return;
    }

    try {
      setError('');
      setSuccess('');

      const blob = await documentAPI.download(selectedDocument.public_id);
      const url = window.URL.createObjectURL(blob);

      const link = window.document.createElement('a');
      link.href = url;
      link.download = selectedDocument.file_name || `${selectedDocument.title}`;
      window.document.body.appendChild(link);
      link.click();
      link.remove();

      window.URL.revokeObjectURL(url);
      setSuccess('Файл скачан');
    } catch (e: any) {
      setError(e?.response?.data?.detail || 'Не удалось скачать файл');
    }
  };

  const formatFileSize = (bytes: number | null): string => {
    if (bytes === null || bytes === undefined) {
      return '—';
    }

    if (bytes < 1024) {
      return `${bytes} Б`;
    }

    if (bytes < 1024 * 1024) {
      return `${(bytes / 1024).toFixed(1)} КБ`;
    }

    return `${(bytes / (1024 * 1024)).toFixed(2)} МБ`;
  };

  if (loading) {
    return <div>Загрузка проводника...</div>;
  }

  return (
    <div className="explorer-page">
      <div className="explorer__header">
        <h1 className="explorer__title">Проводник</h1>
        <p className="explorer__subtitle">
          Папки и документы отображаются в единой древовидной структуре
        </p>
      </div>

      {error && <div className="explorer__alert explorer__alert--error">{error}</div>}
      {success && <div className="explorer__alert explorer__alert--success">{success}</div>}

      <div className="explorer__toolbar explorer__toolbar--triple">
        <div className="explorer__card">
          <h2>Создать папку</h2>
          <input
            className="explorer__input"
            value={folderName}
            onChange={(e) => setFolderName(e.target.value)}
            placeholder="Название папки"
          />
          <div className="explorer__hint">Родитель: {selectedFolderName}</div>
          <button className="explorer__btn explorer__btn--primary" onClick={handleCreateFolder}>
            Создать папку
          </button>
        </div>

        <div className="explorer__card">
          <h2>Создать текстовый документ</h2>
          <input
            className="explorer__input"
            value={documentTitle}
            onChange={(e) => setDocumentTitle(e.target.value)}
            placeholder="Название документа"
          />
          <textarea
            className="explorer__textarea"
            value={documentContent}
            onChange={(e) => setDocumentContent(e.target.value)}
            placeholder="Содержимое"
          />
          <div className="explorer__hint">Папка: {selectedFolderName}</div>
          <button className="explorer__btn explorer__btn--primary" onClick={handleCreateDocument}>
            Создать документ
          </button>
        </div>

        <div className="explorer__card">
          <h2>Загрузить PDF / DOCX</h2>
          <input
            className="explorer__input"
            value={uploadTitle}
            onChange={(e) => setUploadTitle(e.target.value)}
            placeholder="Название документа (необязательно)"
          />
          <input
            id="document-upload-input"
            className="explorer__input explorer__file-input"
            type="file"
            accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
            onChange={(e) => setSelectedFile(e.target.files?.[0] ?? null)}
          />
          <div className="explorer__hint">
            Папка: {selectedFolderName}
            <br />
            Файл: {selectedFile ? selectedFile.name : 'не выбран'}
          </div>
          <button className="explorer__btn explorer__btn--primary" onClick={handleUploadDocument}>
            Загрузить файл
          </button>
        </div>
      </div>

      <div className="explorer__grid">
        <div className="explorer__card">
          <h2>Дерево ресурсов</h2>
          <ResourceTree
            folders={folders}
            documents={documents}
            selectedFolderPublicId={selectedFolderPublicId}
            selectedDocumentPublicId={selectedDocumentPublicId}
            onSelectFolder={(folder) => {
              setSelectedDocumentPublicId(null);
              setSelectedFolderPublicId(folder.public_id);
            }}
            onSelectDocument={(document) => {
              setSelectedFolderPublicId(null);
              setSelectedDocumentPublicId(document.public_id);
            }}
          />
        </div>

        <div className="explorer__card">
          <h2>Сведения о ресурсе</h2>

          {selectedFolder && (
            <div className="explorer__details">
              <div><strong>Тип:</strong> Папка</div>
              <div><strong>Название:</strong> {selectedFolder.name}</div>
              <div><strong>Public ID:</strong> {selectedFolder.public_id}</div>

              <button className="explorer__btn explorer__btn--danger" onClick={handleDeleteFolder}>
                Удалить папку
              </button>
            </div>
          )}

          {selectedDocument && (
            <div className="explorer__details">
              <div><strong>Тип:</strong> Документ</div>
              <div><strong>Название:</strong> {selectedDocument.title}</div>
              <div><strong>Файл:</strong> {selectedDocument.file_name || '—'}</div>
              <div><strong>Размер:</strong> {formatFileSize(selectedDocument.file_size)}</div>

              <div className="explorer__actions">
                {selectedDocument.file_name && (
                  <button
                    className="explorer__btn explorer__btn--secondary"
                    onClick={handleDownloadDocument}
                  >
                    Скачать файл
                  </button>
                )}

                <button
                  className="explorer__btn explorer__btn--danger"
                  onClick={handleDeleteDocument}
                >
                  Удалить документ
                </button>
              </div>
            </div>
          )}

          {!selectedFolder && !selectedDocument && (
            <div className="explorer__empty">Выбери папку или документ в дереве слева</div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ExplorerPage;