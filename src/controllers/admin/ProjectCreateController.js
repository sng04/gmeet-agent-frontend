import { loadTemplate } from '../../utils/template.js';
import { navigate } from '../../router.js';
import { Button } from '../../components/ui/Button.js';

export default async function ProjectCreateController(params) {
  const el = await loadTemplate('/templates/admin/project-create.html', 'project-create');

  // Populate agent select with hardcoded options (matches existing ProjectCreate.js)
  const agentSelect = el.querySelector('[data-bind="agentSelect"]');
  if (agentSelect) {
    const agents = [
      { value: '1', label: 'TechSales Bot' },
      { value: '2', label: 'Demo Agent' },
      { value: '3', label: 'Support Agent' },
    ];
    agents.forEach(a => {
      const opt = document.createElement('option');
      opt.value = a.value;
      opt.textContent = a.label;
      agentSelect.appendChild(opt);
    });
  }

  // Populate gmail select with hardcoded options (matches existing ProjectCreate.js)
  const gmailSelect = el.querySelector('[data-bind="gmailSelect"]');
  if (gmailSelect) {
    const gmails = [
      { value: '1', label: 'techsales-bot@agents.company.com' },
      { value: '2', label: 'demo-bot@agents.company.com' },
      { value: '3', label: 'support-bot@agents.company.com' },
    ];
    gmails.forEach(g => {
      const opt = document.createElement('option');
      opt.value = g.value;
      opt.textContent = g.label;
      gmailSelect.appendChild(opt);
    });
  }

  // Back link
  const backLink = el.querySelector('[data-action="backLink"]');
  if (backLink) {
    backLink.addEventListener('click', (e) => {
      e.preventDefault();
      navigate('projects');
    });
  }

  // Form action buttons
  const actions = el.querySelector('[data-bind="formActions"]');
  if (actions) {
    actions.appendChild(Button({ text: 'Cancel', variant: 's', size: 'lg', onClick: () => navigate('projects') }));
    actions.appendChild(Button({ text: 'Create Project →', variant: 'p', size: 'lg', onClick: () => {
      navigate('project-detail');
    }}));
  }

  return el;
}
