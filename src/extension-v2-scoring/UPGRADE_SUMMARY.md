# Job Filter v2 - Skill Extraction Pipeline Upgrade

## Implementation Summary

**Date**: January 16, 2026
**Branch**: `claude/upgrade-skill-extraction-b7hLI`
**Status**: Phase 1 Complete (Foundation & Core Modules)

---

## ✅ Completed Work

### 1. Foundation Setup

#### Data Dictionaries
- **`data/tools.json`**: 110+ platforms and tools (HubSpot, Salesforce, GA4, Looker, etc.)
- **`data/ignore-rules.json`**: Comprehensive soft skills denial list and junk patterns
  - Soft skills exact matches (communication, leadership, teamwork, etc.)
  - Soft skills patterns (regex-based rejection)
  - Junk phrases and degree/education filtering

#### Configuration Updates
- **`skills/skill-constants.js`**: Added new configurations
  - `FIT_SCORE_CONFIG`: Dual-bucket scoring (70% core skills, 30% tools)
  - `FORCED_CORE_SKILLS`: SQL, Python always classified as CORE_SKILL
  - `SOFT_SKILLS_PATTERNS`: Regex patterns for 100% soft skill rejection
  - `SKILL_ALIASES`: 50+ abbreviation mappings (GA4 → Google Analytics 4, etc.)

#### Build Setup
- **`package.json`**: Added Compromise.js v14.13.0 for paragraph-level NLP

### 2. Core New Modules

#### `skills/skill-classifier.js`
- **4-Layer Classification System**:
  - Layer 0: Soft skill rejection (100% blocking)
  - Layer 1: Exact dictionary match
  - Layer 2: Forced core skills (SQL, Python)
  - Layer 3: Pattern-based rules
  - Layer 4: Context heuristics + candidates bucket
- **Output**: Classifies as CORE_SKILL, TOOL, CANDIDATE, or REJECTED
- **Evidence Tracking**: Every decision includes confidence, evidence, and source location

#### `skills/skill-splitter.js`
- **Robust Multi-Skill Splitting**:
  - Priority order: semicolon (;) > comma (,) > " and " > " or "
  - Handles parenthetical content: "GA4 (Google Analytics 4)" → ["GA4", "Google Analytics 4"]
  - Preserves multi-word skills: "lifecycle marketing" stays intact
- **Edge Cases**: Removes year patterns, proficiency levels, "and/or" splitting

#### `skills/requirement-detector.js`
- **Section Parsing**: Detects "Required" vs "Desired" sections in job descriptions
- **Language Signals**:
  - "expert required" → 2.2x multiplier
  - "must have" → 2.0x multiplier
  - "preferred" → 1.0x multiplier
- **Penalty Calculation**: Maps missing items to penalties (-0.10 to -0.15)

#### `skills/candidate-manager.js`
- **Candidate Bucket Management**: Stores unclassified items for human review
- **User Feedback Loop**: Accept, reject, or classify candidates
- **Dictionary Promotion**: User-approved candidates added to extensions
- **Export Functionality**: Export candidates for bulk updates

#### `skills/fit-score-calculator.js`
- **Dual-Bucket Scoring**:
  - Core Skills Score: (requiredMatched*2.0 + desiredMatched*1.0) / (requiredTotal*2.0 + desiredTotal*1.0)
  - Tools Score: Same formula for tools
  - Overall Score: (coreSkillsScore * 0.70) + (toolsScore * 0.30) + penalties
- **Penalty System**:
  - Missing required skill: -0.10
  - Missing required tool (expert): -0.15
  - Missing required tool (standard): -0.12
  - Missing desired tool: -0.05
  - Max total penalty: -0.50 (cap)
- **Recommendations**: Auto-generates advice based on score breakdown

### 3. Manifest Updates
- Added all new modules to `content_scripts` and `web_accessible_resources`
- Included data files (tools.json, ignore-rules.json) as web-accessible

---

## 📋 Remaining Tasks (Phase 2-4)

### Phase 2: Integration & Updates

1. **Update `skill-extractor.js`**
   - Add Compromise.js for paragraph extraction (not just bullets)
   - Integrate skill-classifier for classification
   - Integrate skill-splitter for multi-skill splitting
   - Target: +40% recall by capturing skills in prose

2. **Update `skill-normalizer.js`**
   - Implement dynamic Fuse.js thresholds:
     - Short strings (<5 chars): threshold 0.2
     - Medium strings (5-15 chars): threshold 0.35
     - Long phrases (>15 chars): threshold 0.50
   - Add alias matching using SKILL_ALIASES map
   - Use ignoreLocation:true for acronyms, false for phrases

3. **Update `skill-matcher.js`**
   - Integrate new dual-bucket fit score calculator
   - Replace old scoring with FitScoreCalculator.calculateFitScore()
   - Update output format to include breakdown and penalties

4. **Update `skill-taxonomy.js`**
   - Expand with tools from tools.json
   - Add aliases to existing skills
   - Ensure SQL and Python are marked as core skills

### Phase 3: Testing

1. **Create Unit Tests**
   - `tests/skill-splitter.test.js`: Test splitting edge cases
   - `tests/normalizer.test.js`: Test threshold tuning
   - `tests/gold-set.json`: 20-30 real job descriptions

2. **Manual Testing**
   - Test on 3-5 real job postings (LinkedIn, Greenhouse, Lever)
   - Verify:
     - Skills and Tools separated
     - Soft skills completely absent
     - Fit score reflects true match
     - Evidence readable
     - No crashes, <1s per job

### Phase 4: Deployment

1. **Install Compromise.js**
   - Run `npm install` to get compromise@^14.13.0
   - Configure tree-shaking if using webpack/vite

2. **Build & Package**
   - Run build process (if applicable)
   - Test in chrome://extensions/

3. **Commit & Push**
   - Commit all changes with descriptive message
   - Push to `claude/upgrade-skill-extraction-b7hLI` branch

---

## 🎯 Product Decisions (DO NOT DEVIATE)

1. ✅ **EXCLUDE all soft skills** (communication, leadership, teamwork) entirely
2. ✅ **SQL and Python are ALWAYS CORE_SKILLS** (never tools)
3. ✅ **3-bucket system**: CORE_SKILLS, TOOLS, CANDIDATES
4. ✅ **Fit score**: 70% core skills, 30% tools (configurable)
5. ✅ **Required items**: 2x multiplier vs Desired (configurable)
6. ⏳ **Performance**: <1s per job page (to be validated in testing)
7. ⏳ **Explainability**: Evidence field for every decision (implemented, needs testing)

---

## 📊 Expected Improvements

| Metric | Before | After (Target) | Status |
|--------|--------|----------------|--------|
| **Recall** | 40-50% | 85%+ | ⏳ Pending Compromise.js integration |
| **Precision** | 85%+ | 75%+ | ⏳ Pending testing |
| **Soft Skills** | ~5-10% leak | 0% | ✅ Implemented (needs validation) |
| **Tools Tracking** | Mixed with skills | Separate | ✅ Implemented |
| **Explainability** | Opaque | Full evidence | ✅ Implemented |
| **Performance** | Variable | <1s | ⏳ Pending testing |

---

## 📁 New Files Created

### Data Files
- `data/tools.json` (6.5 KB)
- `data/ignore-rules.json` (3.2 KB)

### Core Modules
- `skills/skill-classifier.js` (15 KB)
- `skills/skill-splitter.js` (8 KB)
- `skills/requirement-detector.js` (9 KB)
- `skills/candidate-manager.js` (7 KB)
- `skills/fit-score-calculator.js` (11 KB)

### Configuration
- `package.json` (0.3 KB)

### Documentation
- `UPGRADE_SUMMARY.md` (this file)

**Total New Code**: ~60 KB across 5 modules + 2 data files

---

## 🚀 Next Steps

1. ✅ ~~Set up foundation (data files, constants)~~ - **DONE**
2. ✅ ~~Create core new modules~~ - **DONE**
3. ⏳ **Integrate Compromise.js into skill-extractor.js**
4. ⏳ Update existing modules (normalizer, matcher, taxonomy)
5. ⏳ Create unit tests
6. ⏳ Test on real job postings
7. ⏳ Fix bugs and iterate
8. ⏳ Commit and push to feature branch

---

## 🔍 Testing Checklist

When testing is ready, verify:

- [ ] Paragraph skills captured (not just bullets)
- [ ] Multi-word skills preserved (lifecycle marketing)
- [ ] Acronyms handled (GA4, CDP, CRM)
- [ ] Soft skills 100% absent
- [ ] SQL/Python always CORE_SKILL
- [ ] Tools separated from skills
- [ ] HubSpot/Salesforce classified as TOOL
- [ ] Candidates bucket contains plausible items
- [ ] Fit score between 0-1
- [ ] Required items matter more (2x)
- [ ] Missing required tool applies penalty
- [ ] All penalties capped at -0.50
- [ ] <1s per job page
- [ ] No console errors
- [ ] Evidence field populated
- [ ] Confidence scores meaningful (0-1)

---

## 📝 Notes for Next Developer

- **No AI/LLMs**: This is a rule-based system. All classification is deterministic.
- **Soft Skills**: 100% rejection is critical. Do not relax this rule.
- **SQL/Python**: Always CORE_SKILL. This is a product decision, not negotiable.
- **Compromise.js**: Required for paragraph extraction. Install with `npm install`.
- **Testing**: Use real job descriptions, not synthetic data.
- **Performance**: Profile if extraction exceeds 1s per job page.

---

**Last Updated**: January 16, 2026
**Implementation**: Matt Dimock + Claude Code
