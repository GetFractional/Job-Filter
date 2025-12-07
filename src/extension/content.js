/**
 * Job Hunter OS - Content Script
 *
 * Runs on LinkedIn and Indeed job detail pages to:
 * - Detect when user is viewing a job posting
 * - Extract job data from the page DOM
 * - Inject a "Send to Job Hunter" overlay button
 * - Send extracted data to background script for Airtable submission
 */

// Prevent multiple injections
if (window.jobHunterInjected) {
  console.log('[Job Hunter] Already injected, skipping');
} else {
  window.jobHunterInjected = true;
  initJobHunter();
}

/**
 * Main initialization function
 */
function initJobHunter() {
  console.log('[Job Hunter] Content script loaded');

  // Determine which site we're on
  const hostname = window.location.hostname;

  if (hostname.includes('linkedin.com')) {
    handleLinkedIn();
  } else if (hostname.includes('indeed.com')) {
    handleIndeed();
  }
}

// ============================================================================
// LINKEDIN HANDLER
// ============================================================================

/**
 * Initialize LinkedIn job page handling
 */
function handleLinkedIn() {
  // LinkedIn uses client-side routing, so we need to watch for URL changes
  let lastUrl = location.href;

  // Check immediately if we're on a job page
  if (isLinkedInJobPage()) {
    injectOverlay('LinkedIn');
  }

  // Watch for navigation changes (LinkedIn is a SPA)
  const observer = new MutationObserver(() => {
    if (location.href !== lastUrl) {
      lastUrl = location.href;
      // Remove existing overlay if present
      removeOverlay();
      // Check if new page is a job page
      if (isLinkedInJobPage()) {
        // Small delay to let page content load
        setTimeout(() => injectOverlay('LinkedIn'), 500);
      }
    }
  });

  observer.observe(document.body, { childList: true, subtree: true });
}

/**
 * Check if current LinkedIn page is a job detail page
 * @returns {boolean}
 */
function isLinkedInJobPage() {
  const url = window.location.href;
  // LinkedIn job URLs typically contain /jobs/view/ or /jobs/search/ with a currentJobId
  return url.includes('/jobs/view/') ||
         (url.includes('/jobs/') && url.includes('currentJobId='));
}

/**
 * Extract job data from LinkedIn job detail page
 * @returns {Object} Extracted job data
 */
function extractLinkedInJobData() {
  const data = {
    jobTitle: '',
    companyName: '',
    location: '',
    salaryMin: null,
    salaryMax: null,
    descriptionText: '',
    jobUrl: window.location.href,
    source: 'LinkedIn'
  };

  try {
    // Job Title - try multiple possible selectors
    const titleSelectors = [
      '.job-details-jobs-unified-top-card__job-title h1',
      '.jobs-unified-top-card__job-title',
      '.t-24.t-bold.inline',
      'h1.topcard__title',
      '.jobs-details-top-card__job-title'
    ];
    data.jobTitle = getTextFromSelectors(titleSelectors) || '';

    // Company Name - try multiple possible selectors
    const companySelectors = [
      '.job-details-jobs-unified-top-card__company-name a',
      '.job-details-jobs-unified-top-card__company-name',
      '.jobs-unified-top-card__company-name a',
      '.jobs-unified-top-card__company-name',
      '.topcard__org-name-link',
      '.jobs-details-top-card__company-url'
    ];
    data.companyName = getTextFromSelectors(companySelectors) || '';

    // Location - try multiple possible selectors
    const locationSelectors = [
      '.job-details-jobs-unified-top-card__primary-description-container .tvm__text',
      '.jobs-unified-top-card__bullet',
      '.jobs-unified-top-card__workplace-type',
      '.topcard__flavor--bullet',
      '.jobs-details-top-card__bullet'
    ];
    data.location = getTextFromSelectors(locationSelectors) || '';

    // Salary - LinkedIn sometimes shows salary in insights section
    const salarySelectors = [
      '.job-details-jobs-unified-top-card__job-insight span',
      '.compensation__salary',
      '.salary-main-rail__data-item'
    ];
    const salaryText = getTextFromSelectors(salarySelectors) || '';
    const salaryRange = parseSalaryRange(salaryText);
    data.salaryMin = salaryRange.min;
    data.salaryMax = salaryRange.max;

    // Job Description - the main description content
    const descriptionSelectors = [
      '.jobs-description__content',
      '.jobs-description-content__text',
      '.jobs-box__html-content',
      '.description__text',
      '#job-details'
    ];
    data.descriptionText = getTextFromSelectors(descriptionSelectors, true) || '';

    // Clean up the job URL - remove unnecessary parameters
    data.jobUrl = cleanLinkedInUrl(window.location.href);

  } catch (error) {
    console.error('[Job Hunter] Error extracting LinkedIn data:', error);
  }

  return data;
}

/**
 * Clean LinkedIn URL to just the essential parts
 * @param {string} url - Full URL
 * @returns {string} Cleaned URL
 */
function cleanLinkedInUrl(url) {
  try {
    const urlObj = new URL(url);
    // Keep only the job view path
    if (url.includes('/jobs/view/')) {
      const jobId = url.match(/\/jobs\/view\/(\d+)/)?.[1];
      if (jobId) {
        return `https://www.linkedin.com/jobs/view/${jobId}/`;
      }
    }
    // For search pages with currentJobId, extract the job ID
    const currentJobId = urlObj.searchParams.get('currentJobId');
    if (currentJobId) {
      return `https://www.linkedin.com/jobs/view/${currentJobId}/`;
    }
    return url;
  } catch {
    return url;
  }
}

// ============================================================================
// INDEED HANDLER (Basic implementation - can be extended)
// ============================================================================

/**
 * Initialize Indeed job page handling
 */
function handleIndeed() {
  // Check if we're on a job detail page
  if (isIndeedJobPage()) {
    injectOverlay('Indeed');
  }
}

/**
 * Check if current Indeed page is a job detail page
 * @returns {boolean}
 */
function isIndeedJobPage() {
  const url = window.location.href;
  return url.includes('/viewjob') || url.includes('vjk=');
}

/**
 * Extract job data from Indeed job detail page
 * @returns {Object} Extracted job data
 */
function extractIndeedJobData() {
  const data = {
    jobTitle: '',
    companyName: '',
    location: '',
    salaryMin: null,
    salaryMax: null,
    descriptionText: '',
    jobUrl: window.location.href,
    source: 'Indeed'
  };

  try {
    // Job Title
    const titleSelectors = [
      '.jobsearch-JobInfoHeader-title',
      'h1.icl-u-xs-mb--xs',
      '.jobsearch-JobInfoHeader h1'
    ];
    data.jobTitle = getTextFromSelectors(titleSelectors) || '';

    // Company Name
    const companySelectors = [
      '[data-company-name="true"]',
      '.jobsearch-InlineCompanyRating-companyHeader a',
      '.icl-u-lg-mr--sm a'
    ];
    data.companyName = getTextFromSelectors(companySelectors) || '';

    // Location
    const locationSelectors = [
      '[data-testid="job-location"]',
      '.jobsearch-JobInfoHeader-subtitle > div:nth-child(2)',
      '.icl-u-xs-mt--xs'
    ];
    data.location = getTextFromSelectors(locationSelectors) || '';

    // Salary
    const salarySelectors = [
      '[data-testid="attribute_snippet_testid"]',
      '.jobsearch-JobMetadataHeader-item'
    ];
    const salaryText = getTextFromSelectors(salarySelectors) || '';
    const salaryRange = parseSalaryRange(salaryText);
    data.salaryMin = salaryRange.min;
    data.salaryMax = salaryRange.max;

    // Job Description
    const descriptionSelectors = [
      '#jobDescriptionText',
      '.jobsearch-jobDescriptionText'
    ];
    data.descriptionText = getTextFromSelectors(descriptionSelectors, true) || '';

  } catch (error) {
    console.error('[Job Hunter] Error extracting Indeed data:', error);
  }

  return data;
}

// ============================================================================
// SHARED UTILITIES
// ============================================================================

/**
 * Try multiple selectors and return the first matching text content
 * @param {string[]} selectors - Array of CSS selectors to try
 * @param {boolean} preserveWhitespace - Whether to preserve paragraph breaks
 * @returns {string|null} Text content or null
 */
function getTextFromSelectors(selectors, preserveWhitespace = false) {
  for (const selector of selectors) {
    const element = document.querySelector(selector);
    if (element) {
      if (preserveWhitespace) {
        // For descriptions, preserve some structure
        return element.innerText.trim();
      }
      return element.textContent?.trim() || null;
    }
  }
  return null;
}

/**
 * Parse salary range from text
 * @param {string} text - Text potentially containing salary info
 * @returns {Object} { min: number|null, max: number|null }
 */
function parseSalaryRange(text) {
  const result = { min: null, max: null };

  if (!text) return result;

  // Match patterns like "$150,000 - $200,000" or "$150K - $200K"
  const rangeMatch = text.match(/\$?([\d,]+)(?:K|k)?\s*[-–to]+\s*\$?([\d,]+)(?:K|k)?/);
  if (rangeMatch) {
    let min = parseFloat(rangeMatch[1].replace(/,/g, ''));
    let max = parseFloat(rangeMatch[2].replace(/,/g, ''));

    // Handle K suffix (150K = 150000)
    if (text.toLowerCase().includes('k') && min < 1000) {
      min *= 1000;
      max *= 1000;
    }

    result.min = min;
    result.max = max;
    return result;
  }

  // Match single salary like "$180,000" or "$180K"
  const singleMatch = text.match(/\$?([\d,]+)(?:K|k)?/);
  if (singleMatch) {
    let salary = parseFloat(singleMatch[1].replace(/,/g, ''));
    if (text.toLowerCase().includes('k') && salary < 1000) {
      salary *= 1000;
    }
    result.min = salary;
    result.max = salary;
  }

  return result;
}

// ============================================================================
// OVERLAY UI
// ============================================================================

/**
 * Inject the "Send to Job Hunter" overlay button
 * @param {string} source - 'LinkedIn' or 'Indeed'
 */
function injectOverlay(source) {
  // Don't inject if already present
  if (document.getElementById('job-hunter-overlay')) {
    return;
  }

  // Create overlay container
  const overlay = document.createElement('div');
  overlay.id = 'job-hunter-overlay';
  overlay.innerHTML = `
    <style>
      #job-hunter-overlay {
        position: fixed;
        bottom: 24px;
        right: 24px;
        z-index: 999999;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      }

      #job-hunter-btn {
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 12px 20px;
        font-size: 14px;
        font-weight: 600;
        color: #fff;
        background: linear-gradient(135deg, #4361ee 0%, #3a56d4 100%);
        border: none;
        border-radius: 50px;
        cursor: pointer;
        box-shadow: 0 4px 12px rgba(67, 97, 238, 0.4);
        transition: all 0.2s ease;
      }

      #job-hunter-btn:hover {
        transform: translateY(-2px);
        box-shadow: 0 6px 20px rgba(67, 97, 238, 0.5);
      }

      #job-hunter-btn:active {
        transform: translateY(0);
      }

      #job-hunter-btn:disabled {
        background: #6c757d;
        cursor: not-allowed;
        transform: none;
        box-shadow: none;
      }

      #job-hunter-btn.success {
        background: linear-gradient(135deg, #2b8a3e 0%, #228b22 100%);
      }

      #job-hunter-btn.error {
        background: linear-gradient(135deg, #c92a2a 0%, #a51d1d 100%);
      }

      #job-hunter-btn svg {
        width: 18px;
        height: 18px;
        fill: currentColor;
      }

      @keyframes jh-spin {
        to { transform: rotate(360deg); }
      }

      #job-hunter-btn.loading svg {
        animation: jh-spin 1s linear infinite;
      }
    </style>

    <button id="job-hunter-btn" title="Send this job to Job Hunter OS">
      <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
        <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"></path>
      </svg>
      <span>Send to Job Hunter</span>
    </button>
  `;

  document.body.appendChild(overlay);

  // Add click handler
  const button = document.getElementById('job-hunter-btn');
  button.addEventListener('click', () => handleCaptureClick(source, button));

  console.log('[Job Hunter] Overlay injected');
}

/**
 * Remove the overlay from the page
 */
function removeOverlay() {
  const overlay = document.getElementById('job-hunter-overlay');
  if (overlay) {
    overlay.remove();
  }
}

/**
 * Handle click on the capture button
 * @param {string} source - 'LinkedIn' or 'Indeed'
 * @param {HTMLButtonElement} button - The button element
 */
async function handleCaptureClick(source, button) {
  // Prevent double-clicks
  if (button.disabled) return;

  // Show loading state
  button.disabled = true;
  button.classList.add('loading');
  button.querySelector('span').textContent = 'Capturing...';

  try {
    // Extract job data based on source
    const jobData = source === 'LinkedIn'
      ? extractLinkedInJobData()
      : extractIndeedJobData();

    console.log('[Job Hunter] Extracted job data:', jobData);

    // Validate we got essential data
    if (!jobData.jobTitle || !jobData.companyName) {
      throw new Error('Could not extract job title or company name');
    }

    // Send to background script for Airtable submission
    const response = await chrome.runtime.sendMessage({
      action: 'jobHunter.createAirtableRecord',
      job: jobData
    });

    if (response.success) {
      // Show success state
      button.classList.remove('loading');
      button.classList.add('success');
      button.querySelector('span').textContent = 'Job Captured!';

      // Reset button after 3 seconds
      setTimeout(() => {
        button.classList.remove('success');
        button.querySelector('span').textContent = 'Send to Job Hunter';
        button.disabled = false;
      }, 3000);
    } else {
      throw new Error(response.error || 'Failed to save job');
    }

  } catch (error) {
    console.error('[Job Hunter] Capture error:', error);

    // Show error state
    button.classList.remove('loading');
    button.classList.add('error');
    button.querySelector('span').textContent = error.message || 'Error - Try Again';

    // Reset button after 3 seconds
    setTimeout(() => {
      button.classList.remove('error');
      button.querySelector('span').textContent = 'Send to Job Hunter';
      button.disabled = false;
    }, 3000);
  }
}
