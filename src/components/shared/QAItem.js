export function QAItem({ question, answer, confidence, time }) {
  const el = document.createElement('div');
  el.className = 'qa';

  const confClass = confidence >= 90 ? 'b-ok' : confidence >= 80 ? 'b-warn' : 'b-err';

  el.innerHTML = `
    <div class="qa-q">
      <div class="qi">Q</div>
      <div class="qa-txt q">${question}</div>
    </div>
    <div class="qa-a">
      <div class="ai">A</div>
      <div class="qa-txt">${answer}</div>
    </div>
    <div class="flex items-c jc-b mt-4" style="padding-top:12px;border-top:1px solid var(--gray-100)">
      <span class="badge ${confClass}">${confidence}% confidence</span>
      ${time ? `<span class="text-xs mono text-t">${time}</span>` : ''}
    </div>
  `;

  return el;
}
