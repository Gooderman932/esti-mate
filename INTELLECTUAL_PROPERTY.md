# Intellectual Property Register — Esti-Mate

> **Classification:** Proprietary — Tier 1 (High IP) — currently PUBLIC  
> **Last reviewed:** 2026-10-20

This page lists what is owned in this repository, how each item is protected, and what is _not_ owned. It is a navigation record, not legal advice; the controlling terms are in the files listed under **Controlling notices**.

## Summary

| Field                 | Value                                                                                                                             |
| --------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| Owner                 | Poor Dude Holdings LLC                                                                                                            |
| Copyright             | © 2026 Poor Dude Holdings LLC. All rights reserved.                                                                              |
| License               | Proprietary — all rights reserved (see `LICENSE`)                                                                                 |
| SPDX identifier       | `LicenseRef-PDH-Proprietary`                                                                                                      |
| Repository visibility | **Public** — anyone can read this code. Copyright still applies, but trade-secret protection is lost for anything published here. |
| IP tier               | Tier 1 — High IP                                                                                                                  |
| Account-wide registry | `Gooderman932/business_database → ip-registry/IP_REGISTRY.md`                                                                     |
| Contact               | admin@poordudeholdings.com                                                                                                        |

## Controlling notices

- [`LICENSE`](LICENSE) — license terms
- [`NOTICE`](NOTICE) — copyright, third-party, and trademark notices

## Proprietary assets

| Asset                                                      | Location                              | Protection                                 |
| ---------------------------------------------------------- | ------------------------------------- | ------------------------------------------ |
| Pinhole-camera distance measurement and confidence scoring | `frontend/src/utils/pinholeCamera.ts` | Copyright (trade secret lost while public) |
| Perspective area measurement                               | `frontend/src/utils/measurement.ts`   | Copyright                                  |
| Estimate calculations                                      | `frontend/src/utils/calculations.ts`  | Copyright                                  |
| PDF estimate/invoice generator                             | `frontend/src/utils/pdfGenerator.ts`  | Copyright                                  |

Protection key: **Copyright** — the code and text as written. **Trade secret** — only while it stays confidential (private repo, NDAs, access control). **Patent pending** — only while a U.S. application is actually on file. **Trademark** — names used in commerce.

## Trademarks claimed

| Mark        | Status                                     |
| ----------- | ------------------------------------------ |
| Esti-Mate™ | Common-law (unregistered) — use ™, not ® |

## Not owned / excluded

- Open-source dependencies listed in the dependency manifests. They keep their own licenses.
- Third-party names, logos, and APIs referenced in the code (for example payment, hosting, and AI providers). They belong to their owners.
- The underlying math (pinhole-camera model, Shoelace formula) is public-domain; only this implementation is owned.

## Authorship and chain of title

- Human contributions by Matthew P. Goodman (GitHub: Gooderman932) are held by Poor Dude Holdings LLC. A signed founder IP assignment covering all repositories should be on file to make this chain of title provable.
- Some code was generated with AI coding tools (Emergent agent). Under current U.S. Copyright Office guidance, purely AI-generated material is not copyrightable; the human-authored selection, arrangement, editing, and additions are. Trade-secret and contract protection still apply to the whole codebase while it is kept confidential.

## Open compliance actions

- [ ] Make this repository private. It is Tier 1 and public, so its algorithms cannot be claimed as trade secrets.
- [ ] If any patent filing is planned, note that this public code may count as prior disclosure (U.S. 1-year grace period from first publication).
