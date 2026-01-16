/**
 * Job Filter - Requirement Detector (v2 Upgrade)
 *
 * Detects whether extracted skills are REQUIRED or DESIRED based on:
 * 1. Section context ("Required Skills" vs "Preferred Skills" headers)
 * 2. Language signals ("expert required", "must have", "3+ years", etc.)
 * 3. Multiplier strength based on language intensity
 *
 * Output: Maps each skill to requirement level with multiplier
 */

// ============================================================================
// REQUIREMENT DETECTION
// ============================================================================

/**
 * Detect requirement level for extracted skills
 * @param {string} jobDescriptionText - Full job description
 * @param {Array} extractedPhrases - Array of extracted skill phrases with context
 * @returns {Object} Requirement mapping
 */
function detectRequirements(jobDescriptionText, extractedPhrases = []) {
  const result = {
    required: [],
    desired: [],
    metadata: {
      hasRequiredSection: false,
      hasDesiredSection: false,
      defaultToRequired: false
    }
  };

  // Step 1: Parse job description into sections
  const sections = parseSections(jobDescriptionText);

  result.metadata.hasRequiredSection = sections.requiredSection !== null;
  result.metadata.hasDesiredSection = sections.desiredSection !== null;

  // Step 2: If no explicit sections, default all to required (conservative)
  if (!sections.requiredSection && !sections.desiredSection) {
    result.metadata.defaultToRequired = true;
    result.required = extractedPhrases.map(p => ({
      ...p,
      requirementLevel: 'required',
      multiplier: 2.0,
      evidence: 'No explicit sections - defaulted to required'
    }));
    return result;
  }

  // Step 3: Classify each phrase based on source location
  for (const phrase of extractedPhrases) {
    const classification = classifyPhrase(phrase, sections, jobDescriptionText);

    if (classification.level === 'required') {
      result.required.push({
        ...phrase,
        requirementLevel: 'required',
        multiplier: classification.multiplier,
        languageSignal: classification.languageSignal,
        evidence: classification.evidence
      });
    } else {
      result.desired.push({
        ...phrase,
        requirementLevel: 'desired',
        multiplier: classification.multiplier,
        languageSignal: classification.languageSignal,
        evidence: classification.evidence
      });
    }
  }

  return result;
}

// ============================================================================
// SECTION PARSING
// ============================================================================

/**
 * Parse job description into required and desired sections
 * @param {string} text - Job description text
 * @returns {Object} Parsed sections with boundaries
 */
function parseSections(text) {
  const result = {
    requiredSection: null,
    desiredSection: null,
    requiredBoundaries: null,
    desiredBoundaries: null
  };

  // Required section patterns (more comprehensive)
  const requiredPatterns = [
    /(?:^|\n)\s*(required|minimum|essential|must[\s-]have|basic)\s*(?:skills?|qualifications?|requirements?|experience)?\s*:?\s*/gi,
    /(?:^|\n)\s*what\s+(?:you(?:'ll)?|we(?:'re)?)\s+(?:need|looking\s+for|require)\s*:?\s*/gi,
    /(?:^|\n)\s*you\s+(?:should|must|will)\s+have\s*:?\s*/gi,
    /(?:^|\n)\s*qualifications?\s*:?\s*/gi,
    /(?:^|\n)\s*requirements?\s*:?\s*/gi
  ];

  // Desired section patterns
  const desiredPatterns = [
    /(?:^|\n)\s*(preferred|desired|nice[\s-]to[\s-]have|bonus|additional|plus)\s*(?:skills?|qualifications?|requirements?|experience)?\s*:?\s*/gi,
    /(?:^|\n)\s*it(?:'s)?\s+a\s+plus\s+if\s*:?\s*/gi,
    /(?:^|\n)\s*ideal(?:ly)?\s*:?\s*/gi
  ];

  // Find required section boundaries
  for (const pattern of requiredPatterns) {
    const match = pattern.exec(text);
    if (match) {
      const startIndex = match.index;
      const endIndex = findSectionEnd(text, startIndex, desiredPatterns);

      result.requiredSection = text.substring(startIndex, endIndex);
      result.requiredBoundaries = { start: startIndex, end: endIndex };
      break;
    }
    pattern.lastIndex = 0;
  }

  // Find desired section boundaries
  for (const pattern of desiredPatterns) {
    const match = pattern.exec(text);
    if (match) {
      const startIndex = match.index;
      const endIndex = findSectionEnd(text, startIndex, []);

      result.desiredSection = text.substring(startIndex, endIndex);
      result.desiredBoundaries = { start: startIndex, end: endIndex };
      break;
    }
    pattern.lastIndex = 0;
  }

  return result;
}

/**
 * Find the end of a section (next section header or end of text)
 * @param {string} text - Full text
 * @param {number} startIndex - Section start index
 * @param {Array} nextSectionPatterns - Patterns for next section
 * @returns {number} End index
 */
function findSectionEnd(text, startIndex, nextSectionPatterns) {
  let endIndex = text.length;

  // Look for next section header
  for (const pattern of nextSectionPatterns) {
    pattern.lastIndex = startIndex + 1;
    const match = pattern.exec(text);
    if (match && match.index < endIndex) {
      endIndex = match.index;
    }
    pattern.lastIndex = 0;
  }

  // Look for common section boundaries
  const boundaryPatterns = [
    /(?:^|\n)\s*(?:about\s+(?:us|the\s+company)|benefits|what\s+we\s+offer|responsibilities|location|salary)\s*:?\s*/gi
  ];

  for (const pattern of boundaryPatterns) {
    pattern.lastIndex = startIndex + 1;
    const match = pattern.exec(text);
    if (match && match.index < endIndex) {
      endIndex = match.index;
    }
    pattern.lastIndex = 0;
  }

  return endIndex;
}

// ============================================================================
// PHRASE CLASSIFICATION
// ============================================================================

/**
 * Classify a phrase as required or desired
 * @param {Object} phrase - Phrase object with sourceLocation
 * @param {Object} sections - Parsed sections
 * @param {string} fullText - Full job description
 * @returns {Object} Classification result
 */
function classifyPhrase(phrase, sections, fullText) {
  // Default classification
  let level = 'required'; // Conservative default
  let multiplier = 2.0;
  let languageSignal = null;
  let evidence = '';

  // Step 1: Check if phrase comes from a known section
  if (phrase.sourceLocation && sections.requiredBoundaries) {
    const phraseIndex = fullText.indexOf(phrase.raw);
    if (phraseIndex >= sections.requiredBoundaries.start &&
        phraseIndex <= sections.requiredBoundaries.end) {
      level = 'required';
      evidence = 'Found in required section';
    }
  }

  if (phrase.sourceLocation && sections.desiredBoundaries) {
    const phraseIndex = fullText.indexOf(phrase.raw);
    if (phraseIndex >= sections.desiredBoundaries.start &&
        phraseIndex <= sections.desiredBoundaries.end) {
      level = 'desired';
      multiplier = 1.0;
      evidence = 'Found in desired/preferred section';
    }
  }

  // Step 2: Check for language signals in the phrase context
  const contextStart = Math.max(0, fullText.indexOf(phrase.raw) - 100);
  const contextEnd = Math.min(fullText.length, fullText.indexOf(phrase.raw) + phrase.raw.length + 100);
  const context = fullText.substring(contextStart, contextEnd).toLowerCase();

  const signals = detectLanguageSignals(context, phrase.raw);

  if (signals.expertRequired) {
    level = 'required';
    multiplier = 2.2; // Extra emphasis for "expert required"
    languageSignal = 'expert_required';
    evidence = 'Expert level explicitly required';
  } else if (signals.mustHave) {
    level = 'required';
    multiplier = 2.0;
    languageSignal = 'must_have';
    evidence = 'Must have language detected';
  } else if (signals.yearsRequired) {
    level = 'required';
    multiplier = 2.0;
    languageSignal = `${signals.yearsCount}_years_required`;
    evidence = `${signals.yearsCount}+ years required`;
  } else if (signals.preferred) {
    level = 'desired';
    multiplier = 1.0;
    languageSignal = 'preferred';
    evidence = 'Preferred/nice-to-have language detected';
  }

  return { level, multiplier, languageSignal, evidence };
}

// ============================================================================
// LANGUAGE SIGNAL DETECTION
// ============================================================================

/**
 * Detect language signals in context around a skill
 * @param {string} context - Context around skill mention
 * @param {string} skillPhrase - The skill phrase itself
 * @returns {Object} Detected signals
 */
function detectLanguageSignals(context, skillPhrase) {
  const signals = {
    expertRequired: false,
    mustHave: false,
    yearsRequired: false,
    yearsCount: 0,
    preferred: false
  };

  // Expert required patterns
  const expertPatterns = [
    /expert\s+(?:level\s+)?(?:required|needed)/i,
    /advanced\s+(?:level\s+)?(?:required|needed)/i,
    /deep\s+(?:expertise|knowledge|experience)\s+(?:required|needed)/i
  ];

  for (const pattern of expertPatterns) {
    if (pattern.test(context)) {
      signals.expertRequired = true;
      break;
    }
  }

  // Must have patterns
  const mustHavePatterns = [
    /must\s+have/i,
    /required\s+skill/i,
    /essential\s+skill/i,
    /mandatory/i,
    /critical\s+skill/i
  ];

  for (const pattern of mustHavePatterns) {
    if (pattern.test(context)) {
      signals.mustHave = true;
      break;
    }
  }

  // Years of experience patterns
  const yearsMatch = context.match(/(\d+)\+?\s*years?\s+(?:of\s+)?(?:experience|background|track\s+record)/i);
  if (yearsMatch) {
    signals.yearsRequired = true;
    signals.yearsCount = parseInt(yearsMatch[1], 10);
  }

  // Preferred/nice-to-have patterns
  const preferredPatterns = [
    /preferred/i,
    /nice[\s-]to[\s-]have/i,
    /bonus/i,
    /plus/i,
    /ideal(?:ly)?/i,
    /desired/i
  ];

  for (const pattern of preferredPatterns) {
    if (pattern.test(context)) {
      signals.preferred = true;
      break;
    }
  }

  return signals;
}

// ============================================================================
// BATCH DETECTION
// ============================================================================

/**
 * Detect requirements for multiple job descriptions
 * @param {Array} jobs - Array of {jobText, extractedPhrases}
 * @returns {Array} Array of requirement results
 */
function detectBatch(jobs) {
  return jobs.map(job => detectRequirements(job.jobText, job.extractedPhrases));
}

// ============================================================================
// UTILITIES
// ============================================================================

/**
 * Get multiplier for requirement level
 * @param {string} level - 'required' or 'desired'
 * @param {string} languageSignal - Optional language signal
 * @returns {number} Multiplier value
 */
function getMultiplier(level, languageSignal = null) {
  if (level === 'required') {
    if (languageSignal === 'expert_required') {
      return 2.2;
    }
    return 2.0;
  }
  return 1.0;
}

/**
 * Get penalty for missing skill based on requirement level
 * @param {string} level - 'required' or 'desired'
 * @param {string} type - 'CORE_SKILL' or 'TOOL'
 * @param {string} languageSignal - Optional language signal
 * @returns {number} Penalty value (negative)
 */
function getPenalty(level, type, languageSignal = null) {
  const config = window.SkillConstants?.FIT_SCORE_CONFIG || {};

  if (level === 'required') {
    if (type === 'CORE_SKILL') {
      return config.PENALTY_MISSING_REQUIRED_SKILL || -0.10;
    }
    if (type === 'TOOL') {
      if (languageSignal === 'expert_required') {
        return config.PENALTY_MISSING_REQUIRED_TOOL_EXPERT || -0.15;
      }
      return config.PENALTY_MISSING_REQUIRED_TOOL_STANDARD || -0.12;
    }
  }

  if (level === 'desired' && type === 'TOOL') {
    return config.PENALTY_MISSING_DESIRED_TOOL || -0.05;
  }

  return 0;
}

// ============================================================================
// EXPORTS
// ============================================================================

if (typeof window !== 'undefined') {
  window.RequirementDetector = {
    detectRequirements,
    parseSections,
    classifyPhrase,
    detectLanguageSignals,
    detectBatch,
    getMultiplier,
    getPenalty
  };
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    detectRequirements,
    parseSections,
    classifyPhrase,
    detectLanguageSignals,
    detectBatch,
    getMultiplier,
    getPenalty
  };
}
