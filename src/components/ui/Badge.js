export function Badge({ text, variant = 'gray', dot = false }) {
  const el = document.createElement('span');
  el.className = `badge b-${variant}`;
  el.innerHTML = dot ? `<span class="dot"></span> ${text}` : text;
  return el;
}

export function LiveBadge() {
  const el = document.createElement('span');
  el.className = 'badge b-live';
  el.innerHTML = '<span class="dot"></span> Live';
  return el;
}
