# STR-140 Automated Local Behaviour Validation

## Source And Scope

- Repository root: `C:\VSCode\sap-ai-test\CAP_POC_AI`
- Implementation package path: `C:\VSCode\sap-ai-test\CAP_POC_AI\Implementation files\STR-140-implementation-package-6c4405c.md`
- EH3 source: system EH3, client 300, package `$TMP`
- EH3 baseline: completed STR-126 local MVP implementation

STR-140 adds automated local validation evidence only. It does not change approved behaviour from STR-133 through STR-139.

## Starting Baseline

STR-139 / PR #8 was confirmed merged into `main` before implementation.

Approved baselines reused:

- STR-133 persistence model
- STR-134 deterministic SQLite data and reset
- STR-135 read-only service projections
- STR-136 ErrorRecord infrastructure
- STR-137 validation
- STR-138 Responsibility Determination
- STR-139 lifecycle transitions and StatusHistory

## EH3 Objects Inspected

- `ZCL_EH3SVC_VALIDATOR`
- `ZCL_EH3SVC_RESP_DET`
- `ZCL_EH3SVC_STATUS`
- `ZCL_EH3SVC_ERROR_LOG`
- `ZCL_EH3SVC_RESET`
- `ZCL_EH3SVC_SEED`
- `ZEH3_SVC_BATCH4_TEST`

Inspection confirmed scenario coverage expectations:

- validation produces `VALID` ErrorRecords for negative validation
- responsibility determination returns executing company only and creates `RESP` ErrorRecords for zero or multiple matches
- lifecycle supports `CRT -> RDY`, `CRT -> CAN`, `RDY -> CMP`, and `RDY -> CAN`
- lifecycle creates StatusHistory for successful transitions
- invalid lifecycle and duplicate initial-history evidence uses `STATUS` ErrorRecords
- deterministic reset/seed is part of the local MVP baseline
- allocation, posting, workflow, orchestration, UI, auth, BTP, external integration, and production concerns are absent from local MVP validation scope

## Existing Tests Reused

STR-140 reuses the approved tests already present in `npm test`:

- STR-136 ErrorRecord smoke test
- STR-137 validation tests
- STR-138 Responsibility Determination tests
- STR-139 lifecycle, StatusHistory, terminal-state, invalid-transition, and rollback tests
- reset baseline tests from prior batches

This avoids creating a second comprehensive suite for validation, Responsibility Determination, lifecycle, StatusHistory, and ErrorRecord unit coverage.

## New Integrated Scenarios

Added `test/integrated-local-validation.test.ts` with three STR-140 scenarios:

1. Integrated positive vertical slice is deterministic across reruns.
2. Integrated negative evidence uses `VALID`, `RESP`, and `STATUS` ErrorRecords.
3. Deterministic local reset is stable across two runs.

The reset-repeatability scenario is enabled through `npm run validate:local` and skipped during full `npm test` to avoid concurrent writes to the shared `db.sqlite` reset database while other test files also perform reset checks.

## Integrated Positive Flow

The positive integrated scenario runs twice against fresh deterministic local SQLite deployments and compares normalized results:

```text
prepare order
-> validate order
-> determine responsibility
-> verify executing company C200 is returned
-> verify executing company is not persisted
-> record initial CRT history
-> execute CRT -> RDY
-> execute RDY -> CMP
-> execute CRT -> CAN on a second order
-> read ServiceOrders
-> read StatusHistory
-> read ErrorRecords
-> compare deterministic rerun result
```

Expected evidence:

- validation result is positive
- responsibility determination returns `C200`
- persisted executing company remains `null`
- first order reaches `CMP`
- second order reaches `CAN`
- StatusHistory for first order: `CREATE`, `CRT -> RDY`, `RDY -> CMP`
- StatusHistory for second order: `CRT -> CAN`
- no ErrorRecords are created

## Integrated Negative Evidence Flow

The negative integrated scenario coordinates approved components without duplicating their detailed unit tests:

- negative validation creates `VALID` ErrorRecords `034`, `023`, `025`
- no-match responsibility determination creates `RESP` ErrorRecord `040`
- invalid lifecycle transition creates `STATUS` ErrorRecord `100`
- duplicate initial CRT history creates `STATUS` ErrorRecord `100`
- invalid lifecycle status remains unchanged
- duplicate initial history does not create a second initial history row

ErrorRecord evidence is read through `ServiceOrderService.ErrorRecords`.

StatusHistory evidence is read through `ServiceOrderService.StatusHistory`.

## Deterministic Reset And Rerun Evidence

`npm run validate:local` first runs the full `npm test` baseline suite, then runs `scripts/reset-local.mjs` before STR-140 integrated validation with `STR140_VALIDATE_LOCAL=1`.

The reset-repeatability scenario then runs reset twice and compares row counts:

- SyntheticCompanies: 4
- SyntheticAssets: 7
- ServiceTypes: 4
- ResponsibilityRules: 7
- ServiceOrders: 0
- StatusHistory: 0
- ErrorRecords: 0

## Atomicity And Rollback Evidence

STR-140 reuses the approved STR-139 rollback tests instead of duplicating failure-injection coverage:

- status update failure leaves no status change and no StatusHistory
- StatusHistory insert failure rolls back the status update and leaves no StatusHistory

Those tests continue to pass under `npm test`.

## Commands And Results

Required validation results:

```powershell
npm install
# passed; up to date; 0 vulnerabilities

npm run build
# passed

npm run validate:local
# passed; baseline phase 18 passed, 1 skipped, 0 failed; STR-140 phase 3 passed, 0 failed

npm test
# passed; 18 passed, 1 skipped, 0 failed

npm run reset:local
# passed; reset restored deterministic baseline row counts:
# SyntheticCompanies 4
# SyntheticAssets 7
# ServiceTypes 4
# ResponsibilityRules 7
# ServiceOrders 0
# StatusHistory 0
# ErrorRecords 0

npx cds compile db/schema.cds
# passed

npx cds compile srv/service-order-service.cds
# passed

npx cds compile srv/service-order-service.cds --to edmx
# passed
```

The full `npm test` result includes one skipped STR-140 reset-repeatability case. That case is intentionally enabled only once in the second phase of `npm run validate:local`, where reset runs sequentially against `db.sqlite`; this avoids concurrent reset writes when Node runs all test files in parallel. Because `validate:local` runs `npm test` first, reused STR-136 through STR-139 baseline tests now fail the command before STR-140-specific validation starts.

## Files Changed

- `Implementation files/STR-140-implementation-package-6c4405c.md`
- `scripts/validate-local.mjs`
- `test/integrated-local-validation.test.ts`
- `docs/str-140-automated-local-validation.md`
- `package.json`

## Scope Confirmation

- STR-133 through STR-139 approved behaviour remains unchanged.
- No business behaviour was added.
- No validation logic was reimplemented.
- No Responsibility Determination logic was reimplemented.
- No lifecycle logic was reimplemented or changed.
- Executing company remains returned only and not persisted.
- No reporting framework, JSON report infrastructure, production endpoint, CI/CD, GitHub Actions, UI, auth, BTP, HANA/HDI, external SAP integration, performance/load testing, production monitoring, production hardening, ABAP-to-CAP comparison assessment, STR-141, or STR-142 scope was introduced.
- Enterprise Architecture remains unchanged.
