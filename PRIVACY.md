# Privacy Policy

**Effective date:** 2026-06-17
**Operator:** Poor Dude Holdings LLC (Wyoming), through its operating subsidiaries.

This is a template privacy policy. Customize the highlighted sections (`<<...>>`) for the specific application.

## 1. Data we collect

- **Account data:** name, email, hashed password, account creation timestamp.
- **Application data:** <<list app-specific collected fields>> (e.g., meal preferences, case records, estimates, market-data queries).
- **Payment data:** processed by Stripe / RevenueCat / Google Play / Apple. We never store full card numbers; we store only Stripe customer IDs and last-4 digits where displayed.
- **Telemetry:** request logs, error traces, device identifiers (used for fraud prevention and performance debugging).
- **Sensitive categories** (where applicable): <<PHI, financial, government CUI — listed per app>>.

## 2. Why we collect it

- To deliver the contracted service.
- To comply with applicable laws (cottage-food rules, HIPAA, state AI laws, etc.).
- To prevent fraud and abuse.
- To improve the product (telemetry only, never sold).

## 3. How long we keep it

| Category | Retention |
|----------|-----------|
| Account data | While account is active + 30 days after deletion request |
| Payment records | 7 years (IRS / Stripe requirements) |
| Audit logs | 7 years (regulatory minimum) |
| Application data | <<per-app, default 2 years inactivity>> |
| PHI (if applicable) | 6 years minimum (HIPAA), deleted on lawful request thereafter |
| Telemetry | 90 days |

## 4. Who we share with

- **Payment processors** — Stripe, RevenueCat, Google Play, Apple.
- **Cloud / hosting** — AWS, Vercel, Supabase, Appwrite, Convex, Cloudflare.
- **Communication** — Resend, Twilio (where applicable).
- **AI / ML** — Google Gemini, OpenAI (only where the user opts in and only with redacted inputs).

We do **not** sell personal data to advertisers or data brokers.

## 5. Your rights

- **Access** — request a copy of your data.
- **Deletion** — request account deletion (GDPR Art. 17, CCPA).
- **Correction** — request fixes to inaccurate data.
- **Portability** — export your data in JSON.
- **Opt-out** — unsubscribe from marketing emails at any time (one-click in every email).

Submit requests to **privacy@poordudeholdings.com**. We respond within 30 days (CCPA) / 1 month (GDPR).

## 6. Children

We do not knowingly collect data from anyone under 13 (US) / 16 (EU). Contact us if a minor's data was submitted in error and we will delete it.

## 7. International transfers

Data may be processed in the United States. EU/UK users: we rely on the EU-US Data Privacy Framework / UK Extension and standard contractual clauses where required.

## 8. Security

- TLS 1.2+ in transit
- Encryption at rest for sensitive fields (PHI, financial, credentials)
- Role-based access control
- Quarterly secret rotation
- Audit logging of all sensitive operations
- Annual security reviews

Reports: see `SECURITY.md`.

## 9. Changes

We post the "Effective date" at the top of this document. Material changes are announced via email to active account holders 30 days before they take effect.

## 10. Contact

Poor Dude Holdings LLC
Wyoming, USA
privacy@poordudeholdings.com
