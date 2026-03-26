import { loadTemplate } from '../../utils/template.js';
import { navigate } from '../../router.js';

export default async function SkillCreateController(params) {
  const el = await loadTemplate('/templates/admin/skill-create.html', 'skill-create');

  // Breadcrumb nav-back
  el.querySelectorAll('[data-action="navBack"]').forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      navigate(link.dataset.to);
    });
  });

  // Cancel → skills
  el.querySelector('[data-action="cancel"]').addEventListener('click', () => navigate('skills'));

  // Create → skills
  el.querySelector('[data-action="create"]').addEventListener('click', () => navigate('skills'));

  return el;
}
