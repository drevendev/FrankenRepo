# Contributing

Use Node 24 and npm 11. Run npm ci, npm run dev, then open http://127.0.0.1:5173.
Use npm run verify and, after a build, npm run test:e2e before proposing changes.
Chromium can be installed with npx playwright install chromium.

Keep pull requests small and explain the visible behavior, validation and limitations.
Do not include secrets, personal data, raw private source, model weights or paid dependencies.
Add regression coverage for changed security or provider boundaries.
Use real receipts for integration claims; fixtures must be clearly labelled.
Do not publish gallery data without a tested consent and removal mechanism.

Source and releases: https://github.com/drevendev/FrankenRepo.
Check docs/KNOWN_ISSUES.md before starting an existing task. The app has no
verified public deployment; publishing source does not establish hosted readiness.
