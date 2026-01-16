/**
 * Job Filter - Fit Score Calculator (v2 Upgrade)
 *
 * Implements dual-bucket scoring system:
 * - Core Skills: 70% of overall score
 * - Tools: 30% of overall score
 *
 * Formula:
 * coreSkillsScore = (requiredMatched*2.0 + desiredMatched*1.0) / (requiredTotal*2.0 + desiredTotal*1.0)
 * toolsScore = (same calculation for tools)
 * overallScore = (coreSkillsScore * 0.70) + (toolsScore * 0.30) + penalties
 *
 * Penalties:
 * - Missing required skill: -0.10
 * - Missing required tool (expert): -0.15
 * - Missing required tool (standard): -0.12
 * - Missing desired tool: -0.05
 * - Max total penalty: -0.50
 */

// ============================================================================
// MAIN SCORING FUNCTION
// ============================================================================

/**
 * Calculate fit score using dual-bucket approach
 * @param {Object} extractedSkills - Extracted and classified skills
 * @param {Object} userProfile - User's skills and tools from profile
 * @param {Object} options - Scoring options
 * @returns {Object} Fit score result
 */
function calculateFitScore(extractedSkills, userProfile, options = {}) {
  const config = window.SkillConstants?.FIT_SCORE_CONFIG || {
    CORE_SKILLS_WEIGHT: 0.70,
    TOOLS_WEIGHT: 0.30,
    REQUIRED_MULTIPLIER: 2.0,
    DESIRED_MULTIPLIER: 1.0,
    MAX_TOTAL_PENALTY: -0.50
  };

  const {
    weightsOverride = null
  } = options;

  // Use custom weights if provided
  const weights = weightsOverride || {
    coreSkillsWeight: config.CORE_SKILLS_WEIGHT,
    toolsWeight: config.TOOLS_WEIGHT
  };

  // Step 1: Calculate core skills score
  const coreSkillsScore = calculateBucketScore(
    extractedSkills.requiredCoreSkills || [],
    extractedSkills.desiredCoreSkills || [],
    userProfile.coreSkills || [],
    config
  );

  // Step 2: Calculate tools score
  const toolsScore = calculateBucketScore(
    extractedSkills.requiredTools || [],
    extractedSkills.desiredTools || [],
    userProfile.tools || [],
    config
  );

  // Step 3: Calculate penalties
  const penalties = calculatePenalties(
    extractedSkills,
    userProfile,
    coreSkillsScore,
    toolsScore,
    config
  );

  // Step 4: Calculate overall score
  const rawScore =
    (coreSkillsScore.score * weights.coreSkillsWeight) +
    (toolsScore.score * weights.toolsWeight);

  const totalPenalty = Math.max(penalties.totalPenalty, config.MAX_TOTAL_PENALTY);
  const overallScore = Math.max(0, Math.min(1, rawScore + totalPenalty));

  // Step 5: Build result
  return {
    overallScore,
    breakdown: {
      coreSkillsScore: coreSkillsScore.score,
      toolsScore: toolsScore.score,
      coreSkillsWeighted: coreSkillsScore.score * weights.coreSkillsWeight,
      toolsWeighted: toolsScore.score * weights.toolsWeight,
      rawScore,
      totalPenalty,
      finalScore: overallScore
    },
    coreSkillsDetails: coreSkillsScore,
    toolsDetails: toolsScore,
    penalties: penalties.items,
    weightsUsed: weights,
    metadata: {
      calculatedAt: Date.now(),
      version: '2.0'
    }
  };
}

// ============================================================================
// BUCKET SCORING
// ============================================================================

/**
 * Calculate score for a single bucket (core skills or tools)
 * @param {Array} requiredItems - Required items
 * @param {Array} desiredItems - Desired items
 * @param {Array} userItems - User's skills/tools
 * @param {Object} config - Scoring config
 * @returns {Object} Bucket score
 */
function calculateBucketScore(requiredItems, desiredItems, userItems, config) {
  const result = {
    score: 0,
    requiredMatched: 0,
    requiredTotal: requiredItems.length,
    requiredMissing: [],
    desiredMatched: 0,
    desiredTotal: desiredItems.length,
    desiredMissing: [],
    matchedItems: [],
    details: []
  };

  // Normalize user items for comparison
  const userCanonicals = new Set(
    userItems.map(item =>
      typeof item === 'string'
        ? item.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '')
        : item.canonical || item.name.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '')
    )
  );

  // Match required items
  for (const reqItem of requiredItems) {
    const canonical = reqItem.canonical || reqItem.raw.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');
    const matched = userCanonicals.has(canonical);

    if (matched) {
      result.requiredMatched++;
      result.matchedItems.push({
        item: reqItem.raw || reqItem.canonical,
        type: 'required',
        userHasSkill: true
      });
    } else {
      result.requiredMissing.push(reqItem);
    }

    result.details.push({
      item: reqItem.raw || reqItem.canonical,
      requirement: 'required',
      matched,
      multiplier: config.REQUIRED_MULTIPLIER
    });
  }

  // Match desired items
  for (const desItem of desiredItems) {
    const canonical = desItem.canonical || desItem.raw.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');
    const matched = userCanonicals.has(canonical);

    if (matched) {
      result.desiredMatched++;
      result.matchedItems.push({
        item: desItem.raw || desItem.canonical,
        type: 'desired',
        userHasSkill: true
      });
    } else {
      result.desiredMissing.push(desItem);
    }

    result.details.push({
      item: desItem.raw || desItem.canonical,
      requirement: 'desired',
      matched,
      multiplier: config.DESIRED_MULTIPLIER
    });
  }

  // Calculate score using weighted formula
  const numerator =
    (result.requiredMatched * config.REQUIRED_MULTIPLIER) +
    (result.desiredMatched * config.DESIRED_MULTIPLIER);

  const denominator =
    (result.requiredTotal * config.REQUIRED_MULTIPLIER) +
    (result.desiredTotal * config.DESIRED_MULTIPLIER);

  result.score = denominator > 0 ? numerator / denominator : 0;

  return result;
}

// ============================================================================
// PENALTY CALCULATION
// ============================================================================

/**
 * Calculate penalties for missing required/desired items
 * @param {Object} extractedSkills - Extracted skills
 * @param {Object} userProfile - User profile
 * @param {Object} coreSkillsScore - Core skills score details
 * @param {Object} toolsScore - Tools score details
 * @param {Object} config - Scoring config
 * @returns {Object} Penalties
 */
function calculatePenalties(extractedSkills, userProfile, coreSkillsScore, toolsScore, config) {
  const penalties = {
    items: [],
    totalPenalty: 0
  };

  // Penalty for missing required core skills
  for (const missingSkill of coreSkillsScore.requiredMissing) {
    const penalty = config.PENALTY_MISSING_REQUIRED_SKILL || -0.10;
    penalties.items.push({
      item: missingSkill.raw || missingSkill.canonical,
      type: 'CORE_SKILL',
      requirement: 'required',
      penalty,
      reason: 'Missing required core skill'
    });
    penalties.totalPenalty += penalty;
  }

  // Penalty for missing required tools (check for "expert" language)
  for (const missingTool of toolsScore.requiredMissing) {
    const hasExpertLanguage = missingTool.languageSignal === 'expert_required';
    const penalty = hasExpertLanguage
      ? (config.PENALTY_MISSING_REQUIRED_TOOL_EXPERT || -0.15)
      : (config.PENALTY_MISSING_REQUIRED_TOOL_STANDARD || -0.12);

    penalties.items.push({
      item: missingTool.raw || missingTool.canonical,
      type: 'TOOL',
      requirement: 'required',
      penalty,
      reason: hasExpertLanguage
        ? 'Missing required tool (expert level)'
        : 'Missing required tool'
    });
    penalties.totalPenalty += penalty;
  }

  // Penalty for missing desired tools
  for (const missingTool of toolsScore.desiredMissing) {
    const penalty = config.PENALTY_MISSING_DESIRED_TOOL || -0.05;
    penalties.items.push({
      item: missingTool.raw || missingTool.canonical,
      type: 'TOOL',
      requirement: 'desired',
      penalty,
      reason: 'Missing desired tool'
    });
    penalties.totalPenalty += penalty;
  }

  // Cap total penalty
  if (penalties.totalPenalty < config.MAX_TOTAL_PENALTY) {
    penalties.totalPenalty = config.MAX_TOTAL_PENALTY;
    penalties.capped = true;
  }

  return penalties;
}

// ============================================================================
// SCORE INTERPRETATION
// ============================================================================

/**
 * Get label for overall fit score
 * @param {number} score - Fit score (0-1)
 * @returns {string} Fit label
 */
function getFitLabel(score) {
  if (score >= 0.90) return 'Excellent Match';
  if (score >= 0.75) return 'Strong Match';
  if (score >= 0.60) return 'Good Match';
  if (score >= 0.45) return 'Moderate Match';
  if (score >= 0.30) return 'Partial Match';
  return 'Weak Match';
}

/**
 * Get color for score display
 * @param {number} score - Fit score (0-1)
 * @returns {string} Color code
 */
function getScoreColor(score) {
  if (score >= 0.75) return '#22c55e'; // Green
  if (score >= 0.60) return '#84cc16'; // Lime
  if (score >= 0.45) return '#eab308'; // Yellow
  if (score >= 0.30) return '#f97316'; // Orange
  return '#ef4444'; // Red
}

/**
 * Get recommendations based on score breakdown
 * @param {Object} scoreResult - Full score result from calculateFitScore
 * @returns {Array} Array of recommendation strings
 */
function getRecommendations(scoreResult) {
  const recommendations = [];

  // Check core skills
  if (scoreResult.coreSkillsDetails.score < 0.60) {
    const missingCount = scoreResult.coreSkillsDetails.requiredMissing.length;
    if (missingCount > 0) {
      recommendations.push(
        `You're missing ${missingCount} required core skill${missingCount > 1 ? 's' : ''}. Consider highlighting transferable skills.`
      );
    }
  }

  // Check tools
  if (scoreResult.toolsDetails.score < 0.60) {
    const missingCount = scoreResult.toolsDetails.requiredMissing.length;
    if (missingCount > 0) {
      recommendations.push(
        `You're missing ${missingCount} required tool${missingCount > 1 ? 's' : ''}. Mention similar platforms you've used.`
      );
    }
  }

  // Check penalties
  if (scoreResult.penalties.length > 5) {
    recommendations.push(
      'Multiple gaps detected. Focus applications on roles with stronger alignment.'
    );
  }

  // Strong match
  if (scoreResult.overallScore >= 0.75) {
    recommendations.push(
      'Strong fit! Prioritize this application and tailor your resume to highlight matched skills.'
    );
  }

  return recommendations;
}

// ============================================================================
// BATCH SCORING
// ============================================================================

/**
 * Calculate fit scores for multiple jobs
 * @param {Array} jobs - Array of {extractedSkills, jobInfo}
 * @param {Object} userProfile - User profile
 * @param {Object} options - Scoring options
 * @returns {Array} Array of score results
 */
function scoreBatch(jobs, userProfile, options = {}) {
  return jobs.map(job => ({
    jobId: job.jobInfo?.jobId || job.jobInfo?.job_id,
    jobTitle: job.jobInfo?.jobTitle || job.jobInfo?.job_title,
    company: job.jobInfo?.company || job.jobInfo?.company_name,
    fitScore: calculateFitScore(job.extractedSkills, userProfile, options),
    extractedAt: job.extractedAt || Date.now()
  }));
}

// ============================================================================
// GUARDRAILS & EDGE CASES
// ============================================================================

/**
 * Validate inputs and provide warnings
 * @param {Object} extractedSkills - Extracted skills
 * @param {Object} userProfile - User profile
 * @returns {Object} Validation result
 */
function validateInputs(extractedSkills, userProfile) {
  const warnings = [];
  const errors = [];

  // Check extracted skills
  if (!extractedSkills) {
    errors.push('Missing extractedSkills object');
  } else {
    const totalExtracted =
      (extractedSkills.requiredCoreSkills?.length || 0) +
      (extractedSkills.desiredCoreSkills?.length || 0) +
      (extractedSkills.requiredTools?.length || 0) +
      (extractedSkills.desiredTools?.length || 0);

    if (totalExtracted === 0) {
      warnings.push('No skills extracted from job description');
    }

    if (totalExtracted > 100) {
      warnings.push('Unusually high number of extracted skills - may indicate extraction issues');
    }
  }

  // Check user profile
  if (!userProfile) {
    errors.push('Missing userProfile object');
  } else {
    const totalUserSkills =
      (userProfile.coreSkills?.length || 0) +
      (userProfile.tools?.length || 0);

    if (totalUserSkills === 0) {
      warnings.push('User profile has no skills - score will be 0');
    }
  }

  return {
    valid: errors.length === 0,
    warnings,
    errors
  };
}

// ============================================================================
// EXPORTS
// ============================================================================

if (typeof window !== 'undefined') {
  window.FitScoreCalculator = {
    calculateFitScore,
    calculateBucketScore,
    calculatePenalties,
    getFitLabel,
    getScoreColor,
    getRecommendations,
    scoreBatch,
    validateInputs
  };
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    calculateFitScore,
    calculateBucketScore,
    calculatePenalties,
    getFitLabel,
    getScoreColor,
    getRecommendations,
    scoreBatch,
    validateInputs
  };
}
