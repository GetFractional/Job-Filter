/**
 * Job Filter - Skill Classifier (v2 Upgrade)
 *
 * 4-layer rule-based classification system (NO AI/LLMs)
 * Classifies extracted phrases as: CORE_SKILL, TOOL, CANDIDATE, or REJECTED
 *
 * LAYER 0: Soft Skill Rejection (100% blocking)
 * LAYER 1: Exact Dictionary Match
 * LAYER 2: Forced Core Skills (SQL, Python always CORE_SKILL)
 * LAYER 3: Pattern-Based Rules (brand names → tools, -ing words → skills)
 * LAYER 4: Context Heuristics + Candidates Bucket
 */

// ============================================================================
// CLASSIFICATION ENTRY POINT
// ============================================================================

/**
 * Classify a skill phrase
 * @param {string} phrase - Raw extracted phrase
 * @param {Object} options - Classification options
 * @returns {Object} Classification result
 */
function classifySkill(phrase, options = {}) {
  const {
    skillTaxonomy = [],
    toolsDictionary = [],
    context = null
  } = options;

  const cleaned = cleanPhrase(phrase);
  if (!cleaned || cleaned.length < 2) {
    return createRejectedResult(phrase, 'Too short or empty');
  }

  // LAYER 0: Soft Skills Rejection (100% blocking)
  const softSkillCheck = checkSoftSkill(cleaned);
  if (softSkillCheck.isSoftSkill) {
    return createRejectedResult(phrase, `Soft skill: ${softSkillCheck.reason}`);
  }

  // LAYER 1: Exact Dictionary Match
  const exactMatch = findExactDictionaryMatch(cleaned, skillTaxonomy, toolsDictionary);
  if (exactMatch) {
    return exactMatch;
  }

  // LAYER 2: Forced Core Skills
  const forcedSkill = checkForcedCoreSkills(cleaned);
  if (forcedSkill) {
    return forcedSkill;
  }

  // LAYER 3: Pattern-Based Rules
  const patternMatch = applyPatternRules(cleaned, context);
  if (patternMatch) {
    return patternMatch;
  }

  // LAYER 4: Candidates Bucket (needs human review)
  return createCandidateResult(cleaned, context);
}

// ============================================================================
// LAYER 0: SOFT SKILL REJECTION
// ============================================================================

function checkSoftSkill(phrase) {
  const constants = window.SkillConstants || {};
  const softSkillPatterns = constants.SOFT_SKILLS_PATTERNS || [];
  
  const normalized = phrase.toLowerCase().trim();

  // Check regex patterns
  for (const pattern of softSkillPatterns) {
    if (pattern.test(normalized)) {
      return {
        isSoftSkill: true,
        reason: `Matched pattern: ${pattern.source}`
      };
    }
  }

  return { isSoftSkill: false };
}

// ============================================================================
// LAYER 1: EXACT DICTIONARY MATCH
// ============================================================================

function findExactDictionaryMatch(phrase, skillTaxonomy, toolsDictionary) {
  const normalized = phrase.toLowerCase().trim();

  // Check skills dictionary
  for (const skill of skillTaxonomy) {
    if (skill.name.toLowerCase() === normalized ||
        skill.canonical === normalized.replace(/\s+/g, '_')) {
      return {
        type: 'CORE_SKILL',
        canonical: skill.canonical,
        name: skill.name,
        confidence: 1.0,
        evidence: 'Exact match in skills dictionary',
        matchedSkill: skill
      };
    }

    // Check aliases
    if (skill.aliases && skill.aliases.some(a => a.toLowerCase() === normalized)) {
      return {
        type: 'CORE_SKILL',
        canonical: skill.canonical,
        name: skill.name,
        confidence: 0.95,
        evidence: 'Exact alias match',
        matchedSkill: skill
      };
    }
  }

  // Check tools dictionary
  for (const tool of toolsDictionary) {
    if (tool.name.toLowerCase() === normalized ||
        tool.canonical === normalized.replace(/\s+/g, '_')) {
      return {
        type: 'TOOL',
        canonical: tool.canonical,
        name: tool.name,
        confidence: 1.0,
        evidence: 'Exact match in tools dictionary',
        matchedTool: tool
      };
    }

    // Check tool aliases
    if (tool.aliases && tool.aliases.some(a => a.toLowerCase() === normalized)) {
      return {
        type: 'TOOL',
        canonical: tool.canonical,
        name: tool.name,
        confidence: 0.95,
        evidence: 'Exact tool alias match',
        matchedTool: tool
      };
    }
  }

  return null;
}

// ============================================================================
// LAYER 2: FORCED CORE SKILLS
// ============================================================================

function checkForcedCoreSkills(phrase) {
  const constants = window.SkillConstants || {};
  const forcedSkills = constants.FORCED_CORE_SKILLS || new Set();
  
  const normalized = phrase.toLowerCase().trim();

  if (forcedSkills.has(normalized)) {
    return {
      type: 'CORE_SKILL',
      canonical: normalized.replace(/\s+/g, '_'),
      name: phrase,
      confidence: 1.0,
      evidence: 'Forced core skill (product decision: SQL/Python always core)'
    };
  }

  return null;
}

// ============================================================================
// LAYER 3: PATTERN-BASED RULES
// ============================================================================

function applyPatternRules(phrase, context) {
  const normalized = phrase.toLowerCase().trim();

  // Rule: Brand names are tools (capitalized, ends in common tool suffixes)
  if (/^[A-Z]/.test(phrase) && /(?:hub|force|flow|base|desk|suite|cloud|stack)/i.test(phrase)) {
    return {
      type: 'TOOL',
      canonical: normalized.replace(/\s+/g, '_'),
      name: phrase,
      confidence: 0.75,
      evidence: 'Pattern: Brand name tool suffix'
    };
  }

  // Rule: Acronyms 2-5 chars are often tools
  if (/^[A-Z]{2,5}$/.test(phrase)) {
    return {
      type: 'TOOL',
      canonical: normalized,
      name: phrase,
      confidence: 0.65,
      evidence: 'Pattern: Acronym (likely tool)'
    };
  }

  // Rule: Phrases with numbers are often tools (GA4, Salesforce360)
  if (/\d/.test(phrase)) {
    return {
      type: 'TOOL',
      canonical: normalized.replace(/\s+/g, '_'),
      name: phrase,
      confidence: 0.70,
      evidence: 'Pattern: Contains numbers (likely tool/version)'
    };
  }

  // Rule: -ing words are likely skills
  if (/\w+ing$/.test(normalized) && !/(training|testing|learning)$/.test(normalized)) {
    return {
      type: 'CORE_SKILL',
      canonical: normalized.replace(/\s+/g, '_'),
      name: phrase,
      confidence: 0.60,
      evidence: 'Pattern: -ing suffix (likely action/skill)'
    };
  }

  return null;
}

// ============================================================================
// LAYER 4: CANDIDATES BUCKET
// ============================================================================

function createCandidateResult(phrase, context) {
  // Infer type based on weak signals
  let inferredType = 'UNKNOWN';
  let confidence = 0.35;

  if (/^[A-Z]/.test(phrase)) {
    inferredType = 'TOOL';
    confidence = 0.40;
  } else if (/ (strategy|analysis|optimization|management)$/.test(phrase.toLowerCase())) {
    inferredType = 'CORE_SKILL';
    confidence = 0.45;
  }

  return {
    type: 'CANDIDATE',
    canonical: phrase.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, ''),
    name: phrase,
    inferredType,
    confidence,
    evidence: 'No clear classification - needs human review',
    context
  };
}

// ============================================================================
// RESULT BUILDERS
// ============================================================================

function createRejectedResult(phrase, reason) {
  return {
    type: 'REJECTED',
    canonical: null,
    name: phrase,
    confidence: 0,
    evidence: reason
  };
}

// ============================================================================
// UTILITIES
// ============================================================================

function cleanPhrase(phrase) {
  if (!phrase) return '';
  return phrase.trim()
    .replace(/^[,.\s\-•*:]+|[,.\s\-•*:]+$/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

// ============================================================================
// BATCH CLASSIFICATION
// ============================================================================

function classifyBatch(phrases, options = {}) {
  const results = {
    coreSkills: [],
    tools: [],
    candidates: [],
    rejected: []
  };

  for (const phrase of phrases) {
    const classification = classifySkill(phrase, options);

    switch (classification.type) {
      case 'CORE_SKILL':
        results.coreSkills.push(classification);
        break;
      case 'TOOL':
        results.tools.push(classification);
        break;
      case 'CANDIDATE':
        results.candidates.push(classification);
        break;
      case 'REJECTED':
        results.rejected.push(classification);
        break;
    }
  }

  return results;
}

// ============================================================================
// EXPORTS
// ============================================================================

if (typeof window !== 'undefined') {
  window.SkillClassifier = {
    classifySkill,
    classifyBatch,
    checkSoftSkill,
    findExactDictionaryMatch,
    checkForcedCoreSkills,
    applyPatternRules,
    createCandidateResult
  };
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    classifySkill,
    classifyBatch,
    checkSoftSkill,
    findExactDictionaryMatch,
    checkForcedCoreSkills,
    applyPatternRules,
    createCandidateResult
  };
}
