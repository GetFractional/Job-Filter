# Airtable Audit + Migration Checklist

**Purpose**: Keep Airtable as the canonical schema (SSOT) and prevent field drift.

## 1) Export Schema + CSV Backup (Required)

Run the export script before any schema changes:

```bash
AIRTABLE_BASE_ID=appXXXX AIRTABLE_API_KEY=patXXXX \
  python3 scripts/airtable/export_base.py --output backups/airtable
```

Outputs:
- `backups/airtable/<timestamp>/schema.json`
- `backups/airtable/<timestamp>/tables/*.json`
- `backups/airtable/<timestamp>/tables/*.csv`

## 2) Schema Diff (Latest Backup)

**SSOT reference**: `docs/Data-Architecture.md`

Backup used: `backups/airtable/20260204_045916/schema.json`

| Table | Field | Status | Notes |
| --- | --- | --- | --- |
| Jobs Pipeline | lane | Missing | Add Single Select |
| Jobs Pipeline | last_touch_date | Missing | Add Date |
| Jobs Pipeline | next_followup_date | Missing | Add Date |
| Jobs Pipeline | stale_status | Missing | Add Single Select or Formula |
| Jobs Pipeline | rejection_reason | Missing | Add Single Select |
| Jobs Pipeline | rejection_reason_other | Missing | Add Long Text |
| Application Tracking | (table) | Missing | Create table before adding event fields |
| Rejection Insights | (table) | Missing | Add table + fields |

**Drift notes (present in base, not in SSOT):**
- Jobs Pipeline: `Requested Salary`, `Job Search Strategies`, `First Contact Date`, `Offer Date`, `Rejected Date`

## 3) Migration Plan (Non-Destructive)

1. Add new fields to Jobs Pipeline:
   - `lane` (Single Select: fast_apply, full_court_press)
   - `last_touch_date` (Date)
   - `next_followup_date` (Date)
   - `stale_status` (Single Select: fresh, stale)
   - `rejection_reason` (Single Select; see Data-Architecture)
   - `rejection_reason_other` (Long Text)
2. Extend Application Tracking with event metadata fields.
3. Create `Rejection Insights` table (see Data-Architecture).

## 4) Validation

- Create a test job via extension.
- Confirm Job fields are populated (when feature flags are enabled).
- Confirm Application Tracking event rows are created.
- Confirm no 422 errors in background logs.
