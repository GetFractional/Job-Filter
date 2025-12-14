/**
 * Job Hunter OS - Job Fit Scoring Engine
 * 
 * Bidirectional scoring algorithm that evaluates:
 * 1. Job→User Fit (0–50): Does this job meet user preferences?
 * 2. User→Job Fit (0–50): Does user match job requirements?
 * 3. Overall Score (0–100): Combined probability of mutual fit
 * 
 * All computation is client-side; no external API calls.
 * Target performance: <500ms calculation time
 */

// ============================================================================
// CONFIGURATION LOADER
// ============================================================================

let SCORING_CONFIG_CACHE = null;

/**
 * Fetches and caches the scoring configuration from scoring-schema.json
 * @returns {Promise<Object>} The scoring configuration object
 */
async function getScoringConfig() {
  if (SCORING_CONFIG_CACHE) {
    return SCORING_CONFIG_CACHE;
  }
  try {
    const url = chrome.runtime.getURL('scoring-schema.json');
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to fetch scoring schema: ${response.statusText}`);
    }
    const config = await response.json();
    SCORING_CONFIG_CACHE = {
      jobToUserWeights: {
        salary: config.job_to_user_fit.dimensions.find(d => d.name === 'salary').weight,
        workplace: config.job_to_user_fit.dimensions.find(d => d.name === 'workplace').weight,
        equity: config.job_to_user_fit.dimensions.find(d => d.name === 'equity').weight,
        stage: config.job_to_user_fit.dimensions.find(d => d.name === 'company_stage').weight,
        dealBreakers: config.job_to_user_fit.dimensions.find(d => d.name === 'deal_breaker_check').weight,
      },
      userToJobWeights: {
        roleType: config.user_to_job_fit.dimensions.find(d => d.name === 'role_type').weight,
        revOpsComponent: config.user_to_job_fit.dimensions.find(d => d.name === 'revops_component').weight,
        skillMatch: config.user_to_job_fit.dimensions.find(d => d.name === 'skill_match').weight,
        industry: config.user_to_job_fit.dimensions.find(d => d.name === 'industry_alignment').weight,
        orgComplexity: config.user_to_job_fit.dimensions.find(d => d.name === 'org_complexity').weight,
      },
      companyStageScores: config.job_to_user_fit.dimensions.find(d => d.name === 'company_stage').stage_scores,
      revopsKeywords: config.user_to_job_fit.dimensions.find(d => d.name === 'revops_component').revops_keywords,
      scoreLabels: config.overall_score_calculation.interpretation_labels,
    };
    return SCORING_CONFIG_CACHE;
  } catch (error) {
    console.error('[Job Hunter] Could not load scoring-schema.json. Falling back to defaults.', error);
    // Fallback to a minimal config in case of error
    return {
      jobToUserWeights: { salary: 0.25, workplace: 0.25, equity: 0.2, stage: 0.15, dealBreakers: 0.15 },
      userToJobWeights: { roleType: 0.25, revOpsComponent: 0.2, skillMatch: 0.2, industry: 0.15, orgComplexity: 0.2 },
      companyStageScores: {},
      revopsKeywords: [],
      scoreLabels: {},
    };
  }
}


// ============================================================================
// MAIN SCORING FUNCTIONS
// ============================================================================

/**
 * Calculate Job→User Fit (0–50)
 * @param {Object} jobPayload - Extracted job data
 * @param {Object} userProfile - User preferences
 * @param {Object} config - The scoring configuration
 * @returns {Object} Score breakdown
 */
function calculateJobToUserFit(jobPayload, userProfile, config) {
  const breakdown = [];
  const weights = config.jobToUserWeights;
  
  const dealBreakerResult = checkDealBreakers(jobPayload, userProfile, config);
  if (!dealBreakerResult.passed) {
    return {
      score: 0,
      label: 'FAIL',
      breakdown: [{
        criteria: 'Deal-breaker detected',
        actual_value: dealBreakerResult.trigger,
        weight: weights.dealBreakers,
        score: 0,
        rationale: `Job failed automatic filter: ${dealBreakerResult.reason}`
      }]
    };
  }

  breakdown.push(scoreSalaryDimension(jobPayload, userProfile, config));
  breakdown.push(scoreWorkplaceDimension(jobPayload, userProfile, config));
  breakdown.push(scoreEquityDimension(jobPayload, userProfile, config));
  breakdown.push(scoreCompanyStageDimension(jobPayload, userProfile, config));
  
  const dealBreakerScore = {
    criteria: 'Deal-breaker scan',
    actual_value: 'PASS',
    weight: weights.dealBreakers,
    score: dealBreakerResult.score,
    rationale: dealBreakerResult.rationale
  };
  breakdown.push(dealBreakerScore);

  const totalScore = breakdown.reduce((sum, item) => sum + (item.score * item.weight), 0);
  const cappedScore = Math.min(Math.round(totalScore), 50);

  return {
    score: cappedScore,
    label: cappedScore >= 40 ? 'GOOD' : (cappedScore >= 25 ? 'MODERATE' : 'WEAK'),
    breakdown: breakdown
  };
}

/**
 * Calculate User→Job Fit (0–50)
 * @param {Object} jobPayload - Extracted job data
 * @param {Object} userProfile - User background
 * @param {Object} config - The scoring configuration
 * @returns {Object} Score breakdown
 */
function calculateUserToJobFit(jobPayload, userProfile, config) {
  const breakdown = [];
  
  breakdown.push(scoreRoleTypeDimension(jobPayload, userProfile, config));
  breakdown.push(scoreRevOpsComponentDimension(jobPayload, userProfile, config));
  breakdown.push(scoreSkillMatchDimension(jobPayload, userProfile, config));
  breakdown.push(scoreIndustryAlignmentDimension(jobPayload, userProfile, config));
  breakdown.push(scoreOrgComplexityDimension(jobPayload, userProfile, config));

  const totalScore = breakdown.reduce((sum, item) => sum + (item.score * item.weight), 0);
  const cappedScore = Math.min(Math.round(totalScore), 50);

  return {
    score: cappedScore,
    label: cappedScore >= 35 ? 'GOOD' : (cappedScore >= 20 ? 'MODERATE' : 'WEAK'),
    breakdown: breakdown
  };
}

/**
 * Combine scores into an overall result
 * @param {Object} jobToUserFit - Result from calculateJobToUserFit()
 * @param {Object} userToJobFit - Result from calculateUserToJobFit()
 * @param {Object} config - The scoring configuration
 * @returns {Object} Overall score object
 */
function combineScores(jobToUserFit, userToJobFit, config) {
  const overallScore = jobToUserFit.score + userToJobFit.score;
  
  let label = 'WEAK FIT';
  let action = 'SKIP';
  let color = '#e74c3c';

  for (const labelName in config.scoreLabels) {
    const labelData = config.scoreLabels[labelName];
    if (overallScore >= labelData.min && overallScore <= labelData.max) {
      label = labelName;
      action = labelData.action;
      color = labelData.color;
      break;
    }
  }

  const interpretation = generateInterpretation(overallScore, jobToUserFit, userToJobFit);

  return {
    overall_score: overallScore,
    overall_label: label,
    color: color,
    action: action,
    job_to_user_fit: jobToUserFit,
    user_to_job_fit: userToJobFit,
    interpretation: interpretation
  };
}

// ============================================================================
// DIMENSION SCORING FUNCTIONS
// ============================================================================

function scoreSalaryDimension(jobPayload, userProfile, config) {
  const floor = userProfile.preferences.salary_floor || 150000;
  const target = userProfile.preferences.salary_target || 200000;
  const jobMin = jobPayload.salary_min || null;
  const jobMax = jobPayload.salary_max || null;
  let score = 0, rationale = '', actualValue = 'Not specified';

  if (!jobMin && !jobMax) {
    score = 20;
    rationale = 'Salary not disclosed; unable to evaluate';
  } else {
    const baseSalary = jobMin || jobMax;
    actualValue = jobMin && jobMax ? `${jobMin.toLocaleString()}–${jobMax.toLocaleString()}` : `~${baseSalary.toLocaleString()}`;

    if (baseSalary < floor) {
      score = Math.max(5, Math.round((baseSalary / floor) * 30));
      rationale = `Base of ${baseSalary.toLocaleString()} is below floor of ${floor.toLocaleString()}`;
    } else if (baseSalary >= floor && baseSalary < target) {
      const percentToTarget = (target > floor) ? (baseSalary - floor) / (target - floor) : 1;
      score = 30 + Math.round(percentToTarget * 20);
      rationale = `Base of ${baseSalary.toLocaleString()} meets floor; ${Math.round(percentToTarget * 100)}% of way to target`;
    } else if (baseSalary >= target) {
        const excessPercent = ((baseSalary - target) / target) * 100;
      if (excessPercent >= 20) {
        score = 50;
        rationale = `Exceptional: ${baseSalary.toLocaleString()} exceeds target by ${Math.round(excessPercent)}%`;
      } else {
        score = 40 + Math.round((excessPercent / 20) * 10);
        rationale = `Meets target: ${baseSalary.toLocaleString()}, within expected range`;
      }
    }
  }

  return {
    criteria: `Salary (vs. floor of ${floor.toLocaleString()})`,
    actual_value: actualValue,
    weight: config.jobToUserWeights.salary,
    score: Math.min(50, score),
    rationale: rationale
  };
}

function scoreWorkplaceDimension(jobPayload, userProfile, config) {
    const userRequirement = userProfile.preferences.remote_requirement || 'remote_first';
    const jobWorkplace = (jobPayload.workplace_type || '').toLowerCase();
    let score = 0, rationale = '';
    let normalizedWorkplace = 'unknown';

    if (jobWorkplace.includes('remote')) normalizedWorkplace = 'remote';
    else if (jobWorkplace.includes('hybrid')) normalizedWorkplace = 'hybrid';
    else if (jobWorkplace.includes('on') || jobWorkplace.includes('onsite')) normalizedWorkplace = 'on_site';

    if (userRequirement === 'remote_only') {
        if (normalizedWorkplace === 'remote') { score = 50; rationale = 'Matches requirement: Remote only'; } 
        else { score = 0; rationale = 'Fails requirement: Job is not fully remote'; }
    } else if (userRequirement === 'remote_first') {
        if (normalizedWorkplace === 'remote') { score = 50; rationale = 'Matches preference: Fully remote'; }
        else if (normalizedWorkplace === 'hybrid') { score = 35; rationale = 'Acceptable: Hybrid, but prefers remote'; }
        else { score = 0; rationale = 'Fails requirement: Not remote-capable'; }
    } else if (userRequirement === 'hybrid_flexible') {
        if (normalizedWorkplace === 'remote' || normalizedWorkplace === 'hybrid') { score = 50; rationale = `Matches preference: ${normalizedWorkplace}`; }
        else { score = 20; rationale = 'Not preferred: On-site, but could negotiate'; }
    } else {
        if (normalizedWorkplace === 'remote') { score = 50; rationale = 'Ideal: Fully remote'; }
        else if (normalizedWorkplace === 'hybrid') { score = 30; rationale = 'Acceptable: Hybrid'; }
        else { score = 10; rationale = 'Not preferred: On-site'; }
    }
    
    return {
        criteria: `Remote requirement (${userRequirement})`,
        actual_value: normalizedWorkplace.charAt(0).toUpperCase() + normalizedWorkplace.slice(1),
        weight: config.jobToUserWeights.workplace,
        score: score,
        rationale: rationale
    };
}

function scoreEquityDimension(jobPayload, userProfile, config) {
    const preference = userProfile.preferences.bonus_and_equity_preference || 'preferred';
    const hasEquity = jobPayload.equity_mentioned || false;
    const hasBonus = jobPayload.bonus_mentioned || false;
    let score = 0, actualValue = '', rationale = '';

    if (preference === 'required') {
        if (hasEquity && hasBonus) { score = 50; actualValue = 'Equity + Bonus'; rationale = 'Excellent: Both equity and performance bonus present'; }
        else if (hasEquity || hasBonus) { score = 35; actualValue = hasEquity ? 'Equity only' : 'Bonus only'; rationale = `Partial: ${actualValue} mentioned`; }
        else { score = 0; actualValue = 'Neither'; rationale = 'Fails requirement: No equity or bonus mentioned'; }
    } else if (preference === 'preferred') {
        if (hasEquity && hasBonus) { score = 50; actualValue = 'Equity + Bonus'; rationale = 'Ideal: Both equity and bonus present'; }
        else if (hasEquity || hasBonus) { score = 40; actualValue = hasEquity ? 'Equity only' : 'Bonus only'; rationale = `Good: ${actualValue} present`; }
        else { score = 20; actualValue = 'Neither mentioned'; rationale = 'Not ideal but acceptable'; }
    } else {
        score = hasEquity || hasBonus ? 30 : 25;
        actualValue = (hasEquity && hasBonus) ? 'Equity + Bonus' : (hasEquity ? 'Equity' : 'Base only');
        rationale = `No strong preference; ${actualValue}`;
    }

    return {
        criteria: `Equity/Bonus (${preference})`,
        actual_value: actualValue,
        weight: config.jobToUserWeights.equity,
        score: score,
        rationale: rationale
    };
}

function scoreCompanyStageDimension(jobPayload, userProfile, config) {
    const mustHaves = userProfile.preferences.must_haves || [];
    const stageKey = jobPayload.company_stage || 'unknown';
    let stageScore = config.companyStageScores[stageKey] || 20;
    let bonus = 0;

    if (mustHaves.includes('series_b_or_later')) {
        if (['series_b', 'series_c', 'series_d_plus', 'late_stage_private', 'ipo'].includes(stageKey)) {
            bonus = 8;
        }
    }
    const finalScore = Math.min(50, stageScore + bonus);

    return {
        criteria: 'Company stage (Series B+ preferred)',
        actual_value: stageKey.replace(/_/g, ' ').charAt(0).toUpperCase() + stageKey.replace(/_/g, ' ').slice(1),
        weight: config.jobToUserWeights.stage,
        score: finalScore,
        rationale: stageKey === 'unknown' ? 'Stage not identified; using default score.' : `Stage is ${stageKey}.`
    };
}

function scoreRoleTypeDimension(jobPayload, userProfile, config) {
  const jobTitle = (jobPayload.job_title || '').toLowerCase();
  const targetRoles = userProfile.background.target_roles || [];
  let score = 0, rationale = '';

  const lowerTargets = targetRoles.map(r => r.toLowerCase());
  const isExactMatch = lowerTargets.some(target => jobTitle.includes(target.split(' ').slice(0, 2).join(' ')));

  if (isExactMatch) {
    score = 50;
    rationale = 'Exact match: Job title aligns with target roles';
  } else if (jobTitle.includes('growth') || jobTitle.includes('revops') || jobTitle.includes('cro')) {
    score = 40;
    rationale = 'Strong signal: Title contains core domain keywords';
  } else if (jobTitle.includes('director') || jobTitle.includes('head') || jobTitle.includes('vp')) {
    score = 35;
    rationale = 'Seniority matches but not exact role';
  } else if (jobTitle.includes('manager') || jobTitle.includes('lead')) {
    score = 25;
    rationale = 'Below target seniority';
  } else {
    score = 15;
    rationale = 'Title does not match target roles';
  }

  return {
    criteria: 'Role type vs. target roles',
    actual_value: jobPayload.job_title || 'Unknown',
    weight: config.userToJobWeights.roleType,
    score: score,
    rationale: rationale
  };
}

function scoreRevOpsComponentDimension(jobPayload, userProfile, config) {
  const descriptionText = (jobPayload.descriptionText || '').toLowerCase();
  const revOpsKeywordCount = config.revopsKeywords.reduce((count, keyword) => {
    return count + (descriptionText.match(new RegExp(`\\b${keyword}\\b`, 'gi')) || []).length;
  }, 0);
  
  let score = 0, strength = '', rationale = '';

  if (revOpsKeywordCount >= 5) {
    score = 50; strength = 'Strong'; rationale = 'Role is heavily RevOps-focused';
  } else if (revOpsKeywordCount >= 3) {
    score = 35; strength = 'Moderate'; rationale = 'RevOps is significant component';
  } else if (revOpsKeywordCount >= 1) {
    score = 20; strength = 'Weak'; rationale = 'Some RevOps signals present';
  } else {
    score = 10; strength = 'Minimal/None'; rationale = 'Little to no RevOps component';
  }

  return {
    criteria: 'RevOps component strength',
    actual_value: strength,
    weight: config.userToJobWeights.revOpsComponent,
    score: score,
    rationale: rationale
  };
}

function scoreSkillMatchDimension(jobPayload, userProfile, config) {
  const descriptionText = (jobPayload.descriptionText || '').toLowerCase();
  const userSkills = userProfile.background.core_skills || [];
  if (userSkills.length === 0) {
    return { criteria: 'Skill match', actual_value: '0/0 skills matched', weight: config.userToJobWeights.skillMatch, score: 0, rationale: 'No skills in profile to match against.' };
  }
  
  const matchedSkills = userSkills.filter(skill => {
    const skillKeyword = skill.replace(/_/g, ' ').toLowerCase();
    return descriptionText.includes(skillKeyword);
  });
  
  const matchPercentage = (matchedSkills.length / userSkills.length) * 100;
  let score = 0, rationale = '';

  if (matchPercentage >= 80) { score = 50; rationale = `Excellent match: ${Math.round(matchPercentage)}% of skills mentioned.`; }
  else if (matchPercentage >= 60) { score = 40; rationale = `Good match: ${Math.round(matchPercentage)}% of skills mentioned.`; }
  else if (matchPercentage >= 40) { score = 30; rationale = `Partial match: ${Math.round(matchPercentage)}% of skills mentioned.`; }
  else if (matchPercentage >= 20) { score = 20; rationale = `Weak match: Only ${Math.round(matchPercentage)}% of skills mentioned.`; }
  else { score = 10; rationale = 'Minimal skill overlap.'; }
  
  return {
    criteria: 'Skill match',
    actual_value: `${matchedSkills.length}/${userSkills.length} skills matched`,
    weight: config.userToJobWeights.skillMatch,
    score: score,
    rationale: rationale
  };
}

function scoreIndustryAlignmentDimension(jobPayload, userProfile, config) {
  const jobIndustry = (jobPayload.company_industry || 'unknown').toLowerCase();
  const userIndustries = userProfile.background.industries || [];
  let score = 20, rationale = `New industry; transferable skills needed.`;

  const exactMatch = userIndustries.some(ind => jobIndustry.includes(ind.toLowerCase().split('_')[0]));
  if (exactMatch) {
    score = 50;
    rationale = `Direct experience in ${jobIndustry}`;
  } else {
    const adjacentIndustries = ['ecommerce', 'saas', 'marketplace', 'consumer', 'd2c'];
    const jobIsAdjacent = adjacentIndustries.some(adj => jobIndustry.includes(adj));
    if (jobIsAdjacent) {
      score = 35;
      rationale = `Related to user's background (e.g., ${jobIndustry})`;
    }
  }

  return {
    criteria: 'Industry alignment',
    actual_value: jobIndustry || 'Unknown',
    weight: config.userToJobWeights.industry,
    score: score,
    rationale: rationale
  };
}

function scoreOrgComplexityDimension(jobPayload, userProfile, config) {
  // This dimension is highly speculative and depends on data not easily scraped.
  // We default to a neutral score unless strong signals are present.
  const researchBrief = jobPayload.researchBrief || {};
  let score = 30, complexity = 'Unknown', rationale = 'Org complexity not assessed.';

  if (researchBrief.hiring_urgency === 'critical') {
    score = 35; complexity = 'High (inflection point)'; rationale = 'Org is in transition; high expectations.';
  } else if (researchBrief.hiring_urgency === 'high') {
    score = 40; complexity = 'Moderate-High (active growth)'; rationale = 'Active growth phase.';
  } else {
    score = 45; complexity = 'Moderate (stable growth)'; rationale = 'Normal growth phase.';
  }

  return {
    criteria: 'Org complexity readiness',
    actual_value: complexity,
    weight: config.userToJobWeights.orgComplexity,
    score: score,
    rationale: rationale
  };
}

// ============================================================================
// DEAL-BREAKER LOGIC
// ============================================================================

function checkDealBreakers(jobPayload, userProfile, config) {
  const userBreakers = userProfile.preferences.deal_breakers || [];
  for (const breaker of userBreakers) {
    let triggered = false;
    let reason = '';
    switch(breaker) {
      case 'on_site':
        const workplaceTypeLower = (jobPayload.workplace_type || '').toLowerCase();
        if (workplaceTypeLower.includes('on-site') || workplaceTypeLower.includes('on site') || workplaceTypeLower.includes('in-office')) {
          triggered = true; reason = 'Job is on-site; remote is required.';
        }
        break;
      case 'less_than_150k_base': // Note: this key is static, logic is dynamic
        const salaryFloor = userProfile.preferences.salary_floor || 150000;
        if (jobPayload.salary_min && jobPayload.salary_min < salaryFloor) {
          triggered = true; reason = `Base salary ${jobPayload.salary_min.toLocaleString()} is below floor of ${salaryFloor.toLocaleString()}`;
        }
        break;
      case 'no_equity':
        if (userProfile.preferences.bonus_and_equity_preference === 'required' && !jobPayload.equity_mentioned) {
          triggered = true; reason = 'Job does not mention equity, which is required.';
        }
        break;
      case 'pre_revenue':
        if (['pre_seed', 'seed'].includes(jobPayload.company_stage || '')) {
          triggered = true; reason = 'Company is pre-revenue or very early stage.';
        }
        break;
      case 'no_revops_component':
        const revOpsCount = config.revopsKeywords.filter(k => (jobPayload.descriptionText || '').toLowerCase().includes(k)).length;
        if (revOpsCount === 0) {
          triggered = true; reason = 'Job has no discernible RevOps component.';
        }
        break;
    }
    if (triggered) return { passed: false, trigger: breaker, reason: reason, score: 0 };
  }
  return { passed: true, trigger: null, reason: 'Passed all filters', score: 50, rationale: 'No hard "no"s detected' };
}

// ============================================================================
// INTERPRETATION & NARRATIVE
// ============================================================================

function generateInterpretation(overallScore, jobToUserFit, userToJobFit) {
    let summary = '', action = '';
    const starters = [];

    const userAligns = jobToUserFit.score >= 35;
    const jobAligns = userToJobFit.score >= 30;

    if (userAligns && jobAligns) {
        summary = 'Mutual alignment: Job meets your requirements AND you match the role well.';
        action = 'PURSUE—Apply with strong 90-day plan';
    } else if (userAligns && !jobAligns) {
        summary = 'Job meets your requirements but you only partially match the role.';
        action = 'CONSIDER—Only if excited; may require ramp-up';
    } else if (!userAligns && jobAligns) {
        summary = 'You match the role well but job doesn\'t fully meet your requirements.';
        action = 'CONSIDER—If willing to negotiate on weak dimensions (salary/remote)';
    } else {
        summary = 'Limited alignment on both sides. Look for better opportunities.';
        action = 'SKIP—Not a strong fit';
    }

    const weakestDimension = [...jobToUserFit.breakdown, ...userToJobFit.breakdown].sort((a,b) => a.score - b.score)[0];
    if (weakestDimension && weakestDimension.score < 30) {
        if (weakestDimension.criteria.includes('Salary')) starters.push('What is the full compensation package?');
        else if (weakestDimension.criteria.includes('Remote')) starters.push('Is there flexibility for remote work?');
        else if (weakestDimension.criteria.includes('RevOps')) starters.push('How much of this role is RevOps vs. other duties?');
    }
    if (starters.length === 0) starters.push('What does success look like in the first 90 days?');

    return { summary, action, conversation_starters: starters };
}

// ============================================================================
// EXPORT FUNCTIONS
// ============================================================================

/**
 * Main scoring entry point
 */
async function scoreJobFit(jobPayload, userProfileJSON) {
  try {
    const [userProfile, config] = await Promise.all([
      typeof userProfileJSON === 'string' ? JSON.parse(userProfileJSON) : userProfileJSON,
      getScoringConfig()
    ]);

    if (!jobPayload || !userProfile) {
      throw new Error('Missing job payload or user profile');
    }

    const jobToUserFit = calculateJobToUserFit(jobPayload, userProfile, config);
    const userToJobFit = calculateUserToJobFit(jobPayload, userProfile, config);
    const result = combineScores(jobToUserFit, userToJobFit, config);

    result.score_id = `score_${Date.now()}`;
    result.job_id = jobPayload.job_id || `job_${Date.now()}`;
    result.timestamp = new Date().toISOString();

    return result;

  } catch (error) {
    console.error('[Job Hunter] Scoring error:', error);
    return { success: false, error: error.message };
  }
}

window.scoreJobFit = scoreJobFit;

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { scoreJobFit };
}