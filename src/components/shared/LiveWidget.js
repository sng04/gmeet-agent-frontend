import { navigate } from '../../router.js';

export function LiveWidget({ title, subtitle, duration, qaCount, latency = 42, link }) {
  const el = document.createElement('div');
  el.className = 'live-widget';

  el.innerHTML = `
    <div class="flex items-c jc-b">
      <div>
        <div class="live-badge-anim mb-4"><span class="live-dot-anim"></span>LIVE</div>
        <div class="live-widget-title">${title}</div>
        <div class="live-widget-sub">${subtitle}</div>
      </div>
      <div style="font-size:48px;opacity:.15">📡</div>
    </div>
    <div class="live-widget-footer">
      <div class="flex gap-3 items-c">
        <div class="conn ok"><span class="conn-dot"></span> Connected <span class="conn-latency">~${latency}ms · Good</span></div>
        <span class="text-xs text-t">${qaCount} Q&A pairs generated</span>
      </div>
      <button class="btn btn-live" id="live-btn">Open Live View →</button>
    </div>
  `;

  if (link) {
    el.querySelector('#live-btn').addEventListener('click', () => navigate(link));
  }

  return el;
}
