export function FormGroup({ label, required, hint, children }) {
  const el = document.createElement('div');
  el.className = 'form-g';
  el.innerHTML = `
    <label class="form-l">${label}${required ? ' <span class="req">*</span>' : ''}</label>
  `;
  if (typeof children === 'string') {
    el.innerHTML += children;
  } else if (children) {
    el.appendChild(children);
  }
  if (hint) el.innerHTML += `<div class="form-h">${hint}</div>`;
  return el;
}

export function Input({ type = 'text', name, placeholder, value = '', required, className = '' }) {
  const el = document.createElement('input');
  el.type = type;
  el.name = name;
  el.placeholder = placeholder || '';
  el.value = value;
  el.className = `form-i ${className}`.trim();
  if (required) el.required = true;
  return el;
}

export function Select({ name, options, value = '', placeholder, className = '' }) {
  const el = document.createElement('select');
  el.name = name;
  el.className = `form-sel ${className}`.trim();
  el.innerHTML = `
    ${placeholder ? `<option value="">${placeholder}</option>` : ''}
    ${options.map(opt => `<option value="${opt.value}"${opt.value === value ? ' selected' : ''}>${opt.label}</option>`).join('')}
  `;
  return el;
}

export function Textarea({ name, placeholder, value = '', rows = 4, className = '' }) {
  const el = document.createElement('textarea');
  el.name = name;
  el.placeholder = placeholder || '';
  el.value = value;
  el.rows = rows;
  el.className = `form-ta ${className}`.trim();
  return el;
}

export function SearchBox({ placeholder = 'Search...', onInput }) {
  const el = document.createElement('div');
  el.className = 'search-box';
  el.innerHTML = `<span class="si">🔍</span><input placeholder="${placeholder}">`;
  if (onInput) el.querySelector('input').addEventListener('input', (e) => onInput(e.target.value));
  return el;
}

export function FilterSelect({ options, value, onChange }) {
  const el = document.createElement('select');
  el.className = 'fsel';
  el.innerHTML = options.map(opt => `<option value="${opt.value}"${opt.value === value ? ' selected' : ''}>${opt.label}</option>`).join('');
  if (onChange) el.addEventListener('change', (e) => onChange(e.target.value));
  return el;
}
