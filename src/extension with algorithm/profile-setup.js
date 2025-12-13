/**
 * Job Hunter OS - Profile Setup Script
 * 
 * Handles:
 * - Tab navigation
 * - Form validation and serialization
 * - Saving profile to Chrome storage
 * - Loading existing profile for editing
 */

// Storage key matching background.js
const PROFILE_STORAGE_KEY = 'jh_user_profile';

// Default profile structure
const DEFAULT_PROFILE = {
  version: '1.0',
  preferences: {
    salary_floor: 150000,
    salary_target: 200000,
    bonus_and_equity_preference: 'preferred',
    remote_requirement: 'remote_first',
    workplace_types_acceptable: ['remote', 'hybrid_4plus_days'],
    workplace_types_unacceptable: ['on_site'],
    employment_type_preferred: 'full_time',
    employment_types_acceptable: ['full_time', 'contract'],
    deal_breakers: [
      'on_site',
      'less_than_150k_base',
      'no_equity',
      'pre_revenue',
      'no_revops_component'
    ],
    must_haves: [
      'growth_revops_lifecycle_focus',
      'series_b_or_later',
      'data_driven_culture'
    ]
  },
  background: {
    current_title: 'Director of Growth & RevOps',
    years_experience: 18,
    core_skills: [
      'growth_strategy',
      'revops_infrastructure',
      'ecommerce_gtm',
      'lifecycle_marketing',
      'crmops',
      'data_driven_decisioning'
    ],
    industries: ['saas', 'd2c_ecommerce', 'telecom', 'insurance'],
    target_roles: [
      'VP of Growth',
      'Head of RevOps',
      'CMO (ops_heavy)',
      'CRO',
      'Chief Growth Officer'
    ]
  },
  last_updated: new Date().toISOString()
};

// ============================================================================
// INITIALIZATION
// ============================================================================

document.addEventListener('DOMContentLoaded', () => {
  console.log('[Profile Setup] Initializing...');

  // Set up tab buttons
  const tabButtons = document.querySelectorAll('.tab-button');
  tabButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      const tabName = btn.getAttribute('data-tab');
      switchTab(tabName);
    });
  });

  // Set up skill/role tag selection
  setupTagSelection();

  // Set up tab navigation buttons
  document.getElementById('to-background-tab-btn').addEventListener('click', () => switchTab('background'));
  document.getElementById('to-dealbreakers-btn').addEventListener('click', () => switchTab('dealbreakers'));
  document.getElementById('to-preferences-btn').addEventListener('click', () => switchTab('preferences'));
  document.getElementById('to-background-btn-from-dealbreakers').addEventListener('click', () => switchTab('background'));

  // Load existing profile if available
  loadProfile();

  // Handle form submission
  const profileSetupForm = document.getElementById('profile-setup-form');
  if (profileSetupForm) {
    profileSetupForm.addEventListener('submit', handleSaveProfile);
  }

  // Set up dynamic deal-breaker label
  const salaryFloorInput = document.getElementById('salary-floor');
  if (salaryFloorInput) {
    salaryFloorInput.addEventListener('input', updateSalaryDealBreakerLabel);
  }
});

/**
 * Update the salary deal-breaker label to reflect the current salary floor
 */
function updateSalaryDealBreakerLabel() {
    const salaryFloorInput = document.getElementById('salary-floor');
    const dealBreakerLabel = document.querySelector('label[for="breaker-lowsalary"]');
    if (salaryFloorInput && dealBreakerLabel) {
        const salary = parseInt(salaryFloorInput.value) || 0;
        dealBreakerLabel.innerHTML = `Base salary < $${(salary / 1000)}K`;
    }
}

// ============================================================================
// TAB NAVIGATION
// ============================================================================

/**
 * Switch between tabs (Preferences, Background, Deal-Breakers)
 * @param {string} tabName - Tab ID to switch to
 */
function switchTab(tabName) {
  console.log('[Profile Setup] Switching to tab:', tabName);

  // Hide all tabs
  const allTabs = document.querySelectorAll('.tab-content');
  allTabs.forEach(tab => tab.classList.remove('active'));

  // Deactivate all buttons
  const allButtons = document.querySelectorAll('.tab-button');
  allButtons.forEach(btn => btn.classList.remove('active'));

  // Show selected tab
  const selectedTab = document.getElementById(tabName);
  if (selectedTab) {
    selectedTab.classList.add('active');
  }

  // Activate selected button
  const selectedButton = document.querySelector(`[data-tab="${tabName}"]`);
  if (selectedButton) {
    selectedButton.classList.add('active');
  }

  // Scroll to top
  window.scrollTo(0, 0);
}

// ============================================================================
// SKILL/ROLE TAG SELECTION
// ============================================================================

/**
 * Make tags clickable for selection/deselection
 */
function setupTagSelection() {
  // Target Roles
  const roleTagsContainer = document.getElementById('target-roles');
  if (roleTagsContainer) {
    const roleTags = roleTagsContainer.querySelectorAll('.skill-tag');
    roleTags.forEach(tag => {
      tag.addEventListener('click', () => {
        tag.classList.toggle('selected');
      });
    });
  }

  // Core Skills
  const skillTagsContainer = document.getElementById('core-skills');
  if (skillTagsContainer) {
    const skillTags = skillTagsContainer.querySelectorAll('.skill-tag');
    skillTags.forEach(tag => {
      tag.addEventListener('click', () => {
        tag.classList.toggle('selected');
      });
    });
  }
}

// ============================================================================
// PROFILE LOADING & SAVING
// ============================================================================

/**
 * Load existing profile from Chrome storage and populate form
 */
async function loadProfile() {
  try {
    const result = await chrome.storage.local.get([PROFILE_STORAGE_KEY]);
    const profile = result[PROFILE_STORAGE_KEY] || DEFAULT_PROFILE;

    console.log('[Profile Setup] Loading profile:', profile);

    // PREFERENCES TAB
    const preferencesForm = document.getElementById('preferences-form');
    if (preferencesForm && profile.preferences) {
      // Salary
      document.getElementById('salary-floor').value = profile.preferences.salary_floor || 150000;
      document.getElementById('salary-target').value = profile.preferences.salary_target || 200000;

      // Equity preference
      const equityValue = profile.preferences.bonus_and_equity_preference || 'preferred';
      document.querySelector(`input[name="bonus_and_equity_preference"][value="${equityValue}"]`).checked = true;

      // Remote requirement
      const remoteValue = profile.preferences.remote_requirement || 'remote_first';
      document.querySelector(`input[name="remote_requirement"][value="${remoteValue}"]`).checked = true;

      // Workplace types
      // Uncheck all first, then check based on profile
      document.querySelectorAll('input[name="workplace_types_acceptable"]').forEach(checkbox => checkbox.checked = false);
      const workplaceTypes = profile.preferences.workplace_types_acceptable || []; // Default to empty array, defaults are in HTML
      workplaceTypes.forEach(type => {
        const checkbox = document.querySelector(`input[name="workplace_types_acceptable"][value="${type}"]`);
        if (checkbox) checkbox.checked = true;
      });

      // Employment type
      const empType = profile.preferences.employment_type_preferred || 'full_time';
      document.querySelector(`input[name="employment_type_preferred"][value="${empType}"]`).checked = true;
    }

    // BACKGROUND TAB
    const backgroundForm = document.getElementById('background-form');
    if (backgroundForm && profile.background) {
      document.getElementById('current-title').value = profile.background.current_title || '';
      document.getElementById('years-exp').value = profile.background.years_experience || 18;

      // Target roles (restore selected state)
      const targetRoles = profile.background.target_roles || [];
      const roleTags = document.querySelectorAll('#target-roles .skill-tag');
      roleTags.forEach(tag => {
        const role = tag.getAttribute('data-role');
        if (targetRoles.includes(role)) {
          tag.classList.add('selected');
        } else {
          tag.classList.remove('selected');
        }
      });

      // Core skills (restore selected state)
      const skills = profile.background.core_skills || [];
      const skillTags = document.querySelectorAll('#core-skills .skill-tag');
      skillTags.forEach(tag => {
        const skill = tag.getAttribute('data-skill');
        if (skills.includes(skill)) {
          tag.classList.add('selected');
        } else {
          tag.classList.remove('selected');
        }
      });

      // Industries
      // Uncheck all first, then check based on profile
      document.querySelectorAll('input[name="industries"]').forEach(checkbox => checkbox.checked = false);
      const industries = profile.background.industries || [];
      industries.forEach(industry => {
        const checkbox = document.querySelector(`input[name="industries"][value="${industry}"]`);
        if (checkbox) checkbox.checked = true;
      });
    }

    // DEAL-BREAKERS TAB
    const dealBreakerForm = document.getElementById('dealbreakers-form');
    if (dealBreakerForm && profile.preferences) {
      // Deal breakers
      // Uncheck all first, then check based on profile
      document.querySelectorAll('input[name="deal_breakers"]').forEach(checkbox => checkbox.checked = false);
      const breakers = profile.preferences.deal_breakers || [];
      breakers.forEach(breaker => {
        const checkbox = document.querySelector(`input[name="deal_breakers"][value="${breaker}"]`);
        if (checkbox) checkbox.checked = true;
      });

      // Must haves
      // Uncheck all first, then check based on profile
      document.querySelectorAll('input[name="must_haves"]').forEach(checkbox => checkbox.checked = false);
      const mustHaves = profile.preferences.must_haves || [];
      mustHaves.forEach(must => {
        const checkbox = document.querySelector(`input[name="must_haves"][value="${must}"]`);
        if (checkbox) checkbox.checked = true;
      });
    }

    console.log('[Profile Setup] Profile loaded successfully');
    updateSalaryDealBreakerLabel();

  } catch (error) {
    console.error('[Profile Setup] Error loading profile:', error);
    // Use defaults on error
  }
}

/**
 * Handle save button click - serialize form and save to Chrome storage
 * @param {Event} event - Form submission event
 */
async function handleSaveProfile(event) {
  if (event) {
    event.preventDefault();
  }

  try {
    console.log('[Profile Setup] Saving profile...');

    // Serialize all form data
    const profile = serializeProfile();

    // Validate profile
    const errors = validateProfile(profile);
    if (errors.length > 0) {
      showNotification('Validation Error: ' + errors.join(' '), 'error');
      return;
    }

    // Save to Chrome storage
    await chrome.storage.local.set({
      [PROFILE_STORAGE_KEY]: profile
    });

    console.log('[Profile Setup] Profile saved successfully:', profile);
    showNotification('Profile saved successfully!', 'success');

    // Close this tab/window after delay
    setTimeout(() => {
      window.close();
    }, 1500);

  } catch (error) {
    console.error('[Profile Setup] Error saving profile:', error);
    showNotification('Error saving profile: ' + error.message, 'error');
  }
}

/**
 * Serialize form data into profile object
 * @returns {Object} Complete profile object
 */
function serializeProfile() {
  const profile = JSON.parse(JSON.stringify(DEFAULT_PROFILE)); // Deep copy

  // PREFERENCES
  profile.preferences.salary_floor = parseInt(document.getElementById('salary-floor').value) || 150000;
  profile.preferences.salary_target = parseInt(document.getElementById('salary-target').value) || 200000;

  const equityInput = document.querySelector('input[name="bonus_and_equity_preference"]:checked');
  profile.preferences.bonus_and_equity_preference = equityInput ? equityInput.value : 'preferred';

  const remoteInput = document.querySelector('input[name="remote_requirement"]:checked');
  profile.preferences.remote_requirement = remoteInput ? remoteInput.value : 'remote_first';

  const workplaceInputs = document.querySelectorAll('input[name="workplace_types_acceptable"]:checked');
  profile.preferences.workplace_types_acceptable = Array.from(workplaceInputs).map(i => i.value);

  const empInput = document.querySelector('input[name="employment_type_preferred"]:checked');
  profile.preferences.employment_type_preferred = empInput ? empInput.value : 'full_time';

  // BACKGROUND
  profile.background.current_title = document.getElementById('current-title').value || '';
  profile.background.years_experience = parseInt(document.getElementById('years-exp').value) || 0;

  const targetRoles = document.querySelectorAll('#target-roles .skill-tag.selected');
  profile.background.target_roles = Array.from(targetRoles).map(tag => tag.getAttribute('data-role'));

  const coreSkills = document.querySelectorAll('#core-skills .skill-tag.selected');
  profile.background.core_skills = Array.from(coreSkills).map(tag => tag.getAttribute('data-skill'));

  const industryInputs = document.querySelectorAll('input[name="industries"]:checked');
  profile.background.industries = Array.from(industryInputs).map(i => i.value);

  // DEAL-BREAKERS
  const breakerInputs = document.querySelectorAll('input[name="deal_breakers"]:checked');
  profile.preferences.deal_breakers = Array.from(breakerInputs).map(i => i.value);

  const mustInputs = document.querySelectorAll('input[name="must_haves"]:checked');
  profile.preferences.must_haves = Array.from(mustInputs).map(i => i.value);

  // Metadata
  profile.last_updated = new Date().toISOString();

  return profile;
}

/**
 * Validate profile structure
 * @param {Object} profile - Profile object to validate
 * @returns {Array<string>} An array of error messages. Empty if valid.
 */
function validateProfile(profile) {
  const errors = [];

  // Check required fields
  if (!profile.preferences || !profile.background) {
    errors.push('Profile is missing core sections (preferences or background).');
    console.error('[Profile Setup] Missing required sections'); // Keep for debugging
  }

  // Salary must have floor < target
  if (profile.preferences.salary_floor >= profile.preferences.salary_target) {
    errors.push('Salary floor must be less than target salary.');
    console.error('[Profile Setup] Salary floor must be less than target');
  }

  // Must have at least one target role
  if (!profile.background.target_roles || profile.background.target_roles.length === 0) {
    errors.push('Please select at least one target role.');
    console.error('[Profile Setup] Select at least one target role');
  }

  // Must have at least one skill
  if (!profile.background.core_skills || profile.background.core_skills.length === 0) {
    errors.push('Please select at least one core skill.');
    console.error('[Profile Setup] Select at least one core skill');
  }

  return errors;
}

/**
 * Show notification message (success, error, info)
 * @param {string} message - Message to show
 * @param {string} type - Type: 'success', 'error', 'info'
 */
function showNotification(message, type) {
  // Create notification element
  const notification = document.createElement('div');
  notification.className = `status-message fixed ${type}`; // Add 'fixed' class for positioning
  notification.textContent = message;

  document.body.appendChild(notification);

  // Trigger slide-in animation
  notification.style.animation = 'slideIn 0.3s ease forwards';

  // Remove after 3 seconds with slide-out animation
  setTimeout(() => {
    notification.style.animation = 'slideOut 0.3s ease forwards';
    notification.addEventListener('animationend', () => {
      notification.remove();
    }, { once: true });
  }, 3000);
}