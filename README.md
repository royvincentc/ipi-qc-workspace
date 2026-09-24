# IPI QC Microbiology Workspace

Private, phone-friendly sample intake, lookup and DOCX report preparation. The development fixture uses invented samples. Live Google Sheets links start blank. Report review, signatures and sample release remain outside the app.

## Run the de-identified demo

1. Install Node.js 22+, Python 3.11+ with `python-docx` and `lxml`, and Microsoft Word on Windows or LibreOffice Writer on Linux.
2. Run `npm install` and `pip install -r worker/requirements.txt`.
3. Copy `.env.example` to `.env`. Set `DEMO_MODE=true`, `PYTHON_PATH` to your Python executable, and `PDF_RENDERER=word` on Windows or `PDF_RENDERER=libreoffice` with `SOFFICE_PATH` on Linux.
4. Run `npm run dev`, then open `http://127.0.0.1:5173`.

The demo stores only invented sample records in `.data/` and `private/`. It cannot reach Google or write an operational logbook. On this workstation, `private/templates/demo-standardized.docx` is a sanitized copy of a recurring two-test layout from `james.zip`; it keeps the form structure while replacing historical values and signatures. It demonstrates the archive format, but is **not an approved blank template for live use**. The original generic fixture is retired from new demo drafts.

## Configure a private deployment

Set `DEMO_MODE=false`, `DATABASE_URL`, `APP_ORIGIN`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_REDIRECT_URI`, `ADMIN_EMAIL`, `PRIVATE_STORAGE`, `PYTHON_PATH`, and the renderer variables through deployment secrets. Never put the service-account JSON or OAuth client secret in frontend code or the Settings screen. Set `GOOGLE_APPLICATION_CREDENTIALS` to a server-only secret file for `sample-logger-backend@gen-lang-client-0151849181.iam.gserviceaccount.com`.

Run `npm run db:migrate`, then `npm run start`. Use HTTPS in production. The admin email is the first allowlisted user; additional people are added in Settings. Keep database and private storage on persistent volumes with backups and restricted filesystem permissions. Only authenticated, allowlisted users can use the API; administrators configure references and access, analysts log samples and prepare reports, and viewers have read access.

In Settings, paste the Incoming, Environmental Monitoring and Specifications shareable links, test each connection, and run synchronization. The app checks monthly section headers and merged boundaries before importing or writing. Reconcile color-only reservations first; use exact `RESERVED` in the category's Remarks cell for held ML numbers. Coordinate direct spreadsheet intake while the app is active. Only then enable writes. A new sample always goes after the last occupied or reserved row in the **current laboratory month**; earlier gaps and previous months stay untouched. Any uncertain write remains pending for administrator reconciliation.

## Build standardized reports

1. In Settings → Report references, inspect a historical DOCX. Confirm product name, exact testing context, test identities, criteria, units, explicit report date and date basis. The applicability spreadsheet decides which tests are required; historical reports provide candidate criteria. A report with an ambiguous date or criterion requires manual resolution.
2. In Settings → Standardized templates, choose an inspected reference and prepare a copy. Download and inspect it in Word. The copy retains form geometry and recurring tables while recognized sample values, actual results and sign-off entries become blank placeholders. Confirm the binding of **every numbered result row** to its test, location, stage and replicate. The original historical file is untouched. Register only after inspecting sanitization, layout and continuous page numbering. A separately supplied blank DOCX can also be registered.
3. In Analysis reports, select the sample and confirm its product, batch and context. Enter actual results manually and save revisions. Review the pinned criteria, results, missing fields and rendered PDF before downloading a DOCX. Generation never changes the source status or releases the sample.

Prepared copies may flag an unrecognized field structure or missing result row. Resolve these against the approved form before registration. Fixed form-control text, including revision details and signature area labels, remains in place. The separate logbook/page reference is editable; document pages use automatic PAGE and NUMPAGES fields.

## Technical notes

- React, TypeScript and Vite UI; Express API; PostgreSQL; Python OOXML worker; Google Sheets/Drive service-account access on the server. Demo uses embedded PGlite.
- Spreadsheet records keep stable internal IDs, source spreadsheet/tab/section/row/range, the original values, fingerprint and location history. Historical duplicate ML numbers remain distinct and visible.
- Report files record source snapshot, specification revision, template revision, result revision and SHA-256 fingerprint. Rendered previews are required before a report file becomes downloadable.
- `npm test`, `npm run test:worker`, and `npm run build` validate the domain rules, template row bindings, DOCX generation and type/build integrity. Live Google integration and visual comparison of every approved report family require deployment credentials and approved references.

Do not use actual company records in the demo or check them into Git. `private/`, `.data/`, and `.env` are ignored.
