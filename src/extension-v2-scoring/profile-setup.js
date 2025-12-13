/**
 * Job Hunter OS - Profile Setup Script
 *
 * Handles the user profile onboarding flow:
 * - Multi-tab form navigation
 * - Tag input components for skills/industries/roles
 * - Validation and storage of profile to chrome.storage.local
 * - Load existing profile for editing
 */

// ============================================================================
// STORAGE KEY - Must match other extension files
// ============================================================================

const PROFILE_STORAGE_KEY = 'jh_user_profile';

// ============================================================================
// STATE MANAGEMENT
// ============================================================================

/**
 * Current profile data being edited
 * Structure matches the spec in CLAUDE.md
 */
let profileData = {
  version: '1.0',
  preferences: {
    salary_floor: 150000,
    salary_target: 200000,
    bonus_and_equity_preference: 'preferred',
    remote_requirement: 'remote_first',
    workplace_types_acceptable: ['remote', 'hybrid_4plus_days'],
    workplace_types_unacceptable: ['on_site'],
    employment_type_preferred: 'full_time',
    employment_types_acceptable: ['full_time'],
    deal_breakers: ['on_site', 'less_than_150k_base'],
    must_haves: []
  },
  background: {
    current_title: '',
    years_experience: 0,
    core_skills: [],
    industries: [],
    target_roles: []
  },
  constraints: {
    cannot_accept: '',
    avoid_unless_exceptional: '',
    reject_if: ''
  },
  last_updated: null
};

// Tag input state (arrays of current tags)
let skillTags = [];
let industryTags = [];
let roleTags = [];

// Limits
const MAX_TAGS_PER_FIELD = 30;

// DOM element cache
let elements = {};

// ============================================================================
// INITIALIZATION
// ============================================================================

/**
 * Initialize the profile setup page when DOM is ready
 */
document.addEventListener('DOMContentLoaded', async () => {
  // Cache DOM element references
  cacheElements();

  // Set up event listeners
  setupTabNavigation();
  setupTagInputs();
  setupSuggestedTags();
  setupFormSubmission();

  // Load existing profile if available
  await loadExistingProfile();

  console.log('[Profile Setup] Initialized');
});

/**
 * Cache frequently used DOM elements
 */
function cacheElements() {
  elements = {
    form: document.getElementById('profile-form'),
    statusMessage: document.getElementById('status-message'),
    tabs: document.querySelectorAll('.tab'),
    tabContents: document.querySelectorAll('.tab-content'),
    // Tab 1: Preferences
    salaryFloor: document.getElementById('salary-floor'),
    salaryTarget: document.getElementById('salary-target'),
    equityPreference: document.getElementById('equity-preference'),
    remoteRequirement: document.getElementById('remote-requirement'),
    employmentType: document.getElementById('employment-type'),
    // Tab 2: Background
    currentTitle: document.getElementById('current-title'),
    yearsExperience: document.getElementById('years-experience'),
    skillsInput: document.getElementById('core-skills'),
    skillsTags: document.getElementById('skills-tags'),
    industriesInput: document.getElementById('industries'),
    industriesTags: document.getElementById('industries-tags'),
    rolesInput: document.getElementById('target-roles'),
    rolesTags: document.getElementById('roles-tags')
  };
}

// ============================================================================
// TAB NAVIGATION
// ============================================================================

/**
 * Set up tab navigation click handlers
 */
function setupTabNavigation() {
  // Tab button clicks
  elements.tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      const targetTab = tab.dataset.tab;
      switchToTab(targetTab);
    });
  });

  // Next/Previous button clicks
  document.querySelectorAll('[data-next]').forEach(btn => {
    btn.addEventListener('click', () => {
      const nextTab = btn.dataset.next;
      switchToTab(nextTab);
    });
  });

  document.querySelectorAll('[data-prev]').forEach(btn => {
    btn.addEventListener('click', () => {
      const prevTab = btn.dataset.prev;
      switchToTab(prevTab);
    });
  });
}

/**
 * Switch to a specific tab
 * @param {string} tabId - The tab ID to switch to
 */
function switchToTab(tabId) {
  // Update tab buttons
  elements.tabs.forEach(tab => {
    if (tab.dataset.tab === tabId) {
      tab.classList.add('active');
    } else {
      tab.classList.remove('active');
    }
  });

  // Update tab content visibility
  elements.tabContents.forEach(content => {
    if (content.id === `tab-${tabId}`) {
      content.classList.add('active');
    } else {
      content.classList.remove('active');
    }
  });

  // Scroll to top of form
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

// ============================================================================
// TAG INPUT COMPONENTS
// ============================================================================

/**
 * Set up tag input functionality for skills, industries, and roles
 */
function setupTagInputs() {
  // Skills tag input
  setupTagInput(
    elements.skillsInput,
    elements.skillsTags,
    skillTags,
    (tags) => { skillTags = tags; }
  );

  // Industries tag input
  setupTagInput(
    elements.industriesInput,
    elements.industriesTags,
    industryTags,
    (tags) => { industryTags = tags; }
  );

  // Target roles tag input
  setupTagInput(
    elements.rolesInput,
    elements.rolesTags,
    roleTags,
    (tags) => { roleTags = tags; }
  );
}

/**
 * Set up a single tag input component
 * @param {HTMLInputElement} input - The text input element
 * @param {HTMLElement} container - The container for rendered tags
 * @param {string[]} tags - Current array of tags
 * @param {Function} updateTags - Callback to update the tags array
 */
function setupTagInput(input, container, tags, updateTags) {
  if (!input || !container) return;

  // Handle Enter key to add tag (supports comma-delimited bulk on Enter)
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const value = input.value.trim();
      if (!value) return;

      // Split on commas to allow bulk add in one go
      const parts = value.split(',').map(p => p.trim()).filter(Boolean);
      let newTags = [...tags];
      for (const part of parts) {
        if (!newTags.includes(part)) {
          if (newTags.length >= MAX_TAGS_PER_FIELD) {
            showStatus(`You can add up to ${MAX_TAGS_PER_FIELD} entries here.`, 'error');
            break;
          }
          newTags = [...newTags, part];
        }
      }
      updateTags(newTags);
      tags = newTags;
      renderTags(container, newTags, updateTags);
      input.value = '';
    }

    // Handle Backspace to remove last tag
    if (e.key === 'Backspace' && input.value === '' && tags.length > 0) {
      const newTags = tags.slice(0, -1);
      updateTags(newTags);
      tags = newTags;
      renderTags(container, newTags, updateTags);
    }
  });
}

/**
 * Render tags in a container
 * @param {HTMLElement} container - The container element
 * @param {string[]} tags - Array of tags to render
 * @param {Function} updateTags - Callback when tags change
 */
function renderTags(container, tags, updateTags) {
  container.innerHTML = tags.map((tag, index) => `
    <span class="tag">
      ${escapeHtml(formatTagDisplay(tag))}
      <button type="button" class="remove-tag" data-index="${index}" title="Remove">&times;</button>
    </span>
  `).join('');

  // Add click handlers for remove buttons
  container.querySelectorAll('.remove-tag').forEach(btn => {
    btn.addEventListener('click', () => {
      const index = parseInt(btn.dataset.index, 10);
      const newTags = tags.filter((_, i) => i !== index);
      updateTags(newTags);
      renderTags(container, newTags, updateTags);
    });
  });
}

/**
 * Format tag for display (convert snake_case to Title Case)
 * @param {string} tag - Raw tag value
 * @returns {string} Formatted display value
 */
function formatTagDisplay(tag) {
  return tag
    .replace(/_/g, ' ')
    .replace(/\b\w/g, c => c.toUpperCase());
}

/**
 * Escape HTML to prevent XSS
 * @param {string} text - Text to escape
 * @returns {string} Escaped text
 */
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// ============================================================================
// SUGGESTED TAGS
// ============================================================================

/**
 * Set up click handlers for suggested tag buttons
 */
function setupSuggestedTags() {
  // Skill suggestions
  document.querySelectorAll('.suggested-tag[data-skill]').forEach(btn => {
    btn.addEventListener('click', () => {
      const skill = btn.textContent.trim();
      if (!skillTags.includes(skill)) {
        if (skillTags.length >= MAX_TAGS_PER_FIELD) {
          showStatus(`You can add up to ${MAX_TAGS_PER_FIELD} core skills.`, 'error');
          return;
        }
        skillTags.push(skill);
        renderTags(elements.skillsTags, skillTags, (tags) => { skillTags = tags; });
        btn.classList.add('used');
      }
    });
  });

  // Industry suggestions
  document.querySelectorAll('.suggested-tag[data-industry]').forEach(btn => {
    btn.addEventListener('click', () => {
      const industry = btn.textContent.trim();
      if (!industryTags.includes(industry)) {
        if (industryTags.length >= MAX_TAGS_PER_FIELD) {
          showStatus(`You can add up to ${MAX_TAGS_PER_FIELD} industries.`, 'error');
          return;
        }
        industryTags.push(industry);
        renderTags(elements.industriesTags, industryTags, (tags) => { industryTags = tags; });
        btn.classList.add('used');
      }
    });
  });

  // Role suggestions
  document.querySelectorAll('.suggested-tag[data-role]').forEach(btn => {
    btn.addEventListener('click', () => {
      const role = btn.textContent.trim();
      if (!roleTags.includes(role)) {
        if (roleTags.length >= MAX_TAGS_PER_FIELD) {
          showStatus(`You can add up to ${MAX_TAGS_PER_FIELD} target roles.`, 'error');
          return;
        }
        roleTags.push(role);
        renderTags(elements.rolesTags, roleTags, (tags) => { roleTags = tags; });
        btn.classList.add('used');
      }
    });
  });
}

// ============================================================================
// FORM SUBMISSION & VALIDATION
// ============================================================================

/**
 * Set up form submission handler
 */
function setupFormSubmission() {
  elements.form.addEventListener('submit', async (e) => {
    e.preventDefault();
    await saveProfile();
  });
}

/**
 * Validate and save the profile
 */
async function saveProfile() {
  const saveBtn = document.querySelector('.btn-save');

  try {
    // Show loading state
    saveBtn.disabled = true;
    saveBtn.classList.add('loading');
    showStatus('Saving profile...', 'info');

    // Collect form data
    collectFormData();

    // Validate required fields
    const validation = validateProfile();
    if (!validation.valid) {
      showStatus(validation.message, 'error');
      saveBtn.disabled = false;
      saveBtn.classList.remove('loading');
      return;
    }

    // Update timestamp
    profileData.last_updated = new Date().toISOString();

    // Save to Chrome storage
    await chrome.storage.local.set({
      [PROFILE_STORAGE_KEY]: profileData
    });

    console.log('[Profile Setup] Profile saved:', profileData);

    // Show success message
    showStatus('Profile saved successfully! You can now close this page.', 'success');

    // Mark all tabs as completed
    elements.tabs.forEach(tab => tab.classList.add('completed'));

    // If opened in a new tab, offer to close
    setTimeout(() => {
      if (window.opener || document.referrer) {
        showStatus('Profile saved! You can close this tab and return to your job search.', 'success');
      }
    }, 1000);

  } catch (error) {
    console.error('[Profile Setup] Save error:', error);
    showStatus('Failed to save profile. Please try again.', 'error');
  } finally {
    saveBtn.disabled = false;
    saveBtn.classList.remove('loading');
  }
}

/**
 * Collect data from form fields into profileData object
 */
function collectFormData() {
  // Tab 1: Preferences
  profileData.preferences.salary_floor = parseInt(elements.salaryFloor.value, 10) || 150000;
  profileData.preferences.salary_target = parseInt(elements.salaryTarget.value, 10) || 200000;
  profileData.preferences.bonus_and_equity_preference = elements.equityPreference.value;
  profileData.preferences.remote_requirement = elements.remoteRequirement.value;
  profileData.preferences.employment_type_preferred = elements.employmentType.value;

  // Workplace types (from checkboxes)
  const workplaceCheckboxes = document.querySelectorAll('input[name="workplace_types_acceptable"]:checked');
  profileData.preferences.workplace_types_acceptable = Array.from(workplaceCheckboxes).map(cb => cb.value);

  // Set unacceptable types (opposite of acceptable)
  const allWorkplaceTypes = ['remote', 'hybrid_4plus_days', 'hybrid', 'on_site'];
  profileData.preferences.workplace_types_unacceptable = allWorkplaceTypes.filter(
    t => !profileData.preferences.workplace_types_acceptable.includes(t)
  );

  // Tab 2: Background
  profileData.background.current_title = elements.currentTitle.value.trim();
  profileData.background.years_experience = parseInt(elements.yearsExperience.value, 10) || 0;
  profileData.background.core_skills = [...skillTags];
  profileData.background.industries = [...industryTags];
  profileData.background.target_roles = [...roleTags];

  // Tab 3: Deal-breakers & Must-haves
  const dealBreakerCheckboxes = document.querySelectorAll('input[name="deal_breakers"]:checked');
  profileData.preferences.deal_breakers = Array.from(dealBreakerCheckboxes).map(cb => cb.value);

  const mustHaveCheckboxes = document.querySelectorAll('input[name="must_haves"]:checked');
  profileData.preferences.must_haves = Array.from(mustHaveCheckboxes).map(cb => cb.value);
}

/**
 * Validate the profile data
 * @returns {Object} { valid: boolean, message: string }
 */
function validateProfile() {
  // Salary floor must be positive
  if (profileData.preferences.salary_floor <= 0) {
    return { valid: false, message: 'Please enter a valid salary floor' };
  }

  // Target must be >= floor
  if (profileData.preferences.salary_target < profileData.preferences.salary_floor) {
    return { valid: false, message: 'Target salary should be at or above your floor' };
  }

  // At least one workplace type must be acceptable
  if (profileData.preferences.workplace_types_acceptable.length === 0) {
    return { valid: false, message: 'Please select at least one acceptable workplace type' };
  }

  // Warn if no skills (but don't block)
  if (profileData.background.core_skills.length === 0) {
    console.warn('[Profile Setup] No skills defined - scoring will be less accurate');
  }

  return { valid: true, message: '' };
}

// ============================================================================
// LOAD EXISTING PROFILE
// ============================================================================

/**
 * Load existing profile from Chrome storage and populate form
 */
async function loadExistingProfile() {
  try {
    const result = await chrome.storage.local.get([PROFILE_STORAGE_KEY]);
    const savedProfile = result[PROFILE_STORAGE_KEY];

    if (savedProfile) {
      console.log('[Profile Setup] Loading existing profile:', savedProfile);
      profileData = { ...profileData, ...savedProfile };
      populateFormFromProfile();
    }
  } catch (error) {
    console.error('[Profile Setup] Error loading profile:', error);
  }
}

/**
 * Populate form fields from profileData
 */
function populateFormFromProfile() {
  // Tab 1: Preferences
  if (profileData.preferences.salary_floor) {
    elements.salaryFloor.value = profileData.preferences.salary_floor;
  }
  if (profileData.preferences.salary_target) {
    elements.salaryTarget.value = profileData.preferences.salary_target;
  }
  if (profileData.preferences.bonus_and_equity_preference) {
    elements.equityPreference.value = profileData.preferences.bonus_and_equity_preference;
  }
  if (profileData.preferences.remote_requirement) {
    elements.remoteRequirement.value = profileData.preferences.remote_requirement;
  }
  if (profileData.preferences.employment_type_preferred) {
    elements.employmentType.value = profileData.preferences.employment_type_preferred;
  }

  // Workplace types checkboxes
  document.querySelectorAll('input[name="workplace_types_acceptable"]').forEach(cb => {
    cb.checked = (profileData.preferences.workplace_types_acceptable || []).includes(cb.value);
  });

  // Tab 2: Background
  if (profileData.background.current_title) {
    elements.currentTitle.value = profileData.background.current_title;
  }
  if (profileData.background.years_experience) {
    elements.yearsExperience.value = profileData.background.years_experience;
  }

  // Load tags
  skillTags = profileData.background.core_skills || [];
  industryTags = profileData.background.industries || [];
  roleTags = profileData.background.target_roles || [];

  // Render tags
  renderTags(elements.skillsTags, skillTags, (tags) => { skillTags = tags; });
  renderTags(elements.industriesTags, industryTags, (tags) => { industryTags = tags; });
  renderTags(elements.rolesTags, roleTags, (tags) => { roleTags = tags; });

  // Mark suggested tags as used
  skillTags.forEach(skill => {
    const btn = document.querySelector(`.suggested-tag[data-skill="${skill}"]`);
    if (btn) btn.classList.add('used');
  });
  industryTags.forEach(industry => {
    const btn = document.querySelector(`.suggested-tag[data-industry="${industry}"]`);
    if (btn) btn.classList.add('used');
  });
  roleTags.forEach(role => {
    const btn = document.querySelector(`.suggested-tag[data-role="${role}"]`);
    if (btn) btn.classList.add('used');
  });

  // Tab 3: Deal-breakers
  document.querySelectorAll('input[name="deal_breakers"]').forEach(cb => {
    cb.checked = (profileData.preferences.deal_breakers || []).includes(cb.value);
  });

  document.querySelectorAll('input[name="must_haves"]').forEach(cb => {
    cb.checked = (profileData.preferences.must_haves || []).includes(cb.value);
  });
}

// ============================================================================
// STATUS MESSAGES
// ============================================================================

/**
 * Display a status message
 * @param {string} message - Message to display
 * @param {string} type - 'success', 'error', or 'info'
 */
function showStatus(message, type) {
  elements.statusMessage.textContent = message;
  elements.statusMessage.className = `status-message ${type}`;
}

/**
 * Hide the status message
 */
function hideStatus() {
  elements.statusMessage.className = 'status-message hidden';
}
