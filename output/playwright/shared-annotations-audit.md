# Annotation follow-up audit

Scope: direct sticky-body editing, existing sidebar settings, full-header dragging, bounded note feedback and canvas-only fullscreen. Incumbent IPI design files preserved. Chrome 154, 1440×1000, 390×844, and the annotated 985×600 viewport. Demonstration fixtures are synthetic and isolated from production.

| Before | After |
| --- | --- |
| Card body opened a separate editor. | Card body is an editable textarea using the same Yjs update hook as the sidebar. Focus remains on the card while settings are open. |
| Only the small dots activated dragging. | The title/header region activates pointer or keyboard dragging; a separate settings button opens the sidebar. |
| Drop and edit completion had little feedback. | Lifted drag preview, 180ms drop motion, 220ms settling after confirmed placement and local save acknowledgement. Remote text updates do not trigger local save animation. |
| Dark-theme title/metadata could inherit pale ink. | Sticky headings, body and metadata explicitly use the note's contrasting ink. |
| Drawing remained inside the application shell. | Fullscreen occupies the window's canvas viewport with Exit fullscreen and Escape; background controls become inert, focus stays in the canvas and returns to the trigger on exit. |

| Dimension | Score | Evidence / limits |
| --- | --- | --- |
| Accessibility | 3/4 | Viewer fields read-only, keyboard header movement, fullscreen focus restoration/inert background, reduced-motion save verified. Physical touch and full screen-reader audit remain open. |
| Performance | 3/4 | Offscreen notes remain windowed. Stable measured refs and cached content reduce React work during drag. Stress fixture still has isolated long tasks. |
| Responsive | 3/4 | Desktop/mobile fullscreen bounds match viewport. 985px inline field retains focus with sidebar visible and no document overflow. |
| Theming | 3/4 | Existing surface tokens and explicit scoped sticky ink preserved. Dark captures inspected. |
| Integrity | 4/4 | One-time detector returned no findings; existing controls, icons, roles and collaboration logic reused. |
| Total | 16/20 | Good at tested scope. |

Verified with browser interaction: card→sidebar and sidebar→card text synchronization, sidebar color save, dragging from the middle of the header, keyboard column movement, fullscreen button and Escape exits, focus restoration, background inert state and reduced-motion save feedback. Viewer UI uses a mocked session and disabled event stream; server viewer enforcement is covered by the unchanged actual-handler tests. Seven focused collaboration tests pass. Production build passes with the existing upstream lazy-chunk size warning.

Performance: 240-note fixture, 24 mounted cards, warmup after navigation/resizing. Desktop frame p95 approximately 20ms after caching, compared with approximately 82ms in the preceding run; isolated long tasks reached approximately 258ms. Mobile horizontal board navigation at 4× CPU had frame p95 approximately 50ms and no recorded long tasks. These development-build samples are not a physical-device or universal 60fps guarantee. The CPU trace identified repeated development-mode React element creation; immutable card content is now cached during movement.

Evidence: shared-annotations-results.log, shared-annotations-final-results.log, shared-annotations-smoke-results.log, shared-annotations-performance-results.log, shared-drag-profile-results.log, shared-annotations-detector.json; captures under .impeccable/review/annotations-*.png. Remaining limits: physical touch hardware, prolonged concurrent edits and production-mode performance profiling. Existing Drive and largest-drawing release checks remain as previously documented.
