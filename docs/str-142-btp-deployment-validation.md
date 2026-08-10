# STR-142 BTP Deployment Validation

## 1. Scope

- Repository root: `C:\VSCode\sap-ai-test\CAP_POC_AI`
- Branch: `str-142-btp-deployment-validation`
- Starting baseline: `main` contained STR-141 / PR #11 commit `ecbdc2b90913393c8cbad01c3d42e327ba702bd6`
- Continuation commit before new STR-142 deployment changes: `7e5504a5be62be5a195e4b4dbf0317a3e7b28607`
- Implementation package: `Implementation files/STR-142-implementation-package.md`
- Objective: deploy the approved CAP POC to SAP BTP Cloud Foundry with SAP HANA Cloud / HDI-backed persistence and validate read-only runtime access.
- Scope decision: deployment validation only. No CAP business behaviour, CDS business model, persistence semantics, service boundary, validation, responsibility determination, lifecycle, StatusHistory, ErrorRecord, or executing-company semantics were changed.

## 2. Baseline Evidence

The approved STR-133 through STR-141 implementation was inspected before deployment configuration work.

Inspected baseline files:

- `package.json`
- `db/schema.cds`
- `srv/service-order-service.cds`
- `src/error-records/error-records.ts`
- `src/validation/service-order-validation.ts`
- `src/responsibility/responsibility-determination.ts`
- `src/lifecycle/lifecycle-status.ts`
- `scripts/reset-local.mjs`
- `scripts/validate-local.mjs`
- `db/data/*`
- `test/*`
- `docs/str-133*` through `docs/str-141*`

Pre-change local validation:

| Command | Result |
| --- | --- |
| `npm install` | Passed. Packages were up to date; 0 vulnerabilities. |
| `npm run build` | Passed. `tsc --noEmit` completed successfully. |
| `npm test` | First run hit transient existing SQLite `database is locked` reset contention; immediate rerun passed with 19 tests, 18 passed, 0 failed, 1 skipped. No deployment files had been changed before this rerun. |
| `npm run validate:local` | Passed. Baseline phase: 19 tests, 18 passed, 0 failed, 1 skipped. STR-140 phase: 3 tests, 3 passed, 0 failed, 0 skipped. |

Deterministic local seed counts:

| Entity | Rows |
| --- | ---: |
| SyntheticCompanies | 4 |
| SyntheticAssets | 7 |
| ServiceTypes | 4 |
| ResponsibilityRules | 7 |
| ServiceOrders | 0 |
| StatusHistory | 0 |
| ErrorRecords | 0 |

## 3. BTP Readiness

Target used:

- Subaccount: `2BM SAP ERP UDV Clean Core`
- API endpoint: `https://api.cf.eu10-004.hana.ondemand.com`
- Org: `2BM A-S_2bm-sap-erp-udv-clean-core-dhkdgq3h`
- Space: `cap-modernization-poc`
- User: `sst@2bm.dk`

Readiness commands and results:

| Check | Result |
| --- | --- |
| `cf target -s cap-modernization-poc` | Targeted org `2BM A-S_2bm-sap-erp-udv-clean-core-dhkdgq3h`, space `cap-modernization-poc`. |
| `cf target` | Confirmed API `https://api.cf.eu10-004.hana.ondemand.com`, API version `3.224.0`, user, org and space. |
| `cf marketplace -e hana` | `hana` service available with `hdi-shared` and `schema` plans. |
| `cf marketplace -e hana-cloud` | `hana-cloud` service available with `hana-td` and `hana-cloud-option` plans. |
| `cf services` | HANA Cloud instance `cap-modernization-poc-hana` exists with service `hana-cloud`, plan `hana-td`, create succeeded. |
| `cf service-access` | `hana/hdi-shared`, `hana/schema`, `hana-cloud/hana-td`, `hana-cloud/hana-cloud-option`, and `hana-cloud-tools/tools` access are available to the org. |
| `cf apps` before deployment | No apps found in the target space. |
| `cf create-service hana hdi-shared cap-poc-ai-db --wait` | HDI service `cap-poc-ai-db` created successfully. |

Tooling:

| Tool | Result |
| --- | --- |
| `mbt --version` | Cloud MTA Build Tool version `1.2.47`. |
| `cf plugins` | `multiapps` plugin version `3.11.1` installed. |

Readiness conclusion:

- HANA Cloud is visible and usable from the target space through the HDI service broker.
- `hdi-shared` is available and the current user can create HDI service instances.
- The previous STR-142 blocker is resolved.

## 4. Deployment Architecture

Implemented deployment architecture:

- One MTA deployment path using `mta.yaml`.
- One Cloud Foundry Node.js module: `cap-poc-ai-srv`.
- One HDI deployer module: `cap-poc-ai-db-deployer`.
- One HDI resource: `cap-poc-ai-db`, service `hana`, plan `hdi-shared`.
- Deployed profile uses HANA through `@cap-js/hana`.
- Local profile remains SQLite through the existing `@cap-js/sqlite` configuration.
- Production authentication for deployed validation is CAP `dummy` auth, documented as POC-only and not a production security architecture.

No CI/CD, UI, external SAP integration, production authorization model, or new business API was introduced.

## 5. Files Changed

- `.gitignore`: ignores generated MTA archives, MTA makefiles, and temporary MTA build folders.
- `mta.yaml`: defines the minimal MTA service module, HDI deployer module, and `hana/hdi-shared` resource.
- `package.json`: adds `@cap-js/hana` and a production-only `db.kind = hana` profile with `auth.kind = dummy`.
- `package-lock.json`: records the HANA adapter dependency tree.
- `docs/str-142-btp-deployment-validation.md`: records deployment evidence and validation.
- `Implementation files/STR-142-implementation-package.md`: authoritative STR-142 package retained for repository traceability.

No production business source files under `src/`, `db/schema.cds`, `srv/`, seed data, tests, or reset scripts were changed.

## 6. Build Evidence

CAP production build:

- Command: `npx cds build --production`
- Result: passed.
- Generated both HANA database deployment output and Node.js service output under `gen/`.
- HANA output included `.hdbtable`, `.hdbview`, CSV, and `.hdbtabledata` artifacts generated from the existing database-neutral CDS model and STR-134 seed files.

MTA build:

- Initial `mbt build` with `npm ci` failed due an npm CLI/cache error.
- The MTA pre-build was changed to avoid dependency installation during `before-all`.
- Initial `npx cds build --production` inside `mbt` tried registry resolution and failed; the command was changed to `node node_modules/@sap/cds-dk/bin/cds.js build --production`.
- Final command: `mbt build`
- Result: passed.
- Generated archive: `mta_archives\cap-poc-ai_0.1.0.mtar`
- Archive size: approximately 9.16 MiB.
- Generated MTAR and build output were not committed.

## 7. Deployment Evidence

Deployment command:

```powershell
cf deploy .\mta_archives\cap-poc-ai_0.1.0.mtar
```

Deployment result:

- First deployment created `cap-poc-ai-srv`, `cap-poc-ai-db-deployer`, and bound both apps to `cap-poc-ai-db`.
- The HDI deployer executed successfully and deployed 31 files to the HDI container.
- The first service app start failed because CAP defaulted to JWT auth in production and `@sap/xssec` was not present.
- Deployment-only fix: configured CAP production auth as `dummy` for POC validation instead of introducing XSUAA/security architecture.
- The failed MTA operation `979320ed-948c-11f1-8b1b-eeee0a8d1ddb` was aborted.
- Redeployment operation `b722da3b-948d-11f1-8b1b-eeee0a8d1ddb` finished successfully.

Final deployment result:

- `cap-poc-ai-srv` started and available at `https://2bm-a-s-2bm-sap-erp-udv-clean-core-dhkdgq3h-cap-moderniz3653036.cfapps.eu10-004.hana.ondemand.com`
- `cap-poc-ai-db-deployer` stopped after successful deployer task execution.
- `cap-poc-ai-db` remains bound to both `cap-poc-ai-srv` and `cap-poc-ai-db-deployer`.

## 8. HANA/HDI Evidence

Service instances:

| Instance | Offering | Plan | Status | Bound apps |
| --- | --- | --- | --- | --- |
| `cap-modernization-poc-hana` | `hana-cloud` | `hana-td` | create succeeded | none |
| `cap-poc-ai-db` | `hana` | `hdi-shared` | create succeeded | `cap-poc-ai-srv`, `cap-poc-ai-db-deployer` |

HDI deployer evidence:

- `@sap/hdi-deploy` version `5.7.0` ran through the generated deployer module.
- Target service: `cap-poc-ai-db`.
- Deployed HANA tables, service views, and deterministic seed tabledata.
- Make result: succeeded with 31 files deployed.
- Inserted reference data:
  - SyntheticCompanies: 4
  - SyntheticAssets: 7
  - ServiceTypes: 4
  - ResponsibilityRules: 7
- Inserted transactional baseline:
  - ServiceOrders: 0
  - StatusHistory: 0
  - ErrorRecords: 0

Application log evidence:

- CAP loaded `srv/csn.json`.
- CAP connected to `db > hana`.
- Credential values were not committed or documented.
- CAP served `ServiceOrderService` at `/service-orders`.

## 9. Runtime Verification

Base endpoint:

```text
https://2bm-a-s-2bm-sap-erp-udv-clean-core-dhkdgq3h-cap-moderniz3653036.cfapps.eu10-004.hana.ondemand.com/service-orders
```

Endpoint checks:

| Endpoint | HTTP status | Count | Result shape |
| --- | ---: | ---: | --- |
| `$metadata` | 200 | n/a | Metadata document |
| `SyntheticCompanies` | 200 | 4 | `canExecute,canRequest,companyId,datasetVersion,name,restricted` |
| `SyntheticAssets` | 200 | 7 | `active,assetId,blocked,datasetVersion,emergencyServiceAllowed,inspectionAllowed,owningCompany_companyId,region,repairAllowed` |
| `ServiceTypes` | 200 | 4 | `active,baseAmount,currency,datasetVersion,description,serviceTypeCode` |
| `ResponsibilityRules` | 200 | 7 | `active,assetRegion,datasetVersion,executingCompany_companyId,priority,requestingCompany_companyId,ruleId,serviceType_serviceTypeCode` |
| `ServiceOrders` | 200 | 0 | Empty value array |
| `StatusHistory` | 200 | 0 | Empty value array |
| `ErrorRecords` | 200 | 0 | Empty value array |

Runtime verification conclusion:

- The deployed CAP service responds.
- OData metadata responds.
- Reference data is readable with expected deterministic STR-134 counts.
- Transactional projections are accessible and empty as expected from the deterministic baseline.
- No executing company is unexpectedly persisted because there are no persisted service-order rows in the deployed baseline.

## 10. Behaviour-Preservation Evidence

Behaviours directly verified on BTP:

- CAP application starts on Cloud Foundry.
- Application is bound to the HDI container.
- Application connects to HANA in the deployed profile.
- HDI deployer creates HANA artifacts from the approved CDS/service model.
- Deterministic reference data is loaded into HANA and readable through STR-135 read-only projections.
- Transactional projections for ServiceOrders, StatusHistory, and ErrorRecords respond and are empty.
- Service metadata is available.

Behaviours preserved through unchanged source and passing local validation:

- STR-133 persistence model and nullable association semantics.
- STR-134 deterministic local SQLite seed/reset.
- STR-135 read-only service projections.
- STR-136 ErrorRecord persistence infrastructure.
- STR-137 validation behaviour.
- STR-138 Responsibility Determination behaviour, including executing company returned only and not persisted.
- STR-139 lifecycle transitions and StatusHistory behaviour.
- STR-140 integrated local validation and reset-repeatability.
- STR-141 ABAP-to-CAP comparison evidence remains unchanged.

Behaviours not exercised remotely:

- Write-based validation, responsibility, lifecycle, ErrorRecord, and StatusHistory scenarios were not executed remotely because STR-135 exposes read-only service projections and STR-142 must not add public write APIs or test-only endpoints.
- Full STR-140 integrated behaviour remains evidenced locally by unchanged code and passing `validate:local`.

## 11. Blockers and Limitations

Resolved blocker:

- Previous HANA/HDI marketplace/service availability blocker is resolved in space `cap-modernization-poc`.

Remaining limitations:

- Remote validation is read-only because the approved public CAP service is read-only.
- No production authentication or authorization architecture was implemented.
- `auth.kind = dummy` is deployment-validation-only and not suitable as production security.
- No external SAP integration, CI/CD, monitoring, production hardening, load testing, or STR-143 work was performed.
- The generated MTAR is local build output and was not committed.

No workaround or CAP business change was introduced.

## 12. Final Validation

Final local validation was run after deployment configuration changes.

| Command | Result |
| --- | --- |
| `npm install` | Passed. 263 packages audited; 0 vulnerabilities. |
| `npm run build` | Passed. |
| `npm test` | Passed. 19 tests, 18 passed, 0 failed, 1 skipped. |
| `npm run validate:local` | Passed. Baseline phase: 19 tests, 18 passed, 0 failed, 1 skipped. STR-140 phase: 3 tests, 3 passed, 0 failed, 0 skipped. |
| `git diff --check` | Passed. |
| `git status --short` | Only STR-142 files changed plus historical untracked implementation-package files not staged. |

Deployment/runtime validation:

| Command | Result |
| --- | --- |
| `mbt build` | Passed. Generated `mta_archives\cap-poc-ai_0.1.0.mtar`. |
| `cf deploy .\mta_archives\cap-poc-ai_0.1.0.mtar` | Passed after aborting the previous failed operation and redeploying the updated archive. |
| `cf apps` | `cap-poc-ai-srv` started, `web:1/1`; `cap-poc-ai-db-deployer` stopped after task execution. |
| `cf services` | `cap-poc-ai-db` bound to service and deployer; HANA Cloud instance visible. |
| Endpoint readback | `$metadata` and all approved STR-135 projections returned HTTP 200. |

## 13. Scope Confirmation

- No business behaviour changed.
- No production source was refactored for deployment convenience.
- No CDS business model or persistence semantics changed.
- No service boundary changed.
- No validation, Responsibility Determination, lifecycle, StatusHistory, ErrorRecord, or executing-company semantics changed.
- No production reset endpoint, test-only public API, handler, action, or function was introduced.
- No CI/CD was introduced.
- No production security architecture was introduced.
- No external SAP integration was introduced.
- No STR-143 scope was introduced.
- Enterprise Architecture remains unchanged.
