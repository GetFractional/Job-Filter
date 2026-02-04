/**
 * Job Hunter OS - Popup Script
 *
 * Handles the settings popup UI:
 * - Load/save Airtable credentials from Chrome local storage
 * - Test connection to Airtable API
 * - Display success/error feedback to user
 */

// Storage keys for Airtable credentials
const STORAGE_KEYS = {
  BASE_ID: 'jh_airtable_base_id',
  PAT: 'jh_airtable_pat'
};

// DOM element references (populated on DOMContentLoaded)
let elements = {};

/**
 * Initialize the popup when DOM is ready
 */
document.addEventListener('DOMContentLoaded', () => {
  // Cache DOM element references
  elements = {
    form: document.getElementById('settings-form'),
    baseIdInput: document.getElementById('base-id'),
    apiTokenInput: document.getElementById('api-token'),
    statusMessage: document.getElementById('status-message'),
    saveBtn: document.getElementById('save-btn'),
    testBtn: document.getElementById('test-btn')
  };

  // Load saved settings from storage
  loadSettings();

  // Attach event listeners
  elements.form.addEventListener('submit', handleSave);
  elements.testBtn.addEventListener('click', handleTestConnection);
});

/**
 * Load saved credentials from Chrome local storage
 */
async function loadSettings() {
  try {
    const result = await chrome.storage.local.get([
      STORAGE_KEYS.BASE_ID,
      STORAGE_KEYS.PAT
    ]);

    // Populate input fields with saved values (if any)
    if (result[STORAGE_KEYS.BASE_ID]) {
      elements.baseIdInput.value = result[STORAGE_KEYS.BASE_ID];
    }
    if (result[STORAGE_KEYS.PAT]) {
      elements.apiTokenInput.value = result[STORAGE_KEYS.PAT];
    }
  } catch (error) {
    console.error('Error loading settings:', error);
    showStatus('Failed to load saved settings', 'error');
  }
}

/**
 * Save credentials to Chrome local storage
 * @param {Event} event - Form submit event
 */
async function handleSave(event) {
  event.preventDefault();

  const baseId = elements.baseIdInput.value.trim();
  const apiToken = elements.apiTokenInput.value.trim();

  // Basic validation
  if (!baseId) {
    showStatus('Please enter your Airtable Base ID', 'error');
    elements.baseIdInput.focus();
    return;
  }

  if (!apiToken) {
    showStatus('Please enter your Airtable Personal Access Token', 'error');
    elements.apiTokenInput.focus();
    return;
  }

  // Validate Base ID format (should start with "app")
  if (!baseId.startsWith('app')) {
    showStatus('Base ID should start with "app"', 'error');
    elements.baseIdInput.focus();
    return;
  }

  // Validate PAT format (should start with "pat")
  if (!apiToken.startsWith('pat')) {
    showStatus('Personal Access Token should start with "pat"', 'error');
    elements.apiTokenInput.focus();
    return;
  }

  // Disable button and show loading state
  setButtonLoading(elements.saveBtn, true);

  try {
    await chrome.storage.local.set({
      [STORAGE_KEYS.BASE_ID]: baseId,
      [STORAGE_KEYS.PAT]: apiToken
    });

    showStatus('Settings saved successfully!', 'success');
  } catch (error) {
    console.error('Error saving settings:', error);
    showStatus('Failed to save settings', 'error');
  } finally {
    setButtonLoading(elements.saveBtn, false);
  }
}

/**
 * Test connection to Airtable API using saved credentials
 */
async function handleTestConnection() {
  const baseId = elements.baseIdInput.value.trim();
  const apiToken = elements.apiTokenInput.value.trim();

  // Validate inputs are present
  if (!baseId || !apiToken) {
    showStatus('Please enter both Base ID and API Token first', 'error');
    return;
  }

  // Disable button and show loading state
  setButtonLoading(elements.testBtn, true);
  showStatus('Testing connection...', 'info');

  try {
    // Make a GET request to list records from Jobs Pipeline table
    // This validates both the Base ID and API Token are correct
    const response = await fetch(
      `https://api.airtable.com/v0/${baseId}/Jobs%20Pipeline?maxRecords=1`,
      {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${apiToken}`,
          'Content-Type': 'application/json'
        }
      }
    );

    if (response.ok) {
      showStatus('Connection successful! Your credentials are valid.', 'success');
    } else if (response.status === 401) {
      showStatus('Invalid API Token. Please check your Personal Access Token.', 'error');
    } else if (response.status === 404) {
      showStatus('Base or table not found. Check Base ID and ensure "Jobs Pipeline" table exists.', 'error');
    } else if (response.status === 403) {
      showStatus('Access denied. Ensure your token has read/write permissions.', 'error');
    } else {
      const errorData = await response.json().catch(() => ({}));
      showStatus(
        `Connection failed: ${errorData.error?.message || response.statusText}`,
        'error'
      );
    }
  } catch (error) {
    console.error('Connection test error:', error);
    // Handle network errors (no internet, CORS issues, etc.)
    showStatus('Network error. Please check your internet connection.', 'error');
  } finally {
    setButtonLoading(elements.testBtn, false);
  }
}

/**
 * Display a status message to the user
 * @param {string} message - Message to display
 * @param {string} type - Message type: 'success', 'error', or 'info'
 */
function showStatus(message, type) {
  elements.statusMessage.textContent = message;
  elements.statusMessage.className = `status-message ${type}`;
}

/**
 * Toggle loading state on a button
 * @param {HTMLButtonElement} button - Button element to modify
 * @param {boolean} isLoading - Whether to show loading state
 */
function setButtonLoading(button, isLoading) {
  button.disabled = isLoading;
  if (isLoading) {
    button.classList.add('loading');
  } else {
    button.classList.remove('loading');
  }
}
