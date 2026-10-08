# Result entry and automated remarks verification

Implemented the fixed `Nmt 10` result qualifier independently of the pinned standard specification for SFG, FG, ST, and MIS, retaining the parameter unit. Actual numeric values below an Nmt standard suggest Passed; equality and greater values suggest Failed, as explicitly requested. Manual analyst choices remain authoritative until the observation changes. Blank or invalid values have no suggested outcome.

Overall remarks derive from the final analyst choices, remain empty for incomplete outcomes, and list all failed parameters. Both overall report token aliases are populated during generation. PASSED is bold and underlined in the UI and OOXML output.

Validation: 66 relevant TypeScript tests, 26 Python worker tests, TypeScript compilation, and Vite production build. Playwright exercised native entry/qualifier radios, the 49/50 boundary against the demo standard of 50, a manual Passed override, incomplete results, failure labels, and arrow-key selection. Unit tests separately cover the requested 99/100 boundary against 100.

Impeccable audit: existing radio controls and theme tokens remain coherent; detector found zero anti-patterns in the changed surfaces. Existing stylesheet advisory findings were outside this change. Browser inspection identified a higher-specificity responsive grid rule; corrected in the final CSS. Verified 1440px and 390px CSS viewports with no horizontal overflow, single-column mobile results, and 44px result-toggle targets. Desktop/mobile screenshots are in output/playwright/result-toggles-*.png. Browser verification used the de-identified local demo; live integrations were not exercised.
