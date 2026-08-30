// MotiGo Application Bootstrapper
import { store } from './state.js';
import { UIRenderer } from './ui.js';

function initApp() {
  try {
    const ui = new UIRenderer();
    ui.render();

    store.subscribe(() => {
      ui.render();
    });
  } catch (err) {
    console.error('Motigo Bootstrapper Error:', err);
  }
}

// Guaranteed execution whether DOMContentLoaded fired before or after ES module load
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initApp);
} else {
  initApp();
}
