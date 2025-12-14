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
    companyPageUrl: '',
    location: '',
    companyIndustry: '',
    salaryMin: null,
    salaryMax: null,
    workplaceType: '',
    employmentType: '',
    equityMentioned: false,
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
      '.jobs-details-top-card__company-url',
      '.job-details-jobs-unified-top-card__primary-description-container a',
      '.jobs-unified-top-card__subtitle-1 .app-aware-link'
    ];
    data.companyName = getTextFromSelectors(companySelectors) || '';
    const companyLinkSelectors = [
      '.job-details-jobs-unified-top-card__company-name a[href*="/company/"]',
      '.jobs-unified-top-card__company-name a[href*="/company/"]',
      '.jobs-details-top-card__company-url a[href*="/company/"]',
      'a[href*="linkedin.com/company/"]'
    ];
    const companyLinkEl = document.querySelector(companyLinkSelectors.join(','));
    if (companyLinkEl?.href) {
      data.companyPageUrl = cleanCompanyUrl(companyLinkEl.href);
    }
    if (!data.companyName) {
      // Wider fallbacks: any company link in the top card area
      const topCard = document.querySelector('.job-details-jobs-unified-top-card, .jobs-unified-top-card, .job-details-jobs-unified-top-card__primary-description-container');
      const companyLink = topCard?.querySelector(
        'a[href*="/company/"], a[data-tracking-control-name*="org-name"], a[data-tracking-control-name*="company-name"]'
      );
      if (companyLink?.textContent?.trim()) {
        data.companyName = companyLink.textContent.trim();
        if (!data.companyPageUrl && companyLink.href) {
          data.companyPageUrl = cleanCompanyUrl(companyLink.href);
        }
      }
    }
    if (!data.companyName) {
      // Final fallback: scan all obvious company links (company URLs / app-aware links) and pick the first non-empty text/aria-label
      const linkCandidates = Array.from(document.querySelectorAll('a[href*="linkedin.com/company/"], a[href*="/company/"][data-test-app-aware-link]'));
      for (const link of linkCandidates) {
        const text = link.textContent?.trim();
        const aria = link.getAttribute('aria-label')?.replace(/ logo$/i, '').trim();
        if (text) {
          data.companyName = text;
          if (!data.companyPageUrl && link.href) {
            data.companyPageUrl = cleanCompanyUrl(link.href);
          }
          break;
        }
        if (!text && aria) {
          data.companyName = aria;
          if (!data.companyPageUrl && link.href) {
            data.companyPageUrl = cleanCompanyUrl(link.href);
          }
          break;
        }
      }
    }

    // Location - try multiple possible selectors
    const locationSelectors = [
      '.job-details-jobs-unified-top-card__primary-description-container .tvm__text',
      '.jobs-unified-top-card__bullet',
      '.jobs-unified-top-card__workplace-type',
      '.topcard__flavor--bullet',
      '.jobs-details-top-card__bullet',
      '.jobs-unified-top-card__primary-description'
    ];
    data.location = getTextFromSelectors(locationSelectors) || '';

    // Company Industry
    const industrySelectors = [
        '.job-details-jobs-unified-top-card__job-insight:first-of-type span:first-of-type',
        '.jobs-unified-top-card__job-insight span'
    ];
    data.companyIndustry = getTextFromSelectors(industrySelectors) || '';

    // Salary - LinkedIn sometimes shows salary in insights section
    const salarySelectors = [
      '.job-details-jobs-unified-top-card__job-insight span',
      '.compensation__salary',
      '.salary-main-rail__data-item',
      '.job-details-fit-level-preferences button'
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

    // Fallback: parse salary from description when top-card insights are empty
    if (data.salaryMin === null && data.salaryMax === null && data.descriptionText) {
      const parsedFromDesc = findSalaryInText(data.descriptionText);
      if (parsedFromDesc.min !== null && parsedFromDesc.max !== null) {
        data.salaryMin = parsedFromDesc.min;
        data.salaryMax = parsedFromDesc.max;
      }
    }



    // Extract workplace type / job type / salary hints from preference buttons
    const preferenceButtons = Array.from(document.querySelectorAll('.job-details-fit-level-preferences button'));
    for (const btn of preferenceButtons) {
      const text = btn.innerText?.trim() || '';
      if (!text) continue;

      // Workplace type (Remote / Hybrid / On-site)
      if (/remote/i.test(text)) {
        data.workplaceType = 'Remote';
      } else if (/hybrid/i.test(text)) {
        data.workplaceType = 'Hybrid';
      } else if (/on[-\s]?site|onsite/i.test(text)) {
        data.workplaceType = 'On-site';
      }

      // Employment type (Full-time / Part-time / Contract)
      if (/full[-\s]?time/i.test(text)) {
        data.employmentType = 'Full-time';
      } else if (/part[-\s]?time/i.test(text)) {
        data.employmentType = 'Part-time';
      } else if (/contract/i.test(text)) {
        data.employmentType = 'Contract';
      } else if (/intern/i.test(text)) {
        data.employmentType = 'Internship';
      }

      // Salary fallback: if main selectors missed, try parsing here
      if (data.salaryMin === null || data.salaryMax === null) {
        const prefSalary = parseSalaryRange(text);
        if (prefSalary.min !== null && prefSalary.max !== null) {
          data.salaryMin = prefSalary.min;
          data.salaryMax = prefSalary.max;
        }
      }
    }

    // If no location but we know workplace type, use that (e.g., Remote)
    if (!data.location && data.workplaceType) {
      data.location = data.workplaceType;
    }

    // Flag if equity is mentioned in the description
    if (/equity|stock options?|rsus?/i.test(data.descriptionText || '')) {
      data.equityMentioned = true;
    }

    // Clean up the job URL - remove unnecessary parameters
    data.jobUrl = cleanLinkedInUrl(window.location.href);
    data.job_id = data.jobUrl; // Use the cleaned URL as the job_id

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

/**
 * Normalize LinkedIn company URLs by stripping trailing "/life" or tracking params
 * @param {string} url - Full company URL
 * @returns {string} Cleaned URL
 */
function cleanCompanyUrl(url) {
  try {
    const urlObj = new URL(url);
    // Remove query/hash
    urlObj.search = '';
    urlObj.hash = '';

    // Strip trailing /life segment (LinkedIn sometimes links to the "Life" subpage)
    let pathname = urlObj.pathname.replace(/\/+$/, '');
    pathname = pathname.replace(/\/life\/?$/i, '');

    // Ensure trailing slash for canonical company URL
    urlObj.pathname = pathname.endsWith('/') ? pathname : `${pathname}/`;

    return urlObj.toString();
  } catch {
    return url;
  }
}

/**
 * Clean Indeed URL to just the essential parts (job ID)
 * @param {string} url - Full URL
 * @returns {string} Cleaned URL
 */
function cleanIndeedUrl(url) {
  try {
    const urlObj = new URL(url);
    const vjkParam = urlObj.searchParams.get('vjk'); // Indeed's job ID parameter
    if (vjkParam) {
      return `https://www.indeed.com/viewjob?jk=${vjkParam}`;
    }
    // Fallback for /viewjob/ URLs without vjk, try to extract from path
    const pathMatch = urlObj.pathname.match(/\/viewjob\/(.*?)(?:\/|\?|$)/);
    if (pathMatch && pathMatch[1]) {
      return `https://www.indeed.com/viewjob?jk=${pathMatch[1]}`;
    }
    return url; // Return original if no job ID found
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
  // Indeed often keeps you on the same page and swaps the job in-place.
  // Use a URL-aware poller so we only inject on actual job detail URLs.
  let lastUrl = location.href;

  const checkAndInject = () => {
    const isJob = isIndeedJobPage();
    if (isJob && !document.getElementById('job-hunter-overlay')) {
      // Small delay to let the right-rail job detail render
      setTimeout(() => {
        if (isIndeedJobPage() && !document.getElementById('job-hunter-overlay')) {
          injectOverlay('Indeed');
        }
      }, 300);
    } else if (!isJob) {
      removeOverlay();
    }
  };

  // Initial check
  checkAndInject();

  // Poll for URL changes that indicate a new job selection
  setInterval(() => {
    if (location.href !== lastUrl) {
      lastUrl = location.href;
      removeOverlay();
      checkAndInject();
    } else {
      // Even without URL change, ensure overlay exists when on a job
      checkAndInject();
    }
  }, 1000);
}

/**
 * Check if current Indeed page is a job detail page
 * @returns {boolean}
 */
function isIndeedJobPage() {
  const url = window.location.href;
  return /\/viewjob/i.test(url) || /[?&]vjk=/i.test(url);
}

/**
 * Extract job data from Indeed job detail page
 * @returns {Object} Extracted job data
 */
function extractIndeedJobData() {
  const data = {
    jobTitle: '',
    companyName: '',
    companyPageUrl: '',
    location: '',
    salaryMin: null,
    salaryMax: null,
    descriptionText: '',
    workplaceType: '',
    employmentType: '',
    equityMentioned: false,
    jobUrl: window.location.href,
    source: 'Indeed'
  };

  try {
    // Job Title: prefer modern data-testid selectors, then legacy class fallbacks (Indeed DOM changes frequently)
    const titleSelectors = [
      'h1[data-testid="jobDetailTitle"]',
      'h1[data-testid="jobTitle"]',
      '.jobsearch-JobInfoHeader-title',
      'h1.icl-u-xs-mb--xs',
      '.jobsearch-JobInfoHeader h1'
    ];
    data.jobTitle = getTextFromSelectors(titleSelectors) || '';

    // Company Name: data-testid first, then legacy company rating links
    const companySelectors = [
      'div[data-testid="company-name"]',
      'div[data-testid="inlineHeader-companyName"]',
      '[data-company-name="true"]',
      '.jobsearch-InlineCompanyRating-companyHeader a',
      '.icl-u-lg-mr--sm a'
    ];
    data.companyName = getTextFromSelectors(companySelectors) || '';
    const companyLinkEl = document.querySelector('div[data-testid="inlineHeader-companyName"] a, div[data-testid="company-name"] a, [data-company-name="true"] a');
    if (companyLinkEl?.href) {
      data.companyPageUrl = companyLinkEl.href;
    }

    // Location: data-testid location first, then legacy subtitle items
    const locationSelectors = [
      'div[data-testid="text-location"]',
      'div[data-testid="inlineHeader-location"]',
      '[data-testid="job-location"]',
      '.jobsearch-JobInfoHeader-subtitle > div:nth-child(2)',
      '.icl-u-xs-mt--xs'
    ];
    const rawLocation = getTextFromSelectors(locationSelectors) || '';
    const normalizedLocation = normalizeIndeedLocation(rawLocation);
    if (normalizedLocation.location) {
      data.location = normalizedLocation.location;
    }
    if (normalizedLocation.workplaceType && !data.workplaceType) {
      data.workplaceType = normalizedLocation.workplaceType;
    }

    // Salary: data-testid salary first, then legacy metadata items
    const salarySelectors = [
      'div[data-testid="jobDetailSalary"]',
      '[data-testid="attribute_snippet_testid"]',
      '.jobsearch-JobMetadataHeader-item',
      '#salaryInfoAndJobType span'
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

    // Salary fallback from description if primary fields are empty
    if (data.salaryMin === null && data.salaryMax === null && data.descriptionText) {
      const descSalary = findSalaryInText(data.descriptionText);
      if (descSalary.min !== null && descSalary.max !== null) {
        data.salaryMin = descSalary.min;
        data.salaryMax = descSalary.max;
      }
    }

    // Employment type: often near salary info
    const employmentSelectors = [
      '#salaryInfoAndJobType',
      'div[data-testid="jobsearch-OtherJobDetailsContainer"]',
      'div[data-testid="jobsearch-JobInfoHeader-title"] + div'
    ];
    const employmentText = getTextFromSelectors(employmentSelectors) || '';
    if (/full[-\s]?time/i.test(employmentText)) data.employmentType = 'Full-time';
    else if (/part[-\s]?time/i.test(employmentText)) data.employmentType = 'Part-time';
    else if (/contract/i.test(employmentText)) data.employmentType = 'Contract';
    else if (/intern/i.test(employmentText)) data.employmentType = 'Internship';

    // Workspace type from description if not already set
    if (!data.workplaceType) {
      if (/remote/i.test(employmentText)) data.workplaceType = 'Remote';
      else if (/hybrid/i.test(employmentText)) data.workplaceType = 'Hybrid';
      else if (/on[-\s]?site|onsite/i.test(employmentText)) data.workplaceType = 'On-site';
    }

    // Equity flag: avoid EEO/DEI boilerplate false positives
    if (data.descriptionText) {
      const desc = data.descriptionText.toLowerCase();
      const mentionsEquity = /equity|stock options?|rsus?/i.test(desc);
      const isDeiBoilerplate = /diversity[^.]{0,80}equity|equal opportunity employer/i.test(desc);
      if (mentionsEquity && !isDeiBoilerplate) {
        data.equityMentioned = true;
      }
    }

    data.jobUrl = cleanIndeedUrl(window.location.href); // Use cleaned URL
    data.job_id = data.jobUrl; // Use the cleaned URL as the job_id

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
    const elements = document.querySelectorAll(selector);
    for (const element of elements) {
      const text = preserveWhitespace
        ? element.innerText?.trim()
        : element.textContent?.trim();
      if (text) {
        return text;
      }
    }
  }
  return null;
}

/**
 * Find salary information in descriptive text, gated by salary-related keywords to avoid false positives
 * @param {string} text - Full description text
 * @returns {{min: number|null, max: number|null}}
 */
function findSalaryInText(text) {
  const result = { min: null, max: null };
  if (!text) return result;

  const keywordRegex = /(salary|compensation|pay|base|range|total rewards)/i;
  const currencyRegex = /\$|usd/i;

  const lines = text
    .split('\n')
    .map(line => line.trim())
    .filter(Boolean);

  const tryParse = raw => {
    if (!raw || !currencyRegex.test(raw)) return null;
    const parsed = parseSalaryRange(raw);
    if (parsed.min !== null && parsed.max !== null) {
      return parsed;
    }
    return null;
  };

  // Pass 1: keyword line plus following context (handles multi-line labels + amounts)
  for (let i = 0; i < lines.length; i++) {
    if (!keywordRegex.test(lines[i])) continue;
    const block = [lines[i]];
    if (lines[i + 1]) block.push(lines[i + 1]);
    if (lines[i + 2]) block.push(lines[i + 2]);
    if (lines[i + 3]) block.push(lines[i + 3]); // allow two lines after header in case of blank separators
    const parsed = tryParse(block.join(' '));
    if (parsed) return parsed;
  }

  // Pass 2: bullet lines that include keyword + currency
  for (const line of lines) {
    if (!/^[-•*]/.test(line)) continue;
    if (!keywordRegex.test(line)) continue;
    const parsed = tryParse(line);
    if (parsed) return parsed;
  }

  // Pass 3: any single line containing keyword + currency
  for (const line of lines) {
    if (!keywordRegex.test(line)) continue;
    const parsed = tryParse(line);
    if (parsed) return parsed;
  }

  return result;
}

/**
 * Parse salary range from text
 * @param {string} text - Text potentially containing salary info
 * @returns {Object} { min: number|null, max: number|null }
 */
function parseSalaryRange(text) {
  const result = { min: null, max: null };

  if (!text) return result;

  const cleaned = text
    .replace(/\s+/g, ' ')
    .replace(/\/?yr\.?|per year|a year/gi, '')
    .replace(/\b(usd|cad|gbp|eur|aud)\b/gi, '') // strip trailing currency words
    .replace(/[()]/g, '')
    .trim();

  // Match patterns like "$150,000 - $200,000", "$150K–$200K", or "$150K to $200K"
  const rangeMatch = cleaned.match(
    /\$?\s*([\d.,]+)\s*(K|k|M|m)?\s*(?:-|–|to)\s*\$?\s*([\d.,]+)\s*(K|k|M|m)?/i
  );
  if (rangeMatch) {
    let min = parseFloat(rangeMatch[1].replace(/,/g, ''));
    let max = parseFloat(rangeMatch[3].replace(/,/g, ''));

    const minSuffix = rangeMatch[2]?.toLowerCase();
    const maxSuffix = rangeMatch[4]?.toLowerCase();

    if (minSuffix === 'k') min *= 1000;
    if (maxSuffix === 'k') max *= 1000;
    if (minSuffix === 'm') min *= 1000000;
    if (maxSuffix === 'm') max *= 1000000;

    result.min = min;
    result.max = max;
    return result;
  }

  // Match single salary like "$180,000" or "$180K" (guarded by currency and reasonable length)
  const singleMatch = cleaned.match(/\$\s*([\d.,]{3,})\s*(K|k|M|m)?/);
  if (singleMatch) {
    let salary = parseFloat(singleMatch[1].replace(/,/g, ''));
    const suffix = singleMatch[2]?.toLowerCase();
    if (suffix === 'k') salary *= 1000;
    if (suffix === 'm') salary *= 1000000;
    result.min = salary;
    result.max = salary;
  }

  return result;
}

/**
 * Normalize Indeed location strings to "City, ST" and detect workplace type
 * @param {string} rawLocation
 * @returns {{ location: string, workplaceType: string }}
 */
function normalizeIndeedLocation(rawLocation) {
  const result = { location: '', workplaceType: '' };
  if (!rawLocation) return result;

  let text = rawLocation
    .replace(/\s+/g, ' ')
    .replace(/•/g, ' ')
    .trim();

  // Detect workplace type from the location string
  if (/remote/i.test(text)) result.workplaceType = 'Remote';
  else if (/hybrid/i.test(text)) result.workplaceType = 'Hybrid';
  else if (/on[-\s]?site|onsite/i.test(text)) result.workplaceType = 'On-site';

  // Drop leading workplace phrases like "Remote in", "Hybrid in", "On-site in"
  text = text.replace(/^(remote|hybrid|on[-\s]?site|onsite)\s+in\s+/i, '');

  // Remove trailing country tokens commonly appended
  text = text.replace(/,\s*United States( of America)?$/i, '');

  // Remove ZIP codes (5-digit or ZIP+4)
  text = text.replace(/\s+\d{5}(?:-\d{4})?$/, '');

  // If the string still contains multiple tokens, take the first city, ST pair
  const match = text.match(/([A-Za-z .'-]+,\s*[A-Z]{2})(?:\b|$)/);
  if (match) {
    result.location = match[1].trim();
    return result;
  }

  // Fallback: if there is a comma-separated city/state without uppercase state
  const parts = text.split(',').map(p => p.trim()).filter(Boolean);
  if (parts.length >= 2) {
    result.location = `${parts[0]}, ${parts[1]}`;
    return result;
  }

  // Final fallback: return cleaned text
  result.location = text;
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
  // Check if already injected on this page
  if (document.getElementById('job-hunter-overlay')) {
    console.log('[Job Hunter] Overlay already present');
    return;
  }

  // Create overlay container
  const overlay = document.createElement('div');
  overlay.id = 'job-hunter-overlay';
  overlay.style.cssText = `
    position: fixed;
    bottom: 20px;
    right: 20px;
    z-index: 9999;
    display: flex;
    gap: 10px;
    flex-direction: column;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  `;

  // Create primary button: "Send to Job Hunter"
  const sendBtn = document.createElement('button');
  sendBtn.id = 'job-hunter-send-btn';
  sendBtn.textContent = '📤 Send to Job Hunter';
  sendBtn.style.cssText = `
    background-color: #4361ee;
    color: white;
    border: none;
    padding: 10px 16px;
    border-radius: 6px;
    cursor: pointer;
    font-size: 13px;
    font-weight: 500;
    box-shadow: 0 4px 12px rgba(67, 97, 238, 0.3);
    transition: all 0.2s ease;
    min-width: 160px;
  `;

  sendBtn.onmouseover = () => {
    sendBtn.style.backgroundColor = '#3a56d4';
    sendBtn.style.boxShadow = '0 6px 16px rgba(67, 97, 238, 0.4)';
  };

  sendBtn.onmouseout = () => {
    sendBtn.style.backgroundColor = '#4361ee';
    sendBtn.style.boxShadow = '0 4px 12px rgba(67, 97, 238, 0.3)';
  };

  sendBtn.addEventListener('click', () => handleSendJob(source));

  // NEW: Create secondary button: "Score This Job"
  const scoreBtn = document.createElement('button');
  scoreBtn.id = 'job-hunter-score-btn';
  scoreBtn.textContent = '⚡ Score This Job';
  scoreBtn.style.cssText = `
    background-color: #f39c12;
    color: white;
    border: none;
    padding: 10px 16px;
    border-radius: 6px;
    cursor: pointer;
    font-size: 13px;
    font-weight: 500;
    box-shadow: 0 4px 12px rgba(243, 156, 18, 0.3);
    transition: all 0.2s ease;
    min-width: 160px;
  `;

  scoreBtn.onmouseover = () => {
    scoreBtn.style.backgroundColor = '#e67e22';
    scoreBtn.style.boxShadow = '0 6px 16px rgba(243, 156, 18, 0.4)';
  };

  scoreBtn.onmouseout = () => {
    scoreBtn.style.backgroundColor = '#f39c12';
    scoreBtn.style.boxShadow = '0 4px 12px rgba(243, 156, 18, 0.3)';
  };

  scoreBtn.addEventListener('click', () => handleScoreJob(source));

  // Append buttons to overlay
  overlay.appendChild(sendBtn);
  overlay.appendChild(scoreBtn);

  // Add overlay to page
  document.body.appendChild(overlay);

  console.log('[Job Hunter] Overlay injected with Send and Score buttons');
}

/**
 * NEW: Handle "Score This Job" button click
 * Extracts job data, loads user profile, calculates score, displays modal
 */
async function handleScoreJob(source) {
  console.log('[Job Hunter] Score button clicked on', source);

  try {
    // Show loading state
    showScoringLoading();

    // Extract job data based on source
    let jobData;
    if (source === 'LinkedIn') {
      jobData = extractLinkedInJobData();
    } else if (source === 'Indeed') {
      jobData = extractIndeedJobData();
    } else {
      throw new Error('Unknown source: ' + source);
    }

    // Validate extracted data
    if (!jobData.jobTitle || !jobData.companyName) {
      showScoringError('Could not extract complete job data. Please ensure you are on a job detail page.');
      return;
    }

    console.log('[Job Hunter] Extracted job data:', jobData);

    // Fetch user profile from Chrome storage
    const userProfile = await loadUserProfileForScoring();
    if (!userProfile) {
      showScoringError('User profile not configured. Please set up your profile in Job Hunter settings.');
      return;
    }

    console.log('[Job Hunter] Loaded user profile');

    // Calculate score using scoring-engine.js
    // Note: scoring-engine.js must be loaded in content script
    const scoreResult = await scoreJobFit(jobData, userProfile);

    if (scoreResult.success === false) {
      showScoringError('Error calculating score: ' + scoreResult.error);
      return;
    }

    console.log('[Job Hunter] Score result:', scoreResult);

    // Display results modal
    displayScoringResults(scoreResult, jobData);

  } catch (error) {
    console.error('[Job Hunter] Scoring error:', error);
    showScoringError('An unexpected error occurred: ' + error.message);
  }
}

/**
 * Load user profile from Chrome storage for scoring
 */
async function loadUserProfileForScoring() {
  try {
    const result = await chrome.storage.local.get(['jh_user_profile']);
    return result['jh_user_profile'] || null;
  } catch (error) {
    console.error('[Job Hunter] Error loading user profile:', error);
    return null;
  }
}

/**
 * Display scoring results in modal
 */
function displayScoringResults(scoreResult, jobData) {
  // Remove any existing modals
  const existingModal = document.getElementById('job-hunter-scoring-modal');
  if (existingModal) {
    existingModal.remove();
  }

  // Create modal container
  const modalContainer = document.createElement('div');
  modalContainer.id = 'job-hunter-scoring-modal';
  modalContainer.className = 'scoring-overlay';

  // Build score card
  const scoreLabel = scoreResult.overall_label;
  const scoreColor = scoreResult.color;
  const scoreAction = scoreResult.action;

  // Build breakdown tables
  let breakdownHTML = '';

  // Job→User Fit breakdown
  breakdownHTML += '<div class="breakdown-section">';
  breakdownHTML += '<h3>Job → Your Fit (0–50)</h3>';
  breakdownHTML += '<p style="font-size: 12px; color: #6c757d; margin: 8px 0;">Does this job meet your preferences, salary, and workplace requirements?</p>';
  breakdownHTML += '<table class="breakdown-table">';
  breakdownHTML += '<thead><tr><th>Criteria</th><th>Job Offers</th><th style="width: 50px;">Score</th></tr></thead>';
  breakdownHTML += '<tbody>';

  for (const item of scoreResult.job_to_user_fit.breakdown) {
    const scoreClass = item.score >= 40 ? '' : (item.score >= 25 ? 'medium' : 'low');
    breakdownHTML += `
      <tr>
        <td colspan="3">
          <div class="breakdown-criteria">${item.criteria}</div>
          <div class="breakdown-value">${item.actual_value}</div>
          <div class="breakdown-rationale">${item.rationale}</div>
        </td>
      </tr>
    `;
  }

  breakdownHTML += '</tbody></table>';
  breakdownHTML += `<p style="margin-top: 10px; font-weight: 600; color: #2ecc71;">Score: ${scoreResult.job_to_user_fit.score}/50</p>`;
  breakdownHTML += '</div>';

  // User→Job Fit breakdown
  breakdownHTML += '<div class="breakdown-section">';
  breakdownHTML += '<h3>Your → Job Fit (0–50)</h3>';
  breakdownHTML += '<p style="font-size: 12px; color: #6c757d; margin: 8px 0;">Does your background, skills, and experience match this job?</p>';
  breakdownHTML += '<table class="breakdown-table">';
  breakdownHTML += '<thead><tr><th>Criteria</th><th>Your Fit</th><th style="width: 50px;">Score</th></tr></thead>';
  breakdownHTML += '<tbody>';

  for (const item of scoreResult.user_to_job_fit.breakdown) {
    const scoreClass = item.score >= 35 ? '' : (item.score >= 20 ? 'medium' : 'low');
    breakdownHTML += `
      <tr>
        <td colspan="3">
          <div class="breakdown-criteria">${item.criteria}</div>
          <div class="breakdown-value">${item.actual_value}</div>
          <div class="breakdown-rationale">${item.rationale}</div>
        </td>
      </tr>
    `;
  }

  breakdownHTML += '</tbody></table>';
  breakdownHTML += `<p style="margin-top: 10px; font-weight: 600; color: #2ecc71;">Score: ${scoreResult.user_to_job_fit.score}/50</p>`;
  breakdownHTML += '</div>';

  // Interpretation section
  const interpretation = scoreResult.interpretation;
  let conversationHTML = interpretation.conversation_starters
    .map(starter => `<li>${starter}</li>`)
    .join('');

  breakdownHTML += `
    <div class="interpretation-section">
      <h3>Interpretation & Next Steps</h3>
      <div class="interpretation-summary">${interpretation.summary}</div>
      <div class="interpretation-action">${interpretation.action}</div>
      <div style="margin-top: 12px;">
        <strong style="font-size: 12px; color: #1a1a2e;">Conversation Starters:</strong>
        <ul class="conversation-starters">${conversationHTML}</ul>
      </div>
    </div>
  `;

  // Build modal HTML
  const modalHTML = `
    <div class="scoring-modal">
      <div class="scoring-modal-header">
        <h2>Job Fit Score for ${jobData.jobTitle}</h2>
        <button id="modal-close-btn" class="close-modal">×</button>
      </div>
      <div class="scoring-modal-body">
        <div class="score-card strong">
          <div class="score-card-value">${scoreResult.overall_score}</div>
          <div class="score-card-label">${scoreLabel.label}</div>
          <div class="score-card-action">${scoreAction}</div>
        </div>
        ${breakdownHTML}
      </div>
      <div class="scoring-modal-footer">
        <button id="modal-send-btn" class="btn btn-primary">Send to Job Hunter</button>
        <button id="modal-close-footer-btn" class="btn btn-secondary">Close</button>
      </div>
    </div>
  `;

  modalContainer.innerHTML = modalHTML;
  document.body.appendChild(modalContainer);

  console.log('[Job Hunter] Scoring modal displayed');
}

/**
 * Show scoring loading state
 */
function showScoringLoading() {
  const existingModal = document.getElementById('job-hunter-scoring-modal');
  if (existingModal) {
    existingModal.remove();
  }

  const overlay = document.createElement('div');
  overlay.id = 'job-hunter-scoring-modal';
  overlay.className = 'scoring-overlay';
  overlay.innerHTML = `
    <div class="scoring-modal" style="max-width: 300px;">
      <div class="scoring-loading">
        <div class="scoring-spinner"></div>
        <div class="scoring-loading-text">Calculating your fit score...</div>
      </div>
    </div>
  `;
  document.body.appendChild(overlay);
}

/**
 * Show scoring error state
 */
function showScoringError(message) {
  const existingModal = document.getElementById('job-hunter-scoring-modal');
  if (existingModal) {
    existingModal.remove();
  }

  const overlay = document.createElement('div');
  overlay.id = 'job-hunter-scoring-modal';
  overlay.className = 'scoring-overlay';
  overlay.innerHTML = `
    <div class="scoring-modal" style="max-width: 400px;">
      <div class="scoring-error">
        <div class="scoring-error-icon">⚠️</div>
        <div class="scoring-error-title">Scoring Error</div>
        <div class="scoring-error-message">${message}</div>
        <button class="btn btn-secondary" style="margin-top: 20px;" onclick="document.getElementById('job-hunter-scoring-modal').remove();">Close</button>
      </div>
    </div>
  `;
  document.body.appendChild(overlay);
}

/**
 * Remove overlay from page
 */
function removeOverlay() {
  const overlay = document.getElementById('job-hunter-overlay');
  if (overlay) {
    overlay.remove();
  }
  const modal = document.getElementById('job-hunter-scoring-modal');
  if (modal) {
    modal.remove();
  }
}