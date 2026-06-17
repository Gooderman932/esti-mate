# Data Retention & Deletion Policy

**Owner:** Poor Dude Holdings LLC
**Effective:** 2026-06-17
**Applies to:** this repository's production data stores

## Retention schedule

| Data category | Retention period | Disposition at end of period |
|---------------|------------------|------------------------------|
| Active user accounts | While active | N/A |
| Inactive user accounts | 2 years from last login | Anonymize PII, retain aggregate stats |
| Audit logs | 7 years | Hard-delete |
| Payment records (Stripe/RevenueCat) | 7 years (IRS) | Hard-delete |
| PHI (if applicable, HIPAA) | 6 years minimum from last service date | Hard-delete on lawful request |
| Application content (estimates, plans, listings) | 2 years inactivity | Anonymize then delete |
| Telemetry / request logs | 90 days | Hard-delete |
| Backup snapshots | 30 daily / 12 weekly / 12 monthly | Rolling deletion |
| Temporary uploads | 7 days | Hard-delete |

## Deletion-on-request

Users have the right to request deletion under GDPR Art. 17 and CCPA. We:
1. Verify identity (logged-in session or email-loop verification).
2. Soft-delete within 7 days (account marked deleted, no longer accessible).
3. Hard-delete within 30 days, except records we must retain by law (audit logs, financial records, HIPAA-mandated retention).
4. Issue a deletion confirmation email.

## Automated enforcement

This policy is enforced by scheduled jobs documented in the repo (cron / Edge Functions / GitHub Actions). Manual deletions are logged to the audit table.

## Exceptions

- **Legal hold:** data subject to active litigation or government request is retained until the hold is released.
- **Fraud investigation:** data flagged for fraud may be retained until investigation closes, then disposed of per schedule.
