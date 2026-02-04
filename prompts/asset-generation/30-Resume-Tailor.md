<!--
==========================================================
FACTUAL DATA LOCK — MATT DIMOCK (AUTHORITATIVE SOURCE)
==========================================================
GENERAL RULES
1. All role titles, locations, and dates are factual and locked.
   Never infer, reword, or upscale titles (e.g., "Head of," "VP," "Director")
   beyond the verified source below.
2. All employment periods are factual to the month and year listed.
3. All outcomes, metrics, and achievements must remain truthful to baseline resume data.
4. Replace all em dashes (—) with commas (,) or vertical bars (|).
5. When uncertain about any data, HALT and request user confirmation. Never assume.
ROLE HISTORY (VERIFIED)
----------------------------------------------------------
Prosper Wireless = Director of Growth & Retention
Location = Remote
Dates = September 2023 to November 2025
AffordableInsuranceQuotes.com = Chief Marketing Officer
Location = Nashville, TN
Dates = June 2020 to December 2021
Breakthrough Academy = Marketing Operations Manager
Location = Vancouver, BC
Dates = August 2019 to June 2021
Bob's Watches = Director of Marketing
Location = Orange County, CA
Dates = January 2017 to December 2018
Get Fractional = Owner
Location = Remote
Dates = October 2022 to Present
Dealer Acceleration Group = Founder & CRO
Location = Remote
Dates = January 2022 to December 2022
SkyfineUSA = Fractional CMO
Location = Remote
Dates = January 2019 to August 2019
Swell Marketing = SEO Director
Location = Remote
Dates = February 2016 to June 2016
iMarket Solutions = SEO Manager
Location = Remote
Dates = May 2013 to January 2016
National Positions = SEO Specialist & Director of Special Projects
Location = Remote
Dates = September 2007 to May 2013
----------------------------------------------------------
EDUCATION
University of Central Florida = B.A. in Business Administration, Marketing
MANDATE
All generated content (assets, briefs, or memos) must adhere 100% to these facts.
Never introduce speculative data, altered role names, or unverified timeframes.
==========================================================
-->

# Tailored Resume Prompt (Job Filter)

> Reference: This prompt follows `Asset-Generation-Template.md` output rules.

## PURPOSE
Produce a JD-aligned, ATS-friendly resume version that increases interview probability for senior Growth / GTM / RevOps roles by mapping requirements → proof points with specific tools, systems, and outcomes.

---

## INPUTS (Required)
- Research Brief (fetched by Job ID)
- Job Description (explicit requirements checklist)
- Matt-Dimock-Professional-Profile (canonical metrics, tools, scope, voice)
- Job-Hunter-OS-Strategic-Guidelines

---

## OUTPUT CONTRACT (HARD)
- Output only resume content (no meta, no rubric, no template rules)
- Length: 1–2 pages equivalent
- Style: concise, executive, ATS-safe (no tables required)
- Must include:
  1) Headline + 2–3 line Summary
  2) Core Competencies (keyword-dense, role-relevant)
  3) Selected Proof Highlights (3–6 bullets)
  4) Experience bullets tailored to JD (only for relevant roles)
  5) Tools/Platforms (only what’s true for Matt)

---

## NON-HALLUCINATION RULES (HARD)
- Do not invent metrics, dates, employers, titles, tools, scope, or outcomes.
- Only use facts from Matt’s profile and the Research Brief.
- If a JD requirement needs proof Matt does not have in the inputs:
  - Include it as a capability statement only if supported by adjacent experience, otherwise omit and flag in the scoring output (outside the resume content, via Job Filter wrapper).

---

## PROCESS (DETERMINISTIC)
### Step 1 — Extract JD Must-Haves
Create an internal checklist:
- Required channels (paid search, paid social, email/SMS, SEO, affiliates, marketplaces, etc.)
- Required tools (GA4, HubSpot, Shopify, SQL, Looker, etc.)
- Required leadership scope (team size, budget ownership)
- Required outcomes (CAC, ROAS, retention, LTV, conversion rate, revenue)

### Step 2 — Map Requirements → Proof
For each must-have:
- Pull the closest matching proof from Matt’s profile (Action → Method → Impact)
- Use the company’s language where accurate (ATS keyword match)

### Step 3 — Write Resume Sections
- Summary: role-aligned, crisp, no fluff
- Competencies: 12–18 keywords/phrases, grouped by theme
- Proof Highlights: 3–6 bullets, strongest outcomes first
- Experience: rewrite bullets to emphasize JD priorities
  - Bullet formula: Action + Method/Tool + Impact (metric if supported)
  - Prefer present-tense systems for current work, past tense for past roles

### Step 4 — Self-Check
- Coverage: does the resume address the top JD must-haves?
- Specificity: are tools/systems named where true?
- Credibility: no vague claims, no invented numbers
- Language: avoid forbidden phrases from global instructions

---

## OUTPUT TEMPLATE (Use exactly; remove brackets in final output)

# MATT DIMOCK
[Location] • [Email] • [LinkedIn] • [Portfolio/Website if provided]

## HEADLINE
[Role-aligned headline with 1–2 specialties + 1 proof anchor]

## SUMMARY
[2–3 lines: what you do, what systems you build, what outcomes you’ve delivered]

## CORE COMPETENCIES
- [Keyword group 1: Acquisition / Performance]
- [Keyword group 2: Lifecycle / Retention]
- [Keyword group 3: RevOps / Systems]
- [Keyword group 4: Analytics / Experimentation]

## PROOF HIGHLIGHTS
- [Action → Method → Impact]
- [Action → Method → Impact]
- [Action → Method → Impact]

## EXPERIENCE
### [Company] — [Title] — [Dates]
- [Action + tool/method + impact]
- [Action + tool/method + impact]
- [Action + tool/method + impact]

### [Company] — [Title] — [Dates]
- [...]

## TOOLS & PLATFORMS
[Comma-separated list, only what’s true]
