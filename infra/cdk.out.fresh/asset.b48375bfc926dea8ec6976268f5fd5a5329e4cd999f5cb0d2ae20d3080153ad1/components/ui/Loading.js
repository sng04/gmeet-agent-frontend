// Global loading overlay
let overlayEl = null;

export function showLoading(message = 'Processing...') {
  if (overlayEl) return; // Already showing

  overlayEl = document.createElement('div');
  overlayEl.className = 'loading-overlay';
  overlayEl.innerHTML = `
    <div class="loading-content">
      <div class="loading-spinner"></div>
      <div class="loading-text">${message}</div>
    </div>
  `;
  document.body.appendChild(overlayEl);
  requestAnimationFrame(() => overlayEl.classList.add('open'));
}

export function hideLoading() {
  if (!overlayEl) return;
  overlayEl.classList.remove('open');
  setTimeout(() => {
    overlayEl?.remove();
    overlayEl = null;
  }, 200);
}

// Helper to wrap async operations with loading
export async function withLoading(asyncFn, message = 'Processing...') {
  showLoading(message);
  try {
    return await asyncFn();
  } finally {
    hideLoading();
  }
}
