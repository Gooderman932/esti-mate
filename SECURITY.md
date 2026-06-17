# Security Policy

## Reporting a Vulnerability

If you discover a security vulnerability, please **do not** open a public GitHub issue. Instead, report it privately:

1. Use [GitHub Private Security Advisories](https://github.com/Gooderman932/esti-mate/security/advisories/new), **or**
2. Email **security@poordudeholdings.com** with subject line `[SECURITY] esti-mate — <summary>`.

Include:
- A description of the issue and its potential impact
- Steps to reproduce (proof-of-concept code is welcome)
- Any suggested mitigations
- Your contact info for follow-up

## Response SLA

- **Acknowledgement:** within 48 hours
- **Initial assessment + severity rating:** within 7 days
- **Fix or mitigation timeline:** communicated within 14 days, scoped to severity

## Supported Versions

The `main` branch is the only supported version. Backports to tagged releases are evaluated case-by-case.

## Scope

In scope:
- Authentication / authorization flaws
- Data exposure (PII, PHI, payment data, credentials)
- Injection vulnerabilities (SQL, command, XSS)
- Insecure direct object references
- Cryptographic weaknesses
- Dependency vulnerabilities not yet patched upstream

Out of scope:
- Denial-of-service via volumetric attack
- Social engineering of project maintainers
- Physical attacks
- Vulnerabilities in unsupported third-party dependencies (report upstream)

## Disclosure Policy

We follow **coordinated disclosure**. Reporters who follow this policy in good faith will be credited (with permission) in the release notes that contain the fix.

## Compliance Context

This repository is part of the Poor Dude Holdings LLC (Wyoming) IP portfolio. Sensitive operations are subject to the company's data-handling, audit-logging, and trade-secret protection policies. Reports involving regulated data (HIPAA PHI, PCI cardholder data, FedRAMP CUI) are escalated immediately.

---
Last updated: 2026-06-17
