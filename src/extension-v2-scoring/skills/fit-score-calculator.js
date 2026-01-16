/**
 * Job Filter - Fit Score Calculator (v2 Upgrade)
 *
 * Dual-bucket scoring system: 70% core skills, 30% tools
 * Penalty system for missing required items
 *
 * Formula:
 * - Core Skills Score = (requiredMatched*2.0 + desiredMatched*1.0) / (requiredTotal*2.0 + desiredTotal*1.0)
 * - Tools Score = same formula for tools
 * - Overall Score = (coreSkillsScore * 0.70) + (toolsScore * 0.30) + penalties
 * - Penalties capped at -0.50
 */

// ============================================================================
// MAIN CALCULATION FUNCTION
// ============================================================================

/**
 * Calculate fit score using dual-bucket system
 * @param {Object} jobSkills - Job requirements
 * @param {Object} userProfile - User profile with skills
 * @param {Object} config - Scoring configuration
 * @returns {Object} Fit score result
 */
function calculateFitScore(jobSkills, userProfile, config = null) {
  const scoringConfig = config || window.SkillConstants?.FIT_SCORE_CONFIG || getDefaultConfig();

  // Validate inputs
  if (!jobSkills || !userProfile) {
    return createEmptyResult();
  }

  // Extract buckets
  const jobRequired = {
    coreSkills: jobSkills.requiredCoreSkills || [],
    tools: jobSkills.requiredTools || []
  };

  const jobDesired = {
    coreSkills: jobSkills.desiredCoreSkills || [],
    tools: jobSkills.desiredTools || []
  };

  const userSkillsSet = new Set((userProfile.skills || []).map(s => s.canonical || s.toLowerCase()));
  const userToolsSet = new Set((userProfile.tools || []).map(t => t.canonical || t.toLowerCase()));

  // Calculate core skills score
  const coreSkillsResult = calculateBucketScore(
    jobRequired.coreSkills,
    jobDesired.coreSkills,
    userSkillsSet,
    scoringConfig
  );

  // Calculate tools score
  const toolsResult = calculateBucketScore(
    jobRequired.tools,
    jobDesired.tools,
    userToolsSet,
    scoringConfig
  );

  // Calculate penalties for missing items
  const penalties = calculatePenalties(
    jobSkills,
    userSkillsSet,
    userToolsSet,
    scoringConfig
  );

  // Compute overall score
  const rawOverallScore = 
    (coreSkillsResult.score * scoringConfig.CORE_SKILLS_WEIGHT) +
    (toolsResult.score * scoringConfig.TOOLS_WEIGHT);

  const totalPenalty = Math.max(
    penalties.reduce((sum, p) => sum + p.value, 0),
    scoringConfig.MAX_TOTAL_PENALTY
  );

  const overallScore = Math.max(0, Math.min(1, rawOverallScore + totalPenalty));

  return {
    overallScore,
    breakdown: {
      coreSkills: coreSkillsResult,
      tools: toolsResult,
      penalties
    },
    weightsUsed: {
      coreSkillsWeight: scoringConfig.CORE_SKILLS_WEIGHT,
      toolsWeight: scoringConfig.TOOLS_WEIGHT,
      requiredMultiplier: scoringConfig.REQUIRED_MULTIPLIER,
      desiredMultiplier: scoringConfig.DESIRED_MULTIPLIER
    },
    metadata: {
      timestamp: Date.now(),
      configVersion: '2.0'
    }
  };
}

// ============================================================================
// BUCKET SCORING
// ============================================================================

/**
 * Calculate score for a single bucket (skills or tools)
 * @param {Array} required - Required items
 * @param {Array} desired - Desired items
 * @param {Set} userItems - User's items
 * @param {Object} config - Scoring config
 * @returns {Object} Bucket score result
 */
function calculateBucketScore(required, desired, userItems, config) {
  const requiredMultiplier = config.REQUIRED_MULTIPLIER;
  const desiredMultiplier = config.DESIRED_MULTIPLIER;

  // Count matches
  const requiredMatched = required.filter(item => 
    userItems.has(item.canonical || item.toLowerCase())
  ).length;

  const desiredMatched = desired.filter(item =>
    userItems.has(item.canonical || item.toLowerCase())
  ).length;

  const requiredTotal = required.length;
  const desiredTotal = desired.length;

  // Calculate weighted score
  const numerator = (requiredMatched * requiredMultiplier) + (desiredMatched * desiredMultiplier);
  const denominator = (requiredTotal * requiredMultiplier) + (desiredTotal * desiredMultiplier);

  const score = denominator > 0 ? numerator / denominator : 0;

  return {
    score: Math.max(0, Math.min(1, score)),
    requiredMatched,
    requiredTotal,
    desiredMatched,
    desiredTotal,
    matchRate: requiredTotal > 0 ? requiredMatched / requiredTotal : 0
  };
}

// ============================================================================
// PENALTY CALCULATION
// ============================================================================

/**
 * Calculate penalties for missing required items
 * @param {Object} jobSkills - Job requirements
 * @param {Set} userSkills - User skills set
 * @param {Set} userTools - User tools set
 * @param {Object} config - Scoring config
 * @returns {Array} Penalties
 */
function calculatePenalties(jobSkills, userSkills, userTools, config) {
  const penalties = [];

  // Missing required core skills
  const missingRequiredSkills = (jobSkills.requiredCoreSkills || []).filter(skill =>
    !userSkills.has(skill.canonical || skill.toLowerCase())
  );

  for (const skill of missingRequiredSkills) {
    penalties.push({
      type: 'missing_required_skill',
      item: skill.name || skill,
      value: config.PENALTY_MISSING_REQUIRED_SKILL,
      reason: `Missing required core skill: ${skill.name || skill}`
    });
  }

  // Missing required tools
  const missingRequiredTools = (jobSkills.requiredTools || []).filter(tool =>
    !userTools.has(tool.canonical || tool.toLowerCase())
  );

  for (const tool of missingRequiredTools) {
    const isExpertRequired = tool.languageSignal === 'expert_required';
    const penalty = isExpertRequired
      ? config.PENALTY_MISSING_REQUIRED_TOOL_EXPERT
      : config.PENALTY_MISSING_REQUIRED_TOOL_STANDARD;

    penalties.push({
      type: 'missing_required_tool',
      item: tool.name || tool,
      value: penalty,
      reason: `Missing required tool: ${tool.name || tool}${isExpertRequired ? ' (expert level)' : ''}`
    });
  }

  // Missing desired tools (smaller penalty)
  const missingDesiredTools = (jobSkills.desiredTools || []).filter(tool =>
    !userTools.has(tool.canonical || tool.toLowerCase())
  );

  for (const tool of missingDesiredTools.slice(0, 3)) { // Cap at 3 to avoid over-penalizing
    penalties.push({
      type: 'missing_desired_tool',
      item: tool.name || tool,
      value: config.PENALTY_MISSING_DESIRED_TOOL,
      reason: `Missing desired tool: ${tool.name || tool}`
    });
  }

  return penalties;
}

// ============================================================================
// UTILITIES
// ============================================================================

function getDefaultConfig() {
  return {
    CORE_SKILLS_WEIGHT: 0.70,
    TOOLS_WEIGHT: 0.30,
    REQUIRED_MULTIPLIER: 2.0,
    DESIRED_MULTIPLIER: 1.0,
    PENALTY_MISSING_REQUIRED_SKILL: -0.10,
    PENALTY_MISSING_REQUIRED_TOOL_EXPERT: -0.15,
    PENALTY_MISSING_REQUIRED_TOOL_STANDARD: -0.12,
    PENALTY_MISSING_DESIRED_TOOL: -0.05,
    MAX_TOTAL_PENALTY: -0.50
  };
}

function createEmptyResult() {
  return {
    overallScore: 0,
    breakdown: {
      coreSkills: { score: 0, requiredMatched: 0, requiredTotal: 0, desiredMatched: 0, desiredTotal: 0 },
      tools: { score: 0, requiredMatched: 0, requiredTotal: 0, desiredMatched: 0, desiredTotal: 0 },
      penalties: []
    },
    weightsUsed: getDefaultConfig(),
    metadata: {
      timestamp: Date.now(),
      configVersion: '2.0'
    }
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
    getDefaultConfig
  };
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    calculateFitScore,
    calculateBucketScore,
    calculatePenalties,
    getDefaultConfig
  };
}
