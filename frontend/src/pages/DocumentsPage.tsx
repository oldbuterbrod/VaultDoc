import React, { useState, useEffect } from 'react';
import { documentAPI, folderAPI } from '../services/api';

interface DocumentType {
  id: number;
  title: string;
  content_preview?: string;
  content?: string;
  folder_id?: number;
  folder_name?: string;
  owner_id: number;
  owner_name?: string;
  owner_role?: string;
  status: string;
  created_at: string;
  updated_at: string;
}

interface FolderType {
  id: number;
  name: string;
  parent_id?: number;
  children: FolderType[];
  documents: DocumentType[];
}

interface DocumentFormData {
  title: string;
  content: string;
  folder_id?: number;
  status: string;
}

interface FolderFormData {
  name: string;
  parent_id?: number;
}

const DocumentsPage: React.FC = () => {
  const [documents, setDocuments] = useState<DocumentType[]>([]);
  const [folders, setFolders] = useState<any[]>([]);
  const [selectedDocument, setSelectedDocument] = useState<DocumentType | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingFullContent, setLoadingFullContent] = useState(false);
  const [expandedFolders, setExpandedFolders] = useState<Set<number>>(new Set());
  
  // Состояния для модальных окон и форм
  const [showDocumentModal, setShowDocumentModal] = useState(false);
  const [showFolderModal, setShowFolderModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<{type: 'document' | 'folder', id: number, name: string} | null>(null);
  
  // Формы
  const [documentForm, setDocumentForm] = useState<DocumentFormData>({
    title: '',
    content: '',
    folder_id: undefined,
    status: 'draft'
  });
  
  const [folderForm, setFolderForm] = useState<FolderFormData>({
    name: '',
    parent_id: undefined
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      
      const [docsData, foldersData] = await Promise.all([
        documentAPI.getDocuments(),
        folderAPI.getFolders(),
      ]);
      
      setDocuments(docsData);
      setFolders(foldersData);
      
    } catch (error) {
      console.error('Error loading data:', error);
      setDocuments([]);
      setFolders([]);
    } finally {
      setLoading(false);
    }
  };

  const handleDocumentClick = async (doc: DocumentType) => {
    setSelectedDocument(doc);
    setLoadingFullContent(true);
    
    try {
      const fullDoc = await documentAPI.getDocumentById(doc.id);
      
      if (fullDoc) {
        setSelectedDocument({
          ...doc,
          content: fullDoc.content || fullDoc.content_preview || doc.content_preview,
        });
      }
    } catch (error) {
      console.error('Error loading full document:', error);
    } finally {
      setLoadingFullContent(false);
    }
  };

  // 🔥 ДОБАВЛЕНИЕ ДОКУМЕНТА
  const handleAddDocument = () => {
    setEditMode(false);
    setDocumentForm({
      title: '',
      content: '',
      folder_id: undefined,
      status: 'draft'
    });
    setShowDocumentModal(true);
  };

  // 🔥 РЕДАКТИРОВАНИЕ ДОКУМЕНТА
  const handleEditDocument = (doc: DocumentType) => {
    setEditMode(true);
    setDocumentForm({
      title: doc.title,
      content: doc.content || doc.content_preview || '',
      folder_id: doc.folder_id || undefined,
      status: doc.status
    });
    setShowDocumentModal(true);
  };

  // 🔥 УДАЛЕНИЕ ДОКУМЕНТА
  const handleDeleteDocument = (doc: DocumentType) => {
    setItemToDelete({
      type: 'document',
      id: doc.id,
      name: doc.title
    });
    setShowDeleteConfirm(true);
  };

  // 🔥 ПОДТВЕРЖДЕНИЕ УДАЛЕНИЯ
  const confirmDelete = async () => {
  if (!itemToDelete) return;
  
  try {
    if (itemToDelete.type === 'document') {
      await documentAPI.deleteDocument(itemToDelete.id);
      // Если удаляемый документ выбран, очищаем выбранный
      if (selectedDocument && selectedDocument.id === itemToDelete.id) {
        setSelectedDocument(null);
      }
    } else {
      await folderAPI.deleteFolder(itemToDelete.id);
    }
    
    // Перезагружаем данные
    await loadData();
    
    // Закрываем модальное окно
    setShowDeleteConfirm(false);
    setItemToDelete(null);
    
    alert('Успешно удалено');
    
  } catch (error: any) {
    console.error('Error deleting:', error);
    
    const errorMessage = error.response?.data?.detail || 
                        error.response?.data?.message || 
                        'Ошибка при удалении';
    alert(`Ошибка: ${errorMessage}`);
  }
};

  // 🔥 СОХРАНЕНИЕ ДОКУМЕНТА (создание/редактирование)
  const handleSaveDocument = async () => {
  try {
    if (!documentForm.title.trim()) {
      alert('Введите название документа');
      return;
    }
    
    if (editMode && selectedDocument) {
      // Редактирование существующего документа
      await documentAPI.updateDocument(selectedDocument.id, documentForm);
    } else {
      // Создание нового документа
      await documentAPI.createDocument(documentForm);
    }
    
    // Перезагружаем данные
    await loadData();
    
    // Закрываем модальное окно
    setShowDocumentModal(false);
    
    // Если редактировали выбранный документ, обновляем его
    if (editMode && selectedDocument) {
      const updatedDoc = await documentAPI.getDocumentById(selectedDocument.id);
      if (updatedDoc) {
        setSelectedDocument({
          ...selectedDocument,
          ...updatedDoc,
          content: updatedDoc.content || updatedDoc.content_preview
        });
      }
    }
    
  } catch (error: any) {
    console.error('Error saving document:', error);
    
    // Более информативное сообщение об ошибке
    const errorMessage = error.response?.data?.detail || 
                        error.response?.data?.message || 
                        'Ошибка при сохранении документа';
    alert(`Ошибка: ${errorMessage}`);
  }
};

  // 🔥 ДОБАВЛЕНИЕ ПАПКИ
  const handleAddFolder = () => {
    setFolderForm({
      name: '',
      parent_id: undefined
    });
    setShowFolderModal(true);
  };

  // 🔥 СОХРАНЕНИЕ ПАПКИ
  const handleSaveFolder = async () => {
  try {
    if (!folderForm.name.trim()) {
      alert('Введите название папки');
      return;
    }
    
    await folderAPI.createFolder(folderForm);
    
    // Перезагружаем данные
    await loadData();
    
    // Закрываем модальное окно
    setShowFolderModal(false);
    
    alert('Папка успешно создана');
    
  } catch (error: any) {
    console.error('Error saving folder:', error);
    
    const errorMessage = error.response?.data?.detail || 
                        error.response?.data?.message || 
                        'Ошибка при создании папки';
    alert(`Ошибка: ${errorMessage}`);
  }
};

  // Функция для построения дерева папок
  const buildFolderTree = (): FolderType[] => {
    const folderMap = new Map<number, FolderType>();
    const rootFolders: FolderType[] = [];
    
    // Создаем структуру папок
    folders.forEach((folder: any) => {
      folderMap.set(folder.id, {
        ...folder,
        children: [],
        documents: []
      });
    });
    
    // Добавляем дочерние папки
    folders.forEach((folder: any) => {
      const folderNode = folderMap.get(folder.id);
      if (!folderNode) return;
      
      if (folder.parent_id && folderMap.has(folder.parent_id)) {
        const parent = folderMap.get(folder.parent_id);
        if (parent) {
          parent.children.push(folderNode);
        }
      } else {
        rootFolders.push(folderNode);
      }
    });
    
    // Добавляем документы в папки
    documents.forEach(doc => {
      if (doc.folder_id && folderMap.has(doc.folder_id)) {
        const folder = folderMap.get(doc.folder_id);
        if (folder) {
          folder.documents.push(doc);
        }
      }
    });
    
    return rootFolders;
  };

  const toggleFolder = (folderId: number) => {
    const newExpanded = new Set(expandedFolders);
    if (newExpanded.has(folderId)) {
      newExpanded.delete(folderId);
    } else {
      newExpanded.add(folderId);
    }
    setExpandedFolders(newExpanded);
  };

  const expandAllFolders = () => {
    const allFolderIds = folders.map(f => f.id);
    setExpandedFolders(new Set(allFolderIds));
  };

  const collapseAllFolders = () => {
    setExpandedFolders(new Set());
  };

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ru-RU', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusInfo = (status: string) => {
    const statusLower = status.toLowerCase();
    
    if (statusLower.includes('approved')) {
      return {
        color: '#4caf50',
        bgColor: '#e8f5e9',
        label: 'Утвержден',
        icon: '✅'
      };
    }
    if (statusLower.includes('draft')) {
      return {
        color: '#9e9e9e',
        bgColor: '#f5f5f5',
        label: 'Черновик',
        icon: '📝'
      };
    }
    if (statusLower.includes('review')) {
      return {
        color: '#ff9800',
        bgColor: '#fff3e0',
        label: 'На проверке',
        icon: '⏳'
      };
    }
    if (statusLower.includes('rejected')) {
      return {
        color: '#f44336',
        bgColor: '#ffebee',
        label: 'Отклонен',
        icon: '❌'
      };
    }
    return {
      color: '#9e9e9e',
      bgColor: '#f5f5f5',
      label: status,
      icon: '📄'
    };
  };

  // Рекурсивный рендеринг папок с контекстным меню
  const renderFolder = (folder: FolderType, depth = 0) => {
    const isExpanded = expandedFolders.has(folder.id);
    const paddingLeft = depth * 20 + 10;

    return (
      <div key={folder.id} style={{ marginBottom: '5px' }}>
        {/* Папка */}
        <div 
          style={{
            padding: '10px',
            paddingLeft: `${paddingLeft}px`,
            backgroundColor: isExpanded ? '#e3f2fd' : '#f8f9fa',
            border: '1px solid #bbdefb',
            borderRadius: '5px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            transition: 'all 0.2s',
            position: 'relative'
          }}
          onClick={() => toggleFolder(folder.id)}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = isExpanded ? '#bbdefb' : '#e0e0e0';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = isExpanded ? '#e3f2fd' : '#f8f9fa';
          }}
        >
          <span style={{ marginRight: '10px', fontSize: '18px' }}>
            {isExpanded ? '📂' : '📁'}
          </span>
          <span style={{ fontWeight: 'bold', color: '#1565c0', flex: 1 }}>
            {folder.name}
          </span>
          <span style={{ color: '#666', fontSize: '12px', marginLeft: '10px' }}>
            ({folder.children.length} папок, {folder.documents.length} док.)
          </span>
          <span style={{ marginLeft: '10px', fontSize: '12px', color: '#95a5a6' }}>
            {isExpanded ? '▼' : '▶'}
          </span>
          
          {/* Контекстные кнопки для папки */}
          <div style={{
            position: 'absolute',
            right: '10px',
            top: '50%',
            transform: 'translateY(-50%)',
            display: 'flex',
            gap: '5px',
            opacity: 0,
            transition: 'opacity 0.2s'
          }}
          onMouseEnter={(e) => e.currentTarget.style.opacity = '1'}
          onMouseLeave={(e) => e.currentTarget.style.opacity = '0'}
          onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={(e) => {
                e.stopPropagation();
                setFolderForm({
                  name: '',
                  parent_id: folder.id
                });
                setShowFolderModal(true);
              }}
              style={{
                padding: '4px 8px',
                backgroundColor: '#4caf50',
                color: 'white',
                border: 'none',
                borderRadius: '3px',
                fontSize: '11px',
                cursor: 'pointer'
              }}
              title="Добавить подпапку"
            >
              + Папка
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                setDocumentForm({
                  title: '',
                  content: '',
                  folder_id: folder.id,
                  status: 'draft'
                });
                setEditMode(false);
                setShowDocumentModal(true);
              }}
              style={{
                padding: '4px 8px',
                backgroundColor: '#2196f3',
                color: 'white',
                border: 'none',
                borderRadius: '3px',
                fontSize: '11px',
                cursor: 'pointer'
              }}
              title="Добавить документ"
            >
              + Документ
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                setItemToDelete({
                  type: 'folder',
                  id: folder.id,
                  name: folder.name
                });
                setShowDeleteConfirm(true);
              }}
              style={{
                padding: '4px 8px',
                backgroundColor: '#f44336',
                color: 'white',
                border: 'none',
                borderRadius: '3px',
                fontSize: '11px',
                cursor: 'pointer'
              }}
              title="Удалить папку"
            >
              ✕
            </button>
          </div>
        </div>
        
        {/* Содержимое папки (если раскрыта) */}
        {isExpanded && (
          <div style={{ marginTop: '5px', marginLeft: '20px' }}>
            {/* Документы в папке */}
            {folder.documents.map(doc => {
              const statusInfo = getStatusInfo(doc.status);
              return (
                <div 
                  key={doc.id}
                  style={{
                    padding: '10px',
                    paddingLeft: `${paddingLeft + 10}px`,
                    margin: '4px 0',
                    backgroundColor: '#ffffff',
                    border: '1px solid #e0e0e0',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    transition: 'all 0.2s',
                    position: 'relative'
                  }}
                  onClick={() => handleDocumentClick(doc)}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = '#f5f5f5';
                    e.currentTarget.style.transform = 'translateX(2px)';
                    e.currentTarget.style.boxShadow = '0 2px 4px rgba(0,0,0,0.1)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = '#ffffff';
                    e.currentTarget.style.transform = 'none';
                    e.currentTarget.style.boxShadow = 'none';
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', flex: 1, minWidth: 0 }}>
                    <span style={{ marginRight: '10px', fontSize: '16px', flexShrink: 0 }}>📄</span>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ 
                        fontWeight: '500',
                        marginBottom: '2px',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap'
                      }}>
                        {doc.title}
                      </div>
                      {doc.content_preview && (
                        <div style={{ 
                          fontSize: '12px', 
                          color: '#666',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap'
                        }}>
                          {doc.content_preview.length > 50 
                            ? `${doc.content_preview.substring(0, 50)}...` 
                            : doc.content_preview}
                        </div>
                      )}
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
                    {doc.owner_name && (
                      <span style={{
                        padding: '2px 8px',
                        borderRadius: '10px',
                        backgroundColor: '#e3f2fd',
                        color: '#1565c0',
                        fontSize: '11px',
                        whiteSpace: 'nowrap'
                      }}>
                        {doc.owner_role === 'admin' ? '👑 ' : ''}
                        {doc.owner_name}
                      </span>
                    )}
                    <span style={{
                      padding: '3px 10px',
                      borderRadius: '12px',
                      backgroundColor: statusInfo.bgColor,
                      color: statusInfo.color,
                      fontSize: '11px',
                      fontWeight: '600',
                      whiteSpace: 'nowrap'
                    }}>
                      {statusInfo.label}
                    </span>
                  </div>
                  
                  {/* Контекстные кнопки для документа */}
                  <div style={{
                    position: 'absolute',
                    right: '10px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    display: 'flex',
                    gap: '5px',
                    opacity: 0,
                    transition: 'opacity 0.2s',
                    backgroundColor: 'white',
                    padding: '2px',
                    borderRadius: '3px'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.opacity = '1';
                    e.stopPropagation();
                  }}
                  onMouseLeave={(e) => e.currentTarget.style.opacity = '0'}
                  onClick={(e) => e.stopPropagation()}
                  >
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleEditDocument(doc);
                      }}
                      style={{
                        padding: '4px 8px',
                        backgroundColor: '#ff9800',
                        color: 'white',
                        border: 'none',
                        borderRadius: '3px',
                        fontSize: '11px',
                        cursor: 'pointer'
                      }}
                      title="Редактировать"
                    >
                      ✎
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteDocument(doc);
                      }}
                      style={{
                        padding: '4px 8px',
                        backgroundColor: '#f44336',
                        color: 'white',
                        border: 'none',
                        borderRadius: '3px',
                        fontSize: '11px',
                        cursor: 'pointer'
                      }}
                      title="Удалить"
                    >
                      ✕
                    </button>
                  </div>
                </div>
              );
            })}
            
            {/* Вложенные папки */}
            {folder.children.map(child => renderFolder(child, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  const folderTree = buildFolderTree();
  const documentsWithoutFolder = documents.filter(doc => !doc.folder_id);

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
          <div>Загрузка документов...</div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', height: 'calc(100vh - 100px)' }}>
      {/* Левая панель - дерево папок */}
      <div style={{ 
        flex: 1, 
        padding: '20px', 
        overflowY: 'auto',
        borderRight: '1px solid #e0e0e0',
        backgroundColor: '#fafafa',
        minWidth: '400px'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h1 style={{ color: '#2C3E50', margin: 0 }}>Документы</h1>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              onClick={handleAddFolder}
              style={{
                padding: '8px 16px',
                backgroundColor: '#4caf50',
                color: 'white',
                border: 'none',
                borderRadius: '5px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '5px'
              }}
            >
              + Папка
            </button>
            <button
              onClick={handleAddDocument}
              style={{
                padding: '8px 16px',
                backgroundColor: '#2196f3',
                color: 'white',
                border: 'none',
                borderRadius: '5px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '5px'
              }}
            >
              + Документ
            </button>
          </div>
        </div>
        
        <div style={{ display: 'flex', gap: '15px', marginBottom: '20px' }}>
          <button
            onClick={expandAllFolders}
            style={{
              padding: '8px 12px',
              backgroundColor: 'white',
              border: '1px solid #e0e0e0',
              borderRadius: '5px',
              cursor: 'pointer',
              flex: 1
            }}
          >
            Развернуть все
          </button>
          <button
            onClick={collapseAllFolders}
            style={{
              padding: '8px 12px',
              backgroundColor: 'white',
              border: '1px solid #e0e0e0',
              borderRadius: '5px',
              cursor: 'pointer',
              flex: 1
            }}
          >
            Свернуть все
          </button>
          <div style={{
            padding: '8px 12px',
            backgroundColor: 'white',
            border: '1px solid #e0e0e0',
            borderRadius: '5px',
            fontSize: '14px',
            color: '#666',
            flex: 1,
            textAlign: 'center'
          }}>
            📊 {documents.length} док. / {folders.length} пап.
          </div>
        </div>
        
        {/* Древовидная структура */}
        {folderTree.length === 0 && documentsWithoutFolder.length === 0 ? (
          <div style={{ 
            textAlign: 'center', 
            padding: '40px', 
            color: '#7f8c8d',
            backgroundColor: 'white',
            borderRadius: '8px',
            border: '1px dashed #ddd'
          }}>
            📁 Нет папок и документов
            <div style={{ marginTop: '15px' }}>
              <button
                onClick={handleAddFolder}
                style={{
                  padding: '8px 16px',
                  backgroundColor: '#4caf50',
                  color: 'white',
                  border: 'none',
                  borderRadius: '5px',
                  cursor: 'pointer',
                  marginRight: '10px'
                }}
              >
                Создать первую папку
              </button>
              <button
                onClick={handleAddDocument}
                style={{
                  padding: '8px 16px',
                  backgroundColor: '#2196f3',
                  color: 'white',
                  border: 'none',
                  borderRadius: '5px',
                  cursor: 'pointer'
                }}
              >
                Создать первый документ
              </button>
            </div>
          </div>
        ) : (
          <div>
            {/* Папки */}
            {folderTree.map(folder => renderFolder(folder))}
            
            {/* Документы без папки */}
            {documentsWithoutFolder.length > 0 && (
              <div style={{ marginTop: '20px' }}>
                <div style={{ 
                  padding: '10px', 
                  backgroundColor: '#f5f5f5', 
                  borderRadius: '5px',
                  marginBottom: '10px',
                  fontWeight: 'bold',
                  color: '#666',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center' }}>
                    <span style={{ marginRight: '8px' }}>📄</span>
                    Документы без папки ({documentsWithoutFolder.length})
                  </div>
                  <button
                    onClick={() => {
                      setDocumentForm({
                        title: '',
                        content: '',
                        folder_id: undefined,
                        status: 'draft'
                      });
                      setEditMode(false);
                      setShowDocumentModal(true);
                    }}
                    style={{
                      padding: '4px 8px',
                      backgroundColor: '#2196f3',
                      color: 'white',
                      border: 'none',
                      borderRadius: '3px',
                      fontSize: '11px',
                      cursor: 'pointer'
                    }}
                  >
                    + Добавить
                  </button>
                </div>
                {documentsWithoutFolder.map(doc => {
                  const statusInfo = getStatusInfo(doc.status);
                  return (
                    <div 
                      key={doc.id}
                      style={{
                        padding: '10px',
                        margin: '5px 0',
                        backgroundColor: 'white',
                        border: '1px solid #e0e0e0',
                        borderRadius: '5px',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        position: 'relative'
                      }}
                      onClick={() => handleDocumentClick(doc)}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = '#f9f9f9';
                        e.currentTarget.style.transform = 'translateX(2px)';
                        e.currentTarget.style.boxShadow = '0 2px 4px rgba(0,0,0,0.1)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = 'white';
                        e.currentTarget.style.transform = 'none';
                        e.currentTarget.style.boxShadow = 'none';
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', flex: 1 }}>
                        <span style={{ marginRight: '10px', fontSize: '16px' }}>📄</span>
                        <span>{doc.title}</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        {doc.owner_name && (
                          <span style={{
                            padding: '2px 8px',
                            borderRadius: '10px',
                            backgroundColor: '#e3f2fd',
                            color: '#1565c0',
                            fontSize: '11px'
                          }}>
                            {doc.owner_name}
                          </span>
                        )}
                        <span style={{
                          padding: '2px 8px',
                          borderRadius: '10px',
                          backgroundColor: statusInfo.bgColor,
                          color: statusInfo.color,
                          fontSize: '11px',
                          fontWeight: '500'
                        }}>
                          {statusInfo.label}
                        </span>
                      </div>
                      
                      {/* Контекстные кнопки для документа без папки */}
                      <div style={{
                        position: 'absolute',
                        right: '10px',
                        top: '50%',
                        transform: 'translateY(-50%)',
                        display: 'flex',
                        gap: '5px',
                        opacity: 0,
                        transition: 'opacity 0.2s',
                        backgroundColor: 'white',
                        padding: '2px',
                        borderRadius: '3px'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.opacity = '1';
                        e.stopPropagation();
                      }}
                      onMouseLeave={(e) => e.currentTarget.style.opacity = '0'}
                      onClick={(e) => e.stopPropagation()}
                      >
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleEditDocument(doc);
                          }}
                          style={{
                            padding: '4px 8px',
                            backgroundColor: '#ff9800',
                            color: 'white',
                            border: 'none',
                            borderRadius: '3px',
                            fontSize: '11px',
                            cursor: 'pointer'
                          }}
                        >
                          ✎
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteDocument(doc);
                          }}
                          style={{
                            padding: '4px 8px',
                            backgroundColor: '#f44336',
                            color: 'white',
                            border: 'none',
                            borderRadius: '3px',
                            fontSize: '11px',
                            cursor: 'pointer'
                          }}
                        >
                          ✕
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
      
      {/* Правая панель - просмотр документа */}
      <div style={{ 
        flex: 1.5, 
        padding: '20px',
        backgroundColor: '#f9f9f9',
        overflowY: 'auto',
        display: 'flex',
        flexDirection: 'column'
      }}>
        {selectedDocument ? (
          <>
            <div style={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'flex-start',
              marginBottom: '20px',
              flexShrink: 0
            }}>
              <div style={{ flex: 1 }}>
                <h2 style={{ 
                  color: '#2C3E50', 
                  margin: '0 0 10px 0',
                  fontSize: '24px',
                  lineHeight: '1.3',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px'
                }}>
                  <span>📄</span>
                  {selectedDocument.title}
                </h2>
                
                <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
                  {getStatusInfo(selectedDocument.status) && (
                    <span style={{
                      padding: '6px 12px',
                      borderRadius: '15px',
                      backgroundColor: getStatusInfo(selectedDocument.status).bgColor,
                      color: getStatusInfo(selectedDocument.status).color,
                      fontSize: '12px',
                      fontWeight: '600',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px'
                    }}>
                      {getStatusInfo(selectedDocument.status).icon}
                      {getStatusInfo(selectedDocument.status).label}
                    </span>
                  )}
                  
                  {selectedDocument.folder_name && (
                    <span style={{
                      padding: '5px 10px',
                      borderRadius: '12px',
                      backgroundColor: '#f0f0f0',
                      color: '#666',
                      fontSize: '12px',
                      display: 'inline-flex',
                      alignItems: 'center'
                    }}>
                      <span style={{ marginRight: '4px' }}>📁</span>
                      {selectedDocument.folder_name}
                    </span>
                  )}
                  
                  {selectedDocument.owner_name && (
                    <span style={{
                      padding: '5px 10px',
                      borderRadius: '12px',
                      backgroundColor: '#e3f2fd',
                      color: '#1565c0',
                      fontSize: '12px',
                      display: 'inline-flex',
                      alignItems: 'center'
                    }}>
                      <span style={{ marginRight: '4px' }}>
                        {selectedDocument.owner_role === 'admin' ? '👑' : '👤'}
                      </span>
                      {selectedDocument.owner_name}
                    </span>
                  )}
                </div>
              </div>
              
              <div style={{ display: 'flex', gap: '8px', flexShrink: 0 }}>
                <button 
                  onClick={() => handleEditDocument(selectedDocument)}
                  style={{
                    padding: '8px 16px',
                    backgroundColor: '#ff9800',
                    color: 'white',
                    border: 'none',
                    borderRadius: '5px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '5px'
                  }}
                >
                  ✎ Редактировать
                </button>
                <button 
                  onClick={() => handleDeleteDocument(selectedDocument)}
                  style={{
                    padding: '8px 16px',
                    backgroundColor: '#f44336',
                    color: 'white',
                    border: 'none',
                    borderRadius: '5px',
                    cursor: 'pointer'
                  }}
                >
                  ✕ Удалить
                </button>
                <button 
                  onClick={() => setSelectedDocument(null)}
                  style={{
                    padding: '8px 16px',
                    backgroundColor: '#95a5a6',
                    color: 'white',
                    border: 'none',
                    borderRadius: '5px',
                    cursor: 'pointer'
                  }}
                >
                  ✕ Закрыть
                </button>
              </div>
            </div>
            
            <div style={{ 
              display: 'grid', 
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', 
              gap: '15px',
              marginBottom: '25px',
              flexShrink: 0
            }}>
              <div>
                <div style={{ color: '#666', fontSize: '13px', marginBottom: '4px', fontWeight: '500' }}>Дата создания</div>
                <div style={{ fontSize: '14px', fontWeight: '500' }}>
                  {formatDateTime(selectedDocument.created_at)}
                </div>
              </div>
              
              <div>
                <div style={{ color: '#666', fontSize: '13px', marginBottom: '4px', fontWeight: '500' }}>Последнее обновление</div>
                <div style={{ fontSize: '14px', fontWeight: '500' }}>
                  {formatDateTime(selectedDocument.updated_at)}
                </div>
              </div>
              
              <div>
                <div style={{ color: '#666', fontSize: '13px', marginBottom: '4px', fontWeight: '500' }}>ID документа</div>
                <div style={{ 
                  fontSize: '14px', 
                  fontWeight: '500',
                  backgroundColor: '#f0f0f0',
                  padding: '4px 8px',
                  borderRadius: '4px',
                  display: 'inline-block'
                }}>
                  #{selectedDocument.id}
                </div>
              </div>
            </div>
            
            {/* Содержимое документа */}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
              <div style={{ 
                color: '#2C3E50', 
                fontSize: '16px', 
                fontWeight: '600',
                marginBottom: '15px',
                display: 'flex',
                alignItems: 'center',
                flexShrink: 0
              }}>
                <span style={{ marginRight: '8px' }}>📝</span>
                Содержимое документа
                {loadingFullContent && (
                  <span style={{ 
                    marginLeft: '10px', 
                    fontSize: '12px', 
                    color: '#ff9800',
                    backgroundColor: '#fff3cd',
                    padding: '2px 8px',
                    borderRadius: '10px'
                  }}>
                    Загрузка...
                  </span>
                )}
              </div>
              
              {loadingFullContent ? (
                <div style={{
                  flex: 1,
                  backgroundColor: 'white',
                  borderRadius: '8px',
                  border: '1px solid #e0e0e0',
                  display: 'flex',
                  justifyContent: 'center',
                  alignItems: 'center',
                  flexDirection: 'column'
                }}>
                  <div style={{ fontSize: '32px', marginBottom: '15px' }}>⏳</div>
                  <div>Загрузка полного текста документа...</div>
                </div>
              ) : (
                <div style={{
                  flex: 1,
                  backgroundColor: 'white',
                  padding: '25px',
                  borderRadius: '8px',
                  border: '1px solid #e0e0e0',
                  overflowY: 'auto',
                  whiteSpace: 'pre-wrap',
                  fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
                  fontSize: '15px',
                  lineHeight: '1.6',
                  color: '#333'
                }}>
                  {selectedDocument.content || selectedDocument.content_preview || (
                    <div style={{ color: '#7f8c8d', fontStyle: 'italic', textAlign: 'center', padding: '40px' }}>
                      Документ не содержит текста
                    </div>
                  )}
                </div>
              )}
            </div>
          </>
        ) : (
          <div style={{ 
            display: 'flex', 
            flexDirection: 'column',
            justifyContent: 'center', 
            alignItems: 'center', 
            height: '100%',
            color: '#7f8c8d',
            textAlign: 'center'
          }}>
            <div style={{ fontSize: '48px', marginBottom: '20px' }}>📄</div>
            <h3 style={{ color: '#95a5a6', marginBottom: '10px' }}>Выберите документ</h3>
            <p>Кликните на любой документ в дереве слева, чтобы просмотреть его содержимое</p>
            <div style={{ marginTop: '20px', display: 'flex', gap: '10px' }}>
              <button
                onClick={handleAddFolder}
                style={{
                  padding: '10px 20px',
                  backgroundColor: '#4caf50',
                  color: 'white',
                  border: 'none',
                  borderRadius: '5px',
                  cursor: 'pointer'
                }}
              >
                + Создать папку
              </button>
              <button
                onClick={handleAddDocument}
                style={{
                  padding: '10px 20px',
                  backgroundColor: '#2196f3',
                  color: 'white',
                  border: 'none',
                  borderRadius: '5px',
                  cursor: 'pointer'
                }}
              >
                + Создать документ
              </button>
            </div>
          </div>
        )}
      </div>

      {/* 🔥 МОДАЛЬНОЕ ОКНО ДЛЯ ДОКУМЕНТА */}
      {showDocumentModal && (
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
            width: '600px',
            maxWidth: '90%',
            maxHeight: '90%',
            overflow: 'auto'
          }}>
            <h2 style={{ marginBottom: '20px', color: '#2C3E50' }}>
              {editMode ? 'Редактировать документ' : 'Создать новый документ'}
            </h2>
            
            <div style={{ marginBottom: '15px' }}>
              <label style={{ display: 'block', marginBottom: '5px', fontWeight: '500' }}>
                Название документа *
              </label>
              <input
                type="text"
                value={documentForm.title}
                onChange={(e) => setDocumentForm({...documentForm, title: e.target.value})}
                style={{
                  width: '100%',
                  padding: '10px',
                  border: '1px solid #ddd',
                  borderRadius: '4px',
                  fontSize: '14px'
                }}
                placeholder="Введите название документа"
              />
            </div>
            
            <div style={{ marginBottom: '15px' }}>
              <label style={{ display: 'block', marginBottom: '5px', fontWeight: '500' }}>
                Папка
              </label>
              <select
                value={documentForm.folder_id || ''}
                onChange={(e) => setDocumentForm({
                  ...documentForm, 
                  folder_id: e.target.value ? parseInt(e.target.value) : undefined
                })}
                style={{
                  width: '100%',
                  padding: '10px',
                  border: '1px solid #ddd',
                  borderRadius: '4px',
                  fontSize: '14px'
                }}
              >
                <option value="">Без папки (корень)</option>
                {folders.map(folder => (
                  <option key={folder.id} value={folder.id}>
                    {folder.name}
                  </option>
                ))}
              </select>
            </div>
            
            <div style={{ marginBottom: '15px' }}>
              <label style={{ display: 'block', marginBottom: '5px', fontWeight: '500' }}>
                Статус
              </label>
              <select
                value={documentForm.status}
                onChange={(e) => setDocumentForm({...documentForm, status: e.target.value})}
                style={{
                  width: '100%',
                  padding: '10px',
                  border: '1px solid #ddd',
                  borderRadius: '4px',
                  fontSize: '14px'
                }}
              >
                <option value="draft">Черновик</option>
                <option value="review">На проверке</option>
                <option value="approved">Утвержден</option>
                <option value="rejected">Отклонен</option>
              </select>
            </div>
            
            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', marginBottom: '5px', fontWeight: '500' }}>
                Содержимое документа *
              </label>
              <textarea
                value={documentForm.content}
                onChange={(e) => setDocumentForm({...documentForm, content: e.target.value})}
                style={{
                  width: '100%',
                  padding: '10px',
                  border: '1px solid #ddd',
                  borderRadius: '4px',
                  fontSize: '14px',
                  minHeight: '200px',
                  fontFamily: 'monospace',
                  resize: 'vertical'
                }}
                placeholder="Введите текст документа..."
              />
            </div>
            
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button
                onClick={() => setShowDocumentModal(false)}
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
                onClick={handleSaveDocument}
                style={{
                  padding: '10px 20px',
                  backgroundColor: '#2196f3',
                  color: 'white',
                  border: 'none',
                  borderRadius: '5px',
                  cursor: 'pointer'
                }}
              >
                {editMode ? 'Сохранить изменения' : 'Создать документ'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 🔥 МОДАЛЬНОЕ ОКНО ДЛЯ ПАПКИ */}
      {showFolderModal && (
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
            maxWidth: '90%'
          }}>
            <h2 style={{ marginBottom: '20px', color: '#2C3E50' }}>
              Создать новую папку
            </h2>
            
            <div style={{ marginBottom: '15px' }}>
              <label style={{ display: 'block', marginBottom: '5px', fontWeight: '500' }}>
                Название папки *
              </label>
              <input
                type="text"
                value={folderForm.name}
                onChange={(e) => setFolderForm({...folderForm, name: e.target.value})}
                style={{
                  width: '100%',
                  padding: '10px',
                  border: '1px solid #ddd',
                  borderRadius: '4px',
                  fontSize: '14px'
                }}
                placeholder="Введите название папки"
              />
            </div>
            
            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', marginBottom: '5px', fontWeight: '500' }}>
                Родительская папка
              </label>
              <select
                value={folderForm.parent_id || ''}
                onChange={(e) => setFolderForm({
                  ...folderForm, 
                  parent_id: e.target.value ? parseInt(e.target.value) : undefined
                })}
                style={{
                  width: '100%',
                  padding: '10px',
                  border: '1px solid #ddd',
                  borderRadius: '4px',
                  fontSize: '14px'
                }}
              >
                <option value="">Без родительской (корень)</option>
                {folders.map(folder => (
                  <option key={folder.id} value={folder.id}>
                    {folder.name}
                  </option>
                ))}
              </select>
            </div>
            
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button
                onClick={() => setShowFolderModal(false)}
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
                onClick={handleSaveFolder}
                style={{
                  padding: '10px 20px',
                  backgroundColor: '#4caf50',
                  color: 'white',
                  border: 'none',
                  borderRadius: '5px',
                  cursor: 'pointer'
                }}
              >
                Создать папку
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 🔥 МОДАЛЬНОЕ ОКНО ПОДТВЕРЖДЕНИЯ УДАЛЕНИЯ */}
      {showDeleteConfirm && itemToDelete && (
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
              Вы уверены, что хотите удалить {itemToDelete.type === 'document' ? 'документ' : 'папку'} 
              <strong> "{itemToDelete.name}"</strong>?
              {itemToDelete.type === 'folder' && ' Все вложенные папки и документы также будут удалены!'}
            </p>
            
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button
                onClick={() => {
                  setShowDeleteConfirm(false);
                  setItemToDelete(null);
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

export default DocumentsPage;