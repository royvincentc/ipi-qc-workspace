# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

The primary users are QC microbiologists, QC analysts, supervisors, and non-technical laboratory staff working in a laboratory quality-control context. They need to record, find, review, and prepare microbiology sample and report information quickly during operational work.

## Product Purpose

IPI QC Microbiology Operations Dashboard is a private workspace for sample intake, sample lookup, operational review, and DOCX report preparation. It supports the laboratory workflow from logging a sample through reviewing results and preparing a report; report review, signatures, and sample release remain outside the application. Success means staff can complete routine QC information work accurately and quickly while preserving traceability and keeping operational data private.

## Positioning

The product is an operations dashboard for microbiology QC work rather than a marketing or general-purpose SaaS workspace. Its distinctive mechanism is a focused workflow that combines laboratory sample records, spreadsheet-backed references, traceable report preparation, and operational safeguards in one private workspace.

## Operating Context

Users work with laboratory sample records, monthly spreadsheet sections, specifications, historical DOCX references, standardized report templates, actual test results, and rendered report previews. The application may run in a de-identified demo mode or a private authenticated deployment. Administrators configure references and access; analysts log samples and prepare reports; viewers have read access.

## Capabilities and Constraints

- Sample intake, search, lookup, detail review, and report preparation are in scope.
- The application supports Google Sheets/Drive references, report templates, DOCX generation, and rendered previews through server-side services.
- Demo data must remain invented and de-identified; operational records and secrets must not be exposed in frontend code or committed to Git.
- Only authenticated, allowlisted users may use the live API.
- Spreadsheet writes must respect current laboratory-month sections, occupied or reserved rows, and reconciliation of uncertain writes.
- Report generation must not change source sample status or release a sample.
- User roles include administrator, analyst, and viewer.
- Report review, signatures, and sample release remain outside the application.

## Brand Commitments

The product name is IPI QC Microbiology Operations Dashboard. The interface should feel operational rather than marketing-oriented and support dense-but-not-cramped information presentation, fast scanning, strong hierarchy, minimal cards, and a distinctive non-generic-SaaS character. It must support light and dark modes, keyboard accessibility, iOS-level polish, and subtle motion.

## Evidence on Hand

- Existing implementation: React, TypeScript, and Vite UI with an Express API, PostgreSQL support, PGlite demo storage, Python OOXML worker, and Google Sheets/Drive server integrations.
- Existing product documentation: `README.md`, `docs/settings-guide.md`, `docs/overhaul.md`, and `docs/HANDOFF.md`.
- Existing demo and preview assets are under `public/`, `preview/`, and `private/`; demo records are invented.
- No user-provided testimonials, customer claims, performance benchmarks, or approved marketing copy should be fabricated.

## Product Principles

- Optimize for accurate operational completion, not persuasion.
- Make important state and hierarchy immediately scannable.
- Preserve traceability across source records, references, templates, revisions, and generated files.
- Keep sensitive operational data private and make uncertainty visible for reconciliation.
- Support both experienced keyboard-driven work and accessible use by non-technical laboratory staff.

## Accessibility & Inclusion

Keyboard accessibility is a confirmed requirement. The interface should remain usable for non-technical laboratory staff and support both light and dark modes. Additional product-specific accessibility standards remain undecided.
