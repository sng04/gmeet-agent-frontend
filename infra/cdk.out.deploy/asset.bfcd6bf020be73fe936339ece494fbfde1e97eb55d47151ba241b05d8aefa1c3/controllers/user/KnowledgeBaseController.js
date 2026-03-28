import { loadTemplate } from '../../utils/template.js';
import { Table } from '../../components/ui/Table.js';
import { navigate } from '../../router.js';

const mockFolders = [
  {
    id: '1',
    name: 'Acme Corp Sales',
    tag: 'acme-corp',
    docs: [
      { id: '1', name: 'Product Overview.pdf', type: 'pdf', status: 'indexed', size: '2.4 MB' },
      { id: '2', name: 'Technical Specs.docx', type: 'docx', status: 'indexed', size: '1.1 MB' },
    ],
  },
  {
    id: '2',
    name: 'Global Logistics Demo',
    tag: 'logistics',
    docs: [
      { id: '3', name: 'Demo Script.pdf', type: 'pdf', status: 'indexed', size: '890 KB' },
    ],
  },
];

export default async function KnowledgeBaseController(params) {
  const el = await loadTemplate('/templates/user/knowledge-base.html', 'knowledge-base');

  // Breadcrumb back
  el.querySelector('[data-action="backNav"]').addEventListener('click', (e) => {
    e.preventDefault();
    navigate('');
  });

  const foldersContainer = el.querySelector('[data-bind="folders"]');

  mockFolders.forEach(folder => {
    const folderEl = document.createElement('div');
    folderEl.className = 'kb-folder';
    folderEl.innerHTML = `
      <div class="kb-folder-hdr">
        <div class="flex items-c gap-3">
          <span style="font-size:18px">📁</span>
          <strong>${folder.name}</strong>
          <span class="kb-folder-tag">${folder.tag}</span>
        </div>
        <span class="text-xs text-t">${folder.docs.length} documents</span>
      </div>
    `;

    const table = Table({
      columns: [
        { label: 'Document', render: r => `<div class="flex items-c gap-3"><div class="doc-icon ${r.type}">${r.type === 'pdf' ? '📕' : r.type === 'docx' ? '📘' : '📄'}</div><strong>${r.name}</strong></div>` },
        { label: 'Status', render: r => `<span class="badge b-${r.status}">${r.status}</span>` },
        { label: 'Size', key: 'size', className: 'mono text-xs' },
      ],
      data: folder.docs,
    });

    folderEl.appendChild(table);
    foldersContainer.appendChild(folderEl);
  });

  return el;
}
