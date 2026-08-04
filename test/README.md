# test

Automated tests for the CAP POC foundation and approved local behaviour batches.

Run the normal suite with:

```powershell
npm test
```

Run STR-140 local validation with baseline coverage and deterministic reset-repeatability proof with:

```powershell
npm run validate:local
```

`validate:local` runs the full baseline `npm test` suite first, then runs the STR-140-specific integrated validation with `STR140_VALIDATE_LOCAL=1` so the reset-repeatability case runs exactly once and avoids SQLite reset races.
