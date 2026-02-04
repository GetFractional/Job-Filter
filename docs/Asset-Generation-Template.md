# Asset Generation Template (Common Structure)

## PURPOSE
This file defines the common structure used across all asset-generation prompts (Research, Annual Plan, Resume, Cover Letter, Interview Prep, Outreach). Each asset prompt should reference this file to reduce redundancy and improve consistency.

---

## UNIVERSAL OUTPUT RULES (HARD)
1) **Final output must contain ONLY the finished asset.**
   - Never include: PURPOSE, PRINCIPLES, RULES, CHECKLISTS, RUBRICS, or “how I’m thinking”.
2) **Zero bracket placeholders.**
   - No `[COMPANY]`, `[ROLE]`, `[INSERT]`, etc in final outputs.
3) **No research hallucination.**
   - If a claim needs specific numbers or facts not present in the Research Brief or JD, you must either:
     - Omit the number, OR
     - Call it out as “validate baseline”, OR
     - Use a directional statement ONLY if supported by the Research Brief.

---

## UNIVERSAL STRUCTURE (PROMPT-SIDE)
Every asset-generation prompt should include these sections:

### 1) PURPOSE
What this asset exists to achieve (one paragraph).

### 2) INPUTS
List the required inputs:
- Research Brief (fetched by Job ID)
- Job Description (explicit requirements checklist)
- Matt’s profile / proof points file(s)
- Any asset-specific guidelines

### 3) OUTPUT CONTRACT (HARD)
Define:
- Format (memo, letter, bullets)
- Max length
- Required sections/headings
- Non-negotiables

### 4) PROCESS (DETERMINISTIC)
A step-by-step procedure including:
- Extract JD “must have” requirements
- Pull relevant proof points
- Draft
- Self-check against required sections
- Self-check JD coverage
- Only then finalize

### 5) SCORING (INTERNAL)
Define how it will be scored, but do not output the rubric in the final asset.

---

## VOICE & STYLE (GLOBAL)
**Voice**
- Systems architect + operator, executive-facing
- Action → Method → Impact
- Quantify when supported by Matt’s profile or Research Brief
- Clear, direct, no fluff

**Forbidden words / phrases**
- passionate
- excited
- synergy
- responsible for
- helped with
- leverage (verb)
- best practices
- hoping to
- looking forward to
- drive growth (generic)
- significant impact (unquantified)

---

## COMMON FAILURE MODES (ANTI-PATTERNS)
- **Template Showing**: obvious structure leakage, brackets left in
- **Ignoring JD**: missing “must have” requirements
- **Inventing numbers**: CAC/ROAS/AOV/payback not sourced
- **Over-length**: ignores output contract and word limits