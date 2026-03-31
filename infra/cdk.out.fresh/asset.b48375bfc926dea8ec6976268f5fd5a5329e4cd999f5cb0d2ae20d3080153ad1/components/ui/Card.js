import { navigate } from '../../router.js';

export function StatCard({ icon, iconColor = 'blue', label, value, meta, onClick, link, live = false }) {
  const el = document.createElement('div');
  el.className = 'stat';
  if (link) el.style.cursor = 'pointer';

  el.innerHTML = `
    <div class="stat-icon ${iconColor}">${icon}</div>
    <div class="flex items-c gap-2">
      <div class="stat-label">${label}</div>
      ${live ? '<span class="badge b-live" style="font-size:10px"><span class="dot"></span> Live</span>' : ''}
    </div>
    <div class="stat-val">${value}</div>
    ${meta ? `<div class="stat-meta">${meta}</div>` : ''}
  `;

  if (link) {
    el.addEventListener('click', () => navigate(link));
  } else if (onClick) {
    el.addEventListener('click', onClick);
  }

  return el;
}

export function Card({ header, body, footer, className = '' }) {
  const el = document.createElement('div');
  el.className = `card ${className}`.trim();

  if (header) {
    const hdr = document.createElement('div');
    hdr.className = 'card-hdr';
    if (typeof header === 'string') hdr.innerHTML = header;
    else hdr.appendChild(header);
    el.appendChild(hdr);
  }

  if (body) {
    const bd = document.createElement('div');
    bd.className = 'card-body';
    if (typeof body === 'string') bd.innerHTML = body;
    else bd.appendChild(body);
    el.appendChild(bd);
  }

  if (footer) {
    const ft = document.createElement('div');
    ft.className = 'card-foot';
    if (typeof footer === 'string') ft.innerHTML = footer;
    else ft.appendChild(footer);
    el.appendChild(ft);
  }

  return el;
}
