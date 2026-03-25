export function Toggle({ id, checked = false, label = '', onChange }) {
  const wrapper = document.createElement('div');
  wrapper.className = 'flex items-c gap-3';

  wrapper.innerHTML = `
    <label class="toggle-wrap">
      <input type="checkbox" id="${id}" ${checked ? 'checked' : ''}>
      <span class="toggle-slider"></span>
    </label>
    ${label ? `<span class="toggle-label text-sm">${label}</span>` : ''}
  `;

  const input = wrapper.querySelector('input');
  const labelEl = wrapper.querySelector('.toggle-label');

  if (onChange) {
    input.addEventListener('change', (e) => {
      onChange(e.target.checked, labelEl);
    });
  }

  return wrapper;
}

export function getToggleValue(container, id) {
  const input = container.querySelector(`#${id}`);
  return input ? input.checked : false;
}

export function setToggleValue(container, id, checked, label) {
  const input = container.querySelector(`#${id}`);
  if (input) {
    input.checked = checked;
  }
  if (label) {
    const labelEl = container.querySelector(`#${id}`)?.closest('.flex')?.querySelector('.toggle-label');
    if (labelEl) {
      labelEl.textContent = label;
    }
  }
}
