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

export function getVerificationBadge(status) {
  if (status === 'verified') {
    return '<span class="badge b-ok"><span class="dot"></span> verified</span>';
  }
  if (status === 'validating') {
    return '<span class="badge b-info"><span class="badge-spinner"></span> validating</span>';
  }
  if (status === 'verification_failed') {
    return '<span class="badge b-err"><span class="dot"></span> failed</span>';
  }
  return '<span class="badge b-warn"><span class="dot"></span> not verified</span>';
}

export function getStatusBadge(status) {
  if (status === 'active') {
    return '<span class="badge b-ok"><span class="dot"></span> active</span>';
  }
  return '<span class="badge b-gray"><span class="dot"></span> inactive</span>';
}

export function getContainerStatusBadge(status) {
  const badges = {
    idle: '<span class="badge b-ok"><span class="dot"></span> idle</span>',
    busy: '<span class="badge b-warn"><span class="dot"></span> busy</span>',
    starting: '<span class="badge b-pri"><span class="dot"></span> starting</span>',
    error: '<span class="badge b-err"><span class="dot"></span> error</span>',
  };
  return badges[status] || `<span class="badge b-gray">${status}</span>`;
}
