import { Modal } from './Modal.js';
import { Button } from './Button.js';
import { showLoading, hideLoading } from './Loading.js';

/**
 * Reusable confirmation dialog for delete/remove actions
 * @param {Object} options
 * @param {string} options.title - Modal title (e.g., "Delete User")
 * @param {string} options.message - Main message (supports HTML)
 * @param {string} [options.warning] - Warning text (default: "This action cannot be undone.")
 * @param {string} [options.confirmText] - Confirm button text (default: "Delete")
 * @param {string} [options.confirmingText] - Text while processing (default: "Deleting...")
 * @param {string} [options.loadingMessage] - Loading overlay message
 * @param {Function} options.onConfirm - Async function to execute on confirm
 * @param {Function} [options.onSuccess] - Called after successful confirm
 * @param {Function} [options.onError] - Called on error (default: alert)
 */
export function ConfirmDialog({
  title,
  message,
  warning = 'This action cannot be undone.',
  confirmText = 'Delete',
  confirmingText = 'Deleting...',
  loadingMessage,
  onConfirm,
  onSuccess,
  onError = (err) => alert(err.message || 'Operation failed')
}) {
  const bodyEl = document.createElement('div');
  bodyEl.innerHTML = `
    <p>${message}</p>
    ${warning ? `<p style="color: var(--err-600); font-size: 13px; margin-top: 12px;">${warning}</p>` : ''}
  `;

  const footerEl = document.createElement('div');
  footerEl.className = 'flex gap-3 jc-end';

  let modal;

  const cancelBtn = Button({ text: 'Cancel', variant: 's', onClick: () => modal.close() });
  const confirmBtn = Button({
    text: confirmText,
    variant: 'd',
    onClick: async () => {
      confirmBtn.disabled = true;
      confirmBtn.textContent = confirmingText;
      
      // Close modal first, then show loading
      modal.close();
      if (loadingMessage) showLoading(loadingMessage);

      try {
        await onConfirm();
        if (onSuccess) onSuccess();
      } catch (err) {
        onError(err);
      } finally {
        if (loadingMessage) hideLoading();
      }
    }
  });

  footerEl.appendChild(cancelBtn);
  footerEl.appendChild(confirmBtn);

  modal = Modal({ title, body: bodyEl, footer: footerEl });
  return modal;
}
