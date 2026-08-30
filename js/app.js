// MotiGo Application Bootstrapper
import { store } from './state.js';
import { UIRenderer } from './ui.js';

function initApp() {
  const ui = new UIRenderer();
  ui.render();

  store.subscribe(() => {
    ui.render();
  });
}

// Guaranteed execution whether DOMContentLoaded fired before or after ES module load
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initApp);
} else {
  initApp();
}
