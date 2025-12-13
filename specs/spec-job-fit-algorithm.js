FEATURE SPEC: Job Fit Scoring Algorithm for Job Hunter OS Chrome Extension
EXECUTIVE SUMMARY
You need a bidirectional job fit scoring system embedded in your Chrome extension that instantly tells you whether a job is worth applying to. The system scores two dimensions independently and combines them:

Job→User Fit (0–50): Does this job meet YOUR preferences, salary floor, and work constraints?

User→Job Fit (0–50): Does YOUR background, skills, and experience match what THIS job requires?

Combined Score (0–100): Overall probability of a mutually beneficial match.

Each score is supported by sub-criteria breakdowns so you can see exactly why a job scored 72/100 vs. 45/100. This replaces vague intuition with quantified decision-making.

Core Principle: You spend <5 seconds looking at a scoring result to decide "spend 15 min researching + 10 min applying" vs. "skip entirely." The algorithm must be friction-free, fast, and visually scannable.

PROBLEM STATEMENT & CONSTRAINTS
Problem
Currently, you manually evaluate each job posting against vague mental criteria

You can't instantly see if a remote, $150K+, Growth leadership role with equity is worth pursuing

You lack structured visibility into which aspects of a role align vs. misalign (e.g., "role is perfect but on-site" or "salary is low but equity is exceptional")

This leads to decision fatigue and wasted time on non-starters

Constraints
Chrome extension environment: Must run client-side, no heavy server calls; localStorage is limited

Speed: Score must calculate in <500ms; UI must render in <200ms

Accuracy: Scoring is probabilistic; garbage input (bad job extraction) = garbage score

Extensibility: Algorithm must evolve as you discover new deal-breakers or preferences

Simplicity: Onboarding to set up your profile must take <3 minutes, not 30

INPUTS, OUTPUTS, & DATA STRUCTURES
INPUT 1: User Profile
Stored in Chrome local storage under jh_user_profile (JSON blob).

json
{
  "version": "1.0",
  "preferences": {
    "salary_floor": 150000,
    "salary_target": 200000,
    "bonus_and_equity_preference": "required",
    "remote_requirement": "remote_first",
    "workplace_types_acceptable": ["remote", "hybrid_4plus_days"],
    "workplace_types_unacceptable": ["on_site"],
    "employment_type_preferred": "full_time",
    "employment_types_acceptable": ["full_time", "contract"],
    "regions_willing_to_work": [],
    "deal_breakers": [
      "on_site",
      "less_than_150k_base",
      "no_equity",
      "declining_company",
      "pre_revenue"
    ],
    "must_haves": [
      "growth_revops_lifecycle_focus",
      "series_b_or_later",
      "data_driven_culture"
    ]
  },
  "background": {
    "current_title": "Director of Growth & RevOps",
    "years_experience": 18,
    "core_skills": [
      "growth_strategy",
      "revops_infrastructure",
      "ecommerce_gtm",
      "lifecycle_marketing",
      "braze_expertise",
      "crmops",
      "team_building",
      "data_driven_decisioning",
      "zoho_one",
      "spreadsheets",
      "sql_basics"
    ],
    "industries": [
      "telecom",
      "insurance",
      "consumer_electronics",
      "saas",
      "d2c_ecommerce"
    ],
    "target_roles": [
      "VP of Growth",
      "Head of RevOps",
      "CMO (ops_heavy)",
      "CRO",
      "Chief Growth Officer",
      "Director of Growth (with_upside)"
    ]
  },
  "constraints": {
    "cannot_accept": "pre_revenue",
    "avoid_unless_exceptional": "no_clear_revops_component",
    "reject_if": "founder_chaos_politics"
  },
  "last_updated": "2025-12-12T19:00:00Z"
}
Where this lives: popup.html (Settings tab) allows user to edit this interactively.

INPUT 2: Extracted Job Data
Comes from content.js (already extracted from LinkedIn/Indeed) + enriched by job research module.

json
{
  "jobPayload": {
    "job_id": "linkedin_123456789",
    "job_title": "Senior Director, US Growth Strategy",
    "company_name": "iHerb",
    "company_stage": "late_stage_private",
    "company_revenue": 2400000000,
    "company_headcount": 1368,
    "location": "Remote",
    "workplace_type": "remote",
    "employment_type": "full_time",
    "salary_min": 162000,
    "salary_max": 221000,
    "equity_mentioned": true,
    "bonus_mentioned": true,
    "bonus_estimated_percent": 0.2,
    "job_description_text": "...",
    "job_url": "https://www.linkedin.com/jobs/view/...",
    "source": "LinkedIn",
    "extracted_at": "2025-12-12T18:45:00Z"
  },
  "researchBrief": {
    "company_summary": "...",
    "role_requirements": ["Growth strategy", "RevOps infrastructure", "GTM execution", "..."],
    "pain_points": ["No US GTM", "New CRO hire (July 2025)", "..."],
    "success_metrics": ["Scale US revenue 3x in 18 months", "..."],
    "inflection_point": "CEO hired ex-Amazon CMO as CRO; US market is critical inflection",
    "hiring_urgency": "high",
    "fit_assessment": {
      "fit_label": "pursue",
      "fit_score": 46
    }
  }
}
OUTPUT: Fit Score Result
Rendered in popup overlay after user clicks "Score Job".

json
{
  "score_id": "score_202512121900",
  "job_id": "linkedin_123456789",
  "timestamp": "2025-12-12T19:00:00Z",
  "overall_score": 78,
  "overall_label": "STRONG FIT",
  "job_to_user_fit": {
    "score": 42,
    "label": "GOOD",
    "breakdown": [
      {
        "criteria": "Salary (vs. floor of $150K)",
        "actual_value": "$162K–$221K",
        "weight": 0.25,
        "score": 50,
        "rationale": "Base exceeds floor by $12K; within target range"
      },
      {
        "criteria": "Remote requirement",
        "actual_value": "Remote",
        "weight": 0.25,
        "score": 50,
        "rationale": "Matches preference exactly"
      },
      {
        "criteria": "Equity present",
        "actual_value": "Yes, RSUs + bonus",
        "weight": 0.2,
        "score": 50,
        "rationale": "Equity mentioned; confirms upside"
      },
      {
        "criteria": "Company stage",
        "actual_value": "Late-stage private, profitable",
        "weight": 0.15,
        "score": 40,
        "rationale": "Below Series B threshold but stable & high-growth"
      },
      {
        "criteria": "Deal-breaker scan",
        "actual_value": "PASS",
        "weight": 0.15,
        "score": 35,
        "rationale": "No hard no's, but CRO hire (July 2025) = org complexity"
      }
    ]
  },
  "user_to_job_fit": {
    "score": 34,
    "label": "GOOD",
    "breakdown": [
      {
        "criteria": "Role type vs. target roles",
        "actual_value": "Sr. Director, Growth Strategy",
        "weight": 0.25,
        "score": 45,
        "rationale": "Director level; growth focus; but wants VP-level authority"
      },
      {
        "criteria": "RevOps component strength",
        "actual_value": "Moderate (GTM + brand + ops)",
        "weight": 0.2,
        "score": 35,
        "rationale": "Some RevOps signals but not primary focus; more brand/GTM"
      },
      {
        "criteria": "Skill match (Growth strategy, ecommerce, GTM)",
        "actual_value": "99% overlap",
        "weight": 0.2,
        "score": 50,
        "rationale": "Perfect match: ecommerce growth, acquisition, retention"
      },
      {
        "criteria": "Industry alignment",
        "actual_value": "D2C ecommerce (health & supplements)",
        "weight": 0.15,
        "score": 40,
        "rationale": "Core experience; different category but transferable"
      },
      {
        "criteria": "Org complexity readiness",
        "actual_value": "High (new CRO, new COO, complex product)",
        "weight": 0.2,
        "score": 15,
        "rationale": "You prefer stable orgs; post-hire org risk is significant"
      }
    ]
  },
  "interpretation": {
    "summary": "Strong alignment on what you need (salary, remote, equity). Good alignment on your skills (ecommerce growth expertise). Risk: organizational complexity from recent leadership hires means expectations will be high and decision-making may be unclear. Worth pursuing, but clarify reporting line and success metrics in first conversation.",
    "action": "PURSUE—Request research brief, then apply with strong 90-day plan",
    "conversation_starters": [
      "How is reporting structured between this role and the new CRO?",
      "What are the first 90-day success metrics?",
      "What does the US GTM roadmap look like for Year 1?"
    ]
  }
}
FILES TO CREATE OR MODIFY
1. NEW: profile-setup.html (User Onboarding)
Responsibility: First-run setup flow to collect user preferences

Contains: Form fields for salary floor, workplace type, skills, industries, deal-breakers

Validation: Ensures data is valid before storing in chrome.storage.local

UX: 3 minutes max; breaks into tabs (Preferences, Background, Deal-Breakers)

2. NEW: scoring-engine.js (Core Algorithm)
Responsibility: Bidirectional scoring logic

Exports:

calculateJobToUserFit(jobPayload, userProfile) → Object with score 0–50 + breakdown

calculateUserToJobFit(jobPayload, userProfile) → Object with score 0–50 + breakdown

combineScores(jobToUser, userToJob) → Object with overall score 0–100 + interpretation

checkDealBreakers(jobPayload, userProfile) → Boolean; auto-fail on hard no's

No external API calls; all local computation

3. NEW: results-dashboard.html (Results UI)
Responsibility: Display score results with sub-criteria breakdown

Sections:

Overall score card (large, color-coded)

"Job→User Fit" breakdown (table or expandable list)

"User→Job Fit" breakdown (table or expandable list)

"Interpretation & Next Steps" section

"Save to Airtable" button (triggers existing flow)

Styling: Uses existing popup.css + new scoring-specific styles

4. MODIFY: content.js (Injected Overlay)
Change: After extracting job data, add a "Score This Job" button alongside existing "Send to Job Hunter" button

Behavior: Clicking opens a modal/popup that calls the scoring engine and displays results

No changes to extraction logic; reuse existing extractLinkedInJobData() etc.

5. MODIFY: popup.js (Settings Hub)
New tab: "Settings → Profile" where users configure their preferences

New function: loadUserProfile() and saveUserProfile() (mirrors existing Airtable credential flow)

New function: openProfileSetup() for first-run experience

6. MODIFY: manifest.json (Permissions)
Add to content_scripts: results-dashboard.html injection location

Add to permissions: storage (already there) for reading user profile

7. NEW: scoring-schema.json (Reference Doc)
Responsibility: Define all scoring criteria, weights, and thresholds

Used by: Developers + product iteration; helps evolve algorithm over time

Format: YAML/JSON with comments explaining each criterion

STEP-BY-STEP EXECUTION FLOW
Phase 1: User Opens Extension (First Time)
User clicks Job Hunter icon

popup.js checks if jh_user_profile exists in Chrome storage

If missing, show modal: "Complete your Job Hunter Profile in 3 minutes"

User clicks "Set Up Profile"

profile-setup.html opens in a new tab (or modal in popup)

User fills out:

Preferences Tab: Salary floor, remote requirement, workplace types, employment type, deal-breakers

Background Tab: Current title, years of experience, core skills (multi-select), industries, target roles

Deal-Breakers Tab: Pre-selected based on Matt's profile (on-site, <$150K, no equity) + ability to customize

User clicks "Save Profile"

popup.js validates and stores jh_user_profile in chrome.storage.local

Tab closes; user is back in popup

Phase 2: User Views Job Posting (LinkedIn/Indeed)
User navigates to job detail page (LinkedIn or Indeed)

content.js detects job page and injects overlay with two buttons:

"Send to Job Hunter" (existing)

"Score This Job" (new)

User clicks "Score This Job"

content.js calls extractLinkedInJobData() or extractIndeedJobData() → gets jobPayload

content.js sends message to background.js: { action: 'score_job', job: jobPayload }

Phase 3: Background Script Prepares Scoring
background.js receives message

Calls chrome.storage.local.get(['jh_user_profile']) to hydrate user preferences

Optional: If job research brief exists in Airtable for this job, fetch it to enrich jobPayload

(For MVP, skip this; use only extracted data)

Sends both jobPayload + userProfile to scoring-engine.js

Scoring engine runs and returns scoreResult object

Phase 4: Scoring Engine Executes
javascript
const scoreResult = {
  ...
  job_to_user_fit: calculateJobToUserFit(jobPayload, userProfile),
  user_to_job_fit: calculateUserToJobFit(jobPayload, userProfile),
  ...
};
scoreResult.overall_score = combineScores(
  scoreResult.job_to_user_fit.score,
  scoreResult.user_to_job_fit.score
);
Sub-algorithm 1: calculateJobToUserFit()

Check deal-breakers first (if any match, return 0 immediately)

Score dimensions (each 0–50):

Salary (vs. floor, target, range)

Workplace type (remote, hybrid, on-site)

Equity/bonus presence

Company stage (Series B+, profitable, late-stage)

Hiring urgency (if available from research brief)

Weighted average: (salary×0.25 + workplace×0.25 + equity×0.2 + stage×0.15 + urgency×0.15)

Sub-algorithm 2: calculateUserToJobFit()

Score dimensions (each 0–50):

Role type (VP/Director/Head title alignment with target roles)

RevOps component strength (% of JD about RevOps/infrastructure vs. brand/content)

Skill match (count keyword overlaps: growth, ecommerce, GTM, CRM, etc.)

Industry alignment (exact match=50, adjacent=35, new=20)

Org complexity (simple org=50, post-funding chaos=15)

Weighted average: (role_type×0.25 + revops×0.2 + skills×0.2 + industry×0.15 + org×0.2)

Sub-algorithm 3: combineScores()

javascript
overall = (job_to_user×0.5) + (user_to_job×0.5)  // 0-100 scale
label = overall >= 80 ? "STRONG FIT" : 
        overall >= 70 ? "GOOD FIT" : 
        overall >= 50 ? "MODERATE FIT" : 
        overall >= 30 ? "WEAK FIT" : 
        "POOR FIT"
Phase 5: Results Rendered in UI
background.js sends scoreResult back to content.js

content.js injects results-dashboard.html as a modal overlay on top of job posting

Modal displays:

Large score card (0–100, color-coded: green 70+, yellow 50-69, red <50)

Job→User Fit breakdown (table with criteria, weights, scores)

User→Job Fit breakdown (table with criteria, weights, scores)

Interpretation section: "This role is a strong fit because X, Y, Z. Risk: A. Next step: B."

Action buttons:

"Send to Job Hunter" (existing; saves to Airtable)

"Close" (dismiss modal)

"Edit Profile" (opens profile setup if user wants to adjust thresholds)

Phase 6: User Decision
User reads score + interpretation

Decides: "Worth applying" → clicks "Send to Job Hunter"

Existing background.js flow triggers: saves to Airtable + trigger n8n workflow

OR user decides "Not worth it" → clicks "Close"

DATA STRUCTURES & ALGORITHM DETAILS
Scoring Criteria Matrix
JOB→USER FIT (Does this job meet Matt's needs?)
Criterion	Weight	Scoring Logic	0 pts	25 pts	50 pts
Salary	0.25	Compare salary_min to floor ($150K)	<$130K	$130–$149K	$150K+
Workplace Type	0.25	Match workplace_type to preferences	On-site (hard no)	Hybrid <4 days	Remote or Hybrid 4+ days
Equity/Bonus	0.20	Check for equity_mentioned + bonus_mentioned	No equity, no bonus	Equity OR bonus, not both	Both equity AND bonus
Company Stage	0.15	Match to "Series B or later" + profitable	Pre-revenue	Series A or burned-out growth	Series B+, profitable
Hiring Urgency	0.15	Gauge inflection point from research brief	Exploratory hire	Moderate urgency	High urgency / new exec hire
USER→JOB FIT (Does Matt match this job's needs?)
Criterion	Weight	Scoring Logic	0 pts	25 pts	50 pts
Role Type	0.25	Match job_title to target_roles	Individual contributor	Director or Head	VP, CRO, Chief Growth Officer
RevOps Component	0.20	% of JD mentioning RevOps, infrastructure, data, systems	<10% RevOps language	10–30% RevOps	>30% RevOps focus
Skill Match	0.20	Count keyword overlaps with core_skills	<3 matches	3–5 matches	5+ matches or exact match
Industry Alignment	0.15	Check if industry in user's past or adjacent	Brand new vertical	Adjacent (SaaS vs. D2C)	Exact match (ecommerce)
Org Complexity	0.20	Assess hiring_urgency, recent exec changes, founder signals	Founder chaos, pre-product	Post-funding, some chaos	Stable org, clear structure
Deal-Breaker Logic (MECE)
If ANY of these are true, return overall_score = 0 immediately (don't bother calculating sub-scores):

javascript
const HARD_DEALBREAKERS = {
  ON_SITE: workplace_type === "on_site" && userProfile.remote_required === true,
  BELOW_SALARY_FLOOR: salary_max < 150000,
  NO_EQUITY: !equity_mentioned && userProfile.bonus_and_equity === "required",
  PRE_REVENUE: company_revenue === null || company_revenue === 0,
  DECLINING: company_growth_rate < 0,  // (if available from research)
};
User can override these (except ON_SITE, which is non-negotiable) by toggling in Profile Settings.

ACCEPTANCE CRITERIA
Functional Acceptance
 User can complete profile setup in <3 minutes (timed test)

 Scoring runs in <500ms from "Score This Job" click to modal display

 Job→User score ±5 points across 10 test jobs (validation against manual review)

 User→Job score ±5 points across 10 test jobs

 Deal-breaker logic correctly rejects Matt's known "hard no" jobs

 Score results persist in localStorage if user wants to review later

 "Save to Airtable" button in results modal successfully triggers existing Airtable flow

UX Acceptance
 Results dashboard is scannable in <5 seconds

 Color coding (red/yellow/green) is immediately obvious

 Sub-criteria breakdown is readable (not overwhelming)

 Modal does not cover critical job info; user can still read the job while reviewing score

 Mobile responsive (popup scales on smaller screens)

Edge Cases Handled
 Job data is incomplete (e.g., no salary) → algorithm still scores gracefully (flags missing data)

 Job data has contradictions (e.g., "remote" in title but location says "SF, CA") → algorithm reconciles

 User profile not set → prompt to complete setup; don't block scoring with defaults

 Salary is a range vs. single number → uses salary_min for floor check

 Job has no research brief yet → score using only extracted job data

Documentation Acceptance
 Scoring algorithm documented with examples (this spec)

 Code comments explain each criterion and its weight

 scoring-schema.json fully versioned and commented

 README updated with "How the Scoring Algorithm Works" section

OPEN QUESTIONS & RISKS
Open Questions
Weighted Average Formula: Should all criteria be equally weighted within their category, or should some (e.g., salary) be slightly emphasized?

Current assumption: Equal weight within category, then category-level weights (salary 0.25, etc.)

Alternative: Weight salary at 0.35, make other dimensions 0.15 each

Decision needed: Validate against your intuition on 5–10 test jobs

Company Stage Proxy: How do we score company stage if research brief isn't available?

Current assumption: Use headcount (>500 = mature, 100–500 = growth, <100 = early)

Alternative: Ask user to indicate in profile if they'll accept underfunded companies

Decision needed: Is headcount a good proxy, or should we require revenue data?

RevOps Component Parsing: How do we calculate % of JD mentioning "RevOps"?

Current approach: Keyword frequency (count mentions of "RevOps", "infrastructure", "systems", "data", "automation", "CRM", "workflows")

Risk: Marketing roles mention "data" a lot, which could inflate RevOps score

Mitigation: Use keyword clusters (e.g., "RevOps" + "infrastructure" + "automation" must co-occur to count as RevOps component)

Decision needed: Validate on 5 real job postings

Skill Match Precision: Should skill matching be keyword-based or semantic?

Current approach: Keyword matching (e.g., "Braze" in JD + "Braze" in user skills = match)

Alternative: Use fuzzy matching (e.g., "email automation platform" ≈ "Braze")

Decision needed: Start simple (keyword); evolve if too many false negatives

Org Complexity Signals: What if there's no research brief to indicate org stability?

Current approach: Default to 25 pts (assume moderate complexity); user can override

Alternative: Use headcount growth rate, funding recency, founder signals from LinkedIn

Decision needed: Should we try to infer org stability, or require user input?

Risks
Risk	Probability	Impact	Mitigation
Garbage job extraction (LinkedIn/Indeed changes DOM selectors)	Medium	High	If extracted data is incomplete, algorithm degrades gracefully; flag missing fields in results
User profile data stale (user's preferences change)	Low	Medium	Add "Last updated" timestamp to profile; prompt to refresh every 30 days
Scoring feels "magical" (user doesn't understand why score is 72)	High	Medium	Make sub-criteria breakdown extremely clear; allow user to adjust weights in Settings
Over-fitting to Matt's current preferences	Low	High	Build algorithm flexibility; allow overrides; iterate based on real application outcomes
Algorithm bias toward certain job types	Medium	Medium	Validate algorithm on 20+ diverse roles (startups, enterprises, different industries)
Mobile performance (localStorage is slow on mobile)	Low	Low	Cache scores in memory; lazy-load breakdown tables
BEAUTIFUL DESIGN & UX DETAILS
Results Dashboard Layout (Figma-style wireframe)
text
┌─────────────────────────────────────────────────────────────┐
│  OVERALL FIT SCORE                                          │
│                                                             │
│    ████████████████  78/100                                │
│    🟢 STRONG FIT                                            │
│                                                             │
│    This role is a strong match. You meet most of the      │
│    company's needs, and the role aligns with your goals.  │
│    Risk: Recent leadership changes (CRO, COO) may mean     │
│    higher expectations. Clarify reporting lines in first   │
│    conversation.                                           │
│                                                             │
├─────────────────────────────────────────────────────────────┤
│  JOB MEETS YOUR NEEDS                                      │
│                                                             │
│  Salary (⭐⭐⭐⭐⭐)              50/50   Target: $150K–$200K │
│  $162K–$221K exceeds your floor by $12K ✓                 │
│                                                             │
│  Workplace Type (⭐⭐⭐⭐⭐)       50/50   Preference: Remote │
│  100% remote matches your requirement ✓                    │
│                                                             │
│  Equity & Bonus (⭐⭐⭐⭐⭐)       50/50   Requirement: Both  │
│  RSUs + 20% annual bonus ✓                                 │
│                                                             │
│  Company Stage (⭐⭐⭐)           40/50   Preference: Series B+ │
│  $2.4B ARR, late-stage private, 14.5% growth. Below       │
│  Series B threshold but stable & profitable ⚠️             │
│                                                             │
│  Hiring Urgency (⭐⭐)            35/50   Signal: High      │
│  New CRO (July 2025) + no US GTM = org in transition.     │
│  Could mean high expectations or political complexity.     │
│                                                             │
│  SUBTOTAL JOB→USER FIT:  42/50  (84%)                     │
├─────────────────────────────────────────────────────────────┤
│  YOU MATCH THIS ROLE'S NEEDS                               │
│                                                             │
│  Role Type (⭐⭐⭐⭐)             45/50   Target: VP / CRO  │
│  Director-level vs. VP-level target. Growth leadership    │
│  title matches; but role may feel like sideways move.     │
│                                                             │
│  RevOps Component (⭐⭐⭐)        35/50   Preference: 30%+  │
│  JD emphasizes brand strategy, GTM, ops (25% RevOps      │
│  language). Not as RevOps-heavy as ideal, but present.    │
│                                                             │
│  Skill Match (⭐⭐⭐⭐⭐)          50/50   Your expertise    │
│  Growth strategy, ecommerce GTM, acquisition, retention,  │
│  team building. 99% overlap. ✓                            │
│                                                             │
│  Industry (⭐⭐⭐⭐)              40/50   Past: D2C, Telecom │
│  D2C ecommerce (supplements). Different category but       │
│  transferable playbooks & CAC logic. ✓                     │
│                                                             │
│  Org Complexity (⭐)              15/50   Your preference   │
│  Recent CRO + COO hires + product complexity = high        │
│  expectations, unclear politics. You prefer stable orgs. ✗ │
│                                                             │
│  SUBTOTAL USER→JOB FIT:  34/50  (68%)                     │
├─────────────────────────────────────────────────────────────┤
│  NEXT STEPS                                                 │
│                                                             │
│  ✓ PURSUE THIS ROLE                                         │
│                                                             │
│  1. Request research brief to clarify org dynamics        │
│  2. Ask in first conversation:                            │
│     - Reporting line? (To CRO or CEO?)                    │
│     - 90-day success metrics?                             │
│     - US GTM roadmap for Year 1?                          │
│  3. Apply with strong 90-day plan addressing:            │
│     - US market inflection moment                         │
│     - CAC optimization strategies                         │
│     - Retention engine opportunity                        │
│                                                             │
│  ┌──────────────────┬─────────────┬──────────────────┐   │
│  │ Send to Airtable │ Edit Profile │ Close            │   │
│  └──────────────────┴─────────────┴──────────────────┘   │
└─────────────────────────────────────────────────────────────┘
Color Coding
Green (70–100): "STRONG FIT" or "GOOD FIT" – apply immediately

Yellow (50–69): "MODERATE FIT" – research further, clarify with HM

Red (<50): "WEAK FIT" or "POOR FIT" – low probability; consider skipping

Star Ratings (0–5 stars)
Visual indicator of sub-criteria scores

5 stars = 50 pts (perfect match)

4 stars = 40 pts (very good)

3 stars = 30 pts (acceptable)

2 stars = 20 pts (weak)

1 star = 10 pts (very weak)

IMPLEMENTATION PRIORITY & PHASES
MVP (Phase 1): Get to "First Score" — 3 weeks
Create profile-setup.html + basic form (5 days)

Build scoring-engine.js with simple criteria (5 days)

Create results-dashboard.html with basic layout (3 days)

Integrate into content.js + background.js (3 days)

Testing on 10 real LinkedIn jobs (2 days)

Documentation (1 day)

Phase 2: Refine & Polish — 2 weeks
Validate scoring accuracy on 30 jobs (compare to manual review)

Refine criteria weights based on real data

Add mobile responsiveness

Add "Edit Profile" mid-flow

Add "Save Score" to localStorage for history

Phase 3: Integration & Automation — 2 weeks
Integrate with n8n workflow (send score to Airtable alongside job data)

Build "Score History" dashboard (view past scores, trends)

Add A/B testing framework for criteria weights

TECHNICAL ARCHITECTURE DETAILS
scoring-engine.js Pseudo-Code
javascript
// ============================================================================
// SCORING ENGINE: Bidirectional Job Fit Algorithm
// ============================================================================

/**
 * Calculate how well a job meets the user's needs (0-50)
 */
function calculateJobToUserFit(jobPayload, userProfile) {
  // 1. Check hard deal-breakers
  if (checkDealBreakers(jobPayload, userProfile)) {
    return { score: 0, label: "HARD NO", breakdown: [] };
  }

  // 2. Score each criterion
  const criteria = [
    scoreSalary(jobPayload, userProfile),
    scoreWorkplaceType(jobPayload, userProfile),
    scoreEquityBonus(jobPayload, userProfile),
    scoreCompanyStage(jobPayload, userProfile),
    scoreHiringUrgency(jobPayload, userProfile)
  ];

  // 3. Weighted average
  const weights = [0.25, 0.25, 0.20, 0.15, 0.15];
  const score = criteria.reduce((sum, c, i) => sum + (c.score * weights[i]), 0);

  return {
    score: Math.round(score),
    label: score > 40 ? "GOOD" : score > 25 ? "MODERATE" : "WEAK",
    breakdown: criteria
  };
}

/**
 * Calculate how well the user matches the job's needs (0-50)
 */
function calculateUserToJobFit(jobPayload, userProfile) {
  const criteria = [
    scoreRoleType(jobPayload, userProfile),
    scoreRevOpsComponent(jobPayload),
    scoreSkillMatch(jobPayload, userProfile),
    scoreIndustryAlignment(jobPayload, userProfile),
    scoreOrgComplexity(jobPayload)
  ];

  const weights = [0.25, 0.20, 0.20, 0.15, 0.20];
  const score = criteria.reduce((sum, c, i) => sum + (c.score * weights[i]), 0);

  return {
    score: Math.round(score),
    label: score > 40 ? "GOOD" : score > 25 ? "MODERATE" : "WEAK",
    breakdown: criteria
  };
}

/**
 * Combine both fit scores into an overall 0-100 score
 */
function combineScores(jobToUserScore, userToJobScore) {
  const overall = (jobToUserScore * 0.5) + (userToJobScore * 0.5);
  const label = 
    overall >= 80 ? "STRONG FIT" :
    overall >= 70 ? "GOOD FIT" :
    overall >= 50 ? "MODERATE FIT" :
    overall >= 30 ? "WEAK FIT" :
    "POOR FIT";

  return { score: Math.round(overall), label };
}

/**
 * Score salary (0-50)
 */
function scoreSalary(jobPayload, userProfile) {
  const floor = userProfile.preferences.salary_floor;
  const target = userProfile.preferences.salary_target;
  const salaryMin = jobPayload.salary_min || 0;

  let score = 0;
  if (salaryMin >= target) score = 50;
  else if (salaryMin >= floor) score = 35 + ((salaryMin - floor) / (target - floor)) * 15;
  else score = 0;

  return {
    criteria: "Salary (vs. floor of $150K)",
    actual_value: `$${salaryMin}–$${jobPayload.salary_max}`,
    score: Math.round(score),
    rationale: `Base $${salaryMin} ${salaryMin >= floor ? "exceeds" : "below"} floor of $${floor}`
  };
}

// ... similar functions for other criteria ...

/**
 * Check if job triggers any hard deal-breakers
 */
function checkDealBreakers(jobPayload, userProfile) {
  const dealBreakers = userProfile.preferences.deal_breakers;

  if (dealBreakers.includes("on_site") && jobPayload.workplace_type === "on_site") {
    return true;
  }
  if (dealBreakers.includes("less_than_150k_base") && jobPayload.salary_max < 150000) {
    return true;
  }
  if (dealBreakers.includes("no_equity") && !jobPayload.equity_mentioned) {
    return true;
  }

  return false;
}
SUMMARY TABLE: What Changes, What Stays
Component	Status	Notes
content.js (Job extraction)	UNCHANGED	Reuse LinkedIn/Indeed parsers; just add "Score" button
background.js (Airtable API)	ENHANCED	Add message handler for scoring; call scoring engine
popup.html	MODIFIED	Add "Settings" tab linking to profile setup
popup.js	MODIFIED	Add profile load/save functions
popup.css	MODIFIED	Add styles for score modal, color coding
manifest.json	MODIFIED	Register new HTML files, permissions
NEW: scoring-engine.js	CREATE	Core algorithm
NEW: profile-setup.html	CREATE	User onboarding
NEW: results-dashboard.html	CREATE	Score display
NEW: scoring-schema.json	CREATE	Reference documentation