export function Table({ title, columns, data, footer, actions }) {
  const el = document.createElement('div');
  el.className = 'tbl-wrap';

  const headerHtml = title || actions ? `
    <div class="tbl-hdr">
      ${title ? `<div class="tbl-title">${title}</div>` : '<div></div>'}
      ${actions ? `<div class="tbl-actions">${actions}</div>` : ''}
    </div>
  ` : '';

  const footerHtml = footer ? `<div class="tbl-foot">${footer}</div>` : '';

  el.innerHTML = `
    ${headerHtml}
    <table style="table-layout:fixed;width:100%">
      <thead>
        <tr>${columns.map(col => `<th${col.width ? ` style="width:${col.width}"` : ''}>${col.label}</th>`).join('')}</tr>
      </thead>
      <tbody></tbody>
    </table>
    ${footerHtml}
  `;

  const tbody = el.querySelector('tbody');

  data.forEach(row => {
    const tr = document.createElement('tr');
    if (row._onClick) {
      tr.style.cursor = 'pointer';
      tr.addEventListener('click', row._onClick);
    }
    columns.forEach(col => {
      const td = document.createElement('td');
      const value = col.render ? col.render(row) : row[col.key];
      if (typeof value === 'string') td.innerHTML = value;
      else if (value instanceof Node) td.appendChild(value);
      else td.textContent = value ?? '';
      if (col.className) td.className = col.className;
      tr.appendChild(td);
    });
    tbody.appendChild(tr);
  });

  return el;
}
