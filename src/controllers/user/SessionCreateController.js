import { loadTemplate } from '../../utils/template.js';
import { Button } from '../../components/ui/Button.js';
import { navigate } from '../../router.js';

export default async function SessionCreateController(params) {
  const el = await loadTemplate('/templates/user/session-create.html', 'session-create');

  // Breadcrumb back
  el.querySelector('[data-action="backNav"]').addEventListener('click', (e) => {
    e.preventDefault();
    navigate('project-detail');
  });

  // Form action buttons
  const actions = el.querySelector('[data-bind="formActions"]');
  actions.appendChild(Button({ text: 'Start Session →', variant: 'p', size: 'lg', onClick: () => navigate('live-session') }));
  actions.appendChild(Button({ text: 'Cancel', variant: 's', size: 'lg', onClick: () => navigate('project-detail') }));

  return el;
}
