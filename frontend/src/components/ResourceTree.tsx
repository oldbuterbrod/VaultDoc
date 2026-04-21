import React, { useMemo, useState } from 'react';
import { Document, Folder } from '../types';
import './ResourceTree.css';

interface Props {
  folders: Folder[];
  documents: Document[];
  selectedFolderPublicId: string | null;
  selectedDocumentPublicId: string | null;
  onSelectFolder: (folder: Folder) => void;
  onSelectDocument: (document: Document) => void;
}

const ResourceTree: React.FC<Props> = ({
  folders,
  documents,
  selectedFolderPublicId,
  selectedDocumentPublicId,
  onSelectFolder,
  onSelectDocument,
}) => {
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  const foldersByParent = useMemo(() => {
    const map: Record<string, Folder[]> = {};
    for (const folder of folders) {
      const key = String(folder.parent_id ?? 'root');
      if (!map[key]) map[key] = [];
      map[key].push(folder);
    }
    return map;
  }, [folders]);

  const documentsByFolder = useMemo(() => {
    const map: Record<string, Document[]> = {};
    for (const document of documents) {
      const key = String(document.folder_id ?? 'root');
      if (!map[key]) map[key] = [];
      map[key].push(document);
    }
    return map;
  }, [documents]);

  const toggle = (folderPublicId: string) => {
    setExpanded((prev) => ({ ...prev, [folderPublicId]: !prev[folderPublicId] }));
  };

  const renderFolder = (folder: Folder) => {
    const childrenFolders = foldersByParent[String(folder.id)] || [];
    const childrenDocuments = documentsByFolder[String(folder.id)] || [];
    const isOpen = expanded[folder.public_id] ?? true;

    return (
      <div key={folder.public_id} className="tree__node">
        <div
          className={`tree__item ${selectedFolderPublicId === folder.public_id ? 'tree__item--selected' : ''}`}
        >
          <button className="tree__toggle" onClick={() => toggle(folder.public_id)}>
            {isOpen ? '▾' : '▸'}
          </button>
          <button className="tree__label tree__label--folder" onClick={() => onSelectFolder(folder)}>
            📁 {folder.name}
          </button>
        </div>

        {isOpen && (
          <div className="tree__children">
            {childrenFolders.map(renderFolder)}
            {childrenDocuments.map((document) => (
              <div key={document.public_id} className="tree__node">
                <div
                  className={`tree__item ${
                    selectedDocumentPublicId === document.public_id ? 'tree__item--selected' : ''
                  }`}
                >
                  <span className="tree__toggle tree__toggle--empty" />
                  <button className="tree__label tree__label--document" onClick={() => onSelectDocument(document)}>
                    📄 {document.title}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  const rootFolders = foldersByParent.root || [];
  const rootDocuments = documentsByFolder.root || [];

  return (
    <div className="tree">
      {rootFolders.map(renderFolder)}

      {rootDocuments.map((document) => (
        <div key={document.public_id} className="tree__node">
          <div
            className={`tree__item ${
              selectedDocumentPublicId === document.public_id ? 'tree__item--selected' : ''
            }`}
          >
            <span className="tree__toggle tree__toggle--empty" />
            <button className="tree__label tree__label--document" onClick={() => onSelectDocument(document)}>
              📄 {document.title}
            </button>
          </div>
        </div>
      ))}
    </div>
  );
};

export default ResourceTree;