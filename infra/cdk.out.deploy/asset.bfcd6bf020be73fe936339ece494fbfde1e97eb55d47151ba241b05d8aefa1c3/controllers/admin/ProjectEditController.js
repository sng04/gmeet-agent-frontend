import { loadTemplate } from '../../utils/template.js';
import { navigate } from '../../router.js';

export default async function ProjectEditController(params) {
  const el = await loadTemplate('/templates/admin/project-edit.html', 'project-edit');

  // Breadcrumb nav-back handlers
  el.querySelectorAll('.nav-back').forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      navigate(link.dataset.to);
    });
  });

  // Cancel → project-detail
  el.querySelector('[data-action="cancel"]').addEventListener('click', () => navigate('project-detail'));

  // Save → project-detail
  el.querySelector('[data-action="save"]').addEventListener('click', () => navigate('project-detail'));

  return el;
}
