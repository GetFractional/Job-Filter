/**
 * Job Filter - Side Panel Script
 */
(async function initSidePanel() {
  const statusEl = document.getElementById('flag-status');
  const helpEl = document.getElementById('flag-help');

  if (!statusEl || !helpEl) {
    return;
  }

  try {
    const flags = await window.JobFilterFlags.getFlags();
    if (flags.enableSidePanel) {
      statusEl.textContent = 'Enabled';
      statusEl.classList.add('enabled');
      helpEl.textContent = 'Side panel is active. Use it alongside LinkedIn job pages.';
    } else {
      statusEl.textContent = 'Disabled';
      statusEl.classList.add('disabled');
      helpEl.textContent = 'Enable “Side Panel” in the popup Feature Flags tab to activate.';
    }
  } catch (error) {
    statusEl.textContent = 'Error loading flags';
    statusEl.classList.add('disabled');
    helpEl.textContent = 'Open the popup to verify feature flag settings.';
  }
})();
