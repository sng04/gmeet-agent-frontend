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

export default function KnowledgeBasePage() {
  const el = document.createElement('div');
  el.className = 'page';

  el.innerHTML = `
    <div class="bc">
      <a href="#" id="back-link">Dashboard</a>
      <span class="sep">›</span>
      <span class="cur">Knowledge Base</span>
    </div>
    <div class="pg-hdr">
      <div>
        <h1>Knowledge Base</h1>
        <div class="pg-sub">Documents available to AI agents during sessions</div>
      </div>
    </div>
    <div id="folders"></div>
  `;

  el.querySelector('#back-link').addEventListener('click', (e) => {
    e.preventDefault();
    navigate('');
  });

  const foldersContainer = el.querySelector('#folders');

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
