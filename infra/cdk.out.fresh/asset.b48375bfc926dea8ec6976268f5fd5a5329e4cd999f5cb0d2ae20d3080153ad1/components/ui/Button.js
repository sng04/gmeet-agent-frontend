export function Button({ text, variant = 'p', size = '', icon = '', onClick, className = '' }) {
  const btn = document.createElement('button');
  btn.className = `btn btn-${variant} ${size ? `btn-${size}` : ''} ${className}`.trim();
  btn.innerHTML = icon ? `${icon} ${text}` : text;
  if (onClick) btn.addEventListener('click', onClick);
  return btn;
}
