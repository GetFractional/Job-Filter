# Job Filter - Data Architecture (Research)

**Version**: 3.0  
**Database**: Airtable  
**Last Updated**: February 3, 2026

---

## DATABASE STRATEGY

### Why Airtable?

Chosen over PostgreSQL because:
- Visual interface (fast manual QA and edits)
- Built-in views, filters, sorting (no SQL required)
- Native automation hooks (easy n8n triggers)
- Record-linking is first-class (Jobs ↔ Research ↔ Assets ↔ Contacts)
- Sufficient for the current operating scale
- Have $1,736 in credits available; on an annual Team plan currently

Trade-offs accepted:
- Airtable is less flexible than a warehouse for complex analytics
- Vendor lock-in risk (mitigated by periodic CSV exports)
- Strong discipline required around field names (schema mismatch breaks automations)

---

## SYSTEM MODEL (END-TO-END)

**Core loop**: Capture Job → Research → Generate Assets → Outreach → Track Outcomes → Monthly Learning

**Relationship map (high level):**

- **Jobs Pipeline** is the primary table (1 record per opportunity).
- **Research Briefs** is 1:1 with Jobs (one brief per job).
- **Generated Assets** is 1:many with Jobs (many assets per job).
- **Contacts** is many:many with Jobs (a job can have multiple contacts; a contact can relate to multiple jobs/companies).
- **Companies** is 1:many with Jobs (company can have multiple job listings).
- **Outreach Log** is 1:many with Contacts (every outreach attempt is logged).
- **Measurement** is 1 record per logged date (automated with goal to leverage for advanced BI).

---

## TABLE SCHEMA

### TABLE 1: Jobs Pipeline (Primary Table)

**Purpose**: Core job records, one row per job opportunity. Created first via job hunting, then linked to Research Briefs and downstream work.

**Fields**

| Field Name | Type | Description | Required | Example |
|---|---|---|---|---|
| **Job Title** | Single line text | Role title (Primary field) | Yes | VP of Growth |
| Company Name | Single line text | Company name | Yes | TechCorp |
| Company Page | Single line text | Company page on the job platform | No | https://linkedin.com/company/techcorp |
| Job URL | Single line text | Original job posting URL | Yes | https://linkedin.com/jobs/... |
| Location | Single line text | Job location | No | San Francisco, CA |
| Workplace Type | Single line text | Remote, hybrid, on-site work | No | Remote |
| Employment Type | Single line text | Type of employment being offered | No | Full-time |
| Salary Min | Number (Currency $) | Minimum salary | No | 180000 |
| Salary Max | Number (Currency $) | Maximum salary | No | 220000 |
| Equity Mentioned | Checkbox | Does posting mention equity? | No | ✓ |
| Bonus Mentioned | Checkbox | Does posting mention bonus? | No | ✓ |
| Benefits | Multiple select | Benefits mentioned in posting | No | Medical insurance, 401k, PTO |
| Source | Single select | Where job was found | Yes | LinkedIn |
| Job Description | Long text | Full job posting text | Yes | [Full text] |
| Status | Single select | Current stage | Yes | Captured |
| Overall Fit Score | Number (Integer) | Overall fit score | No | 85 |
| Preference Fit Score | Number (Integer) | Preference alignment score | No | 90 |
| Role Fit Score | Number (Integer) | Role alignment score | No | 80 |
| Fit Recommendation | Single select | Fit assessment label | No | STRONG FIT |
| Matched Skills | Long text | Skills that match requirements | No | [Bullets] |
| Missing Skills | Long text | Skills gaps identified | No | [Bullets] |
| Triggered Dealbreakers | Long text | Dealbreakers triggered by this role | No | [Bullets] |
| Research Brief | Link to record | Link to Research Briefs table | No | → Research record |
| Generated Assets | Link to records | Links to Generated Assets table | No | → Multiple asset records |
| Application Tracking | Link to records | Links to Application Tracking table (optional/TBD) | No | → Multiple event records |
| Companies | Link to records | Links to Companies table | No | → Company record |
| Contacts | Link to records | Links to Contacts table | No | → Multiple contact records |
| Outreach Log | Link to records | Links to Outreach Log table | No | → Multiple outreach records |
| Applied Date | Date | When application was submitted | No | 2024-12-10 |
| Interview Date | Date | When interview is scheduled | No | 2024-12-15 |
| Offer Date | Date | When offer was received | No | 2024-12-20 |
| Rejected Date | Date | When rejection was received | No | 2024-12-18 |
| First Contact Date | Date | Date of first contact with company | No | 2024-12-05 |
| Requested Salary | Number (Currency $) | Salary requested in application | No | 200000 |
| Job Search Strategies | Single line text | Strategy tags for this job | No | Networking |
| Notes | Long text | Matt's notes | No | Really like this one... |
| Created | Formula (Date) | Auto-populated via `CREATED_TIME()` | Yes | 2024-12-06 10:30 AM |
| Last Modified | Formula (Date) | Auto-populated via `LAST_MODIFIED_TIME()` | Yes | 2024-12-06 2:45 PM |

**Single select options**

- **Source**: LinkedIn, Indeed, Company Website, Dribbble, Glassdoor, Referral  
- **Status**: Captured, Researched, Applied, Interview, Offer, Rejected  
- **Fit Recommendation**: STRONG FIT, GOOD FIT, MODERATE FIT, WEAK FIT, POOR FIT, HARD NO

**Operational notes**
- Airtable assigns an internal record ID to each job (starts with `rec...`). This is the **canonical identifier** for linking Research Briefs, Assets, Contacts, and Outreach.
- Use record IDs for linking, never infer IDs from names.

**Recommended views**
1. **All Jobs**: Sorted by `Created` (newest first)  
2. **Needs Research**: `Status = Captured`  
3. **Ready to Apply**: `Status = Researched`  
4. **In Progress** (Kanban): Group by `Status`  
5. **High Fit**: `Fit Recommendation` in (STRONG FIT, GOOD FIT) OR `Overall Fit Score ≥ 80`  
6. **This Week** (Calendar): By `Applied Date`

---

### TABLE 2: Research Briefs (Linked Records)

**Purpose**: Structured company + role intelligence for each job, with one research brief per job.

**Fields**

| Field Name | Type | Description | Required |
|---|---|---|---|
| research_id | Autonumber | Primary key | Yes |
| job | Link to record | Links to Jobs Pipeline (one-to-one). MUST be an existing Jobs Pipeline record ID (rec...) | Yes |
| job_title | Lookup (from job) | Job title from Jobs Pipeline | No |
| company_name | Lookup (from job) | Company name from Jobs Pipeline | No |
| Contacts (from job) | Lookup (from job) | Contacts linked to the job | No |
| fit_label | Single select | Overall fit label: reject, caution, pursue, Maybe | No |
| fit_score | Number (Integer) | Fit score (0–50) | No |
| fit_summary | Long text | Narrative summary of fit assessment | No |
| reasons_to_pursue | Long text | Bullet list of reasons to pursue | No |
| risks_or_flags | Long text | Bullet list of risks or red flags | No |
| company_summary | Long text | High-level company overview summary | Yes |
| stage | Single line text | Company stage (e.g., Series B, late-stage private, public) | No |
| revenue_range | Single line text | Revenue range or estimate (e.g., "$20–30M ARR") | No |
| funding | Single line text | Recent funding status / investors | No |
| headcount | Single line text | Approximate headcount (e.g., "~250 FTEs") | No |
| products_services | Long text | Key products/services and categories | No |
| revenue_model | Single line text | Revenue model (e.g., SaaS, transactional, marketplace) | No |
| gtm_motion | Long text | Go-to-market motion | No |
| mission | Long text | Company mission statement | No |
| vision | Long text | Company long-term vision | No |
| icp_summary | Long text | Ideal customer profile summary | No |
| reported_cac | Long text | Company-reported CAC | Yes |
| estimated_cac_range | Long text | Estimated CAC range with assumptions | Yes |
| role_summary | Long text | High-level summary of the role | Yes |
| role_requirements | Long text | Bullet list of real requirements | Yes |
| team_structure | Long text | Reporting line and team composition | No |
| success_metrics | Long text | Bullet list of Year 1+ success metrics | No |
| pain_points | Long text | Bullet list of pains this role must solve | No |
| inflection_point | Long text | Why they are hiring now / key inflection point | No |
| market_summary | Long text | High-level market context summary | Yes |
| industry_trends | Long text | Bullet list of key industry trends | No |
| growth_signals | Long text | Bullet list of growth signals | No |
| competitive_threats | Long text | Bullet list of competitive threats | No |
| hiring_manager_intel_summary | Long text | Summary of hiring manager background and decision style | No |
| hiring_manager_name | Single line text | Name of the hiring manager | No |
| hiring_manager_title | Single line text | Title of the hiring manager | No |
| hiring_manager_priority | Single line text | Priority/focus area of the hiring manager | No |
| hiring_manager_decision_gate | Single line text | Decision criteria for the hiring manager | No |
| stakeholder_1_name | Single line text | Name of primary stakeholder | No |
| stakeholder_1_title | Single line text | Title of stakeholder 1 | No |
| stakeholder_1_priority | Long text | Priority/focus area of stakeholder 1 | No |
| stakeholder_1_decision_gate | Long text | Decision criteria for stakeholder 1 | No |
| stakeholder_2_name | Single line text | Name of secondary stakeholder | No |
| stakeholder_2_title | Single line text | Title of stakeholder 2 | No |
| stakeholder_2_priority | Long text | Priority/focus area of stakeholder 2 | No |
| stakeholder_2_decision_gate | Long text | Decision criteria for stakeholder 2 | No |
| stakeholder_3_name | Single line text | Name of tertiary stakeholder | No |
| stakeholder_3_title | Single line text | Title of stakeholder 3 | No |
| stakeholder_3_priority | Long text | Priority/focus area of stakeholder 3 | No |
| stakeholder_3_decision_gate | Long text | Decision criteria for stakeholder 3 | No |
| hiring_priorities | Long text | Aggregated list of all hiring priorities | No |
| strategic_positioning_summary | Long text | Summary of how Matt should position himself | Yes |
| best_angle | Long text | Best angle or narrative for Matt | No |
| proof_points | Long text | Bullet list of Matt's most relevant proof points | No |
| quick_win_opportunities | Long text | Bullet list of 30–90 day quick wins | No |
| risks_to_address | Long text | Bullet list of risks/objections to address | No |
| key_insights | Long text | Bullet list of most important insights | Yes |
| research_sources | Long text | Newline-separated URLs of sources used | No |
| quality_score | Number (Integer) | Research quality score (0–50) | No |
| Best Man Summary | AI text (on-demand) | Auto-generated value proposition summary | No |
| Generated At | Formula (Date) | When research record was created (`CREATED_TIME()`) | Yes |

**Fit label vs Fit recommendation**
- **fit_label** (Research Briefs) is your internal triage: *reject / caution / maybe / pursue*.
- **Fit Recommendation** (Jobs Pipeline) is the “resume-velocity” label: *HARD NO → STRONG FIT*.

Recommended mapping (optional):
- reject → HARD NO / POOR FIT
- caution → WEAK FIT / MODERATE FIT
- Maybe → MODERATE FIT / GOOD FIT
- pursue → GOOD FIT / STRONG FIT

**Recommended views**
1. **All Research**: Sorted by `Generated At`  
2. **High Quality**: `quality_score ≥ 45`  
3. **High Fit**: `fit_label = pursue` and `fit_score ≥ 40`  
4. **By Fit Label**: Group by `fit_label`

---

### TABLE 3: Generated Assets (Linked Records)

**Purpose**: Store links and content for generated documents (annual plan, resume, cover letter, interview prep, outreach).

**Fields**

| Field Name | Type | Description | Required |
|---|---|---|---|
| Asset ID | Autonumber | Primary key | Yes |
| Job | Link to record | Links to Jobs Pipeline | Yes |
| Company Name (from Job) | Lookup (from Job) | Company name from linked job | No |
| Contact First Name | Link to record | Links to Contacts table | No |
| Asset Type | Single select | Type of asset | Yes |
| Google Drive Link | Single line text | Link to file in Drive | Yes |
| Content (Full) | Long text | Final content for the asset | No |
| Quality Score | Number (Integer) | Score from asset rubric (0–50) | No |
| Score Breakdown | Long text | Breakdown of quality score | No |
| Reviewed | Checkbox | Checked when Matt has reviewed and approved | No |
| Needs Revision | Checkbox | Flag for assets needing improvement | No |
| Revision Notes | Long text | Notes on what needs to be changed | No |
| Version Number | Number (Decimal) | Version tag for the asset | No |
| Prompt Used | Long text | Which asset prompt template was used | No |
| Generated At | Formula (Date) | When asset record was created (`CREATED_TIME()`) | Yes |

**Asset Type options**
- Research Brief
- Annual Growth Plan
- Resume
- Cover Letter
- Interview Prep
- Outreach Message
- Image
- Document
- Video
- Presentation
- Spreadsheet
- Resume Tailored
- Strategic Memo

**Recommended views**
1. **All Assets**: Sorted by `Generated At`  
2. **By Asset Type**: Group by `Asset Type`  
3. **Needs Review**: `Reviewed = unchecked`  
4. **High Quality**: `Quality Score ≥ 45`

---

### TABLE 4: Contacts

**Purpose**: Track all people connected to opportunities, including recruiters, hiring managers, stakeholders, and networking allies.

**Fields**

| Field Name | Type | Description | Required |
|---|---|---|---|
| **First Name** | Single line text | Contact's first name (Primary field) | Yes |
| Last Name | Single line text | Contact's last name | No |
| Full Name | Formula | Computed full name (First + Last) | No |
| Role / Title | Single line text | Contact's job title | No |
| Company | Link to record | Links to Jobs Pipeline (job-specific relationship) | No |
| Companies | Link to record | Links to Companies table (company-level relationship) | No |
| Email | Single line text | Contact's email address | No |
| LinkedIn URL | Single line text | Contact's LinkedIn profile URL | No |
| Phone / WhatsApp | Phone number | Contact's phone number | No |
| Contact Type | Single select | Type of contact relationship | No |
| Status | Single select | Current engagement status | No |
| Last Outreach Date | Date | When last outreach was made | No |
| Next Follow-Up Date | Date | When to follow up next | No |
| Follow-Up Interval (Days) | Number (Integer) | Days between follow-ups | No |
| Contacted Via | Multiple select | Channels used to contact | No |
| Relationship Strength | Rating (5 stars) | Strength of relationship | No |
| Introduced By | Single line text | Who made the introduction | No |
| Hiring Influence Level | Single select | Level of hiring influence | No |
| Next Task / Action | Single line text | Next action item for this contact | No |
| Generated Assets | Link to records | Links to Generated Assets | No |
| Outreach Log | Link to records | Links to Outreach Log | No |
| Days Since Last Outreach | Formula (Number) | Calculated days since last contact | No |
| Next Follow-Up Trigger | Formula | Automation trigger for follow-up | No |
| Relationship Age | Formula (Number) | Days since contact was created | No |
| Created Time | Formula (Date) | When contact was created (`CREATED_TIME()`) | Yes |
| Last Modified | Formula (Date) | When contact was last modified (`LAST_MODIFIED_TIME()`) | Yes |

**Contact Type options**
- Recruiter (Agency)
- Recruiter (In-House)
- Executive Search Partner
- Hiring Manager
- Stakeholder / Influencer
- Networking / Ally

**Status options**
- Active Outreach
- Replied
- Scheduled Call
- Inactive / Not Engaged
- Long-Term Relationship
- Do Not Contact

**Contacted Via options**
- LinkedIn DM
- Email
- Phone
- Referral Intro
- Other

**Hiring Influence Level options**
- Decision Maker
- Gatekeeper
- Influencer
- Referrer

---

### TABLE 5: Companies

**Purpose**: Store company-level info separate from individual job listings, so multiple roles at the same company roll up cleanly.

**Fields**

| Field Name | Type | Description | Required |
|---|---|---|---|
| **Company Name** | Single line text | Company name (Primary field) | Yes |
| Website | Single line text | Company website URL | No |
| LinkedIn URL | Single line text | Company LinkedIn page URL | No |
| Industry | Single line text | Company's industry | No |
| Location | Single line text | Company headquarters location | No |
| Size | Single select | Company size by headcount | No |
| Type | Single select | Company type/stage | No |
| Total Employees | Number (Decimal) | Exact employee count | No |
| Growth | Number (Percent) | Employee growth rate | No |
| Median Employee Tenure | Number (Decimal) | Median tenure in years | No |
| Company Description | Long text | Description of the company | No |
| Company Overview (AI) | AI text (on-demand) | AI-generated company overview | No |
| Notes | Long text | Additional notes | No |
| Job Listings | Link to records | Links to Jobs Pipeline | No |
| Contacts | Link to records | Links to Contacts | No |
| Created Time | Formula (Date) | When record was created (`CREATED_TIME()`) | Yes |
| Last Modified Time | Formula (Date) | When record was last modified (`LAST_MODIFIED_TIME()`) | Yes |

**Size options**
- 1-10, 11-50, 51-200, 201-500, 501-1000, 1001-5000, 5001-10000, 10000+

**Type options**
- Startup, SMB, Enterprise, Nonprofit, Agency, Other

---

### TABLE 6: Outreach Log

**Purpose**: Track all outreach activities, including messages sent, replies received, and status.

**Fields**

| Field Name | Type | Description | Required |
|---|---|---|---|
| Outreach ID | Autonumber | Primary key | Yes |
| Contact | Link to record | Links to Contacts table | Yes |
| Company | Link to record | Links to Jobs Pipeline (job context) | No |
| First Name | Lookup (from Contact) | Contact's first name | No |
| Role / Title | Lookup (from Contact) | Contact's job title | No |
| Email | Lookup (from Contact) | Contact's email | No |
| LinkedIn URL | Lookup (from Contact) | Contact's LinkedIn URL | No |
| Phone / WhatsApp | Lookup (from Contact) | Contact's phone number | No |
| Last Outreach Date | Lookup (from Contact) | Last outreach date from contact record | No |
| Outreach Channel | Single select | Channel used for outreach | No |
| Outreach Status | Single select | Current status of outreach | No |
| Outreach Message | Long text | Content of the outreach message | No |
| Sent Date | Date | When message was sent | No |
| Response Date | Date | When response was received | No |
| Response | Long text | Content of the response | No |
| Make First Contact | Button | Opens LinkedIn URL with record ID params | No |
| Created Time | Formula (Date) | When record was created (`CREATED_TIME()`) | Yes |
| Last Modified | Formula (Date) | When record was last modified (`LAST_MODIFIED_TIME()`) | Yes |

**Outreach Channel options**
- LinkedIn
- Email

**Outreach Status options**
- Drafted
- Sent
- Replied

---

### TABLE 7: Measurement

**Purpose**: Track job search performance metrics and learnings on a daily basis to use for advanced BI.

**Fields**

| Field Name | Type | Description | Required |
|---|---|---|---|
| **Date** | Date | Date logged (Primary field) | Yes |
| Week | Single line text | Week | Yes |
| Month | Single line text | Month name | Yes |
| Year | Number (Integer) | Year | Yes |
| Applications Sent | Number (Integer) | Total applications submitted | No |
| Responses Received | Number (Integer) | Total responses received | No |
| Response Rate | Number (Percent) | Response rate (0–100%) | No |
| Phone Screens | Number (Integer) | Number of phone screens | No |
| Interviews | Number (Integer) | Number of interviews | No |
| Offers | Number (Integer) | Number of offers received | No |
| Avg Days to Response | Number (Integer) | Avg days to response | No |
| Avg Quality Score | Number (Integer) | Avg quality score of applications | No |
| Application to Response Rate | Number (Percent) | Conversion: application → response | No |
| Response to Interview Rate | Number (Percent) | Conversion: response → interview | No |
| Interview to Offer Rate | Number (Percent) | Conversion: interview → offer | No |
| Lessons Learned | Long text | Key learnings from the month | No |

---

## RESEARCH JSON CONTRACT (FOR AI AGENTS)

The Research Briefs table is populated from a **Research JSON** object produced by a research agent (Perplexity/custom GPT/n8n) and mapped into Airtable fields.

### CRITICAL: Linking uses Airtable record IDs (`rec...`)

The single source of truth for linking a Research Brief to a Job is the **Airtable record ID** of the job in the Jobs Pipeline table.

- Appears in Airtable record URL as the `rec...` segment
- The `job` link field in Research Briefs must receive this value in an array:
  - `"job": ["recXXXXXXXXXXXXXX"]`

### Recommended Research JSON shape (v3)

```json
{
  "jobMeta": {
    "job_id": "recXXXXXXXXXXXXXX",
    "job_title": "VP of Growth",
    "company_name": "TechCorp",
    "company_page": "https://linkedin.com/company/techcorp",
    "job_url": "https://linkedin.com/jobs/...",
    "source": "LinkedIn",
    "location": "Remote",
    "workplace_type": "Remote",
    "employment_type": "Full-time",
    "salary_min": 180000,
    "salary_max": 220000,
    "equity_mentioned": true,
    "bonus_mentioned": false,
    "benefits": ["Medical insurance", "401k", "PTO"]
  },
  "fitAssessment": {
    "fit_label": "pursue",
    "fit_score": 47,
    "fit_summary": "…",
    "reasons_to_pursue": ["…"],
    "risks_or_flags": ["…"]
  },
  "researchBrief": {
    "company_overview": {
      "company_summary": "…",
      "stage": "Series B",
      "revenue_range": "$20–30M ARR",
      "funding": "…",
      "headcount": "…",
      "products_services": "…",
      "revenue_model": "SaaS",
      "gtm_motion": "…",
      "mission": "…",
      "vision": "…",
      "icp_summary": "…",
      "reported_cac": "…",
      "estimated_cac_range": "…"
    },
    "role_analysis": {
      "role_summary": "…",
      "role_requirements": ["…"],
      "team_structure": "…",
      "success_metrics": ["…"],
      "pain_points": ["…"],
      "inflection_point": "…"
    },
    "market_context": {
      "market_summary": "…",
      "industry_trends": ["…"],
      "growth_signals": ["…"],
      "competitive_threats": ["…"]
    },
    "hiring_manager_intel": {
      "hiring_manager_intel_summary": "…",
      "hiring_manager_name": "…",
      "hiring_manager_title": "…",
      "hiring_manager_priority": "…",
      "hiring_manager_decision_gate": "…",
      "stakeholders": [
        {
          "stakeholder_name": "…",
          "stakeholder_title": "…",
          "stakeholder_priority": "…",
          "stakeholder_decision_gate": "…"
        }
      ],
      "hiring_priorities": ["…"]
    },
    "strategic_positioning_for_matt": {
      "strategic_positioning_summary": "…",
      "best_angle": "…",
      "proof_points": ["…"],
      "quick_win_opportunities": ["…"],
      "risks_to_address": ["…"]
    },
    "key_insights": ["…"],
    "research_sources": ["https://…"],
    "quality_score": 45
  }
}
```

### Field mapping: Research JSON → Research Briefs

- `jobMeta.job_id` → `job` (link field, array containing a job `rec...` ID)
- `jobMeta.job_title` → `job_title` (lookup, read-only)
- `jobMeta.company_name` → `company_name` (lookup, read-only)
- `fitAssessment.fit_label` → `fit_label`
- `fitAssessment.fit_score` → `fit_score`
- `fitAssessment.fit_summary` → `fit_summary`
- `fitAssessment.reasons_to_pursue[]` → `reasons_to_pursue` (bullet-separated text)
- `fitAssessment.risks_or_flags[]` → `risks_or_flags` (bullet-separated text)
- `researchBrief.company_overview.company_summary` → `company_summary`
- `researchBrief.company_overview.stage` → `stage`
- `researchBrief.company_overview.revenue_range` → `revenue_range`
- `researchBrief.company_overview.funding` → `funding`
- `researchBrief.company_overview.headcount` → `headcount`
- `researchBrief.company_overview.products_services` → `products_services`
- `researchBrief.company_overview.revenue_model` → `revenue_model`
- `researchBrief.company_overview.gtm_motion` → `gtm_motion`
- `researchBrief.company_overview.mission` → `mission`
- `researchBrief.company_overview.vision` → `vision`
- `researchBrief.company_overview.icp_summary` → `icp_summary`
- `researchBrief.company_overview.reported_cac` → `reported_cac`
- `researchBrief.company_overview.estimated_cac_range` → `estimated_cac_range`
- `researchBrief.role_analysis.role_summary` → `role_summary`
- `researchBrief.role_analysis.role_requirements[]` → `role_requirements` (bullet-separated)
- `researchBrief.role_analysis.team_structure` → `team_structure`
- `researchBrief.role_analysis.success_metrics[]` → `success_metrics` (bullet-separated)
- `researchBrief.role_analysis.pain_points[]` → `pain_points` (bullet-separated)
- `researchBrief.role_analysis.inflection_point` → `inflection_point`
- `researchBrief.market_context.market_summary` → `market_summary`
- `researchBrief.market_context.industry_trends[]` → `industry_trends` (bullet-separated)
- `researchBrief.market_context.growth_signals[]` → `growth_signals` (bullet-separated)
- `researchBrief.market_context.competitive_threats[]` → `competitive_threats` (bullet-separated)
- `researchBrief.hiring_manager_intel.hiring_manager_intel_summary` → `hiring_manager_intel_summary`
- `researchBrief.hiring_manager_intel.hiring_manager_name` → `hiring_manager_name`
- `researchBrief.hiring_manager_intel.hiring_manager_title` → `hiring_manager_title`
- `researchBrief.hiring_manager_intel.hiring_manager_priority` → `hiring_manager_priority`
- `researchBrief.hiring_manager_intel.hiring_manager_decision_gate` → `hiring_manager_decision_gate`
- `researchBrief.hiring_manager_intel.stakeholders[0]` → stakeholder_1_* fields
- `researchBrief.hiring_manager_intel.stakeholders[1]` → stakeholder_2_* fields
- `researchBrief.hiring_manager_intel.stakeholders[2]` → stakeholder_3_* fields
- `researchBrief.hiring_manager_intel.hiring_priorities[]` → `hiring_priorities` (bullet-separated)
- `researchBrief.strategic_positioning_for_matt.*` → strategic positioning fields
- `researchBrief.key_insights[]` → `key_insights` (bullet-separated)
- `researchBrief.research_sources[]` → `research_sources` (newline-separated URLs)
- `researchBrief.quality_score` → `quality_score`

### Optional propagation: Research → Jobs Pipeline

To reduce context switching, it can be valuable to write a small subset of research outputs back to the job record:
- `fitAssessment.fit_label` → Jobs Pipeline `Status` remains manual (do not overwrite)
- `fitAssessment.fit_score` → Jobs Pipeline `Overall Fit Score` (optional: store `fit_score * 2` if Jobs uses 0–100)
- `Fit Recommendation` can be derived from Overall Fit Score using a simple mapping (e.g., ≥85 STRONG FIT, ≥75 GOOD FIT, etc.)

---

## INTEGRATION POINTS

### Data flow

1. **Capture**
   - Create a Job record in Jobs Pipeline.
   - (Optional) Create/attach Company record in Companies.
   - (Optional) Create/attach early Contacts (recruiter, hiring manager) if known.

2. **Research**
   - Provide the Airtable Job record ID (`rec...`) + job description to the research agent.
   - Create a Research Brief linked to the Job (`job` field = `["rec..."]`).

3. **Asset generation**
   - Fetch context via the job record ID.
   - Generate assets and create Generated Assets records linked to the Job.
   - If an asset is meant for a specific contact (outreach message), link `Contact First Name`.

4. **Outreach + follow-up**
   - Log outreach attempts in Outreach Log linked to the Contact (and optionally the Job).
   - Update Contact: `Last Outreach Date`, `Next Follow-Up Date`, and `Status`.

5. **Outcome tracking**
   - Update Jobs Pipeline dates (Applied/Interview/Offer/Rejected) as reality changes.

6. **Monthly learning**
   - Update Monthly Analytics with rollups and lessons.

### Guardrails (prevents schema breakage)

- Never send Airtable fields that do not exist (example: **no “Asset Title” field** in Generated Assets).
- Link fields must always be arrays of Airtable record IDs (e.g., `"job": ["rec..."]`).
- Lookup + formula fields are read-only. Do not attempt to write to them.

---

## SCALING & MAINTENANCE

- **Backups**: Export Research Briefs + Generated Assets + Outreach Log monthly (CSV) and store in Drive.
- **Schema change rule**: Any Airtable field rename must be mirrored in:
  - Custom GPT action schemas (OpenAPI)
  - n8n mapping nodes
  - This document
- **Upgrade trigger**: Upgrade when record count approaches 70–80% of plan limit, or when multi-base separation becomes necessary.

