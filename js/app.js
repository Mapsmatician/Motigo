// MotiGo Application Bootstrapper

import { store } from './state.js';
import { UIRenderer } from './ui.js';

document.addEventListener('DOMContentLoaded', () => {
  const ui = new UIRenderer();
  
  // Initial render
  ui.render();

  // Re-render when state changes
  store.subscribe(() => {
    ui.render();
  });
});
