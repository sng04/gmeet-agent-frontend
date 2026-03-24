export function Modal({ title, body, footer, onClose }) {
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';

  overlay.innerHTML = `
    <div class="modal">
      <div class="modal-hdr">
        <div class="modal-title">${title}</div>
      </div>
      <div class="modal-body"></div>
      ${footer ? '<div class="modal-foot"></div>' : ''}
    </div>
  `;

  const modalBody = overlay.querySelector('.modal-body');
  if (typeof body === 'string') modalBody.innerHTML = body;
  else if (body) modalBody.appendChild(body);

  if (footer) {
    const modalFoot = overlay.querySelector('.modal-foot');
    if (typeof footer === 'string') modalFoot.innerHTML = footer;
    else modalFoot.appendChild(footer);
  }

  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) {
      overlay.classList.remove('open');
      setTimeout(() => overlay.remove(), 200);
      if (onClose) onClose();
    }
  });

  document.body.appendChild(overlay);
  requestAnimationFrame(() => overlay.classList.add('open'));

  return {
    el: overlay,
    close: () => {
      overlay.classList.remove('open');
      setTimeout(() => overlay.remove(), 200);
      if (onClose) onClose();
    },
  };
}
