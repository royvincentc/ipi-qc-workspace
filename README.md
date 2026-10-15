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
3. In Analysis reports, select the sample and confirm its product, batch and context. Enter actual results manually and save revisions. Generate the DOCX, then open Preview in a new browser tab to review its PDF. Download the original DOCX independently for external review and editing. Generation never changes the source status or releases the sample.

Prepared copies may flag an unrecognized field structure or missing result row. Resolve these against the approved form before registration. Fixed form-control text, including revision details and signature area labels, remains in place. The separate logbook/page reference is editable; document pages use automatic PAGE and NUMPAGES fields.

Previews use the authenticated app and the configured local Word or LibreOffice renderer; report bytes are never sent to a public document viewer. The first preview may take longer while its PDF is created. If rendering is unavailable, the preview tab explains the problem and the original DOCX remains downloadable. Drive library documents continue to open in Drive using native permissions.

## Smart Assistant

Miss Minutes is read-only. It can search saved sample snapshots and audit summaries for signed-in workspace users, including viewers. It cannot refresh Google Sheets, change laboratory records, generate reports, execute code or send messages. Refresh sources from Samples & history when current Google Sheets data is needed. Answers identify saved source data and its last successful refresh.

Retrieved fields and audit text are marked as untrusted evidence, with bounded field lengths and result sizes. Embedded instructions must not control the assistant. Answers render text and limited formatting; external links, images and raw HTML remain inert. These controls reduce the impact of prompt injection but do not guarantee the accuracy of every AI answer.

Default allowances per person are 30 questions, 30 generated conversation titles and 200,000 input/output tokens per UTC hour. These are initial workspace defaults, not a universal industry allowance. Override them with `AI_CHAT_REQUESTS_PER_HOUR`, `AI_TITLE_REQUESTS_PER_HOUR` and `AI_TOKENS_PER_HOUR`. PostgreSQL reserves usage atomically across tabs, restarts and server copies. Allowances reset at the next UTC hour; a rejected request returns HTTP 429 and `Retry-After`. Token reservations use a preflight count and are adjusted using reported usage; uncertain failures keep their reservation because an upstream request may still be billed.

Each question is also bounded to 32,000 history characters, 50,000 processing tokens, five tool rounds and eight tool calls. Each model response allows at most 2,048 output tokens; titles allow 256. Responses include at most 12,000 characters of records per tool and 32,000 across the question. Automatic upstream retries are disabled, model calls time out after 45 seconds (30 for titles), and the chat has a two-minute cancellation deadline. Google project/model quotas still apply independently. App token allowances limit usage rather than guaranteeing a fixed currency spend.

## Technical notes

- React, TypeScript and Vite UI; Express API; PostgreSQL; Python OOXML worker; Google Sheets/Drive service-account access on the server. Demo uses embedded PGlite.
- Spreadsheet records keep stable internal IDs, source spreadsheet/tab/section/row/range, the original values, fingerprint and location history. Historical duplicate ML numbers remain distinct and visible.
- Report files record source snapshot, specification revision, template revision, result revision and SHA-256 fingerprint. PDF previews are created on demand; original DOCX downloads do not depend on rendering.
- `npm test`, `npm run test:worker`, and `npm run build` validate the domain rules, template row bindings, DOCX generation and type/build integrity. Live Google integration and visual comparison of every approved report family require deployment credentials and approved references.

Do not use actual company records in the demo or check them into Git. `private/`, `.data/`, and `.env` are ignored.
