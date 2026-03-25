/**
 * Alert/Notice component
 * @param {Object} options
 * @param {string} options.message - Alert message (can include HTML)
 * @param {string} options.variant - 'warn', 'info', 'error', 'success'
 * @param {string} options.icon - Emoji or icon to display
 * @returns {HTMLElement}
 */
export function Alert({ message, variant = 'info', icon = '' }) {
  const el = document.createElement('div');
  
  const variantStyles = {
    warn: { bg: 'var(--warn-50)', border: 'var(--warn-100)', color: 'var(--warn-700)' },
    info: { bg: 'var(--pri-50)', border: 'var(--pri-100)', color: 'var(--pri-700)' },
    error: { bg: 'var(--err-50)', border: 'var(--err-100)', color: 'var(--err-700)' },
    success: { bg: 'var(--ok-50)', border: 'var(--ok-100)', color: 'var(--ok-700)' },
  };
  
  const style = variantStyles[variant] || variantStyles.info;
  
  el.className = 'alert';
  el.style.cssText = `
    background: ${style.bg};
    border: 1px solid ${style.border};
    border-radius: 8px;
    padding: 12px 20px;
    margin-bottom: 20px;
  `;
  
  el.innerHTML = `
    <div class="flex items-c gap-3">
      ${icon ? `<span>${icon}</span>` : ''}
      <span class="text-sm" style="color:${style.color}">${message}</span>
    </div>
  `;
  
  return el;
}
