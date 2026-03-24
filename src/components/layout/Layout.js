import { Topbar } from './Topbar.js';
import { Sidebar } from './Sidebar.js';

export function Layout() {
  const el = document.createElement('div');
  el.id = 'app';

  el.appendChild(Topbar());

  const layout = document.createElement('div');
  layout.className = 'layout';

  layout.appendChild(Sidebar());

  const main = document.createElement('main');
  main.className = 'main';
  main.id = 'main-content';

  layout.appendChild(main);
  el.appendChild(layout);

  return { el, main };
}
