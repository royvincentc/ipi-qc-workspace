# Analyst remarks and environmental SPC/MY verification

8 October 2026. Scope: shared report result controls, environmental SPC/MY limit recognition.

- Environmental SPC and MY recognize the pinned long-form “Not more than” criterion as well as Nmt. Fixed-limit entry and Actual Result use the existing product controls, validation and display formatter. No product default replaces an environmental limit. Accupoint retains its measured-value controls.
- All report result types share the new Passed/Failed control. Empty remarks remain unselected. Native radios provide accessible names, mutual exclusion, Tab and arrow-key navigation; viewer controls are disabled.
- Passed uses the existing success token; Failed uses the critical token, with explicit words and check/cross vectors. A 180 ms selection slide and vector feedback acknowledge user choice. Reduced motion removes spatial/icon animation and retains color feedback. There is no continuous animation or added dependency.
- Playwright exercised the user's existing environmental draft in a separate tab. SPC retained 100 cfu/mL; MY retained 30 cfu/mL. Actual zero, fixed-limit selection, Not tested, Passed click, and arrow-key Failed selection worked. Other locations remained independent. Test edits were never saved.
- Inspected light/mobile and dark/desktop captures. Settled 391 px and 1440 px layouts had no document overflow. The audit found 40 px option targets; increased them to 44 px before completion. Selection colors use the existing theme-specific semantic palette and background ink. No significant outstanding scope findings.
- TypeScript compilation and 37 domain regression tests passed. The Impeccable detector reported no findings for the two report components. The audit also inspected semantics, state, theming, responsive layout and bounded motion directly.

Screenshots are review artifacts under output/environmental-automation-review/analyst-toggle-*.png. Google source rows, current laboratory results and report revisions were not modified by verification.
